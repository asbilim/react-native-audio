import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { TextInput, Button, Checkbox, Text, Menu, IconButton  } from 'react-native-paper';
import { SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import { useEffect } from "react";
import Animated, { Easing } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import base64 from 'react-native-base64';
import axios from 'axios';

const { Value, timing } = Animated;

export default function WordForm() {

  const [isRecording, setIsRecording] = useState(false);
  const [visible, setVisible] = useState(false); // For the dropdown menu
  const [language, setLanguage] = useState('english');
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [audio, setAudio] = useState("");
  const [load,setLoad] = useState(0)
  const  [token, setToken] = useState('')

  const fetchToken = async () =>{
    fetch('http://localhost:8000/auth/token/login/',{
      method:'POST',
      headers:{
        'Content-Type': 'application/json',
      },
      body:{
        "username":"admin",
        "password":"admin"
      }
    })
    .then(response=>response.json())
    .then(data=>setToken(data.access))
  }

  const pulseAnim = new Value(1); // initialize animation value
  
  const startPulse = () => {
    timing(pulseAnim, {
      duration: 1000,
      toValue: 1.2,
      easing: Easing.inOut(Easing.ease),
    }).start(({ finished }) => {
      if (finished) {
        timing(pulseAnim, {
          duration: 1000,
          toValue: 1,
          easing: Easing.inOut(Easing.ease),
        }).start(startPulse); // recursive loop for continuous pulsation
      }
    });
  };

  const playRecordedSound = async () => {
    if (audio) {
        await playSound(audio);
    }
 }


  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      setIsRecording(false);
    //   pulseAnim.stopAnimation(); // Stop pulsation
    //   pulseAnim.setValue(1);
    } else {
      await startRecording();
      setIsRecording(true);
      startPulse(); // Start pulsation
    }
  }


    const recordingOptions = {
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        ios: {
            extension: '.mp3',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
        },
        android: {
            extension: '.mp3',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
        }
    };

    useEffect(() => {

        console.log(token)
        return sound && load ? () => {
            sound.unloadAsync(); 
            setLoad(1)
        } : undefined;
    }, [sound]);


    async function playSound(filePath) {
        console.log('Loading Sound');
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: filePath });
        setSound(newSound);

        console.log('Playing Sound');
        await newSound.playAsync();
    }

    async function isLoaded(recordingOrSound) {
        if (!recordingOrSound) return false;
    
        const status = await recordingOrSound.getStatusAsync();
        return status.isLoaded || false;
    }
    

    async function startRecording() {
        try {
          console.log('Requesting permissions..');
          await Audio.requestPermissionsAsync();
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          console.log('Starting recording..');
          const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
          setRecording(newRecording);
          console.log('Recording started');
        } catch (err) {
          console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');

        if (await isLoaded(recording)) {
            await recording.stopAndUnloadAsync();
        }

        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true, 
        });
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        setAudio(uri);
        setRecording(false)
    }

    const [formData, setFormData] = useState({
        word_text: '',
        translation_fr: '',
        definition_french: '',
        translation_en: '',
        definition_english: '',
        synonym: '',
        phrase: '',
        meaning: '',
        verified: false,
        language: 1, 
    });


    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {

      const formToSend = new FormData();

        Object.keys(formData).forEach(key => {
            formToSend.append(key, formData[key]);
        });

        
        if (audio) {
            
            const file = await FileSystem.readAsStringAsync(audio, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            const byteCharacters = base64.decode(file);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/mp3' });

            
            formToSend.append('pronunciation', {
                type: 'audio/mp3',
                name: 'pronunciation.mp3',
                blob
            });

            console.log(formToSend);
           
            const url = 'http://192.168.206.170:8000/api/v1/words/';

      const headers = {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjkyODkwNzkwLCJpYXQiOjE2OTIyODU5OTAsImp0aSI6Ijg1N2NmZWIyNTIyMjRjNTZiYTQ1Y2JhZjQwODRjZWNmIiwidXNlcl9pZCI6MTF9.R3GDMdj4DExRfy1f2Rl0GNmfe-QQf2JIqfqhLMRKq04',
        'Content-Type': 'multipart/form-data'
      };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: formToSend // Assuming formToSend is a FormData object or similar payload
      });

      if (!response.ok) {
        // Fetch doesn't reject HTTP error statuses, so you need to handle them manually.
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json(); // assuming server responds with json
      console.log('Successfully sent data:', data);

    } catch (error) {
      console.error('Error sending data:', error.message);
    }


           
        }

    
    };

  return (
    <SafeAreaView
        style={{marginTop:100,flex:1}}
    >
        <ScrollView style={{ padding: 20,paddingBottom:100,flex:1 }} contentContainerStyle={{ paddingBottom: 60 }}>
        <View >
            <Text style={{fontSize:25}}>Add a word</Text>
        </View>
        <TextInput
            label="Word Text"
            value={formData.word_text}
            onChangeText={(value) => handleChange('word_text', value)}
            style={{marginVertical:20}}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchor={
              <Button onPress={() => setVisible(true)}>
                {language.charAt(0).toUpperCase() + language.slice(1)}
              </Button>
            }
          >
            <Menu.Item onPress={() => { setLanguage('english'); setVisible(false); }} title="English" />
            <Menu.Item onPress={() => { setLanguage('french'); setVisible(false); }} title="French" />
           
          </Menu>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20,justifyContent:"center" }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <FontAwesome name="microphone" size={32} color={isRecording ? 'red' : 'black'} />
          </Animated.View>
          <IconButton icon={isRecording ? "stop" : "record-rec"} color={isRecording ? 'red' : 'black'} size={24} onPress={toggleRecording} />
          <Button mode="contained" onPress={playRecordedSound} style={{ marginTop: 20 }}>
                Play Recorded Audio
          </Button>

        </View>
        <TextInput
            label="Translation (FR)"
            value={formData.translation_fr}
            onChangeText={(value) => handleChange('translation_fr', value)}
            style={{marginVertical:20}}
        />
        <TextInput
            label="Definition (French)"
            value={formData.definition_french}
            onChangeText={(value) => handleChange('definition_french', value)}
            style={{marginVertical:20}}
            multiline
            numberOfLines={4}
        />
        <TextInput
            label="Translation (EN)"
            value={formData.translation_en}
            onChangeText={(value) => handleChange('translation_en', value)}
            style={{marginVertical:20}}

        />
        <TextInput
            label="Definition (English)"
            value={formData.definition_english}
            onChangeText={(value) => handleChange('definition_english', value)}
            style={{marginVertical:20}}
            multiline
            numberOfLines={4}

        />
        <TextInput
            label="Synonym"
            value={formData.synonym}
            onChangeText={(value) => handleChange('synonym', value)}
            style={{marginVertical:20}}

        />
        <TextInput
            label="Phrase"
            value={formData.phrase}
            onChangeText={(value) => handleChange('phrase', value)}
            style={{marginVertical:20}}

        />
        <TextInput
            label="Meaning"
            value={formData.meaning}
            onChangeText={(value) => handleChange('meaning', value)}
            style={{marginVertical:20}}

        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Checkbox
            status={formData.verified ? 'checked' : 'unchecked'}
            onPress={() => handleChange('verified', !formData.verified)}
            style={{marginVertical:20}}

            />
            <Text>Verified</Text>
        </View>

        <Button mode="contained" onPress={handleSubmit} style={{ marginTop: 20 }}>
            Submit
        </Button>
        
        </ScrollView>
    </SafeAreaView>
  );
}

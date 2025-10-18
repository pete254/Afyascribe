// src/services/AudioService.js - Updated to use Groq for transcription
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';


class AudioService {
 constructor() {
   this.recording = null;
   this.isRecording = false;
   this.isTranscribing = false;
   this.recordingDuration = 0;
   this.durationInterval = null;
   this.currentTranscript = '';
  
   // 🔄 CHANGED: Groq API Configuration
   this.API_KEY = Constants.expoConfig?.extra?.GROQ_API_KEY || process.env.EXPO_PUBLIC_GROQ_API_KEY;
  
   if (!this.API_KEY) {
     console.warn('⚠️ Groq API key not found. Please set EXPO_PUBLIC_GROQ_API_KEY in your environment.');
   }
 }


 async initialize() {
   try {
     console.log('Requesting audio permissions...');
     const permission = await Audio.requestPermissionsAsync();
    
     if (permission.status !== 'granted') {
       throw new Error('Audio recording permission not granted');
     }


     await Audio.setAudioModeAsync({
       allowsRecordingIOS: true,
       playsInSilentModeIOS: true,
       staysActiveInBackground: true,
       shouldDuckAndroid: true,
       playThroughEarpieceAndroid: false,
     });


     console.log('Audio permissions granted and mode set');
     return { success: true };
   } catch (error) {
     console.error('Failed to initialize audio:', error);
     throw error;
   }
 }


 async getRecordingStatus() {
   try {
     if (!this.recording) {
       return {
         isRecording: false,
         durationMs: 0,
         metering: null
       };
     }
     const status = await this.recording.getStatusAsync();
     return {
       isRecording: status.isRecording,
       durationMs: status.durationMillis || 0,
       metering: status.metering
     };
   } catch (error) {
     console.error('Error getting recording status:', error);
     throw error;
   }
 }


 async startRecording() {
   try {
     console.log('Starting recording...');
    
     // Clear previous transcript
     this.currentTranscript = '';
    
     await this.initialize();


     const recordingOptions = {
       isMeteringEnabled: true,
       android: {
         extension: '.m4a',
         sampleRate: 44100,
         numberOfChannels: 2,
         bitRate: 128000,
         outputFormat: Audio.AndroidOutputFormat.MPEG_4,
         audioEncoder: Audio.AndroidAudioEncoder.AAC,
       },
       ios: {
         extension: '.m4a',
         audioQuality: Audio.IOSAudioQuality.HIGH,
         sampleRate: 44100,
         numberOfChannels: 2,
         bitRate: 128000,
         linearPCMBitDepth: 16,
         linearPCMIsBigEndian: false,
         linearPCMIsFloat: false,
       },
     };


     this.recording = new Audio.Recording();
     await this.recording.prepareToRecordAsync(recordingOptions);
    
     this.recording.setOnRecordingStatusUpdate((status) => {
       if (status.durationMillis !== undefined) {
         this.recordingDuration = status.durationMillis;
       }
     });


     await this.recording.startAsync();
     this.isRecording = true;
    
     this.durationInterval = setInterval(async () => {
       const status = await this.getRecordingStatus();
       if (status.isRecording) {
         this.recordingDuration = status.durationMs;
       }
     }, 1000);


     console.log('Recording started successfully');
     return { success: true };


   } catch (error) {
     console.error('Failed to start recording:', error);
     this.cleanup();
     throw error;
   }
 }


 async stopRecording() {
   try {
     console.log('Stopping recording...');
     this.isRecording = false;


     // Clear duration interval
     if (this.durationInterval) {
       clearInterval(this.durationInterval);
       this.durationInterval = null;
     }


     if (this.recording) {
       await this.recording.stopAndUnloadAsync();
       const uri = this.recording.getURI();
       this.recording = null;


       console.log('Recording stopped, audio saved to:', uri);
      
       if (uri) {
         // Start transcription process
         try {
           this.isTranscribing = true;
           console.log('🚀 Starting Groq Whisper transcription...');
          
           const transcriptionResult = await this.transcribeAudio(uri);
          
           if (transcriptionResult.success && transcriptionResult.transcription) {
             this.currentTranscript = transcriptionResult.transcription;
             console.log('✅ Transcription completed:', this.currentTranscript);
            
             return {
               success: true,
               uri,
               transcript: this.currentTranscript
             };
           } else {
             console.log('⚠️ No transcription received or transcription failed');
             return {
               success: true,
               uri,
               transcript: '',
               transcriptionError: 'No speech detected or transcription failed'
             };
           }
         } catch (transcriptionError) {
           console.error('❌ Transcription error:', transcriptionError);
           return {
             success: true,
             uri,
             transcript: '',
             transcriptionError: transcriptionError.message
           };
         } finally {
           this.isTranscribing = false;
         }
       }
     }


     return { success: false };
   } catch (error) {
     console.error('Failed to stop recording:', error);
     this.isTranscribing = false;
     throw error;
   }
 }


 // 🔄 CHANGED: Using Groq API for transcription
 async transcribeAudio(audioUri) {
   try {
     console.log('🚀 Starting Groq Whisper API transcription...');


     if (!this.API_KEY) {
       throw new Error('Groq API key not configured');
     }


     // Check if audio file exists
     const audioInfo = await FileSystem.getInfoAsync(audioUri);
     if (!audioInfo.exists) {
       throw new Error('Audio file does not exist');
     }


     console.log('📁 Audio file info:', audioInfo);


     // Create FormData for Groq API
     const formData = new FormData();
    
     // Append the audio file
     formData.append('file', {
       uri: audioUri,
       type: 'audio/m4a',
       name: 'recording.m4a',
     });
    
     // 🔄 CHANGED: Use Groq's Whisper model
     // Available models: whisper-large-v3, whisper-large-v3-turbo
     formData.append('model', 'whisper-large-v3-turbo'); // Faster variant
    
     // Language (optional, but helps accuracy)
     formData.append('language', 'en');
    
     // Prompt to guide transcription (helps with medical terminology)
     formData.append('prompt', 'Medical consultation with patient. Include medical terminology, SOAP notes format, symptoms, diagnosis, assessment, and treatment plan details.');
    
     // Response format (text is default)
     formData.append('response_format', 'text');


     console.log('📤 Sending request to Groq Whisper API...');


     // 🔄 CHANGED: Groq API endpoint
     const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${this.API_KEY}`,
         // Note: Don't set Content-Type header - FormData sets it automatically with boundary
       },
       body: formData,
     });


     if (!response.ok) {
       const errorText = await response.text();
       console.error('❌ Groq API error response:', errorText);
       throw new Error(`Groq API request failed: ${response.status} - ${errorText}`);
     }


     // Response is plain text when response_format is 'text'
     const transcriptionText = await response.text();
    
     console.log('✅ Groq transcription completed successfully');
     console.log('📝 Transcribed text:', transcriptionText);


     return {
       success: true,
       transcription: transcriptionText,
     };


   } catch (error) {
     console.error('❌ Groq transcription failed:', error);
     throw error;
   }
 }


 formatDuration(durationMs) {
   if (!durationMs || isNaN(durationMs)) {
     return '0:00';
   }
   const totalSeconds = Math.floor(durationMs / 1000);
   const minutes = Math.floor(totalSeconds / 60);
   const seconds = totalSeconds % 60;
   return `${minutes}:${seconds.toString().padStart(2, '0')}`;
 }


 getCurrentTranscript() {
   return this.currentTranscript;
 }


 clearTranscript() {
   console.log('Clearing transcript');
   this.currentTranscript = '';
 }


 cleanup() {
   console.log('Cleaning up AudioService...');


   if (this.recording) {
     this.recording.stopAndUnloadAsync()
       .catch(error => {
         if (!error.message.includes('Recorder does not exist')) {
           console.error('Cleanup error:', error);
         }
       });
     this.recording = null;
   }


   if (this.durationInterval) {
     clearInterval(this.durationInterval);
     this.durationInterval = null;
   }


   this.isRecording = false;
   this.isTranscribing = false;
   this.recordingDuration = 0;
   this.currentTranscript = '';
 }
}


export default new AudioService();
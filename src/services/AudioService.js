// src/services/AudioService.js - With Enhanced Diagnostics
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
    
    // 🔍 DIAGNOSTIC: Check all possible sources for API key
    console.log('🔍 ========== API KEY DIAGNOSTIC ==========');
    console.log('1. Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
    console.log('2. Constants.manifest?.extra:', Constants.manifest?.extra);
    console.log('3. Constants.manifest2?.extra:', Constants.manifest2?.extra);
    console.log('4. process.env.EXPO_PUBLIC_GROQ_API_KEY:', process.env.EXPO_PUBLIC_GROQ_API_KEY ? 'EXISTS' : 'MISSING');
    
    // Try multiple sources for the API key
    this.API_KEY = 
      Constants.expoConfig?.extra?.GROQ_API_KEY || 
      Constants.manifest?.extra?.GROQ_API_KEY ||
      Constants.manifest2?.extra?.GROQ_API_KEY ||
      process.env.EXPO_PUBLIC_GROQ_API_KEY;
    
    console.log('5. Final API_KEY:', this.API_KEY ? `${this.API_KEY.substring(0, 10)}...` : 'NOT FOUND');
    console.log('==========================================');
    
    if (!this.API_KEY) {
      console.error('❌ CRITICAL: Groq API key not found in any location!');
      console.error('📋 Checklist:');
      console.error('   1. Check app.json has GROQ_API_KEY in extra section');
      console.error('   2. For local dev: Check .env has EXPO_PUBLIC_GROQ_API_KEY');
      console.error('   3. For builds: Check EAS secrets with `eas secret:list`');
      console.error('   4. Restart dev server with `npx expo start -c`');
    } else {
      console.log('✅ Groq API key loaded successfully');
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

  async transcribeAudio(audioUri) {
    try {
      console.log('🚀 Starting Groq Whisper API transcription...');

      if (!this.API_KEY) {
        throw new Error('Groq API key not configured. Check app.json extra section or .env file.');
      }

      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      console.log('📁 Audio file info:', audioInfo);

      const formData = new FormData();
      
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      formData.append('prompt', 'Medical consultation with patient. Include medical terminology, SOAP notes format, symptoms, diagnosis, assessment, and treatment plan details.');
      formData.append('response_format', 'text');

      console.log('📤 Sending request to Groq Whisper API...');
      console.log('🔑 Using API key:', this.API_KEY.substring(0, 10) + '...');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq API error response:', errorText);
        throw new Error(`Groq API request failed: ${response.status} - ${errorText}`);
      }

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
// src/services/AudioService.js - Backend Transcription Version
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

class AudioService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.isTranscribing = false;
    this.recordingDuration = 0;
    this.durationInterval = null;
    this.currentTranscript = '';
    
    console.log('✅ AudioService initialized (Backend transcription mode)');
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
      console.log('📱 Platform:', Platform.OS);
      
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
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
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

      console.log('✅ Recording started successfully with AAC/M4A format');
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
            console.log('🚀 Starting transcription via backend...');
            
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
      console.log('🚀 Starting transcription via backend...');
      console.log('📱 Platform:', Platform.OS);

      // Validate audio file exists
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      console.log('📁 Audio file URI:', audioUri);
      console.log('📁 Audio file size:', audioInfo.size, 'bytes', `(${(audioInfo.size / 1024).toFixed(2)} KB)`);

      // Read the audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📊 Base64 audio length:', base64Audio.length);
      console.log('📊 First 50 chars of base64:', base64Audio.substring(0, 50));

      // Get backend URL from multiple sources
      const API_URL = 
        Constants.expoConfig?.extra?.API_URL ||
        Constants.manifest?.extra?.API_URL ||
        Constants.manifest2?.extra?.API_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'https://afyascribe-backend.onrender.com';

      // Get authentication token
      const storage = require('../utils/storage').default;
      const token = await storage.getToken();

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      console.log('📤 Sending to backend:', `${API_URL}/transcription/transcribe`);

      // Send base64 audio to backend
      const response = await fetch(`${API_URL}/transcription/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          platform: Platform.OS,
        }),
      });

      console.log('📨 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend transcription error:', errorText);
        throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const transcriptionText = data.text || data.transcription;

      if (!transcriptionText) {
        throw new Error('No transcription text received from backend');
      }

      console.log('✅ Transcription completed successfully');
      console.log('📝 Transcribed text length:', transcriptionText.length, 'characters');
      console.log('📝 Transcribed text:', transcriptionText);

      return {
        success: true,
        transcription: transcriptionText,
      };

    } catch (error) {
      console.error('❌ Transcription failed:', error);
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
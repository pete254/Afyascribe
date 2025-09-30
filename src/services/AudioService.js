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
    
    // Assembly AI Configuration for REST API
    this.API_KEY = Constants.expoConfig?.extra?.ASSEMBLY_AI_KEY || process.env.EXPO_PUBLIC_ASSEMBLYAI_API_KEY;
    
    if (!this.API_KEY) {
      console.warn('Assembly AI API key not found. Please set EXPO_PUBLIC_ASSEMBLYAI_API_KEY in your environment.');
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
            console.log('Starting transcription...');
            
            const transcriptionResult = await this.transcribeAudio(uri);
            
            if (transcriptionResult.success && transcriptionResult.transcription) {
              this.currentTranscript = transcriptionResult.transcription;
              console.log('Transcription completed:', this.currentTranscript);
              
              return { 
                success: true, 
                uri, 
                transcript: this.currentTranscript 
              };
            } else {
              console.log('No transcription received or transcription failed');
              return { 
                success: true, 
                uri, 
                transcript: '',
                transcriptionError: 'No speech detected or transcription failed'
              };
            }
          } catch (transcriptionError) {
            console.error('Transcription error:', transcriptionError);
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
      console.log('Starting REST API transcription...');

      if (!this.API_KEY) {
        throw new Error('Assembly AI API key not configured');
      }

      // Check if audio file exists
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      console.log('Audio file info:', audioInfo);

      // Step 1: Upload audio file
      console.log('Uploading audio file...');
      const uploadUrl = await this.uploadAudioFile(audioUri);
      
      // Step 2: Submit transcription request
      console.log('Submitting transcription request...');
      const transcriptId = await this.submitTranscriptionRequest(uploadUrl);
      
      // Step 3: Poll for results
      console.log('Polling for transcription results...');
      const transcription = await this.pollForTranscription(transcriptId);
      
      return {
        success: true,
        transcription: transcription.text,
        confidence: transcription.confidence,
      };

    } catch (error) {
      console.error('REST API Transcription failed:', error);
      throw error;
    }
  }

  async uploadAudioFile(audioUri) {
    try {
      // Read the audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary
      const binaryString = atob(audioBase64);
      const audioBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioBytes[i] = binaryString.charCodeAt(i);
      }

      console.log(`Uploading ${audioBytes.length} bytes to AssemblyAI...`);

      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': this.API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: audioBytes,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const { upload_url } = await uploadResponse.json();
      console.log('Audio uploaded successfully:', upload_url);
      return upload_url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async submitTranscriptionRequest(uploadUrl) {
    try {
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': this.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadUrl,
          punctuate: true,
          format_text: true,
          word_boost: [
            'SOAP', 'medical', 'patient', 'diagnosis', 'treatment', 
            'symptoms', 'prescription', 'history', 'examination',
            'subjective', 'objective', 'assessment', 'plan'
          ],
          speech_model: 'best',
          language_code: 'en',
        }),
      });

      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        throw new Error(`Transcription request failed: ${transcriptResponse.status} - ${errorText}`);
      }

      const { id } = await transcriptResponse.json();
      console.log('Transcription request submitted with ID:', id);
      return id;
    } catch (error) {
      console.error('Transcription request error:', error);
      throw error;
    }
  }

  async pollForTranscription(transcriptId, maxAttempts = 60) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`);
        
        const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.API_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const transcript = await response.json();
        console.log(`Transcription status: ${transcript.status}`);

        if (transcript.status === 'completed') {
          console.log('Transcription completed successfully');
          console.log('Transcript text:', transcript.text);
          return transcript;
        } else if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }

    throw new Error('Transcription timeout - polling exceeded maximum attempts');
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
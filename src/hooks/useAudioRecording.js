// src/hooks/useAudioRecording.js
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AudioService from '../services/AudioService';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState(null);
  
  const durationInterval = useRef(null);

  // Update recording duration every second while recording
  useEffect(() => {
    if (isRecording) {
      durationInterval.current = setInterval(async () => {
        try {
          const status = await AudioService.getRecordingStatus();
          setRecordingDuration(status.durationMs);
        } catch (error) {
          console.error('Failed to get recording status:', error);
        }
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      setRecordingDuration(0);

      console.log('Hook: Starting recording...');
      const result = await AudioService.startRecording();
      
      if (result.success) {
        setIsRecording(true);
        console.log('Hook: Recording started successfully');
      }
    } catch (error) {
      console.error('Hook: Failed to start recording:', error);
      setError(error.message);
      
      Alert.alert(
        'Recording Error',
        `Failed to start recording: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const stopRecording = async () => {
    try {
      setError(null);
      
      console.log('Hook: Stopping recording...');
      setIsRecording(false);
      setIsTranscribing(true); // Show transcription animation
      
      const result = await AudioService.stopRecording();
      
      if (result.success) {
        console.log('Hook: Recording stopped successfully');
        
        if (result.transcriptionError) {
          // Recording succeeded but transcription failed
          console.error('Transcription failed:', result.transcriptionError);
          Alert.alert(
            'Transcription Failed',
            `Recording was saved but transcription failed: ${result.transcriptionError}`,
            [
              { text: 'Cancel' },
              { 
                text: 'Retry Transcription', 
                onPress: async () => {
                  try {
                    setIsTranscribing(true);
                    const transcriptionResult = await AudioService.transcribeAudio(result.uri);
                    if (transcriptionResult.success && transcriptionResult.transcription) {
                      setTranscription(transcriptionResult.transcription);
                      Alert.alert(
                        'Transcription Complete',
                        `Your recording has been transcribed successfully!`,
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (retryError) {
                    Alert.alert('Retry Failed', retryError.message);
                  } finally {
                    setIsTranscribing(false);
                  }
                }
              }
            ]
          );
        } else if (result.transcript && result.transcript.trim()) {
          // Both recording and transcription succeeded
          console.log('Hook: Setting transcription:', result.transcript);
          setTranscription(result.transcript);
          
          Alert.alert(
            'Recording Complete',
            `Your recording has been transcribed successfully!\n\nTranscribed: "${result.transcript.substring(0, 100)}${result.transcript.length > 100 ? '...' : ''}"`,
            [{ text: 'OK' }]
          );
        } else {
          // Recording succeeded but no transcription
          console.log('Hook: No transcription received');
          Alert.alert(
            'No Speech Detected',
            'Recording completed successfully, but no speech was detected. Please try recording again and speak clearly.',
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error('Recording failed to stop properly');
      }
    } catch (error) {
      console.error('Hook: Failed to stop recording:', error);
      setIsRecording(false);
      setError(error.message);
      
      Alert.alert(
        'Recording Error',
        `Failed to stop recording: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const clearTranscription = () => {
    console.log('Hook: Clearing transcription');
    setTranscription('');
    setError(null);
    setRecordingDuration(0);
    AudioService.clearTranscript();
  };

  const getFormattedDuration = () => {
    return AudioService.formatDuration(recordingDuration);
  };

  const getCurrentTranscription = () => {
    return transcription || AudioService.getCurrentTranscript();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      AudioService.cleanup();
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    transcription,
    getCurrentTranscription,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscription,
    getFormattedDuration,
  };
};
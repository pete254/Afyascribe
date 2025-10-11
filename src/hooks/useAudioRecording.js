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
      setIsTranscribing(true);
      
      const result = await AudioService.stopRecording();
      
      if (result.success) {
        console.log('Hook: Recording stopped successfully');
        
        // ✅ FIX: Handle transcription result WITHOUT showing Alert immediately
        if (result.transcript && result.transcript.trim()) {
          // SUCCESS - Set transcription state
          console.log('Hook: Setting transcription:', result.transcript);
          setTranscription(result.transcript);
          console.log('Hook: ✅ Transcription state updated');
          
          // ✅ Important: Set isTranscribing to false AFTER setting transcription
          // This ensures TranscriptionScreen sees the transcription value
          setTimeout(() => {
            setIsTranscribing(false);
            console.log('Hook: ✅ isTranscribing set to false');
          }, 100);
          
        } else if (result.transcriptionError) {
          // Transcription failed
          console.error('Transcription failed:', result.transcriptionError);
          setIsTranscribing(false);
          
          Alert.alert(
            'Transcription Failed',
            `Recording saved but transcription failed: ${result.transcriptionError}`,
            [{ text: 'OK' }]
          );
        } else {
          // No speech detected
          console.log('Hook: No transcription received');
          setIsTranscribing(false);
          
          Alert.alert(
            'No Speech Detected',
            'No speech was detected. Please try again and speak clearly.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setIsTranscribing(false);
        throw new Error('Recording failed to stop properly');
      }
    } catch (error) {
      console.error('Hook: Failed to stop recording:', error);
      setIsRecording(false);
      setIsTranscribing(false);
      setError(error.message);
      
      Alert.alert(
        'Recording Error',
        `Failed to stop recording: ${error.message}`,
        [{ text: 'OK' }]
      );
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
// src/screens/TranscriptionScreen.js - Firebase Integration with Editable SOAP Notes
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { formatToSOAP } from '../services/soapFormatter';
import { useAudioRecording } from '../hooks/useAudioRecording';
import FirebaseService from '../services/firebaseService';

const { width } = Dimensions.get('window');

export default function TranscriptionScreen() {
  const [inputNotes, setInputNotes] = useState('');
  const [soapNotes, setSoapNotes] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [showMicAnimation, setShowMicAnimation] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [medicalTerms, setMedicalTerms] = useState([]);
  const [formattingStartTime, setFormattingStartTime] = useState(null);
  
  // New state for SOAP editing
  const [isEditingSOAP, setIsEditingSOAP] = useState(false);
  const [hasEditedSOAP, setHasEditedSOAP] = useState(false);

  // Audio recording hook
  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    transcription,
    getCurrentTranscription,
    toggleRecording,
    clearTranscription,
    getFormattedDuration,
  } = useAudioRecording();

  // Animation values
  const micShakeAnim = useRef(new Animated.Value(0)).current;
  const soundWave1 = useRef(new Animated.Value(0)).current;
  const soundWave2 = useRef(new Animated.Value(0)).current;
  const soundWave3 = useRef(new Animated.Value(0)).current;
  const soundWave4 = useRef(new Animated.Value(0)).current;
  const soundWave5 = useRef(new Animated.Value(0)).current;
  
  // Transcription animation values
  const transcriptionPulse = useRef(new Animated.Value(0)).current;
  const transcriptionDots = useRef(new Animated.Value(0)).current;
  
  const typingIndex = useRef(0);
  const currentPhrase = useRef(0);

  const phrases = [
    "Type your case details here...",
    "Record your case..."
  ];

  // Update input with transcription and extract patient info
  useEffect(() => {
    const currentText = getCurrentTranscription();
    if (currentText && currentText.trim()) {
      // Append new transcription to existing input instead of replacing it
      setInputNotes(prevNotes => {
        const newText = prevNotes.trim() 
          ? `${prevNotes}\n\n${currentText}` 
          : currentText;
        return newText;
      });
      
      // Extract patient info from the complete text
      const completeText = inputNotes.trim() 
        ? `${inputNotes}\n\n${currentText}` 
        : currentText;
      const extractedInfo = FirebaseService.extractPatientInfo(completeText);
      setPatientInfo(extractedInfo);
      console.log('Extracted patient info:', extractedInfo);
    }
  }, [transcription]);

  // Extract patient info when input notes change (for manual input)
  useEffect(() => {
    if (inputNotes.trim()) {
      const extractedInfo = FirebaseService.extractPatientInfo(inputNotes);
      setPatientInfo(extractedInfo);
    } else {
      setPatientInfo(null);
    }
  }, [inputNotes]);

  // Typing animation effect
  useEffect(() => {
    if (inputNotes.trim() || isRecording || isTranscribing) {
      return; // Don't show placeholder animation when there's content or recording
    }

    const typeText = () => {
      const phrase = phrases[currentPhrase.current];
      
      if (typingIndex.current <= phrase.length) {
        setPlaceholderText(phrase.substring(0, typingIndex.current));
        typingIndex.current++;
        
        setTimeout(typeText, 100);
      } else {
        setTimeout(() => {
          if (currentPhrase.current === 0) {
            currentPhrase.current = 1;
            typingIndex.current = 0;
            setShowMicAnimation(true);
            startMicShake();
          } else {
            currentPhrase.current = 0;
            typingIndex.current = 0;
            setShowMicAnimation(false);
          }
          typeText();
        }, 3000);
      }
    };

    typeText();
  }, [inputNotes, isRecording, isTranscribing]);

  // Recording soundwave animation
  useEffect(() => {
    if (isRecording) {
      startSoundWaveAnimation();
    } else {
      stopSoundWaveAnimation();
    }
  }, [isRecording]);

  // Transcription animation
  useEffect(() => {
    if (isTranscribing) {
      startTranscriptionAnimation();
    } else {
      stopTranscriptionAnimation();
    }
  }, [isTranscribing]);

  const startSoundWaveAnimation = () => {
    const createAnimation = (animValue, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 600,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
    };

    Animated.parallel([
      createAnimation(soundWave1, 0),
      createAnimation(soundWave2, 100),
      createAnimation(soundWave3, 200),
      createAnimation(soundWave4, 300),
      createAnimation(soundWave5, 400),
    ]).start();
  };

  const stopSoundWaveAnimation = () => {
    soundWave1.setValue(0);
    soundWave2.setValue(0);
    soundWave3.setValue(0);
    soundWave4.setValue(0);
    soundWave5.setValue(0);
  };

  const startTranscriptionAnimation = () => {
    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(transcriptionPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(transcriptionPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(transcriptionDots, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(transcriptionDots, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const stopTranscriptionAnimation = () => {
    transcriptionPulse.setValue(0);
    transcriptionDots.setValue(0);
  };

  // Mic shake animation
  const startMicShake = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(micShakeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(micShakeAnim, {
          toValue: -1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(micShakeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleSendNotes = async () => {
    if (!inputNotes.trim()) {
      Alert.alert('Error', 'Please enter some notes to format');
      return;
    }

    setIsFormatting(true);
    setFormattingStartTime(Date.now());
    
    try {
      const result = await formatToSOAP(inputNotes);
      setSoapNotes(result.formatted);
      setMedicalTerms(result.medicalTermsFound || []);
      
      // Reset editing states when new SOAP notes are generated
      setIsEditingSOAP(false);
      setHasEditedSOAP(false);
      
      console.log('SOAP formatting completed:', {
        medicalTerms: result.medicalTermsFound,
        patientInfo
      });
      
      // Clear transcription after formatting (moved from handleVoiceRecord)
      clearTranscription();
      
    } catch (error) {
      Alert.alert('Error', `Failed to format notes: ${error.message}`);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isTranscribing) {
      Alert.alert('Processing', 'Please wait for transcription to complete');
      return;
    }

    if (isRecording) {
      // Stop recording - don't clear anything here
      await toggleRecording();
    } else {
      // Start new recording - don't clear existing text
      // Only clear the transcription state, not the input text
      await toggleRecording();
    }
  };

  // New function to clear all content (for new note)
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Content',
      'This will clear all input text and start fresh. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setInputNotes('');
            setSoapNotes('');
            setPatientInfo(null);
            setMedicalTerms([]);
            setIsEditingSOAP(false);
            setHasEditedSOAP(false);
            clearTranscription();
          }
        }
      ]
    );
  };

  // New function to handle SOAP note editing toggle
  const handleToggleSOAPEdit = () => {
    if (isEditingSOAP) {
      // Confirm finishing edit
      Alert.alert(
        'Finish Editing',
        'Are you satisfied with your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Done Editing', 
            style: 'default',
            onPress: () => {
              setIsEditingSOAP(false);
              if (!hasEditedSOAP) {
                setHasEditedSOAP(true);
              }
            }
          }
        ]
      );
    } else {
      setIsEditingSOAP(true);
    }
  };

  // New function to handle SOAP text changes
  const handleSOAPTextChange = (text) => {
    setSoapNotes(text);
    setHasEditedSOAP(true);
  };

  // New function to regenerate SOAP notes
  const handleRegenerateSOAP = () => {
    if (hasEditedSOAP) {
      Alert.alert(
        'Regenerate SOAP Notes',
        'This will replace your edited content with a new AI-generated version. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Regenerate', 
            style: 'destructive',
            onPress: () => {
              handleSendNotes();
            }
          }
        ]
      );
    } else {
      handleSendNotes();
    }
  };

  const handleSaveNotes = async () => {
    if (!soapNotes.trim()) {
      Alert.alert('Error', 'No formatted notes to save');
      return;
    }

    if (!patientInfo) {
      Alert.alert('Warning', 'No patient information detected in the notes');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('Saving note to Firebase...');
      
      // Calculate processing time
      const processingTime = formattingStartTime ? Date.now() - formattingStartTime : null;
      
      // Prepare data for Firebase
      const saveData = {
        originalTranscription: inputNotes,
        formattedSoapNotes: soapNotes,
        medicalTermsFound: medicalTerms,
        transcriptionMethod: transcription ? 'voice' : 'manual',
        processingTime,
        confidence: null, // You could add confidence score from voice recognition
        wasEdited: hasEditedSOAP // Track if the SOAP notes were manually edited
      };

      const result = await FirebaseService.saveSoapNote(saveData);
      
      if (result.success) {
        Alert.alert(
          'Success', 
          `Note saved successfully!${hasEditedSOAP ? ' (Including your edits)' : ''}\n\nPatient: ${patientInfo.patientName}${patientInfo.age ? `\nAge: ${patientInfo.age}` : ''}${patientInfo.gender ? `\nGender: ${patientInfo.gender}` : ''}\n\nCheck the Saved Notes tab to view it.`,
          [
            { 
              text: 'New Note', 
              onPress: () => {
                // Clear everything for new note
                setInputNotes('');
                setSoapNotes('');
                setPatientInfo(null);
                setMedicalTerms([]);
                setIsEditingSOAP(false);
                setHasEditedSOAP(false);
                clearTranscription();
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Error', `Failed to save note: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const micShakeStyle = {
    transform: [
      {
        rotate: micShakeAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-10deg', '10deg'],
        }),
      },
    ],
  };

  const getSoundWaveHeight = (animValue) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 45],
    });
  };

  const getTranscriptionDotsText = () => {
    const progress = transcriptionDots._value;
    const numDots = Math.floor(progress * 3) + 1;
    return '.'.repeat(numDots);
  };

  const getRecordingButtonContent = () => {
    if (isTranscribing) {
      return { icon: '🔄', text: 'Transcribing...' };
    } else if (isRecording) {
      return { icon: '⏹️', text: `Recording... ${getFormattedDuration()}` };
    } else {
      return { icon: '🎤', text: 'Start Recording' };
    }
  };

  const recordingButton = getRecordingButtonContent();

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.appName}>Afyascribe</Text>
          <Text style={styles.appTagline}>Accurate Medical Transcriptions, Simplified</Text>
        </View>
      </View>

      {/* Header Soundwave Icon */}
      <View style={styles.headerIcon}>
        <View style={[styles.iconContainer, isTranscribing && styles.iconContainerTranscribing]}>
          {isTranscribing ? (
            <Animated.View style={[
              styles.transcriptionIcon,
              {
                opacity: transcriptionPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
                transform: [{
                  scale: transcriptionPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.1],
                  }),
                }],
              }
            ]}>
              <Text style={styles.transcriptionIconText}>🎙</Text>
            </Animated.View>
          ) : (
            <View style={styles.soundwaveContainer}>
              <Animated.View style={[styles.soundBar, { height: getSoundWaveHeight(soundWave1) }]} />
              <Animated.View style={[styles.soundBar, { height: getSoundWaveHeight(soundWave2) }]} />
              <Animated.View style={[styles.soundBar, { height: getSoundWaveHeight(soundWave3) }]} />
              <Animated.View style={[styles.soundBar, { height: getSoundWaveHeight(soundWave4) }]} />
              <Animated.View style={[styles.soundBar, { height: getSoundWaveHeight(soundWave5) }]} />
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Patient Info Display */}
        {patientInfo && patientInfo.patientName !== 'Unknown Patient' && (
          <View style={styles.patientInfoCard}>
            <View style={styles.patientInfoHeader}>
              <Text style={styles.patientInfoTitle}>👤 Patient Information</Text>
              <View style={styles.detectedBadge}>
                <Text style={styles.detectedBadgeText}>✨ Auto-detected</Text>
              </View>
            </View>
            <View style={styles.patientInfoContent}>
              <Text style={styles.patientName}>Name: {patientInfo.patientName}</Text>
              {patientInfo.age && (
                <Text style={styles.patientDetail}>Age: {patientInfo.age} years</Text>
              )}
              {patientInfo.gender && (
                <Text style={styles.patientDetail}>Gender: {patientInfo.gender}</Text>
              )}
            </View>
            {medicalTerms.length > 0 && (
              <View style={styles.medicalTermsPreview}>
                <Text style={styles.medicalTermsLabel}>Medical terms found:</Text>
                <Text style={styles.medicalTermsText}>
                  {medicalTerms.slice(0, 4).join(', ')}{medicalTerms.length > 4 && '...'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recording Button Container */}
        <View style={[
          styles.recordingContainer, 
          isTranscribing && styles.recordingContainerTranscribing
        ]}>
          <View style={styles.recordingContent}>
            {/* Recording Button */}
            <Animated.View style={showMicAnimation && !isRecording && !isTranscribing ? micShakeStyle : {}}>
              <TouchableOpacity 
                style={[
                  styles.recordButton, 
                  isRecording && styles.recordButtonActive,
                  isTranscribing && styles.recordButtonProcessing
                ]}
                onPress={handleVoiceRecord}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#0f766e" size="large" />
                ) : (
                  <Text style={styles.recordButtonIcon}>
                    {recordingButton.icon}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            
            {/* Recording Status */}
            <View style={styles.recordingStatus}>
              <Text style={styles.recordingStatusText}>
                {recordingButton.text}
                {isTranscribing && getTranscriptionDotsText()}
              </Text>
              
              {isRecording && (
                <View style={styles.listeningIndicator}>
                  <View style={styles.redDot} />
                  <Text style={styles.listeningText}>Listening</Text>
                </View>
              )}
              
              {isTranscribing && (
                <View style={styles.listeningIndicator}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.listeningText}>Converting speech to text</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Input Container */}
        <View style={styles.inputCard}>
          <View style={styles.inputContent}>
            {/* Text Input */}
            <TextInput
              style={[
                styles.textInput, 
                isRecording && styles.textInputRecording,
                isTranscribing && styles.textInputTranscribing
              ]}
              placeholder={!inputNotes.trim() ? (placeholderText || "Type your case details here...") : ""}
              value={inputNotes}
              onChangeText={setInputNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="rgba(0,0,0,0.5)"
              editable={!isTranscribing && !isRecording}
            />

            {/* Button Container */}
            <View style={styles.buttonContainer}>
              {/* Clear Button - only show when there's content */}
              {inputNotes.trim() && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleClearAll}
                  disabled={isRecording || isTranscribing}
                >
                  <Text style={styles.clearButtonText}>🗑️ Clear All</Text>
                </TouchableOpacity>
              )}
              
              {/* Format Button */}
              <TouchableOpacity 
                style={[
                  styles.formatButton, 
                  (!inputNotes.trim() || isTranscribing || isRecording) && styles.formatButtonDisabled
                ]}
                onPress={soapNotes ? handleRegenerateSOAP : handleSendNotes}
                disabled={isFormatting || !inputNotes.trim() || isRecording || isTranscribing}
              >
                {isFormatting ? (
                  <ActivityIndicator color="#0f766e" size="small" />
                ) : (
                  <Text style={styles.formatButtonIcon}>
                    {soapNotes ? '🔄' : '➤'}
                  </Text>
                )}
                <Text style={styles.formatButtonText}>
                  {isFormatting ? 'Processing...' : (soapNotes ? 'Regenerate Notes' : 'Format Notes')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SOAP Output Section */}
        {soapNotes && (
          <View style={styles.outputCard}>
            <View style={styles.outputContent}>
              <View style={styles.outputHeader}>
                <Text style={styles.outputTitle}>📋 SOAP Notes Generated</Text>
                <View style={styles.outputActions}>
                  {hasEditedSOAP && (
                    <View style={styles.editedBadge}>
                      <Text style={styles.editedBadgeText}>✏️ Edited</Text>
                    </View>
                  )}
                  <View style={styles.aiTag}>
                    <Text style={styles.aiTagText}>✨ AI</Text>
                  </View>
                </View>
              </View>
              
              {/* SOAP Notes Content - Editable when in edit mode */}
              {isEditingSOAP ? (
                <TextInput
                  style={styles.soapEditInput}
                  value={soapNotes}
                  onChangeText={handleSOAPTextChange}
                  multiline
                  textAlignVertical="top"
                  placeholder="Edit your SOAP notes here..."
                  placeholderTextColor="rgba(0,0,0,0.5)"
                />
              ) : (
                <ScrollView 
                  style={[
                    styles.soapContainer,
                    hasEditedSOAP && styles.soapContainerEdited
                  ]} 
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.soapText}>{soapNotes}</Text>
                </ScrollView>
              )}
              
              {/* SOAP Actions */}
              <View style={styles.soapActions}>
                {/* Edit/Done Button */}
                <TouchableOpacity 
                  style={[
                    styles.editButton,
                    isEditingSOAP && styles.editButtonActive
                  ]}
                  onPress={handleToggleSOAPEdit}
                >
                  <Text style={[
                    styles.editButtonText,
                    isEditingSOAP && styles.editButtonTextActive
                  ]}>
                    {isEditingSOAP ? '✅ Done Editing' : '✏️ Edit Notes'}
                  </Text>
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity 
                  style={[
                    styles.saveButton, 
                    isSaving && styles.saveButtonDisabled,
                    isEditingSOAP && styles.saveButtonDisabledEditing
                  ]}
                  onPress={handleSaveNotes}
                  disabled={isSaving || isEditingSOAP}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                      <Text style={styles.saveButtonText}>Saving to Firebase...</Text>
                    </>
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isEditingSOAP ? '⚠️ Finish Editing First' : '💾 Save to Database'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appHeader: {
    backgroundColor: '#0f766e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  headerIcon: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 30,
    backgroundColor: '#ffffff',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#0f766e',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerTranscribing: {
    borderColor: '#f59e0b',
  },
  transcriptionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptionIconText: {
    fontSize: 32,
  },
  soundwaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  soundBar: {
    width: 3,
    backgroundColor: '#0f766e',
    borderRadius: 2,
  },
  scrollContent: {
    flex: 1,
  },
  // Patient Info Card Styles
  patientInfoCard: {
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#22c55e',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
  },
  detectedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  detectedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803d',
  },
  patientInfoContent: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  medicalTermsPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  medicalTermsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  medicalTermsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  recordingContainer: {
    backgroundColor: '#0f766e',
    marginBottom: 0,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  recordingContainerTranscribing: {
    backgroundColor: '#f59e0b',
  },
  recordingContent: {
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
  recordButtonProcessing: {
    backgroundColor: '#f59e0b',
  },
  recordButtonIcon: {
    fontSize: 24,
  },
  recordingStatus: {
    alignItems: 'center',
  },
  recordingStatusText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fca5a5',
    marginRight: 8,
  },
  listeningText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
  },
  inputCard: {
    backgroundColor: '#0f766e',
    marginBottom: 0,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  inputContent: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  textInputRecording: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  textInputTranscribing: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  formatButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  formatButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  formatButtonIcon: {
    fontSize: 16,
    color: '#0f766e',
    fontWeight: 'bold',
    marginRight: 8,
  },
  formatButtonText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '600',
  },
  outputCard: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  outputContent: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  outputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  outputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  editedBadgeText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '600',
  },
  aiTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  aiTagText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  soapContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#0d9488',
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
    marginBottom: 16,
  },
  soapContainerEdited: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  soapText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1e293b',
  },
  soapEditInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 200,
    maxHeight: 400,
    textAlignVertical: 'top',
    marginBottom: 16,
    lineHeight: 22,
  },
  soapActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    flex: 1,
  },
  editButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  editButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  editButtonTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    flex: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#a78bfa',
    opacity: 0.7,
  },
  saveButtonDisabledEditing: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
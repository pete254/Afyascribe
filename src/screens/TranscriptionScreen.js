// src/screens/TranscriptionScreen.js - DEBUGGED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useAudioRecording } from '../hooks/useAudioRecording';
import SoapSectionInput from '../components/SoapSectionInput';
import PatientSearchBar from '../components/PatientSearchBar';

export default function TranscriptionScreen() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [symptoms, setSymptoms] = useState('');
  const [physicalExamination, setPhysicalExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [management, setManagement] = useState('');
  
  const [activeRecordingSection, setActiveRecordingSection] = useState(null);
  
  const [formatingSections, setFormatingSections] = useState({
    symptoms: false,
    physicalExamination: false,
    diagnosis: false,
    management: false,
  });
  
  const [collapsedSections, setCollapsedSections] = useState({
    symptoms: false,
    physicalExamination: false,
    diagnosis: false,
    management: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const {
    isRecording,
    isTranscribing,
    transcription,
    getCurrentTranscription,
    toggleRecording,
    clearTranscription,
  } = useAudioRecording();

  // ✅ FIX: Handle transcription completion - watch transcription directly
  useEffect(() => {
    console.log('📝 Transcription useEffect triggered:', {
      transcription,
      isRecording,
      isTranscribing,
      activeSection: activeRecordingSection,
    });
    
    // Process when we have transcription text AND an active section
    // Don't wait for isTranscribing to be false
    if (transcription && transcription.trim() && activeRecordingSection) {
      console.log(`✅ Adding transcription to ${activeRecordingSection}: "${transcription}"`);
      
      switch (activeRecordingSection) {
        case 'symptoms':
          setSymptoms((prev) => {
            const newValue = prev ? `${prev}\n\n${transcription}` : transcription;
            console.log('✅ Symptoms updated to:', newValue);
            return newValue;
          });
          break;
        case 'physicalExamination':
          setPhysicalExamination((prev) => {
            const newValue = prev ? `${prev}\n\n${transcription}` : transcription;
            console.log('✅ Physical Examination updated to:', newValue);
            return newValue;
          });
          break;
        case 'diagnosis':
          setDiagnosis((prev) => {
            const newValue = prev ? `${prev}\n\n${transcription}` : transcription;
            console.log('✅ Diagnosis updated to:', newValue);
            return newValue;
          });
          break;
        case 'management':
          setManagement((prev) => {
            const newValue = prev ? `${prev}\n\n${transcription}` : transcription;
            console.log('✅ Management updated to:', newValue);
            return newValue;
          });
          break;
        default:
          console.warn('❌ Unknown section:', activeRecordingSection);
      }
      
      // Clear after adding
      console.log('🧹 Clearing activeRecordingSection and transcription');
      setActiveRecordingSection(null);
      clearTranscription();
    }
  }, [transcription, activeRecordingSection]);

  const handleStartRecording = async (sectionName) => {
    console.log(`🎙️ START RECORDING for section: ${sectionName}`);
    
    if (isRecording) {
      console.log('⚠️ Already recording, stopping...');
      // ✅ FIX: Don't clear activeRecordingSection here!
      // Let the useEffect clear it after adding transcription
      await toggleRecording();
    } else {
      setActiveRecordingSection(sectionName);
      await toggleRecording();
    }
  };

  const handleFormatSection = async (sectionTitle, sectionText, setSectionText) => {
    if (!sectionText.trim()) {
      Alert.alert('Error', `Please add some text to ${sectionTitle} before formatting`);
      return;
    }

    const sectionKey = getSectionKey(sectionTitle);
    setFormatingSections((prev) => ({ ...prev, [sectionKey]: true }));

    try {
      const { chatWithGemini } = require('../services/geminiClient');
      
      const prompt = `Format the following medical notes professionally for the ${sectionTitle} section. Keep it concise and medical:\n\n${sectionText}`;
      const formatted = await chatWithGemini(prompt);
      
      setSectionText(formatted);
      Alert.alert('Success', `${sectionTitle} formatted successfully!`);
    } catch (error) {
      Alert.alert('Error', `Failed to format: ${error.message}`);
    } finally {
      setFormatingSections((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  const handleClearSection = (sectionTitle, setSectionText) => {
    Alert.alert(
      'Clear Section',
      `Are you sure you want to clear ${sectionTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setSectionText(''),
        },
      ]
    );
  };

  const toggleSection = (sectionName) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const getSectionKey = (title) => {
    if (title.includes('Symptoms')) return 'symptoms';
    if (title.includes('Physical')) return 'physicalExamination';
    if (title.includes('Diagnosis')) return 'diagnosis';
    if (title.includes('Management')) return 'management';
    return '';
  };

  const handleSaveAll = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    if (!symptoms.trim() && !physicalExamination.trim() && !diagnosis.trim() && !management.trim()) {
      Alert.alert('Error', 'Please add content to at least one section');
      return;
    }

    setIsSaving(true);

    try {
      const apiService = require('../services/apiService').default;
      
      const soapNoteData = {
        patientId: selectedPatient.id,
        symptoms: symptoms.trim(),
        physicalExamination: physicalExamination.trim(),
        diagnosis: diagnosis.trim(),
        management: management.trim(),
      };

      console.log('💾 Saving SOAP note:', soapNoteData);
      
      await apiService.createSoapNote(soapNoteData);
      
      Alert.alert(
        'Success',
        'SOAP note saved successfully!',
        [
          {
            text: 'New Note',
            onPress: () => {
              setSymptoms('');
              setPhysicalExamination('');
              setDiagnosis('');
              setManagement('');
              setSelectedPatient(null);
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      id: 'patient-search',
      type: 'patient-search',
      component: (
        <PatientSearchBar
          selectedPatient={selectedPatient}
          onPatientSelect={setSelectedPatient}
        />
      ),
    },
    {
      id: 'recording-banner',
      type: 'recording-banner',
      component: (isRecording || isTranscribing) && (
        <View style={styles.recordingBanner}>
          {isTranscribing ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.recordingBannerText}>Converting speech to text...</Text>
            </>
          ) : (
            <>
              <View style={styles.redDot} />
              <Text style={styles.recordingBannerText}>
                Recording {activeRecordingSection}...
              </Text>
            </>
          )}
        </View>
      ),
    },
    {
      id: 'symptoms',
      type: 'soap-section',
      component: (
        <SoapSectionInput
          title="1. Symptoms & Diagnosis"
          value={symptoms}
          onChangeText={setSymptoms}
          onFormat={() => handleFormatSection('Symptoms', symptoms, setSymptoms)}
          onClear={() => handleClearSection('Symptoms', setSymptoms)}
          onStartRecording={() => handleStartRecording('symptoms')}
          isRecording={isRecording && activeRecordingSection === 'symptoms'}
          isFormatting={formatingSections.symptoms}
          placeholder="What does the patient report? Symptoms, concerns, history..."
          isCollapsed={collapsedSections.symptoms}
          onToggleCollapse={() => toggleSection('symptoms')}
        />
      ),
    },
    {
      id: 'physicalExamination',
      type: 'soap-section',
      component: (
        <SoapSectionInput
          title="2. Physical Examination"
          value={physicalExamination}
          onChangeText={setPhysicalExamination}
          onFormat={() =>
            handleFormatSection('Physical Examination', physicalExamination, setPhysicalExamination)
          }
          onClear={() => handleClearSection('Physical Examination', setPhysicalExamination)}
          onStartRecording={() => handleStartRecording('physicalExamination')}
          isRecording={isRecording && activeRecordingSection === 'physicalExamination'}
          isFormatting={formatingSections.physicalExamination}
          placeholder="Measurable findings, vitals, exam results, observations..."
          isCollapsed={collapsedSections.physicalExamination}
          onToggleCollapse={() => toggleSection('physicalExamination')}
        />
      ),
    },
    {
      id: 'diagnosis',
      type: 'soap-section',
      component: (
        <SoapSectionInput
          title="3. Diagnosis"
          value={diagnosis}
          onChangeText={setDiagnosis}
          onFormat={() => handleFormatSection('Diagnosis', diagnosis, setDiagnosis)}
          onClear={() => handleClearSection('Diagnosis', setDiagnosis)}
          onStartRecording={() => handleStartRecording('diagnosis')}
          isRecording={isRecording && activeRecordingSection === 'diagnosis'}
          isFormatting={formatingSections.diagnosis}
          placeholder="Clinical diagnosis, assessment, differential diagnosis..."
          isCollapsed={collapsedSections.diagnosis}
          onToggleCollapse={() => toggleSection('diagnosis')}
        />
      ),
    },
    {
      id: 'management',
      type: 'soap-section',
      component: (
        <SoapSectionInput
          title="4. Management"
          value={management}
          onChangeText={setManagement}
          onFormat={() => handleFormatSection('Management', management, setManagement)}
          onClear={() => handleClearSection('Management', setManagement)}
          onStartRecording={() => handleStartRecording('management')}
          isRecording={isRecording && activeRecordingSection === 'management'}
          isFormatting={formatingSections.management}
          placeholder="Treatment plan, medications, follow-up, patient education..."
          isCollapsed={collapsedSections.management}
          onToggleCollapse={() => toggleSection('management')}
        />
      ),
    },
    {
      id: 'save-button',
      type: 'save-button',
      component: (
        <TouchableOpacity
          style={[styles.saveButton, (!selectedPatient || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSaveAll}
          disabled={!selectedPatient || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save All Sections</Text>
          )}
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Afyascribe</Text>
        <Text style={styles.tagline}>Medical Transcription</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.component}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#0f766e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#d1fae5',
  },
  listContent: {
    paddingBottom: 20,
  },
  recordingBanner: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  recordingBannerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#0f766e',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
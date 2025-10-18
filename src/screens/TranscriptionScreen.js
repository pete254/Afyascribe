// src/screens/TranscriptionScreen.js - Complete Updated Version with Format All
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

export default function TranscriptionScreen({ 
  preselectedPatient, 
  onViewPatientHistory,
  onClearPatient 
}) {
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient || null);
  
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
  const [isFormattingAll, setIsFormattingAll] = useState(false);

  const {
    isRecording,
    isTranscribing,
    transcription,
    getCurrentTranscription,
    toggleRecording,
    clearTranscription,
  } = useAudioRecording();

  // Update selected patient when prop changes
  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatient(preselectedPatient);
    }
  }, [preselectedPatient]);

  // Handle transcription completion
  useEffect(() => {
    console.log('📝 Transcription useEffect triggered:', {
      transcription,
      isRecording,
      isTranscribing,
      activeSection: activeRecordingSection,
    });
    
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
      
      console.log('🧹 Clearing activeRecordingSection and transcription');
      setActiveRecordingSection(null);
      clearTranscription();
    }
  }, [transcription, activeRecordingSection]);

  const handleStartRecording = async (sectionName) => {
    console.log(`🎙️ START RECORDING for section: ${sectionName}`);
    
    if (isRecording) {
      console.log('⚠️ Already recording, stopping...');
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
      const { formatSoapSection } = require('../services/soapFormatter');
      
      console.log(`🔄 Formatting ${sectionTitle}...`);
      const formatted = await formatSoapSection(sectionTitle, sectionText);
      
      if (formatted && formatted.trim()) {
        setSectionText(formatted);
        console.log(`✅ ${sectionTitle} formatted successfully`);
      } else {
        console.log(`⚠️ Formatting returned empty for ${sectionTitle}`);
      }
    } catch (error) {
      console.error(`❌ Format error for ${sectionTitle}:`, error);
      Alert.alert('Error', `Failed to format: ${error.message}`);
    } finally {
      setFormatingSections((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  // 🆕 NEW: Format All Sections
  const handleFormatAll = async () => {
    const sectionsWithContent = [
      { title: 'Symptoms', text: symptoms, setter: setSymptoms, key: 'symptoms' },
      { title: 'Physical Examination', text: physicalExamination, setter: setPhysicalExamination, key: 'physicalExamination' },
      { title: 'Diagnosis', text: diagnosis, setter: setDiagnosis, key: 'diagnosis' },
      { title: 'Management', text: management, setter: setManagement, key: 'management' },
    ].filter(section => section.text.trim());

    if (sectionsWithContent.length === 0) {
      Alert.alert('Error', 'Please add content to at least one section before formatting');
      return;
    }

    setIsFormattingAll(true);

    try {
      const { formatSoapSection } = require('../services/soapFormatter');
      
      console.log(`🔄 Formatting ${sectionsWithContent.length} sections...`);
      
      // Format all sections sequentially
      for (const section of sectionsWithContent) {
        setFormatingSections((prev) => ({ ...prev, [section.key]: true }));
        
        try {
          const formatted = await formatSoapSection(section.title, section.text);
          
          if (formatted && formatted.trim()) {
            section.setter(formatted);
            console.log(`✅ ${section.title} formatted successfully`);
          }
        } catch (error) {
          console.error(`❌ Failed to format ${section.title}:`, error);
          // Continue with other sections even if one fails
        } finally {
          setFormatingSections((prev) => ({ ...prev, [section.key]: false }));
        }
      }
      
      Alert.alert('Success', `Formatted ${sectionsWithContent.length} section(s) with AI`);
    } catch (error) {
      console.error('❌ Format all error:', error);
      Alert.alert('Error', `Failed to format all sections: ${error.message}`);
    } finally {
      setIsFormattingAll(false);
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

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    if (onClearPatient) {
      onClearPatient();
    }
  };

  const handleSaveAll = async () => {
    console.log('💾 Save button pressed');
    console.log('Selected patient:', selectedPatient);
    console.log('Content:', {
      symptoms: symptoms.trim(),
      physicalExamination: physicalExamination.trim(),
      diagnosis: diagnosis.trim(),
      management: management.trim(),
    });

    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    // Check if at least one section has content
    const hasContent = symptoms.trim() || physicalExamination.trim() || diagnosis.trim() || management.trim();
    
    if (!hasContent) {
      Alert.alert('Error', 'Please add content to at least one section');
      return;
    }

    setIsSaving(true);

    try {
      const apiService = require('../services/apiService').default;
      
      // Ensure all fields are strings (even if empty)
      const soapNoteData = {
        patientId: selectedPatient.id,
        symptoms: symptoms.trim() || '',
        physicalExamination: physicalExamination.trim() || '',
        diagnosis: diagnosis.trim() || '',
        management: management.trim() || '',
      };

      console.log('💾 Saving SOAP note:', soapNoteData);
      
      const result = await apiService.createSoapNote(soapNoteData);
      console.log('✅ Save successful:', result);
      
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
              if (onClearPatient) {
                onClearPatient();
              }
            },
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('❌ Save error:', error);
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
        <>
          <PatientSearchBar
            selectedPatient={selectedPatient}
            onPatientSelect={handlePatientSelect}
          />
          
          {selectedPatient && (
            <View style={styles.patientHistoryBanner}>
              <View style={styles.patientHistoryInfo}>
                <Text style={styles.patientHistoryLabel}>📋 Patient Selected</Text>
                <Text style={styles.patientHistoryHint}>
                  View previous notes before adding new ones
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={() => onViewPatientHistory && onViewPatientHistory(selectedPatient)}
              >
                <Text style={styles.viewHistoryButtonText}>View History →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
      id: 'format-all-button',
      type: 'format-all-button',
      component: (
        <TouchableOpacity
          style={[
            styles.formatAllButton,
            (isFormattingAll || isRecording || 
             (!symptoms.trim() && !physicalExamination.trim() && !diagnosis.trim() && !management.trim())) 
            && styles.formatAllButtonDisabled
          ]}
          onPress={handleFormatAll}
          disabled={
            isFormattingAll || 
            isRecording || 
            (!symptoms.trim() && !physicalExamination.trim() && !diagnosis.trim() && !management.trim())
          }
        >
          {isFormattingAll ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.formatAllButtonText}>  Formatting...</Text>
            </>
          ) : (
            <>
              <Text style={styles.formatAllButtonIcon}>✨</Text>
              <Text style={styles.formatAllButtonText}>Format All Sections with AI</Text>
            </>
          )}
        </TouchableOpacity>
      ),
    },
    {
      id: 'save-button',
      type: 'save-button',
      component: (
        <TouchableOpacity
          style={[
            styles.saveButton, 
            (!selectedPatient || isSaving || isFormattingAll) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveAll}
          disabled={!selectedPatient || isSaving || isFormattingAll}
        >
          {isSaving ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.saveButtonText}>  Saving...</Text>
            </>
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
  patientHistoryBanner: {
    backgroundColor: '#dbeafe',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  patientHistoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientHistoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  patientHistoryHint: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 16,
  },
  viewHistoryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewHistoryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  // 🆕 NEW: Format All Button Styles
  formatAllButton: {
    backgroundColor: '#8b5cf6',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  formatAllButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  formatAllButtonIcon: {
    fontSize: 20,
  },
  formatAllButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
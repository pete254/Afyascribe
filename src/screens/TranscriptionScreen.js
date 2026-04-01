// src/screens/TranscriptionScreen.js
// UPDATED: Added "Billing" tab — doctors can bill patients from their service catalog.
// Bills must be paid at reception before the note can be finalised (enforced by banner).
import React, { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAudioRecording } from '../hooks/useAudioRecording';
import SoapSectionInput from '../components/SoapSectionInput';
import PatientSearchBar from '../components/PatientSearchBar';
import NoteDocumentsPanel from '../components/NoteDocumentsPanel';
import DocumentUploadWidget, { getCategoryInfo } from '../components/DocumentUploadWidget';
import TranscriptionBillingTab from '../components/TranscriptionBillingTab';

// ─── Draft list card ───────────────────────────────────────────────────────────
function DraftCard({ draft, onResume, onDelete }) {
  const patient = draft.patient;
  const updatedAt = new Date(draft.updatedAt);
  const timeAgo = (() => {
    const diffMs = Date.now() - updatedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return updatedAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  })();

  const preview = [
    draft.symptoms && `S: ${draft.symptoms}`,
    draft.physicalExamination && `O: ${draft.physicalExamination}`,
    draft.diagnosis && `A: ${draft.diagnosis}`,
  ].filter(Boolean).join(' · ').slice(0, 120);

  return (
    <View style={draftStyles.card}>
      <View style={draftStyles.cardTop}>
        <View style={draftStyles.avatar}>
          <Text style={draftStyles.avatarText}>
            {patient?.firstName?.[0]}{patient?.lastName?.[0]}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={draftStyles.patientName}>
            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
          </Text>
          <Text style={draftStyles.patientId}>{patient?.patientId}</Text>
        </View>
        <Text style={draftStyles.timeAgo}>{timeAgo}</Text>
      </View>

      {preview ? (
        <Text style={draftStyles.preview} numberOfLines={2}>{preview}</Text>
      ) : (
        <Text style={draftStyles.emptyPreview}>No content yet</Text>
      )}

      <View style={draftStyles.actions}>
        <TouchableOpacity style={draftStyles.resumeBtn} onPress={() => onResume(draft)}>
          <MaterialCommunityIcons name="pencil-outline" size={15} color="#0f766e" />
          <Text style={draftStyles.resumeBtnText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={draftStyles.deleteBtn} onPress={() => onDelete(draft)}>
          <MaterialCommunityIcons name="trash-can-outline" size={15} color="#dc2626" />
          <Text style={draftStyles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TranscriptionScreen({
  preselectedPatient,
  noteToEdit,
  visitContext,     // PatientVisit passed from MyQueueScreen
  onViewPatientHistory,
  onClearPatient,
  onClearNote,
}) {
  // 'new' | 'billing' | 'drafts'
  const [activeTab, setActiveTab] = useState('new');

  // Form state
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient || null);
  const [symptoms, setSymptoms] = useState('');
  const [physicalExamination, setPhysicalExamination] = useState('');
  const [labInvestigations, setLabInvestigations] = useState('');
  const [imaging, setImaging] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [management, setManagement] = useState('');
  const [selectedIcd10Code, setSelectedIcd10Code] = useState(null);
  const [activeRecordingSection, setActiveRecordingSection] = useState(null);
  const [formatingSections, setFormatingSections] = useState({
    symptoms: false, physicalExamination: false, labInvestigations: false,
    imaging: false, diagnosis: false, management: false,
  });
  const [collapsedSections, setCollapsedSections] = useState({
    symptoms: false, physicalExamination: false, labInvestigations: false,
    imaging: false, diagnosis: false, management: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFormattingAll, setIsFormattingAll] = useState(false);

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsRefreshing, setDraftsRefreshing] = useState(false);

  // Pending docs for brand-new notes
  const [pendingDocs, setPendingDocs] = useState([]);

  // Billing unpaid flag (from billing tab callback)
  const [hasUnpaidBills, setHasUnpaidBills] = useState(false);

  const removePendingDoc = (localId) => {
    setPendingDocs(prev => prev.filter(d => d.localId !== localId));
  };

  const {
    isRecording,
    isTranscribing,
    transcription,
    getCurrentTranscription,
    toggleRecording,
    clearTranscription,
  } = useAudioRecording();

  // Sync preselectedPatient
  useEffect(() => {
    if (preselectedPatient) setSelectedPatient(preselectedPatient);
  }, [preselectedPatient]);

  // Handle transcription completion
  useEffect(() => {
    if (transcription && transcription.trim() && activeRecordingSection) {
      switch (activeRecordingSection) {
        case 'symptoms':
          setSymptoms(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
        case 'physicalExamination':
          setPhysicalExamination(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
        case 'labInvestigations':
          setLabInvestigations(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
        case 'imaging':
          setImaging(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
        case 'diagnosis':
          setDiagnosis(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
        case 'management':
          setManagement(prev => prev ? `${prev}\n\n${transcription}` : transcription);
          break;
      }
      setActiveRecordingSection(null);
      clearTranscription();
    }
  }, [transcription, activeRecordingSection]);

  // Handle noteToEdit
  useEffect(() => {
    if (noteToEdit) {
      setSymptoms(noteToEdit.symptoms || '');
      setPhysicalExamination(noteToEdit.physicalExamination || '');
      setLabInvestigations(noteToEdit.labInvestigations || '');
      setImaging(noteToEdit.imaging || '');
      setDiagnosis(noteToEdit.diagnosis || '');
      setManagement(noteToEdit.management || '');
      if (noteToEdit.icd10Code) {
        setSelectedIcd10Code({ code: noteToEdit.icd10Code, short_description: noteToEdit.icd10Description || '' });
      }
      setCurrentDraftId(noteToEdit.id);
      setActiveTab('new');
    }
  }, [noteToEdit]);

  // Load drafts
  const loadDrafts = useCallback(async (silent = false) => {
    if (!silent) setDraftsLoading(true);
    try {
      const apiService = require('../services/apiService').default;
      const data = await apiService.getMyDrafts();
      setDrafts(data ?? []);
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setDraftsLoading(false);
      setDraftsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'drafts') loadDrafts();
  }, [activeTab]);

  // Helpers
  const getSectionKey = (title) => {
    if (title.includes('Symptoms')) return 'symptoms';
    if (title.includes('Physical')) return 'physicalExamination';
    if (title.includes('Lab')) return 'labInvestigations';
    if (title.includes('Imaging')) return 'imaging';
    if (title.includes('Diagnosis')) return 'diagnosis';
    if (title.includes('Management')) return 'management';
    return '';
  };

  const clearForm = () => {
    setSymptoms(''); setPhysicalExamination(''); setLabInvestigations('');
    setImaging(''); setDiagnosis(''); setManagement('');
    setSelectedIcd10Code(null); setCurrentDraftId(null);
    setSelectedPatient(null); setPendingDocs([]);
    setHasUnpaidBills(false);
    onClearPatient?.();
    onClearNote?.();
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    if (onClearNote && noteToEdit && noteToEdit.patient?.id !== patient?.id) {
      onClearNote();
      setSymptoms(''); setPhysicalExamination(''); setLabInvestigations('');
      setImaging(''); setDiagnosis(''); setSelectedIcd10Code(null); setManagement('');
    }
  };

  const handleIcd10Select = (code) => setSelectedIcd10Code(code);
  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const handleStartRecording = async (sectionName) => {
    if (isRecording) {
      await toggleRecording();
    } else {
      setActiveRecordingSection(sectionName);
      await toggleRecording();
    }
  };

  const handleClearSection = (sectionTitle, setSectionText) => {
    Alert.alert('Clear Section', `Clear ${sectionTitle}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setSectionText('') },
    ]);
  };

  const handleFormatSection = async (sectionTitle, sectionText, setSectionText) => {
    if (!sectionText.trim()) { Alert.alert('Error', `Add text to ${sectionTitle} first`); return; }
    const sectionKey = getSectionKey(sectionTitle);
    setFormatingSections(prev => ({ ...prev, [sectionKey]: true }));
    try {
      const { formatSoapSection } = require('../services/soapFormatter');
      const formatted = await formatSoapSection(sectionTitle, sectionText);
      if (formatted && formatted.trim()) setSectionText(formatted);
    } catch (error) {
      Alert.alert('Error', `Failed to format: ${error.message}`);
    } finally {
      setFormatingSections(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  const handleFormatAll = async () => {
    const sectionsWithContent = [
      { title: 'Symptoms', text: symptoms, setter: setSymptoms, key: 'symptoms' },
      { title: 'Physical Examination', text: physicalExamination, setter: setPhysicalExamination, key: 'physicalExamination' },
      { title: 'Lab Investigations', text: labInvestigations, setter: setLabInvestigations, key: 'labInvestigations' },
      { title: 'Imaging', text: imaging, setter: setImaging, key: 'imaging' },
      { title: 'Diagnosis', text: diagnosis, setter: setDiagnosis, key: 'diagnosis' },
      { title: 'Management', text: management, setter: setManagement, key: 'management' },
    ].filter(s => s.text.trim());

    if (sectionsWithContent.length === 0) { Alert.alert('Error', 'Add content to at least one section first'); return; }

    setIsFormattingAll(true);
    try {
      const { formatSoapSection } = require('../services/soapFormatter');
      for (const section of sectionsWithContent) {
        setFormatingSections(prev => ({ ...prev, [section.key]: true }));
        try {
          const formatted = await formatSoapSection(section.title, section.text);
          if (formatted && formatted.trim()) section.setter(formatted);
        } catch (e) { console.error(`Failed to format ${section.title}:`, e); }
        finally { setFormatingSections(prev => ({ ...prev, [section.key]: false })); }
      }
      Alert.alert('Done', `Formatted ${sectionsWithContent.length} section(s) with AI`);
    } catch (error) {
      Alert.alert('Error', `Format all failed: ${error.message}`);
    } finally {
      setIsFormattingAll(false);
    }
  };

  // Upload pending docs after a note is saved
  const uploadPendingDocs = async (patientId, soapNoteId) => {
    if (pendingDocs.length === 0) return;
    const apiService = require('../services/apiService').default;
    for (const doc of pendingDocs) {
      try {
        await apiService.uploadSoapNoteDocument(patientId, soapNoteId, doc);
      } catch (e) {
        console.error(`Failed to upload pending doc "${doc.documentName}":`, e.message);
      }
    }
    setPendingDocs([]);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedPatient) { Alert.alert('Missing', 'Please select a patient first'); return; }
    setIsSavingDraft(true);
    try {
      const apiService = require('../services/apiService').default;
      const fields = {
        symptoms: symptoms.trim(), physicalExamination: physicalExamination.trim(),
        labInvestigations: labInvestigations.trim(), imaging: imaging.trim(),
        diagnosis: diagnosis.trim(), icd10Code: selectedIcd10Code?.code || null,
        icd10Description: selectedIcd10Code?.short_description || null,
        management: management.trim(),
      };
      let saved;
      if (currentDraftId) {
        saved = await apiService.updateDraft(currentDraftId, selectedPatient.id, fields);
      } else {
        saved = await apiService.createDraft(selectedPatient.id, fields);
        setCurrentDraftId(saved.id);
        if (pendingDocs.length > 0) {
          await uploadPendingDocs(selectedPatient.id, saved.id);
        }
      }
      Alert.alert('Draft Saved 📝', `Draft saved for ${selectedPatient.firstName} ${selectedPatient.lastName}.`, [{ text: 'OK' }]);
    } catch (e) {
      Alert.alert('Error', `Failed to save draft: ${e.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Save Final
  const handleSaveAll = async () => {
    if (!selectedPatient) { Alert.alert('Error', 'Please select a patient first'); return; }
    const hasContent = symptoms.trim() || physicalExamination.trim() || labInvestigations.trim() ||
      imaging.trim() || diagnosis.trim() || management.trim();
    if (!hasContent) { Alert.alert('Error', 'Add content to at least one section'); return; }

    // Warn if unpaid bills — note will be saved as draft anyway
    if (hasUnpaidBills) {
      Alert.alert(
        'Unpaid Bills',
        'This patient has unpaid bills. The note will be saved as a draft. Ask the receptionist to collect payment, then return here to finalise.',
        [
          { text: 'Save as Draft', onPress: handleSaveDraft },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    setIsSaving(true);
    try {
      const apiService = require('../services/apiService').default;
      const soapNoteData = {
        patientId: selectedPatient.id,
        symptoms: symptoms.trim() || '',
        physicalExamination: physicalExamination.trim() || '',
        labInvestigations: labInvestigations.trim() || '',
        imaging: imaging.trim() || '',
        diagnosis: diagnosis.trim() || '',
        icd10Code: selectedIcd10Code?.code || null,
        icd10Description: selectedIcd10Code?.short_description || null,
        management: management.trim() || '',
      };

      let result;
      if (currentDraftId) {
        result = await apiService.finaliseDraft(currentDraftId, selectedPatient.id, soapNoteData);
      } else {
        result = await apiService.createSoapNote(soapNoteData);
      }

      if (result?.id && pendingDocs.length > 0) {
        await uploadPendingDocs(selectedPatient.id, result.id);
      }

      Alert.alert('Success', 'SOAP note saved successfully!', [
        {
          text: 'New Note',
          onPress: () => {
            setSymptoms(''); setPhysicalExamination(''); setLabInvestigations('');
            setImaging(''); setDiagnosis(''); setSelectedIcd10Code(null);
            setManagement(''); setCurrentDraftId(null); setPendingDocs([]);
            setSelectedPatient(null); setHasUnpaidBills(false);
            if (onClearPatient) onClearPatient();
          },
        },
        { text: 'OK' },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Resume Draft
  const handleResumeDraft = (draft) => {
    setSelectedPatient(draft.patient);
    setSymptoms(draft.symptoms ?? '');
    setPhysicalExamination(draft.physicalExamination ?? '');
    setLabInvestigations(draft.labInvestigations ?? '');
    setImaging(draft.imaging ?? '');
    setDiagnosis(draft.diagnosis ?? '');
    setManagement(draft.management ?? '');
    if (draft.icd10Code) setSelectedIcd10Code({ code: draft.icd10Code, short_description: draft.icd10Description });
    setCurrentDraftId(draft.id);
    setPendingDocs([]);
    setActiveTab('new');
  };

  // Delete Draft
  const handleDeleteDraft = (draft) => {
    Alert.alert('Delete Draft', `Delete draft for ${draft.patient?.firstName} ${draft.patient?.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const apiService = require('../services/apiService').default;
            await apiService.deleteDraft(draft.id);
            setDrafts(prev => prev.filter(d => d.id !== draft.id));
            if (currentDraftId === draft.id) { setCurrentDraftId(null); clearForm(); }
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  // Sections list for the New Note tab
  const sections = [
    {
      id: 'patient-search',
      type: 'patient-search',
      component: (
        <>
          <PatientSearchBar selectedPatient={selectedPatient} onPatientSelect={handlePatientSelect} />
          {selectedPatient && (
            <View style={styles.patientHistoryBanner}>
              <View style={styles.bannerIconContainer}>
                <Ionicons name="time-outline" size={20} color="#3b82f6" />
              </View>
              <View style={styles.patientHistoryInfo}>
                <Text style={styles.patientHistoryLabel}>Patient History Available</Text>
                <Text style={styles.patientHistoryHint}>View {selectedPatient.firstName}'s previous notes</Text>
              </View>
              <TouchableOpacity
                style={styles.viewHistoryButton}
                onPress={() => onViewPatientHistory && onViewPatientHistory(selectedPatient)}
              >
                <Text style={styles.viewHistoryButtonText}>View</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
          {currentDraftId && (
            <View style={styles.draftResumeBanner}>
              <MaterialCommunityIcons name="pencil-box-outline" size={18} color="#b45309" />
              <Text style={styles.draftResumeBannerText}>Editing a saved draft</Text>
              <TouchableOpacity onPress={clearForm}>
                <Text style={styles.draftResumeDiscard}>Discard</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Unpaid bills warning on new-note tab */}
          {hasUnpaidBills && (
            <TouchableOpacity
              style={styles.unpaidWarningBanner}
              onPress={() => setActiveTab('billing')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="cash-clock" size={18} color="#b45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.unpaidWarningTitle}>Unpaid Bills — Note saved as draft</Text>
                <Text style={styles.unpaidWarningBody}>Tap to view billing details →</Text>
              </View>
            </TouchableOpacity>
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
            <><ActivityIndicator color="#ffffff" size="small" /><Text style={styles.recordingBannerText}>Converting speech to text...</Text></>
          ) : (
            <><MaterialCommunityIcons name="record-circle" size={16} color="#ffffff" /><Text style={styles.recordingBannerText}>Recording {activeRecordingSection}...</Text></>
          )}
        </View>
      ),
    },
    {
      id: 'symptoms', type: 'soap-section',
      component: <SoapSectionInput title="1. Symptoms & History" value={symptoms} onChangeText={setSymptoms}
        onFormat={() => handleFormatSection('Symptoms', symptoms, setSymptoms)}
        onClear={() => handleClearSection('Symptoms', setSymptoms)}
        onStartRecording={() => handleStartRecording('symptoms')}
        isRecording={isRecording && activeRecordingSection === 'symptoms'}
        isFormatting={formatingSections.symptoms}
        placeholder="What does the patient report? Symptoms, concerns, history..."
        isCollapsed={collapsedSections.symptoms} onToggleCollapse={() => toggleSection('symptoms')} />,
    },
    {
      id: 'physicalExamination', type: 'soap-section',
      component: <SoapSectionInput title="2. Physical Examination" value={physicalExamination} onChangeText={setPhysicalExamination}
        onFormat={() => handleFormatSection('Physical Examination', physicalExamination, setPhysicalExamination)}
        onClear={() => handleClearSection('Physical Examination', setPhysicalExamination)}
        onStartRecording={() => handleStartRecording('physicalExamination')}
        isRecording={isRecording && activeRecordingSection === 'physicalExamination'}
        isFormatting={formatingSections.physicalExamination}
        placeholder="Measurable findings, vitals, exam results, observations..."
        isCollapsed={collapsedSections.physicalExamination} onToggleCollapse={() => toggleSection('physicalExamination')} />,
    },
    {
      id: 'labInvestigations', type: 'soap-section',
      component: <SoapSectionInput title="3. Lab Investigations 🧪" value={labInvestigations} onChangeText={setLabInvestigations}
        onFormat={() => handleFormatSection('Lab Investigations', labInvestigations, setLabInvestigations)}
        onClear={() => handleClearSection('Lab Investigations', setLabInvestigations)}
        onStartRecording={() => handleStartRecording('labInvestigations')}
        isRecording={isRecording && activeRecordingSection === 'labInvestigations'}
        isFormatting={formatingSections.labInvestigations}
        placeholder="Lab tests ordered, results, values, interpretations..."
        isCollapsed={collapsedSections.labInvestigations} onToggleCollapse={() => toggleSection('labInvestigations')} />,
    },
    {
      id: 'imaging', type: 'soap-section',
      component: <SoapSectionInput title="4. Imaging 📸" value={imaging} onChangeText={setImaging}
        onFormat={() => handleFormatSection('Imaging', imaging, setImaging)}
        onClear={() => handleClearSection('Imaging', setImaging)}
        onStartRecording={() => handleStartRecording('imaging')}
        isRecording={isRecording && activeRecordingSection === 'imaging'}
        isFormatting={formatingSections.imaging}
        placeholder="Imaging studies ordered, findings, impressions..."
        isCollapsed={collapsedSections.imaging} onToggleCollapse={() => toggleSection('imaging')} />,
    },
    {
      id: 'diagnosis', type: 'soap-section',
      component: <SoapSectionInput title="5. Diagnosis" value={diagnosis} onChangeText={setDiagnosis}
        onFormat={() => handleFormatSection('Diagnosis', diagnosis, setDiagnosis)}
        onClear={() => handleClearSection('Diagnosis', setDiagnosis)}
        onStartRecording={() => handleStartRecording('diagnosis')}
        isRecording={isRecording && activeRecordingSection === 'diagnosis'}
        isFormatting={formatingSections.diagnosis}
        placeholder="Clinical diagnosis, assessment, differential diagnosis..."
        isCollapsed={collapsedSections.diagnosis} onToggleCollapse={() => toggleSection('diagnosis')}
        showIcd10Search={true} selectedIcd10Code={selectedIcd10Code} onIcd10Select={handleIcd10Select} />,
    },
    {
      id: 'management', type: 'soap-section',
      component: <SoapSectionInput title="6. Management" value={management} onChangeText={setManagement}
        onFormat={() => handleFormatSection('Management', management, setManagement)}
        onClear={() => handleClearSection('Management', setManagement)}
        onStartRecording={() => handleStartRecording('management')}
        isRecording={isRecording && activeRecordingSection === 'management'}
        isFormatting={formatingSections.management}
        placeholder="Treatment plan, medications, follow-up, patient education..."
        isCollapsed={collapsedSections.management} onToggleCollapse={() => toggleSection('management')} />,
    },
    {
      id: 'attachments',
      type: 'attachments',
      component: (
        <View style={{ marginHorizontal: 16, marginVertical: 8 }}>
          <View style={{
            backgroundColor: '#ffffff', borderRadius: 12,
            borderWidth: 1, borderColor: '#e5e7eb', padding: 16, elevation: 2,
          }}>
            {currentDraftId ? (
              <NoteDocumentsPanel
                soapNoteId={currentDraftId}
                patientId={selectedPatient?.id}
                editable={true}
              />
            ) : (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <MaterialCommunityIcons name="paperclip" size={15} color="#0f766e" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>Attachments</Text>
                  {pendingDocs.length > 0 && (
                    <View style={{ backgroundColor: '#ccfbf1', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f766e' }}>
                        {pendingDocs.length} pending
                      </Text>
                    </View>
                  )}
                </View>

                {pendingDocs.map((doc) => {
                  const cat = getCategoryInfo(doc.category);
                  return (
                    <View key={doc.localId} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
                      borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 8,
                    }}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 8,
                        backgroundColor: cat.color + '20',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Ionicons name={cat.icon} size={16} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>
                          {doc.documentName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{cat.label}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removePendingDoc(doc.localId)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                <DocumentUploadWidget
                  onFileReady={(fileObj) => {
                    setPendingDocs(prev => [...prev, { ...fileObj, localId: Date.now().toString() }]);
                  }}
                  compact={pendingDocs.length > 0}
                />
              </View>
            )}
          </View>
        </View>
      ),
    },
    {
      id: 'format-all-button', type: 'format-all-button',
      component: (
        <TouchableOpacity
          style={[styles.formatAllButton,
            (isFormattingAll || isRecording ||
              (!symptoms.trim() && !physicalExamination.trim() && !labInvestigations.trim() &&
               !imaging.trim() && !diagnosis.trim() && !management.trim())) && styles.formatAllButtonDisabled,
          ]}
          onPress={handleFormatAll}
          disabled={isFormattingAll || isRecording ||
            (!symptoms.trim() && !physicalExamination.trim() && !labInvestigations.trim() &&
             !imaging.trim() && !diagnosis.trim() && !management.trim())}
        >
          {isFormattingAll ? (
            <><ActivityIndicator color="#ffffff" size="small" /><Text style={styles.formatAllButtonText}>  Formatting...</Text></>
          ) : (
            <><Ionicons name="sparkles" size={20} color="#ffffff" /><Text style={styles.formatAllButtonText}>Format All Sections with AI</Text></>
          )}
        </TouchableOpacity>
      ),
    },
    {
      id: 'action-buttons', type: 'action-buttons',
      component: (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.saveDraftButton, (!selectedPatient || isSavingDraft || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSaveDraft}
            disabled={!selectedPatient || isSavingDraft || isSaving}
          >
            {isSavingDraft ? (
              <ActivityIndicator color="#0f766e" size="small" />
            ) : (
              <><MaterialCommunityIcons name="content-save-outline" size={18} color="#0f766e" /><Text style={styles.saveDraftButtonText}>Save Draft</Text></>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, (!selectedPatient || isSaving || isFormattingAll) && styles.saveButtonDisabled]}
            onPress={handleSaveAll}
            disabled={!selectedPatient || isSaving || isFormattingAll || isSavingDraft}
          >
            {isSaving ? (
              <><ActivityIndicator color="#ffffff" size="small" /><Text style={styles.saveButtonText}>  Saving...</Text></>
            ) : (
              <><Ionicons name="save-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {hasUnpaidBills ? '  Save as Draft' : currentDraftId ? '  Finalise Note' : '  Save SOAP Note'}
                </Text></>
            )}
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  // ── Effective visitContext: from prop or from noteToEdit's patient ────────────
  const effectiveVisit = visitContext || null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Afyascribe</Text>
        <Text style={styles.tagline}>Fast, Accurate Medical Notes</Text>
      </View>

      {/* ── Tab switcher ── */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'new' && styles.tabBtnActive]}
          onPress={() => setActiveTab('new')}
        >
          <MaterialCommunityIcons name="microphone" size={16} color={activeTab === 'new' ? '#0f766e' : '#94a3b8'} />
          <Text style={[styles.tabBtnText, activeTab === 'new' && styles.tabBtnTextActive]}>New Note</Text>
        </TouchableOpacity>

        {/* Billing tab — always shown */}
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]}
          onPress={() => setActiveTab('billing')}
        >
          <MaterialCommunityIcons
            name="cash-register"
            size={16}
            color={activeTab === 'billing' ? '#0f766e' : '#94a3b8'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'billing' && styles.tabBtnTextActive]}>
            Billing
          </Text>
          {hasUnpaidBills && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'drafts' && styles.tabBtnActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <MaterialCommunityIcons name="pencil-box-multiple-outline" size={16} color={activeTab === 'drafts' ? '#0f766e' : '#94a3b8'} />
          <Text style={[styles.tabBtnText, activeTab === 'drafts' && styles.tabBtnTextActive]}>
            Drafts{drafts.length > 0 ? ` (${drafts.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── New Note tab ── */}
      {activeTab === 'new' && (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => item.component}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled={true}
        />
      )}

      {/* ── Billing tab ── */}
      {activeTab === 'billing' && (
        <TranscriptionBillingTab
          visitContext={effectiveVisit}
          selectedPatient={selectedPatient}
          onUnpaidBillsChange={setHasUnpaidBills}
        />
      )}

      {/* ── Drafts tab ── */}
      {activeTab === 'drafts' && (
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DraftCard draft={item} onResume={handleResumeDraft} onDelete={handleDeleteDraft} />
          )}
          contentContainerStyle={styles.draftsListContent}
          refreshControl={
            <RefreshControl
              refreshing={draftsRefreshing}
              onRefresh={() => { setDraftsRefreshing(true); loadDrafts(true); }}
              tintColor="#0f766e"
            />
          }
          ListHeaderComponent={draftsLoading ? (
            <View style={styles.draftsLoading}>
              <ActivityIndicator color="#0f766e" />
              <Text style={styles.draftsLoadingText}>Loading drafts...</Text>
            </View>
          ) : null}
          ListEmptyComponent={!draftsLoading ? (
            <View style={styles.draftsEmpty}>
              <MaterialCommunityIcons name="pencil-box-outline" size={52} color="#cbd5e1" />
              <Text style={styles.draftsEmptyTitle}>No drafts yet</Text>
              <Text style={styles.draftsEmptySubtitle}>
                Tap "Save Draft" while writing a note to pause and resume it later.
              </Text>
            </View>
          ) : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#0f766e', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#d1fae5' },

  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4,
    position: 'relative',
  },
  tabBtnActive: { borderBottomColor: '#0f766e' },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
  tabBtnTextActive: { color: '#0f766e', fontWeight: '700' },
  tabBadge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#dc2626',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  listContent: { paddingBottom: 20 },
  draftsListContent: { padding: 16, paddingBottom: 40 },

  patientHistoryBanner: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#3b82f6',
  },
  bannerIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  patientHistoryInfo: { flex: 1 },
  patientHistoryLabel: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 2 },
  patientHistoryHint: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  viewHistoryButton: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewHistoryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  draftResumeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  draftResumeBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#b45309' },
  draftResumeDiscard: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  unpaidWarningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: '#fde68a',
  },
  unpaidWarningTitle: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  unpaidWarningBody: { fontSize: 12, color: '#92400e', marginTop: 2 },

  recordingBanner: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  recordingBannerText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  formatAllButton: {
    backgroundColor: '#8b5cf6', marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    gap: 8,
  },
  formatAllButtonDisabled: { backgroundColor: '#9ca3af' },
  formatAllButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  actionButtonsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginVertical: 24 },
  saveDraftButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 12, height: 52,
    borderWidth: 2, borderColor: '#0f766e',
  },
  saveDraftButtonText: { color: '#0f766e', fontWeight: '700', fontSize: 15 },
  saveButton: {
    flex: 2, backgroundColor: '#0f766e', borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    flexDirection: 'row',
  },
  saveButtonDisabled: { backgroundColor: '#9ca3af' },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  draftsLoading: { alignItems: 'center', paddingTop: 40, gap: 12 },
  draftsLoadingText: { color: '#64748b', fontSize: 14 },
  draftsEmpty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  draftsEmptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155' },
  draftsEmptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});

const draftStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#b45309' },
  patientName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  timeAgo: { fontSize: 12, color: '#94a3b8' },
  preview: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 12 },
  emptyPreview: { fontSize: 13, color: '#cbd5e1', fontStyle: 'italic', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 8, justifyContent: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  resumeBtnText: { fontSize: 13, fontWeight: '600', color: '#0f766e' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff1f2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#fecdd3' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
});
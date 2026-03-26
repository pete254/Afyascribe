// src/screens/PatientHistoryScreen.js
// UPDATED: Hybrid documents view - per-note attachments in timeline + "All Documents" tab
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import NoteDocumentsPanel from '../components/NoteDocumentsPanel';
import { getCategoryInfo } from '../components/DocumentUploadWidget';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Zoomable image viewer ─────────────────────────────────────────────────────
function ImageViewer({ uri, fileName, onClose }) {
  return (
    <View style={viewerS.container}>
      <View style={viewerS.topBar}>
        <Text style={viewerS.title} numberOfLines={1}>{fileName}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={viewerS.closeBtnCircle}>
            <Ionicons name="close" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
      <Text style={viewerS.hint}>Pinch to zoom</Text>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={viewerS.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        <Image source={{ uri }} style={viewerS.image} resizeMode="contain" />
      </ScrollView>
    </View>
  );
}

// ── All Documents tab ─────────────────────────────────────────────────────────
function AllDocumentsTab({ patientId }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null);

  useEffect(() => {
    load();
  }, [patientId]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllPatientDocs(patientId);
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load all docs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (doc) => {
    if (doc.fileType === 'application/pdf') {
      Alert.alert('Open PDF', `Open "${doc.documentName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(doc.fileUrl) },
      ]);
      return;
    }
    setViewerDoc(doc);
  };

  if (loading) {
    return (
      <View style={allDocsS.center}>
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  if (docs.length === 0) {
    return (
      <View style={allDocsS.empty}>
        <MaterialCommunityIcons name="folder-open-outline" size={48} color="#cbd5e1" />
        <Text style={allDocsS.emptyTitle}>No documents</Text>
        <Text style={allDocsS.emptySub}>
          Documents added during onboarding or attached to notes will appear here
        </Text>
      </View>
    );
  }

  // Group by scope for visual separation
  const patientDocs = docs.filter((d) => d.scope === 'patient');
  const noteDocs    = docs.filter((d) => d.scope === 'soap_note');

  const renderDoc = (doc) => {
    const cat = getCategoryInfo(doc.category);
    const isImage = doc.fileType?.startsWith('image/');
    return (
      <TouchableOpacity key={doc.id} style={allDocsS.docCard} onPress={() => handleView(doc)} activeOpacity={0.8}>
        <View style={allDocsS.thumb}>
          {isImage ? (
            <Image source={{ uri: doc.fileUrl }} style={allDocsS.thumbImg} resizeMode="cover" />
          ) : (
            <View style={allDocsS.thumbPdf}>
              <MaterialCommunityIcons name="file-pdf-box" size={26} color="#dc2626" />
            </View>
          )}
        </View>
        <View style={allDocsS.info}>
          <Text style={allDocsS.docName} numberOfLines={1}>{doc.documentName}</Text>
          <View style={allDocsS.metaRow}>
            <View style={[allDocsS.catBadge, { backgroundColor: cat.color + '18' }]}>
              <Ionicons name={cat.icon} size={10} color={cat.color} />
              <Text style={[allDocsS.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {doc.scope === 'soap_note' && (
              <View style={allDocsS.noteBadge}>
                <Text style={allDocsS.noteBadgeText}>Note</Text>
              </View>
            )}
          </View>
          <Text style={allDocsS.date}>
            {new Date(doc.createdAt).toLocaleDateString('en-KE', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
        <Ionicons name={isImage ? 'expand-outline' : 'open-outline'} size={16} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={allDocsS.scroll} showsVerticalScrollIndicator={false}>
      {patientDocs.length > 0 && (
        <View style={allDocsS.group}>
          <Text style={allDocsS.groupLabel}>
            <MaterialCommunityIcons name="account-circle-outline" size={13} color="#0f766e" />
            {'  '}Patient Documents
          </Text>
          {patientDocs.map(renderDoc)}
        </View>
      )}
      {noteDocs.length > 0 && (
        <View style={allDocsS.group}>
          <Text style={allDocsS.groupLabel}>
            <MaterialCommunityIcons name="note-text-outline" size={13} color="#7c3aed" />
            {'  '}Note Attachments
          </Text>
          {noteDocs.map(renderDoc)}
        </View>
      )}

      {/* Full-screen viewer */}
      <Modal
        visible={!!viewerDoc}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setViewerDoc(null)}
        statusBarTranslucent
      >
        {viewerDoc && (
          <ImageViewer
            uri={viewerDoc.fileUrl}
            fileName={viewerDoc.documentName}
            onClose={() => setViewerDoc(null)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PatientHistoryScreen({ patient, onBack, onAddNewNote, onEditWithVoice }) {
  const { user } = useAuth();
  const [notes, setNotes]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedData, setEditedData]     = useState({
    symptoms: '', physicalExamination: '', labInvestigations: '',
    imaging: '', diagnosis: '', icd10Code: '', icd10Description: '', management: '',
  });
  const [showEditHistory, setShowEditHistory] = useState({});
  const [activeTab, setActiveTab]       = useState('timeline'); // 'timeline' | 'all-docs'

  useEffect(() => {
    if (patient?.id) loadPatientHistory();
    else { Alert.alert('Error', 'Invalid patient data.'); setLoading(false); }
  }, [patient]);

  const loadPatientHistory = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPatientHistory(patient.id);
      setNotes(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load patient history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditedData({
      symptoms: note.symptoms, physicalExamination: note.physicalExamination,
      labInvestigations: note.labInvestigations || '', imaging: note.imaging || '',
      diagnosis: note.diagnosis, icd10Code: note.icd10Code || '',
      icd10Description: note.icd10Description || '', management: note.management,
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditedData({
      symptoms: '', physicalExamination: '', labInvestigations: '',
      imaging: '', diagnosis: '', icd10Code: '', icd10Description: '', management: '',
    });
  };

  const saveEdit = async (noteId) => {
    try {
      await apiService.editSoapNoteWithHistory(noteId, editedData);
      Alert.alert('Success', 'Note updated successfully');
      await loadPatientHistory();
      setEditingNoteId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const toggleEditHistory = (noteId) => {
    setShowEditHistory((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ── Note card ──────────────────────────────────────────────────────────────
  const renderNoteCard = ({ item }) => {
    const isEditing = editingNoteId === item.id;

    return (
      <View style={styles.noteCard}>
        {/* Header */}
        <View style={styles.noteHeader}>
          <View style={styles.noteHeaderLeft}>
            <View style={styles.doctorNameRow}>
              <Ionicons name="medical-outline" size={18} color="#0f766e" />
              <Text style={styles.doctorName}>
                Dr. {item.createdBy?.firstName} {item.createdBy?.lastName}
              </Text>
            </View>
            <View style={styles.noteDateRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.lastEditedByName && (
              <View style={styles.editedLabelRow}>
                <Ionicons name="create-outline" size={14} color="#d97706" />
                <Text style={styles.editedLabel}>
                  Edited by {item.lastEditedByName} · {formatDate(item.lastEditedAt)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.noteHeaderRight}>
            {!isEditing && onEditWithVoice && (
              <TouchableOpacity style={styles.voiceEditButton} onPress={() => onEditWithVoice(item)}>
                <Ionicons name="mic-outline" size={16} color="#ffffff" />
                <Text style={styles.voiceEditButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {!isEditing && (
              <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
                <Ionicons name="create-outline" size={16} color="#0f766e" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SOAP content or edit form */}
        {isEditing ? (
          <ScrollView style={styles.editForm} nestedScrollEnabled>
            {[
              ['Symptoms & History', 'symptoms', 'Symptoms...'],
              ['Physical Examination', 'physicalExamination', 'Physical examination...'],
              ['Lab Investigations', 'labInvestigations', 'Lab results...'],
              ['Imaging', 'imaging', 'Imaging findings...'],
              ['Diagnosis', 'diagnosis', 'Diagnosis...'],
              ['ICD-10 Code', 'icd10Code', 'e.g. J18.9'],
              ['ICD-10 Description', 'icd10Description', 'ICD-10 description'],
              ['Management', 'management', 'Management plan...'],
            ].map(([label, key, ph]) => (
              <View key={key}>
                <Text style={styles.sectionLabel}>{label}</Text>
                <TextInput
                  style={styles.editInput}
                  value={editedData[key]}
                  onChangeText={(text) => setEditedData((prev) => ({ ...prev, [key]: text }))}
                  multiline={key !== 'icd10Code' && key !== 'icd10Description'}
                  placeholder={ph}
                />
              </View>
            ))}

            {/* ── Note attachments while editing ── */}
            <Text style={styles.sectionLabel}>Attachments</Text>
            <NoteDocumentsPanel
              soapNoteId={item.id}
              patientId={patient?.id}
              editable={true}
            />

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={() => saveEdit(item.id)}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                <Ionicons name="close-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.noteContent}>
            {/* SOAP sections */}
            {[
              { icon: 'chatbox-ellipses-outline', title: 'Symptoms & History',    value: item.symptoms },
              { icon: 'body-outline',             title: 'Physical Examination',  value: item.physicalExamination },
              { icon: 'flask-outline',            title: 'Lab Investigations',    value: item.labInvestigations },
              { icon: 'image-outline',            title: 'Imaging',              value: item.imaging },
              { icon: 'medical-outline',          title: 'Diagnosis',            value: item.diagnosis },
              { icon: 'list-outline',             title: 'Management',           value: item.management },
            ].map(({ icon, title, value }) =>
              value ? (
                <View key={title} style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name={icon} size={18} color="#0f766e" />
                    <Text style={styles.sectionTitle}>{title}</Text>
                  </View>
                  <Text style={styles.sectionText}>{value}</Text>
                  {title === 'Diagnosis' && item.icd10Code && (
                    <View style={styles.icd10Badge}>
                      <Ionicons name="clipboard-outline" size={16} color="#065f46" />
                      <Text style={styles.icd10BadgeText}>
                        ICD-10: {item.icd10Code} — {item.icd10Description}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null
            )}

            {/* ── Note attachments (view-only in timeline) ── */}
            <View style={styles.section}>
              <NoteDocumentsPanel
                soapNoteId={item.id}
                patientId={patient?.id}
                editable={false}
              />
            </View>

            {/* Edit history */}
            {item.editHistory?.length > 0 && (
              <View style={styles.editHistoryContainer}>
                <TouchableOpacity style={styles.editHistoryToggle} onPress={() => toggleEditHistory(item.id)}>
                  <Ionicons
                    name={showEditHistory[item.id] ? 'chevron-down-outline' : 'chevron-forward-outline'}
                    size={16} color="#6b7280"
                  />
                  <Text style={styles.editHistoryToggleText}>
                    {showEditHistory[item.id] ? 'Hide Edit History' : 'Show Edit History'}
                  </Text>
                </TouchableOpacity>
                {showEditHistory[item.id] && (
                  <View style={styles.editHistoryList}>
                    {item.editHistory.map((edit, index) => (
                      <View key={index} style={styles.editHistoryItem}>
                        <Ionicons name="time-outline" size={14} color="#6b7280" />
                        <Text style={styles.editHistoryText}>
                          {edit.editedByName} · {formatDate(edit.editedAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleRow}>
          <Ionicons name="time-outline" size={28} color="#ffffff" />
          <Text style={styles.title}>Patient History</Text>
        </View>
        <View style={styles.patientInfoRow}>
          <Ionicons name="person-circle-outline" size={24} color="#ffffff" />
          <View style={styles.patientInfoText}>
            <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
            <Text style={styles.patientId}>ID: {patient?.patientId}</Text>
          </View>
        </View>
        <View style={styles.notesCountRow}>
          <Ionicons name="document-text-outline" size={18} color="#d1fae5" />
          <Text style={styles.notesCount}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} on record
          </Text>
        </View>
        <TouchableOpacity style={styles.addNoteButton} onPress={() => onAddNewNote(patient)}>
          <Ionicons name="add-circle-outline" size={20} color="#0f766e" />
          <Text style={styles.addNoteButtonText}>Add New Note</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab switcher ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
          onPress={() => setActiveTab('timeline')}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={activeTab === 'timeline' ? '#0f766e' : '#94a3b8'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'timeline' && styles.tabBtnTextActive]}>
            Timeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all-docs' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all-docs')}
        >
          <MaterialCommunityIcons
            name="folder-multiple-outline"
            size={15}
            color={activeTab === 'all-docs' ? '#0f766e' : '#94a3b8'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'all-docs' && styles.tabBtnTextActive]}>
            All Documents
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading patient history...</Text>
        </View>
      ) : activeTab === 'all-docs' ? (
        <AllDocumentsTab patientId={patient?.id} />
      ) : (
        <>
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Notes Yet</Text>
              <Text style={styles.emptySubtitle}>No notes recorded for this patient yet</Text>
              <TouchableOpacity style={styles.addFirstNoteButton} onPress={() => onAddNewNote(patient)}>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.addFirstNoteButtonText}>Add First Note</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={notes}
              renderItem={renderNoteCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.notesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#0f766e',
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTop: { marginBottom: 12 },
  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  patientInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  patientInfoText: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: '600', color: '#ffffff' },
  patientId: { fontSize: 14, color: '#d1fae5' },
  notesCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  notesCount: { fontSize: 14, color: '#d1fae5' },
  addNoteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
  },
  addNoteButtonText: { color: '#0f766e', fontSize: 16, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4,
  },
  tabBtnActive: { borderBottomColor: '#0f766e' },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },
  tabBtnTextActive: { color: '#0f766e', fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  addFirstNoteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0f766e', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8,
  },
  addFirstNoteButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  notesList: { padding: 16 },

  // Note card
  noteCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  noteHeaderLeft: { flex: 1 },
  noteHeaderRight: { gap: 8 },
  doctorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  doctorName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  noteDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteDate: { fontSize: 13, color: '#6b7280' },
  editedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  editedLabel: { fontSize: 11, color: '#d97706' },
  voiceEditButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: '#0f766e', borderRadius: 6,
  },
  voiceEditButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: '#f3f4f6', borderRadius: 6,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },
  noteContent: { gap: 16 },
  section: { marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sectionText: { fontSize: 15, color: '#1f2937', lineHeight: 22 },
  icd10Badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: '#dcfce7', padding: 10, borderRadius: 6,
    borderLeftWidth: 3, borderLeftColor: '#0f766e',
  },
  icd10BadgeText: { fontSize: 13, fontWeight: '600', color: '#065f46', flex: 1 },

  // Edit form
  editForm: { maxHeight: 600 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  editInput: {
    backgroundColor: '#f9fafb', borderRadius: 8, padding: 12,
    fontSize: 15, color: '#1f2937', minHeight: 80,
    textAlignVertical: 'top', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  saveButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 8,
  },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  cancelButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8,
  },
  cancelButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  // Edit history
  editHistoryContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  editHistoryToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  editHistoryToggleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  editHistoryList: { marginTop: 8, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#e5e7eb' },
  editHistoryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  editHistoryText: { fontSize: 12, color: '#6b7280' },
});

// ── All Docs styles ───────────────────────────────────────────────────────────
const allDocsS = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 16, paddingBottom: 40 },
  group: { marginBottom: 20 },
  groupLabel: {
    fontSize: 12, fontWeight: '700', color: '#0f766e',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  thumb: {
    width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
    flexShrink: 0, backgroundColor: '#f1f5f9',
  },
  thumbImg: { width: 56, height: 56 },
  thumbPdf: {
    width: 56, height: 56, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fef2f2',
  },
  info: { flex: 1, gap: 4 },
  docName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  noteBadge: {
    backgroundColor: '#ede9fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  noteBadgeText: { fontSize: 10, fontWeight: '600', color: '#7c3aed' },
  date: { fontSize: 12, color: '#94a3b8' },
});

// ── Viewer styles ─────────────────────────────────────────────────────────────
const viewerS = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', gap: 10,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  closeBtnCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  hint: {
    textAlign: 'center', fontSize: 12,
    color: 'rgba(255,255,255,0.4)', paddingVertical: 6,
  },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.78 },
});
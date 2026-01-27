// src/screens/PatientHistoryScreen.js - Updated with Lab & Imaging sections
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';

export default function PatientHistoryScreen({ patient, onBack, onAddNewNote, onEditWithVoice }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedData, setEditedData] = useState({
    symptoms: '',
    physicalExamination: '',
    labInvestigations: '', // NEW
    imaging: '', // NEW
    diagnosis: '',
    icd10Code: '', // NEW
    icd10Description: '', // NEW
    management: '',
  });
  const [showEditHistory, setShowEditHistory] = useState({});

  useEffect(() => {
    console.log('🔍 PatientHistoryScreen received patient:', patient);
    console.log('🔍 Patient ID (UUID):', patient?.id);
    console.log('🔍 Patient ID (Hospital):', patient?.patientId);
    
    if (patient?.id) {
      loadPatientHistory();
    } else {
      console.error('❌ No patient ID found!');
      Alert.alert('Error', 'Invalid patient data. Missing patient ID.');
      setLoading(false);
    }
  }, [patient]);

  const loadPatientHistory = async () => {
    try {
      setLoading(true);
      
      const patientUUID = patient.id;
      
      if (!patientUUID || patientUUID.startsWith('P-')) {
        throw new Error('Invalid patient ID format. Expected UUID, got: ' + patientUUID);
      }
      
      console.log('📋 Loading history for patient UUID:', patientUUID);
      
      const data = await apiService.getPatientHistory(patientUUID);
      setNotes(data);
      
      console.log(`✅ Loaded ${data.length} notes for patient`);
    } catch (error) {
      console.error('❌ Failed to load patient history:', error);
      Alert.alert('Error', 'Failed to load patient history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditedData({
      symptoms: note.symptoms,
      physicalExamination: note.physicalExamination,
      labInvestigations: note.labInvestigations || '', // NEW
      imaging: note.imaging || '', // NEW
      diagnosis: note.diagnosis,
      icd10Code: note.icd10Code || '', // NEW
      icd10Description: note.icd10Description || '', // NEW
      management: note.management,
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditedData({
      symptoms: '',
      physicalExamination: '',
      labInvestigations: '',
      imaging: '',
      diagnosis: '',
      icd10Code: '',
      icd10Description: '',
      management: '',
    });
  };

  const saveEdit = async (noteId) => {
    try {
      console.log('💾 Saving edit for note:', noteId);
      
      await apiService.editSoapNoteWithHistory(noteId, editedData);
      
      Alert.alert('Success', 'Note updated successfully');
      await loadPatientHistory();
      setEditingNoteId(null);
    } catch (error) {
      console.error('❌ Failed to save edit:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const toggleEditHistory = (noteId) => {
    setShowEditHistory(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
                  Edited by {item.lastEditedByName} • {formatDate(item.lastEditedAt)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.noteHeaderRight}>
            {!isEditing && onEditWithVoice && (
              <TouchableOpacity
                style={styles.voiceEditButton}
                onPress={() => onEditWithVoice(item)}
              >
                <Ionicons name="mic-outline" size={16} color="#ffffff" />
                <Text style={styles.voiceEditButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => startEditing(item)}
              >
                <Ionicons name="create-outline" size={16} color="#0f766e" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content - Editable or Display */}
        {isEditing ? (
          <ScrollView style={styles.editForm} nestedScrollEnabled>
            {/* Symptoms */}
            <Text style={styles.sectionLabel}>Symptoms & Diagnosis</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.symptoms}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, symptoms: text }))}
              multiline
              placeholder="Symptoms..."
            />

            {/* Physical Examination */}
            <Text style={styles.sectionLabel}>Physical Examination</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.physicalExamination}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, physicalExamination: text }))}
              multiline
              placeholder="Physical examination..."
            />

            {/* Lab Investigations - NEW */}
            <Text style={styles.sectionLabel}>Lab Investigations</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.labInvestigations}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, labInvestigations: text }))}
              multiline
              placeholder="Lab results..."
            />

            {/* Imaging - NEW */}
            <Text style={styles.sectionLabel}>Imaging</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.imaging}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, imaging: text }))}
              multiline
              placeholder="Imaging findings..."
            />

            {/* Diagnosis */}
            <Text style={styles.sectionLabel}>Diagnosis</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.diagnosis}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, diagnosis: text }))}
              multiline
              placeholder="Diagnosis..."
            />

            {/* ICD-10 Code - NEW */}
            <Text style={styles.sectionLabel}>ICD-10 Code</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.icd10Code}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, icd10Code: text }))}
              placeholder="ICD-10 code (e.g., J18.9)"
            />

            {/* ICD-10 Description - NEW */}
            <Text style={styles.sectionLabel}>ICD-10 Description</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.icd10Description}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, icd10Description: text }))}
              placeholder="ICD-10 description"
            />

            {/* Management */}
            <Text style={styles.sectionLabel}>Management</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.management}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, management: text }))}
              multiline
              placeholder="Management plan..."
            />

            {/* Action Buttons */}
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveEdit(item.id)}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEditing}
              >
                <Ionicons name="close-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.noteContent}>
            {/* Symptoms */}
            {item.symptoms && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="chatbox-ellipses-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Symptoms & Diagnosis</Text>
                </View>
                <Text style={styles.sectionText}>{item.symptoms}</Text>
              </View>
            )}

            {/* Physical Examination */}
            {item.physicalExamination && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="body-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Physical Examination</Text>
                </View>
                <Text style={styles.sectionText}>{item.physicalExamination}</Text>
              </View>
            )}

            {/* Lab Investigations - NEW */}
            {item.labInvestigations && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flask-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Lab Investigations</Text>
                </View>
                <Text style={styles.sectionText}>{item.labInvestigations}</Text>
              </View>
            )}

            {/* Imaging - NEW */}
            {item.imaging && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="image-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Imaging</Text>
                </View>
                <Text style={styles.sectionText}>{item.imaging}</Text>
              </View>
            )}

            {/* Diagnosis */}
            {item.diagnosis && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="medical-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Diagnosis</Text>
                </View>
                <Text style={styles.sectionText}>{item.diagnosis}</Text>
                
                {/* ICD-10 Code - NEW */}
                {item.icd10Code && (
                  <View style={styles.icd10Badge}>
                    <Ionicons name="clipboard-outline" size={16} color="#065f46" />
                    <Text style={styles.icd10BadgeText}>
                      ICD-10: {item.icd10Code} - {item.icd10Description}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Management */}
            {item.management && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="list-outline" size={18} color="#0f766e" />
                  <Text style={styles.sectionTitle}>Management</Text>
                </View>
                <Text style={styles.sectionText}>{item.management}</Text>
              </View>
            )}

            {/* Edit History */}
            {item.editHistory && item.editHistory.length > 0 && (
              <View style={styles.editHistoryContainer}>
                <TouchableOpacity
                  style={styles.editHistoryToggle}
                  onPress={() => toggleEditHistory(item.id)}
                >
                  <Ionicons 
                    name={showEditHistory[item.id] ? "chevron-down-outline" : "chevron-forward-outline"} 
                    size={16} 
                    color="#6b7280" 
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
                          {edit.editedByName} • {formatDate(edit.editedAt)}
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
            <Text style={styles.patientName}>
              {patient?.firstName} {patient?.lastName}
            </Text>
            <Text style={styles.patientId}>ID: {patient?.patientId}</Text>
          </View>
        </View>
        
        <View style={styles.notesCountRow}>
          <Ionicons name="document-text-outline" size={18} color="#d1fae5" />
          <Text style={styles.notesCount}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} on record
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addNoteButton}
          onPress={() => onAddNewNote(patient)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#0f766e" />
          <Text style={styles.addNoteButtonText}>Add New Note</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading patient history...</Text>
        </View>
      )}

      {/* Notes List */}
      {!loading && notes.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Notes Yet</Text>
          <Text style={styles.emptySubtitle}>
            This patient doesn't have any notes recorded yet
          </Text>
          <TouchableOpacity
            style={styles.addFirstNoteButton}
            onPress={() => onAddNewNote(patient)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.addFirstNoteButtonText}>Add First Note</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && notes.length > 0 && (
        <FlatList
          data={notes}
          renderItem={renderNoteCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTop: {
    marginBottom: 12,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  patientInfoText: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  patientId: {
    fontSize: 14,
    color: '#d1fae5',
  },
  notesCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  notesCount: {
    fontSize: 14,
    color: '#d1fae5',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addNoteButtonText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstNoteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  notesList: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  noteHeaderLeft: {
    flex: 1,
  },
  noteHeaderRight: {
    gap: 8,
  },
  doctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  noteDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  editedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 11,
    color: '#d97706',
  },
  voiceEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0f766e',
    borderRadius: 6,
  },
  voiceEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f766e',
  },
  noteContent: {
    gap: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sectionText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
  },
  icd10Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0f766e',
  },
  icd10BadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  editForm: {
    maxHeight: 500,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  editHistoryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  editHistoryToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  editHistoryList: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
  },
  editHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  editHistoryText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
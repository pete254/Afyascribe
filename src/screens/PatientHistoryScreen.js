// src/screens/PatientHistoryScreen.js
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
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';

export default function PatientHistoryScreen({ patient, onBack, onAddNewNote }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedData, setEditedData] = useState({
    symptoms: '',
    physicalExamination: '',
    diagnosis: '',
    management: '',
  });
  const [showEditHistory, setShowEditHistory] = useState({});

  useEffect(() => {
    if (patient?.id) {
      loadPatientHistory();
    }
  }, [patient]);

  const loadPatientHistory = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading history for patient:', patient.id);
      
      const data = await apiService.getPatientHistory(patient.id);
      setNotes(data);
      
      console.log(`✅ Loaded ${data.length} notes for patient`);
    } catch (error) {
      console.error('❌ Failed to load patient history:', error);
      Alert.alert('Error', 'Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditedData({
      symptoms: note.symptoms,
      physicalExamination: note.physicalExamination,
      diagnosis: note.diagnosis,
      management: note.management,
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditedData({
      symptoms: '',
      physicalExamination: '',
      diagnosis: '',
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
            <Text style={styles.doctorName}>
              👨‍⚕️ Dr. {item.createdBy?.firstName} {item.createdBy?.lastName}
            </Text>
            <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
            
            {item.lastEditedByName && (
              <Text style={styles.editedLabel}>
                ✏️ Edited by {item.lastEditedByName} • {formatDate(item.lastEditedAt)}
              </Text>
            )}
          </View>
          
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => startEditing(item)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
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

            {/* Diagnosis */}
            <Text style={styles.sectionLabel}>Diagnosis</Text>
            <TextInput
              style={styles.editInput}
              value={editedData.diagnosis}
              onChangeText={(text) => setEditedData(prev => ({ ...prev, diagnosis: text }))}
              multiline
              placeholder="Diagnosis..."
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
                <Text style={styles.saveButtonText}>💾 Save Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEditing}
              >
                <Text style={styles.cancelButtonText}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.noteContent}>
            {/* Symptoms */}
            {item.symptoms && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Symptoms & Diagnosis</Text>
                <Text style={styles.sectionText}>{item.symptoms}</Text>
              </View>
            )}

            {/* Physical Examination */}
            {item.physicalExamination && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Physical Examination</Text>
                <Text style={styles.sectionText}>{item.physicalExamination}</Text>
              </View>
            )}

            {/* Diagnosis */}
            {item.diagnosis && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Diagnosis</Text>
                <Text style={styles.sectionText}>{item.diagnosis}</Text>
              </View>
            )}

            {/* Management */}
            {item.management && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Management</Text>
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
                  <Text style={styles.editHistoryToggleText}>
                    {showEditHistory[item.id] ? '▼' : '▶'} View Edit History ({item.editHistory.length})
                  </Text>
                </TouchableOpacity>

                {showEditHistory[item.id] && (
                  <View style={styles.editHistoryList}>
                    {item.editHistory.map((edit, idx) => (
                      <View key={idx} style={styles.editHistoryItem}>
                        <Text style={styles.editHistoryHeader}>
                          {edit.editedByName} • {formatDate(edit.editedAt)}
                        </Text>
                        {edit.changes.map((change, changeIdx) => (
                          <View key={changeIdx} style={styles.changeItem}>
                            <Text style={styles.changeField}>
                              {change.field.replace(/([A-Z])/g, ' $1').trim()}:
                            </Text>
                            <Text style={styles.changeOldValue} numberOfLines={2}>
                              Old: {change.oldValue}
                            </Text>
                            <Text style={styles.changeNewValue} numberOfLines={2}>
                              New: {change.newValue}
                            </Text>
                          </View>
                        ))}
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

  if (!patient) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No patient selected</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>Patient History</Text>
        <Text style={styles.patientName}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.patientId}>ID: {patient.patientId}</Text>
        <Text style={styles.notesCount}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'} on record
        </Text>
        
        <TouchableOpacity
          style={styles.addNoteButton}
          onPress={() => onAddNewNote(patient)}
        >
          <Text style={styles.addNoteButtonText}>+ Add New Note</Text>
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
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Notes Yet</Text>
          <Text style={styles.emptySubtitle}>
            This patient doesn't have any notes recorded yet
          </Text>
          <TouchableOpacity
            style={styles.addFirstNoteButton}
            onPress={() => onAddNewNote(patient)}
          >
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
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  patientId: {
    fontSize: 14,
    color: '#d1fae5',
    marginBottom: 8,
  },
  notesCount: {
    fontSize: 14,
    color: '#d1fae5',
    marginBottom: 16,
  },
  addNoteButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstNoteButton: {
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
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  editedLabel: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 4,
  },
  editButton: {
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
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
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  editHistoryHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  changeItem: {
    marginLeft: 8,
    marginBottom: 8,
  },
  changeField: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  changeOldValue: {
    fontSize: 11,
    color: '#ef4444',
    marginBottom: 2,
  },
  changeNewValue: {
    fontSize: 11,
    color: '#22c55e',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
});
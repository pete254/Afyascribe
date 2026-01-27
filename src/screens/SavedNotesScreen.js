// src/screens/SavedNotesScreen.js - Updated with Lab & Imaging sections
import React, { useState, useEffect } from 'react';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import apiService from '../services/apiService';

export default function SavedNotesScreen({ onViewPatientHistory, onEditWithVoice, onGoToTranscription }) {
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotesFromBackend();
  }, []);

  const loadNotesFromBackend = async () => {
    try {
      setError(null);
      console.log('Loading SOAP notes from backend...');
      
      const response = await apiService.getSoapNotes();
      console.log('Backend response:', response);
      
      const notes = response.data || response || [];
      
      const transformedNotes = notes.map(note => ({
        id: note.id,
        patientName: note.patient ? `${note.patient.firstName} ${note.patient.lastName}` : 'Unknown Patient',
        patientId: note.patient?.patientId || 'N/A',
        date: note.createdAt ? formatDate(note.createdAt) : 'Unknown Date',
        time: note.createdAt ? formatTime(note.createdAt) : 'Unknown Time',
        
        // SOAP sections
        symptoms: note.symptoms || '',
        physicalExamination: note.physicalExamination || '',
        labInvestigations: note.labInvestigations || '', // NEW
        imaging: note.imaging || '', // NEW
        diagnosis: note.diagnosis || '',
        icd10Code: note.icd10Code || '', // NEW
        icd10Description: note.icd10Description || '', // NEW
        management: note.management || '',
        
        // Combined view
        soapNotes: formatSoapPreview(note),
        
        status: note.status || 'pending',
        createdBy: note.createdBy || {},
        patient: note.patient,
        fullNote: note,
      }));

      setSavedNotes(transformedNotes);
      console.log(`✅ Loaded ${transformedNotes.length} notes from backend`);
    } catch (error) {
      console.error('❌ Failed to load notes from backend:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSoapPreview = (note) => {
    let preview = '';
    if (note.symptoms) preview += `S: ${note.symptoms}\n\n`;
    if (note.physicalExamination) preview += `O: ${note.physicalExamination}\n\n`;
    if (note.labInvestigations) preview += `Lab: ${note.labInvestigations}\n\n`; // NEW
    if (note.imaging) preview += `Imaging: ${note.imaging}\n\n`; // NEW
    if (note.diagnosis) preview += `A: ${note.diagnosis}\n\n`;
    if (note.icd10Code) preview += `ICD-10: ${note.icd10Code} - ${note.icd10Description}\n\n`; // NEW
    if (note.management) preview += `P: ${note.management}`;
    return preview || 'No SOAP notes available';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotesFromBackend();
    setRefreshing(false);
  };

  const handleDeleteNote = (id) => {
    const note = savedNotes.find(n => n.id === id);
    
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete the note for ${note.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting note:', id);
              await apiService.deleteSoapNote(id);
              
              setSavedNotes(prev => prev.filter(note => note.id !== id));
              
              Alert.alert('Success', 'Note deleted successfully');
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert('Error', `Failed to delete note: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleViewNote = (note) => {
    Alert.alert(
      `${note.patientName} - SOAP Note`,
      note.soapNotes,
      [{ text: 'Close' }],
      { cancelable: true }
    );
  };

  const renderNoteItem = ({ item }) => (
    <View style={styles.noteCard}>
      {/* Header */}
      <View style={styles.noteHeader}>
        <View style={styles.noteHeaderLeft}>
          <View style={styles.patientNameRow}>
            <Ionicons name="person-circle-outline" size={20} color="#1f2937" />
            <Text style={styles.patientName}>{item.patientName}</Text>
          </View>
          <Text style={styles.patientId}>ID: {item.patientId}</Text>
        </View>
        <View style={styles.noteHeaderRight}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.noteDate}>{item.date}</Text>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.noteTime}>{item.time}</Text>
          </View>
        </View>
      </View>

      {/* Quick indicators for sections */}
      <View style={styles.indicatorsRow}>
        {item.symptoms && (
          <View style={styles.indicator}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>S</Text>
          </View>
        )}
        {item.physicalExamination && (
          <View style={styles.indicator}>
            <Ionicons name="body-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>O</Text>
          </View>
        )}
        {item.labInvestigations && (
          <View style={styles.indicator}>
            <Ionicons name="flask-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>Lab</Text>
          </View>
        )}
        {item.imaging && (
          <View style={styles.indicator}>
            <Ionicons name="image-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>Img</Text>
          </View>
        )}
        {item.diagnosis && (
          <View style={styles.indicator}>
            <Ionicons name="medical-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>A</Text>
          </View>
        )}
        {item.icd10Code && (
          <View style={styles.indicator}>
            <Ionicons name="clipboard-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>ICD-10</Text>
          </View>
        )}
        {item.management && (
          <View style={styles.indicator}>
            <Ionicons name="list-outline" size={14} color="#0f766e" />
            <Text style={styles.indicatorText}>P</Text>
          </View>
        )}
      </View>

      {/* SOAP Preview */}
      <ScrollView style={styles.soapPreview} nestedScrollEnabled={true}>
        <Text style={styles.soapText} numberOfLines={6}>
          {item.soapNotes}
        </Text>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.voiceEditButton]}
          onPress={() => onEditWithVoice && onEditWithVoice(item.fullNote)}
        >
          <Ionicons name="mic-outline" size={16} color="#ffffff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => onViewPatientHistory && onViewPatientHistory(item.patient)}
        >
          <Ionicons name="time-outline" size={16} color="#ffffff" />
          <Text style={styles.actionButtonText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewNote(item)}
        >
          <Ionicons name="eye-outline" size={16} color="#ffffff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteNote(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onGoToTranscription && onGoToTranscription()}
          >
            <Ionicons name="arrow-back" size={20} color="#0f766e" />
            <Text style={styles.backButtonText}>New Note</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons name="note-text" size={28} color="#1f2937" />
            <Text style={styles.title}>My Notes</Text>
          </View>
          
          <Text style={styles.subtitle}>
            {savedNotes.length} note{savedNotes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading your saved notes...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onGoToTranscription && onGoToTranscription()}
          >
            <Ionicons name="arrow-back" size={20} color="#0f766e" />
            <Text style={styles.backButtonText}>New Note</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons name="note-text" size={28} color="#1f2937" />
            <Text style={styles.title}>My Notes</Text>
          </View>
          <Text style={styles.subtitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#dc2626" />
          <Text style={styles.errorTitle}>Unable to load notes</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotesFromBackend}>
            <Ionicons name="reload-outline" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoToTranscription && onGoToTranscription()}
        >
          <Ionicons name="arrow-back" size={20} color="#0f766e" />
          <Text style={styles.backButtonText}>New Note</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="note-text" size={28} color="#1f2937" />
          <Text style={styles.title}>My Notes</Text>
        </View>
        <Text style={styles.subtitle}>
          {savedNotes.length} note{savedNotes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {savedNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No saved notes yet</Text>
          <Text style={styles.emptySubtitle}>
            Create and save notes in the Transcription tab to see them here
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="reload-outline" size={20} color="#ffffff" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0f766e']}
              tintColor="#0f766e"
            />
          }
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
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f766e',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f766e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  noteHeaderLeft: {
    flex: 1,
  },
  noteHeaderRight: {
    alignItems: 'flex-end',
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  patientId: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 26,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f766e',
  },
  noteTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  indicatorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  soapPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 150,
  },
  soapText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 10,
    borderRadius: 8,
  },
  voiceEditButton: {
    backgroundColor: '#0f766e',
  },
  historyButton: {
    backgroundColor: '#0f766e',
  },
  viewButton: {
    backgroundColor: '#0f766e',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    flex: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f766e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
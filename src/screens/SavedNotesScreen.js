// src/screens/SavedNotesScreen.js - Firebase Integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import FirebaseService from '../services/firebaseService';

export default function SavedNotesScreen() {
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load notes from Firebase when component mounts
  useEffect(() => {
    loadNotesFromFirebase();
  }, []);

  const loadNotesFromFirebase = async () => {
    try {
      setError(null);
      console.log('Loading SOAP notes from Firebase...');
      
      const notes = await FirebaseService.getAllSoapNotes();
      
      // Transform Firebase data to match existing UI format
      const transformedNotes = notes.map(note => ({
        id: note.id,
        patientName: note.patientName || 'Unknown Patient',
        date: note.createdAt ? formatDate(note.createdAt) : 'Unknown Date',
        time: note.createdAt ? formatTime(note.createdAt) : 'Unknown Time',
        soapNotes: note.formattedSoapNotes || 'No SOAP notes available',
        status: note.status || 'pending',
        originalTranscription: note.originalTranscription || '',
        medicalTermsFound: note.medicalTermsFound || [],
        firebaseId: note.id // Keep track of Firebase document ID
      }));

      setSavedNotes(transformedNotes);
      console.log(`Loaded ${transformedNotes.length} notes from Firebase`);
    } catch (error) {
      console.error('Failed to load notes from Firebase:', error);
      setError(error.message);
      Alert.alert('Error', `Failed to load notes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotesFromFirebase();
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
              // Delete from Firebase
              await FirebaseService.deleteSoapNote(note.firebaseId);
              
              // Remove from local state
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

  const handleSubmitNote = (id) => {
    const note = savedNotes.find(n => n.id === id);
    
    Alert.alert(
      'Submit to Database',
      `Submit the note for ${note.patientName} to the medical database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: async () => {
            try {
              // Update status in Firebase
              await FirebaseService.updateSoapNoteStatus(
                note.firebaseId, 
                'submitted',
                {
                  submittedBy: 'Doctor', // You might want to add user authentication
                  submissionNotes: 'Submitted to medical database'
                }
              );
              
              // Update local state
              setSavedNotes(prev => 
                prev.map(n => 
                  n.id === id ? { ...n, status: 'submitted' } : n
                )
              );
              
              Alert.alert('Success', 'Note submitted to database!');
            } catch (error) {
              console.error('Failed to submit note:', error);
              Alert.alert('Error', `Failed to submit note: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (date) => {
    if (!date) return 'Unknown Time';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderNoteItem = ({ item }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.dateTime}>{item.date} • {item.time}</Text>
          {item.medicalTermsFound && item.medicalTermsFound.length > 0 && (
            <Text style={styles.medicalTerms}>
              Medical terms: {item.medicalTermsFound.slice(0, 3).join(', ')}
              {item.medicalTermsFound.length > 3 && '...'}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, 
          item.status === 'submitted' ? styles.submittedBadge : styles.pendingBadge
        ]}>
          <Text style={[styles.statusText,
            item.status === 'submitted' ? styles.submittedText : styles.pendingText
          ]}>
            {item.status === 'submitted' ? '✓ Submitted' : '⏳ Pending'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.soapPreview} nestedScrollEnabled={true}>
        <Text style={styles.soapText}>{item.soapNotes}</Text>
      </ScrollView>

      <View style={styles.actionButtons}>
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.submitButton]}
            onPress={() => handleSubmitNote(item.id)}
          >
            <Text style={styles.actionButtonText}>📤 Submit to DB</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteNote(item.id)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💾 Saved Notes</Text>
          <Text style={styles.subtitle}>Loading from Firebase...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your saved notes...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💾 Saved Notes</Text>
          <Text style={styles.subtitle}>Connection Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load notes</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotesFromFirebase}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💾 Saved Notes</Text>
        <Text style={styles.subtitle}>
          {savedNotes.length} note{savedNotes.length !== 1 ? 's' : ''} from Firebase
        </Text>
      </View>

      {savedNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No saved notes yet</Text>
          <Text style={styles.emptySubtitle}>
            Create and format notes in the Transcription tab to see them here
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
        />
      )}
    </View>
  );
}

// Add these new styles to the existing styles object
const styles = StyleSheet.create({
  // ... existing styles ...
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notesList: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
    marginBottom: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateTime: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  medicalTerms: {
    fontSize: 12,
    color: '#7c3aed',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  submittedBadge: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingText: {
    color: '#d97706',
  },
  submittedText: {
    color: '#16a34a',
  },
  soapPreview: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    marginBottom: 12,
  },
  soapText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
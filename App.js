// App.js 
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // ✅ ADD THIS
import TranscriptionScreen from './src/screens/TranscriptionScreen';
import SavedNotesScreen from './src/screens/SavedNotesScreen';
import PatientHistoryScreen from './src/screens/PatientHistoryScreen';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';


const Stack = createNativeStackNavigator();

// Main App Component (inside AuthProvider)
function MainApp() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('transcription');
  const [activeScreen, setActiveScreen] = useState('transcription');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [noteToEdit, setNoteToEdit] = useState(null);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Navigation handlers
  const goToPatientHistory = (patient) => {
    setSelectedPatient(patient);
    setActiveScreen('patient-history');
  };

  const goToTranscription = (patient = null) => {
    if (patient) {
      setSelectedPatient(patient);
    }
    setActiveScreen('transcription');
    setActiveTab('transcription');
  };

  const editNoteWithVoice = (note) => {
    console.log('✏️ Editing note with voice:', note.id);
    setNoteToEdit(note);
    setSelectedPatient(note.patient);
    setActiveScreen('transcription');
    setActiveTab('transcription');
  };

  const goToSavedNotes = () => {
    setActiveScreen('saved');
    setActiveTab('saved');
  };

  const goBack = () => {
    setActiveScreen(activeTab);
    setSelectedPatient(null);
    setNoteToEdit(null);
  };

  const clearEditMode = () => {
    setNoteToEdit(null);
  };

  // Render active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'patient-history':
        return (
          <PatientHistoryScreen
            patient={selectedPatient}
            onBack={goBack}
            onAddNewNote={goToTranscription}
            onEditWithVoice={editNoteWithVoice}
          />
        );
      case 'saved':
        return (
          <SavedNotesScreen
            onViewPatientHistory={goToPatientHistory}
            onEditWithVoice={editNoteWithVoice}
            onGoToTranscription={goToTranscription}
          />
        );
      case 'transcription':
      default:
        return (
          <TranscriptionScreen
            preselectedPatient={selectedPatient}
            noteToEdit={noteToEdit}
            onViewPatientHistory={goToPatientHistory}
            onClearPatient={() => setSelectedPatient(null)}
            onClearNote={clearEditMode}
          />
        );
    }
  };

  // Show main app if authenticated
  return (
    <View style={styles.container}>
      {/* Header with User Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SOAP Notes</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, Dr. {user?.firstName || 'User'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={logout}
        >
          {/* ✅ ADD LOGOUT ICON */}
          <Ionicons name="log-out-outline" size={18} color="#475569" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom Tab Bar - Hide on Patient History screen */}
      {activeScreen !== 'patient-history' && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'transcription' && styles.activeTab]}
            onPress={() => {
              setActiveTab('transcription');
              setActiveScreen('transcription');
              setNoteToEdit(null);
            }}
          >
            {/* ✅ REPLACE EMOJI WITH ICON */}
            <MaterialCommunityIcons 
              name="microphone" 
              size={24} 
              color={activeTab === 'transcription' ? '#0f766e' : '#64748b'} 
            />
            <Text style={[styles.tabText, activeTab === 'transcription' && styles.activeTabText]}>
              New Note
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
            onPress={goToSavedNotes}
          >
            {/* ✅ REPLACE EMOJI WITH ICON */}
            <MaterialCommunityIcons 
              name="note-text-outline" 
              size={24} 
              color={activeTab === 'saved' ? '#0f766e' : '#64748b'} 
            />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
              My Notes
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

// Root App Component (wraps with AuthProvider)
export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row', // ✅ ADDED
    alignItems: 'center', // ✅ ADDED
    gap: 6, // ✅ ADDED
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 10,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#f1f5f9',
  },
  // ✅ REMOVED tabIcon style (not needed anymore)
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4, // 
  },
  activeTabText: {
    color: '#0f766e', // 
    fontWeight: '600',
  },
});
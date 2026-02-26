// App.js - Updated with Home Tab + Patient Onboarding
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import TranscriptionScreen from './src/screens/TranscriptionScreen';
import SavedNotesScreen from './src/screens/SavedNotesScreen';
import PatientHistoryScreen from './src/screens/PatientHistoryScreen';
import PatientDirectoryScreen from './src/screens/PatientDirectoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardPatientScreen from './src/screens/OnboardPatientScreen';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();

function MainApp() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [activeScreen, setActiveScreen] = useState('home');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [noteToEdit, setNoteToEdit] = useState(null);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
    if (patient) setSelectedPatient(patient);
    setActiveScreen('transcription');
    setActiveTab('transcription');
  };

  const editNoteWithVoice = (note) => {
    setNoteToEdit(note);
    setSelectedPatient(note.patient);
    setActiveScreen('transcription');
    setActiveTab('transcription');
  };

  const goToSavedNotes = () => {
    setActiveScreen('saved');
    setActiveTab('saved');
  };

  const goToHome = () => {
    setActiveScreen('home');
    setActiveTab('home');
    setNoteToEdit(null);
    setSelectedPatient(null);
  };

  const goToOnboard = () => {
    setActiveScreen('onboard-patient');
  };

  const goToPatientDirectory = () => {
    setActiveScreen('patient-directory');
  };

  const goBack = () => {
    const returnTo = activeTab === 'home' ? 'home' : activeTab;
    setActiveScreen(returnTo);
    setSelectedPatient(null);
    setNoteToEdit(null);
  };

  const clearEditMode = () => setNoteToEdit(null);

  const hideTabBar =
    activeScreen === 'patient-history' || activeScreen === 'onboard-patient' || activeScreen === 'patient-directory';

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return (
          <HomeScreen
            onOnboardPatient={goToOnboard}
            onTranscribeNotes={() => {
              setActiveTab('transcription');
              setActiveScreen('transcription');
            }}
            onViewPatientDirectory={goToPatientDirectory}
          />
        );

      case 'onboard-patient':
        return (
          <OnboardPatientScreen
            onBack={goBack}
            onSuccess={() => {
              setActiveScreen('home');
              setActiveTab('home');
            }}
          />
        );

      case 'patient-directory':
        return (
          <PatientDirectoryScreen
            onBack={goBack}
            onViewPatientHistory={goToPatientHistory}
          />
        );

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AfyaScribe</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, Dr. {user?.firstName || 'User'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#475569" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      {!hideTabBar && (
        <View style={styles.tabBar}>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.activeTab]}
            onPress={goToHome}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? '#0f766e' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'transcription' && styles.activeTab]}
            onPress={() => {
              setActiveTab('transcription');
              setActiveScreen('transcription');
              setNoteToEdit(null);
            }}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={22}
              color={activeTab === 'transcription' ? '#0f766e' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeTab === 'transcription' && styles.activeTabText]}>
              New Note
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
            onPress={goToSavedNotes}
          >
            <MaterialCommunityIcons
              name={activeTab === 'saved' ? 'note-text' : 'note-text-outline'}
              size={22}
              color={activeTab === 'saved' ? '#0f766e' : '#94a3b8'}
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

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
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
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  logoutButtonText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeTab: { backgroundColor: '#f0fdf9' },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 3,
  },
  activeTabText: { color: '#0f766e', fontWeight: '700' },
});
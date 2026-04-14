// App.js - Updated with SafeAreaProvider + bottom inset fixes
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import TranscriptionScreen from './src/screens/TranscriptionScreen';
import SavedNotesScreen from './src/screens/SavedNotesScreen';
import PatientHistoryScreen from './src/screens/PatientHistoryScreen';
import PatientDirectoryScreen from './src/screens/PatientDirectoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardPatientScreen from './src/screens/OnboardPatientScreen';
import ServiceCatalogScreen from './src/screens/ServiceCatalogScreen';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import RegisterFacilityScreen from './src/screens/RegisterFacilityScreen';
import CreateClinicScreen from './src/screens/CreateClinicScreen';
import OwnerCardScreen from './src/screens/OwnerCardScreen';
import QueuePatientScreen from './src/screens/QueuePatientScreen';
import QueueScreen from './src/screens/QueueScreen';
import MyQueueScreen from './src/screens/MyQueueScreen';
import TriageScreen from './src/screens/TriageScreen';
import DischargeScreen from './src/screens/DischargeScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ReportsScreen from './src/screens/ReportsScreen';
import PrescriptionScreen from './src/screens/PrescriptionScreen';

const Stack = createNativeStackNavigator();

// ── Standalone Bottom Tab Bar component (reads safe area insets) ──────────────
function BottomTabBar({
  activeTab,
  user,
  goToHome,
  goToMyQueue,
  goToQueue,
  goToSavedNotes,
  onPressNewNote,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'home' && styles.activeTab]}
        onPress={goToHome}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'home' ? '#0f766e' : '#94a3b8'}
        />
        <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>Home</Text>
      </TouchableOpacity>

      {user?.role === 'doctor' ? (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-queue' && styles.activeTab]}
          onPress={goToMyQueue}
        >
          <MaterialCommunityIcons
            name="account-clock-outline"
            size={22}
            color={activeTab === 'my-queue' ? '#0f766e' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'my-queue' && styles.activeTabText]}>
            My Queue
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.activeTab]}
          onPress={goToQueue}
        >
          <MaterialCommunityIcons
            name="clipboard-list-outline"
            size={22}
            color={activeTab === 'queue' ? '#0f766e' : '#94a3b8'}
          />
          <Text style={[styles.tabText, activeTab === 'queue' && styles.activeTabText]}>
            Queue
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.tab, activeTab === 'transcription' && styles.activeTab]}
        onPress={onPressNewNote}
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
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('home');
  const [activeScreen, setActiveScreen] = useState('home');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [triageVisit, setTriageVisit] = useState(null);
  const [soapVisit, setSoapVisit] = useState(null);
  const [viewTriageOnly, setViewTriageOnly] = useState(false);
  const [dischargeContext, setDischargeContext] = useState(null);
  const [prescriptionContext, setPrescriptionContext] = useState(null);

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
          <Stack.Screen name="RegisterFacility" component={RegisterFacilityScreen} />
          <Stack.Screen name="CreateClinic" component={CreateClinicScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // ── Navigation helpers ───────────────────────────────────────────────────────

  const goToHome = () => {
    setActiveScreen('home');
    setActiveTab('home');
    setNoteToEdit(null);
    setSelectedPatient(null);
    setTriageVisit(null);
    setSoapVisit(null);
  };

  const goBack = () => {
    const fullScreens = ['my-queue', 'queue'];
    if (fullScreens.includes(activeTab) || fullScreens.includes(activeScreen)) {
      goToHome();
      return;
    }
    const returnTo = activeTab === 'home' ? 'home' : activeTab;
    setActiveScreen(returnTo);
    setSelectedPatient(null);
    setNoteToEdit(null);
    setTriageVisit(null);
    setSoapVisit(null);
  };

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

  const goToOnboard = () => setActiveScreen('onboard-patient');
  const goToPatientDirectory = () => setActiveScreen('patient-directory');
  const goToQueuePatient = () => setActiveScreen('queue-patient');

  const goToQueue = () => {
    setActiveScreen('queue');
    setActiveTab('queue');
  };

  const goToMyQueue = () => {
    setActiveScreen('my-queue');
    setActiveTab('my-queue');
  };

  const goToReports = () => setActiveScreen('reports');

  const goToServiceCatalog = () => setActiveScreen('service-catalog');

  const goToTriage = (visit = null) => {
    setTriageVisit(visit);
    setViewTriageOnly(false);
    setActiveScreen('triage');
  };

  const goToViewTriage = (visit) => {
    setTriageVisit(visit);
    setViewTriageOnly(true);
    setActiveScreen('triage');
  };
  
  const openSoapFromQueue = (visit) => {
    setSoapVisit(visit);
    setSelectedPatient(visit.patient);
    setActiveScreen('transcription');
    setActiveTab('transcription');
  };

  const clearEditMode = () => setNoteToEdit(null);

  // ── Tab bar visibility ───────────────────────────────────────────────────────
  const hideTabBar = [
    'patient-history', 'onboard-patient', 'patient-directory',
    'queue-patient', 'queue', 'my-queue', 'triage', 'reports', 'service-catalog', 'discharge', 'prescription', 'owner-card'
  ].includes(activeScreen);

  // ── Screen renderer ──────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (activeScreen) {

      case 'home':
        return (
          <HomeScreen
            onOnboardPatient={goToOnboard}
            onTranscribeNotes={goToTranscription}
            onViewPatientDirectory={goToPatientDirectory}
            onQueuePatient={goToQueuePatient}
            onViewQueue={goToQueue}
            onViewMyQueue={goToMyQueue}
            onViewTriageQueue={() => goToTriage(null)}
            onViewReports={goToReports}
            onViewServiceCatalog={goToServiceCatalog}
            onViewOwnerCard={() => setActiveScreen('owner-card')}
          />
        );

      case 'queue-patient':
        return (
          <QueuePatientScreen
            onBack={goBack}
            onSuccess={goToHome}
          />
        );

      case 'queue':
        return (
          <QueueScreen
            onBack={goBack}
            onTriagePatient={(visit) => goToTriage(visit)}
          />
        );

      case 'my-queue':
        return (
          <MyQueueScreen
            onBack={goBack}
            onOpenSoapNote={openSoapFromQueue}
            onTriagePatient={(visit) => goToTriage(visit)}
            onViewTriage={(visit) => goToViewTriage(visit)}
          />
        );

      case 'triage':
        return (
          <TriageScreen
            onBack={goBack}
            preselectedVisit={triageVisit}
            viewTriageOnly={viewTriageOnly}
            onContinueToSOAP={openSoapFromQueue}
          />
        );

      case 'onboard-patient':
        return (
          <OnboardPatientScreen
            onBack={goBack}
            onSuccess={goToHome}
          />
        );

      case 'service-catalog':
        return (
          <ServiceCatalogScreen
            onBack={goBack}
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

      case 'reports':
        return <ReportsScreen onBack={goBack} />;

      case 'owner-card':
        return <OwnerCardScreen onBack={goBack} />;

      case 'discharge':
        return (
          <DischargeScreen
            patient={dischargeContext?.patient}
            soapNoteId={dischargeContext?.soapNoteId}
            diagnosis={dischargeContext?.diagnosis}
            onWritePrescription={() => {
              setPrescriptionContext(dischargeContext);
              setActiveScreen('prescription');
            }}
            onDischarge={({ scheduled }) => {
              setDischargeContext(null);
              setPrescriptionContext(null);
              goToHome();
            }}
            onBack={() => setActiveScreen('transcription')}
          />
        );

      case 'prescription':
        return (
          <PrescriptionScreen
            patient={prescriptionContext?.patient}
            soapNoteId={prescriptionContext?.soapNoteId}
            diagnosis={prescriptionContext?.diagnosis}
            onBack={() => setActiveScreen('discharge')}
            onDone={() => {
              setPrescriptionContext(null);
              setDischargeContext(null);
              goToHome();
            }}
          />
        );

      case 'transcription':
      default:
        return (
          <TranscriptionScreen
            preselectedPatient={selectedPatient}
            noteToEdit={noteToEdit}
            visitContext={soapVisit}
            onViewPatientHistory={goToPatientHistory}
            onClearPatient={() => setSelectedPatient(null)}
            onClearNote={clearEditMode}
            onSoapNoteSaved={(ctx) => {
              setDischargeContext(ctx);
              setActiveScreen('discharge');
            }}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header — respects top inset ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.headerTitle}>AfyaScribe</Text>
          <Text style={styles.headerSubtitle}>
            {user?.role === 'doctor' ? `Dr. ${user?.firstName}` : user?.firstName || 'User'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#475569" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* ── Bottom Tab Bar — respects bottom inset ── */}
      {!hideTabBar && (
        <BottomTabBar
          activeTab={activeTab}
          user={user}
          goToHome={goToHome}
          goToMyQueue={goToMyQueue}
          goToQueue={goToQueue}
          goToSavedNotes={goToSavedNotes}
          onPressNewNote={() => {
            setActiveTab('transcription');
            setActiveScreen('transcription');
            setNoteToEdit(null);
            setSoapVisit(null);
          }}
        />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
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
    backgroundColor: '#f8fafc',
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
    // paddingTop is now dynamic via insets.top + 10
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
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  logoutButtonText: {
    fontSize: 13,
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
    // paddingBottom is now dynamic via insets.bottom in BottomTabBar component
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
  activeTab: {
    backgroundColor: '#f0fdf9',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 3,
  },
  activeTabText: {
    color: '#0f766e',
    fontWeight: '700',
  },
});
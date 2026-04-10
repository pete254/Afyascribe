// src/screens/TriageScreen.js
// Nurse or doctor fills in vitals for a queued patient
// FIXED: keyboard management + legend shown after submit
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert, Platform,
  FlatList, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import ColorCodedVitals from '../components/ColorCodedVitals';

// ── Vitals Field ──────────────────────────────────────────────────────────────
function VitalField({ label, value, onChangeText, placeholder, unit, icon, keyboardType = 'decimal-pad' }) {
  return (
    <View style={styles.vitalField}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <View style={styles.vitalInputRow}>
        <MaterialCommunityIcons name={icon} size={15} color="#94a3b8" style={{ marginRight: 5 }} />
        <TextInput
          style={styles.vitalInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType={keyboardType}
          returnKeyType="next"
        />
        {unit ? <Text style={styles.vitalUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function TriageScreen({ onBack, preselectedVisit, viewTriageOnly = false, onContinueToSOAP }) {
  const [queue, setQueue] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(preselectedVisit || null);
  const [loading, setLoading] = useState(!preselectedVisit);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedTriageData, setSavedTriageData] = useState(null);

  // Vitals state
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [spO2, setSpO2] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [notes, setNotes] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiService.getActiveQueue();
      setQueue(data.filter(v => !['completed', 'cancelled'].includes(v.status)));
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!preselectedVisit) loadQueue();
  }, [loadQueue, preselectedVisit]);

  // Pre-fill if visit already has triage data
  useEffect(() => {
    if (selectedVisit?.triageData) {
      const t = selectedVisit.triageData;
      setBloodPressure(t.bloodPressure || '');
      setTemperature(t.temperature || '');
      setPulse(t.pulse || '');
      setWeight(t.weight || '');
      setHeight(t.height || '');
      setSpO2(t.spO2 || '');
      setRespiratoryRate(t.respiratoryRate || '');
      setNotes(t.notes || '');
    }
  }, [selectedVisit]);

  // Auto-show saved triage view when in viewTriageOnly mode
  useEffect(() => {
    if (viewTriageOnly && selectedVisit?.triageData && preselectedVisit) {
      setSavedTriageData(selectedVisit.triageData);
      setSubmitted(true);
    }
  }, [viewTriageOnly, selectedVisit, preselectedVisit]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const clearForm = () => {
    setBloodPressure('');
    setTemperature('');
    setPulse('');
    setWeight('');
    setHeight('');
    setSpO2('');
    setRespiratoryRate('');
    setNotes('');
  };

  const handleSelectVisit = (visit) => {
    setSelectedVisit(visit);
    setSubmitted(false);
    setSavedTriageData(null);
    clearForm();
    if (visit.triageData) {
      const t = visit.triageData;
      setBloodPressure(t.bloodPressure || '');
      setTemperature(t.temperature || '');
      setPulse(t.pulse || '');
      setWeight(t.weight || '');
      setHeight(t.height || '');
      setSpO2(t.spO2 || '');
      setRespiratoryRate(t.respiratoryRate || '');
      setNotes(t.notes || '');
    }
  };

  const handleSubmit = async () => {
    if (!selectedVisit) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    const hasAnyVital = bloodPressure || temperature || pulse || weight || height || spO2 || respiratoryRate || notes;
    if (!hasAnyVital) {
      Alert.alert('Error', 'Please record at least one vital sign or note');
      return;
    }

    setSubmitting(true);
    const triageData = {
      bloodPressure: bloodPressure.trim() || undefined,
      temperature: temperature.trim() || undefined,
      pulse: pulse.trim() || undefined,
      weight: weight.trim() || undefined,
      height: height.trim() || undefined,
      spO2: spO2.trim() || undefined,
      respiratoryRate: respiratoryRate.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await apiService.submitTriage(selectedVisit.id, triageData);
      setSavedTriageData(triageData);
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save triage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSelectedVisit(null);
    clearForm();
    setSubmitted(false);
    setSavedTriageData(null);
    loadQueue();
    if (preselectedVisit) onBack();
  };

  // ── PATIENT PICKER ────────────────────────────────────────────────────────
  if (!selectedVisit) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Triage Queue</Text>
            <Text style={styles.headerSub}>Select a patient to record vitals</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0f766e" />
          </View>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
            renderItem={({ item }) => {
              const patient = item.patient;
              return (
                <TouchableOpacity style={styles.patientCard} onPress={() => handleSelectVisit(item)}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
                    <Text style={styles.patientMeta}>{patient?.patientId}</Text>
                    <Text style={styles.reasonText} numberOfLines={1}>{item.reasonForVisit}</Text>
                  </View>
                  {item.triageCompleted
                    ? <View style={styles.triagedBadge}><Text style={styles.triagedBadgeText}>✓ Update</Text></View>
                    : <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
                  }
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="heart-pulse" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No patients waiting</Text>
                <Text style={styles.emptySub}>Checked-in patients will appear here</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  const patient = selectedVisit.patient;

  // ── SUBMITTED / RESULTS VIEW ──────────────────────────────────────────────
  if (submitted && savedTriageData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleDone}>
            <Ionicons name="arrow-back" size={20} color="#64748b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Triage Saved</Text>
            <Text style={styles.headerSub}>Vitals recorded</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success banner */}
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={28} color="#0f766e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Triage Saved ✓</Text>
              <Text style={styles.successSubtitle}>
                Vitals recorded for {patient?.firstName} {patient?.lastName}
              </Text>
            </View>
          </View>

          {/* Patient pill */}
          <View style={styles.selectedPatientCard}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
              <Text style={styles.patientMeta}>{patient?.patientId}</Text>
            </View>
          </View>

          {/* Vitals results with legend */}
          <View style={styles.resultsCard}>
            <Text style={styles.resultsSectionTitle}>
              <MaterialCommunityIcons name="heart-pulse" size={15} color="#0f766e" /> Recorded Vitals
            </Text>
            <ColorCodedVitals triageData={savedTriageData} compact={false} showLegend={true} />
          </View>

          {viewTriageOnly ? (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.updateTriageButton}
                onPress={() => {
                  setSubmitted(false);
                  setSavedTriageData(null);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#0f766e" />
                <Text style={styles.updateTriageButtonText}>Update Triage</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.continueButton} 
                onPress={() => {
                  onContinueToSOAP && onContinueToSOAP(selectedVisit);
                }}
              >
                <Ionicons name="arrow-forward" size={20} color="#fff" />
                <Text style={styles.continueButtonText}>Continue to SOAP Note</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── TRIAGE FORM ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => preselectedVisit ? onBack() : setSelectedVisit(null)}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Triage</Text>
          <Text style={styles.headerSub}>Recording vitals</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Patient card */}
        <View style={styles.selectedPatientCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
            <Text style={styles.patientMeta}>{patient?.patientId}</Text>
            <Text style={styles.reasonText}>{selectedVisit.reasonForVisit}</Text>
          </View>
          {!preselectedVisit && (
            <TouchableOpacity onPress={() => setSelectedVisit(null)}>
              <Ionicons name="close-circle" size={22} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Vitals form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            <MaterialCommunityIcons name="heart-pulse" size={15} color="#0f766e" /> Vital Signs
          </Text>

          <View style={styles.vitalsGrid}>
            <VitalField label="Blood Pressure" value={bloodPressure} onChangeText={setBloodPressure} placeholder="120/80" unit="mmHg" icon="water" keyboardType="numbers-and-punctuation" />
            <VitalField label="Temperature" value={temperature} onChangeText={setTemperature} placeholder="37.0" unit="°C" icon="thermometer" />
            <VitalField label="Pulse" value={pulse} onChangeText={setPulse} placeholder="72" unit="bpm" icon="heart-outline" />
            <VitalField label="SpO₂" value={spO2} onChangeText={setSpO2} placeholder="98" unit="%" icon="lungs" />
            <VitalField label="Weight" value={weight} onChangeText={setWeight} placeholder="70" unit="kg" icon="scale-bathroom" />
            <VitalField label="Height" value={height} onChangeText={setHeight} placeholder="170" unit="cm" icon="human-male-height" />
            <VitalField label="Resp. Rate" value={respiratoryRate} onChangeText={setRespiratoryRate} placeholder="16" unit="/min" icon="breath" />
          </View>

          <Text style={styles.notesLabel}>Additional Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations, allergies, or clinical notes..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor="#cbd5e1"
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <><MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" /><Text style={styles.submitBtnText}>  Save Triage</Text></>
          }
        </TouchableOpacity>

        {/* Bottom spacing for keyboard */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8' },

  list: { padding: 16, gap: 10, paddingBottom: 40 },
  formContent: { paddingBottom: 24 },
  resultsContent: { padding: 16, paddingBottom: 48 },

  patientCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selectedPatientCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', margin: 16, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  patientMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  reasonText: { fontSize: 12, color: '#64748b', marginTop: 3 },
  triagedBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  triagedBadgeText: { fontSize: 11, color: '#166534', fontWeight: '700' },
  pendingBadge: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 11, color: '#92400e', fontWeight: '700' },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 16, marginTop: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#0f766e', marginBottom: 16 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },

  vitalField: { width: '47%' },
  vitalLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  vitalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  vitalInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  vitalUnit: { fontSize: 11, color: '#94a3b8', marginLeft: 3 },

  notesLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 8 },
  notesInput: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 14, color: '#1e293b', minHeight: 80,
  },

  submitBtn: {
    backgroundColor: '#0f766e', borderRadius: 14, padding: 18, margin: 16, marginTop: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Results / Success view
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#bbf7d0', marginBottom: 14,
  },
  successTitle: { fontSize: 16, fontWeight: '800', color: '#0f766e' },
  successSubtitle: { fontSize: 13, color: '#166534', marginTop: 2 },

  resultsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 16,
  },
  resultsSectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f766e', marginBottom: 14 },

  doneButton: {
    backgroundColor: '#0f766e', borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  continueButton: {
    backgroundColor: '#0f766e', borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 16,
  },
  continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  buttonsContainer: {
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  updateTriageButton: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  updateTriageButtonText: { color: '#0f766e', fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
});
// src/screens/QueuePatientScreen.js
// Receptionist checks in a patient and assigns to a doctor
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

export default function QueuePatientScreen({ onBack, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const staff = await apiService.getFacilityDoctors();
      setDoctors(staff);
    } catch (e) {
      console.error('Failed to load doctors:', e);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    setSelectedPatient(null);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await apiService.searchPatients(text.trim());
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }
    if (!reasonForVisit.trim()) {
      Alert.alert('Error', 'Please enter the reason for visit');
      return;
    }
    if (!selectedDoctor) {
      Alert.alert('Error', 'Please assign a doctor');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.checkInPatient(selectedPatient.id, reasonForVisit.trim(), selectedDoctor.id);
      Alert.alert(
        'Patient Queued ✅',
        `${selectedPatient.firstName} ${selectedPatient.lastName} has been assigned to Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to queue patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color="#64748b" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Queue Patient</Text>
      <Text style={styles.screenSubtitle}>Check in a patient and assign them to a doctor</Text>

      {/* Step 1 — Search Patient */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="magnify" size={15} color="#0f766e" /> Step 1 — Find Patient
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or patient ID..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="words"
          />
          {searching && <ActivityIndicator size="small" color="#0f766e" />}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsBox}>
            {searchResults.map((p) => (
              <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => selectPatient(p)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.firstName[0]}{p.lastName[0]}</Text>
                </View>
                <View>
                  <Text style={styles.resultName}>{p.firstName} {p.lastName}</Text>
                  <Text style={styles.resultMeta}>{p.patientId} · {p.gender} · {p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() + ' yrs' : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Patient Card */}
        {selectedPatient && (
          <View style={styles.selectedCard}>
            <MaterialCommunityIcons name="account-check" size={20} color="#0f766e" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.selectedName}>{selectedPatient.firstName} {selectedPatient.lastName}</Text>
              <Text style={styles.selectedMeta}>{selectedPatient.patientId}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedPatient(null); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Step 2 — Reason for Visit */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={15} color="#0f766e" /> Step 2 — Reason for Visit
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Fever and headache for 3 days, chest pain, routine checkup..."
          value={reasonForVisit}
          onChangeText={setReasonForVisit}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Step 3 — Assign Doctor */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="doctor" size={15} color="#0f766e" /> Step 3 — Assign Doctor
        </Text>

        {doctors.length === 0 ? (
          <Text style={styles.emptyDoctors}>No doctors found in this facility</Text>
        ) : (
          doctors.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.doctorRow, selectedDoctor?.id === doc.id && styles.doctorRowSelected]}
              onPress={() => setSelectedDoctor(doc)}
            >
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>{doc.firstName[0]}{doc.lastName[0]}</Text>
              </View>
              <Text style={styles.doctorName}>Dr. {doc.firstName} {doc.lastName}</Text>
              {selectedDoctor?.id === doc.id && (
                <Ionicons name="checkmark-circle" size={20} color="#0f766e" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <><MaterialCommunityIcons name="account-arrow-right" size={20} color="#fff" /><Text style={styles.submitText}>  Queue Patient</Text></>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: Platform.OS === 'ios' ? 8 : 0 },
  backText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  screenSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0f766e', marginBottom: 14 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

  resultsBox: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  resultMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  selectedCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bbf7d0',
  },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  selectedMeta: { fontSize: 12, color: '#16a34a', marginTop: 2 },

  textArea: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, fontSize: 15, color: '#1e293b', minHeight: 90,
  },

  doctorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 8,
  },
  doctorRowSelected: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  doctorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center' },
  doctorAvatarText: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  doctorName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  emptyDoctors: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },

  submitButton: {
    backgroundColor: '#0f766e', borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
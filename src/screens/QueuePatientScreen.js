// src/screens/QueuePatientScreen.js
// Receptionist checks in a patient, assigns a doctor, and records the bill.
// Patient is queued with status CHECKED_IN — they advance to WAITING_FOR_DOCTOR
// only after the receptionist marks their bill as paid.
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform, Modal, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

const SERVICE_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'lab', label: 'Lab / Investigations' },
  { value: 'imaging', label: 'Imaging (X-Ray / Ultrasound)' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
];

export default function QueuePatientScreen({ onBack, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Billing state
  const [serviceType, setServiceType] = useState('consultation');
  const [serviceDescription, setServiceDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [doctorPickerVisible, setDoctorPickerVisible] = useState(false);

  // Payment mode + insurance state
  const [paymentMode, setPaymentMode] = useState('cash');
  const [insuranceSchemes, setInsuranceSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemePickerVisible, setSchemePickerVisible] = useState(false);

  useEffect(() => {
    loadDoctors();
    loadSchemes();
  }, []);

  const loadDoctors = async () => {
    try {
      const staff = await apiService.getFacilityDoctors();
      setDoctors(staff);
    } catch (e) {
      console.error('Failed to load doctors:', e);
    }
  };

  const loadSchemes = async () => {
    try {
      const schemes = await apiService.getInsuranceSchemes();
      setInsuranceSchemes(schemes);
    } catch (e) {
      console.error('Failed to load insurance schemes:', e);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    setSelectedPatient(null);
    if (text.trim().length < 2) { setSearchResults([]); return; }
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

  const selectedServiceLabel = SERVICE_TYPES.find(s => s.value === serviceType)?.label ?? 'Consultation';

  const handleSubmit = async () => {
    if (!selectedPatient) { Alert.alert('Missing', 'Please select a patient'); return; }
    if (!reasonForVisit.trim()) { Alert.alert('Missing', 'Please enter the reason for visit'); return; }
    if (!selectedDoctor) { Alert.alert('Missing', 'Please assign a doctor'); return; }

    // Amount validation — cash requires a value; insurance can be 0 (copay)
    let parsedAmount = 0;
    if (paymentMode === 'cash') {
      parsedAmount = parseFloat(amount);
      if (!amount || isNaN(parsedAmount) || parsedAmount < 0) {
        Alert.alert('Missing', 'Please enter a valid bill amount');
        return;
      }
    } else {
      parsedAmount = parseFloat(amount) || 0;
    }
    if ((paymentMode === 'insurance' || paymentMode === 'split') && !selectedScheme) {
      Alert.alert('Missing', 'Please select an insurance scheme');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1 — Check in patient (visit starts as CHECKED_IN)
      const visit = await apiService.checkInPatient(
        selectedPatient.id,
        reasonForVisit.trim(),
        selectedDoctor.id,
      );

      // Step 2 — Create billing record
      await apiService.createBill(
        visit.id,
        serviceType,
        serviceDescription.trim() || null,
        parsedAmount,
        paymentMode,
        selectedScheme?.name || null,
      );

      Alert.alert(
        'Patient Queued ✅',
        `${selectedPatient.firstName} ${selectedPatient.lastName} has been checked in.\n\nBill of KES ${parsedAmount.toLocaleString()} recorded. Mark it as paid at the counter to move them to the doctor's queue.`,
        [{ text: 'OK', onPress: onSuccess }],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to queue patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color="#64748b" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Queue Patient</Text>
      <Text style={styles.screenSubtitle}>Check in, assign a doctor, and record the bill</Text>

      {/* ── Step 1 — Find Patient ─────────────────────────────────────────── */}
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

        {searchResults.length > 0 && (
          <View style={styles.resultsBox}>
            {searchResults.map((p) => (
              <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => selectPatient(p)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.firstName[0]}{p.lastName[0]}</Text>
                </View>
                <View>
                  <Text style={styles.resultName}>{p.firstName} {p.lastName}</Text>
                  <Text style={styles.resultMeta}>
                    {p.patientId} · {p.gender} · {p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() + ' yrs' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

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

      {/* ── Step 2 — Reason for Visit ─────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={15} color="#0f766e" /> Step 2 — Reason for Visit
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Chest pain, follow-up, fever..."
          value={reasonForVisit}
          onChangeText={setReasonForVisit}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* ── Step 3 — Assign Doctor ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="doctor" size={15} color="#0f766e" /> Step 3 — Assign Doctor
        </Text>

        <TouchableOpacity style={styles.pickerButton} onPress={() => setDoctorPickerVisible(true)}>
          <MaterialCommunityIcons name="doctor" size={18} color={selectedDoctor ? '#0f766e' : '#94a3b8'} />
          <Text style={[styles.pickerText, selectedDoctor && styles.pickerTextSelected]}>
            {selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Select a doctor...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ── Step 4 — Payment Mode ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="cash-register" size={15} color="#0f766e" /> Step 4 — Billing
        </Text>

        {/* Payment mode selector */}
        <View style={styles.payModeRow}>
          {[
            { value: 'cash', label: 'Cash' },
            { value: 'insurance', label: 'Insurance' },
            { value: 'split', label: 'Split / Copay' },
          ].map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.payModeBtn, paymentMode === m.value && styles.payModeBtnActive]}
              onPress={() => { setPaymentMode(m.value); setSelectedScheme(null); setAmount(''); }}
            >
              <Text style={[styles.payModeTxt, paymentMode === m.value && styles.payModeTxtActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Insurance scheme picker — shown for insurance + split */}
        {(paymentMode === 'insurance' || paymentMode === 'split') && (
          <>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setSchemePickerVisible(true)}
            >
              <MaterialCommunityIcons name="shield-check-outline" size={18}
                color={selectedScheme ? '#0f766e' : '#94a3b8'} />
              <Text style={[styles.pickerText, selectedScheme && styles.pickerTextSelected]}>
                {selectedScheme ? selectedScheme.name : 'Select insurance scheme...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>

            {insuranceSchemes.length === 0 && (
              <Text style={styles.sectionHint}>
                No schemes registered. Ask your facility admin to add insurance schemes in settings.
              </Text>
            )}
          </>
        )}

        {/* Service type picker */}
        <TouchableOpacity style={styles.pickerButton} onPress={() => setServicePickerVisible(true)}>
          <MaterialCommunityIcons name="medical-bag" size={18} color="#0f766e" />
          <Text style={[styles.pickerText, styles.pickerTextSelected]}>{selectedServiceLabel}</Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TextInput
          style={styles.textArea}
          placeholder="Service description (optional)"
          value={serviceDescription}
          onChangeText={setServiceDescription}
          multiline
          numberOfLines={2}
        />

        {/* Amount field — label changes based on mode */}
        <TextInput
          style={styles.amountInput}
          placeholder={
            paymentMode === 'insurance'
              ? 'Total amount (covered by insurer) in KES'
              : paymentMode === 'split'
              ? 'Patient copay amount in KES'
              : 'Amount in KES'
          }
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {paymentMode === 'split' && (
          <Text style={styles.sectionHint}>
            Enter the amount the patient pays now. The remainder goes to the insurer as a claim.
          </Text>
        )}

        {paymentMode === 'insurance' && (
          <Text style={styles.sectionHint}>
            Patient will proceed to the doctor immediately — no cash collection needed.
          </Text>
        )}
      </View>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="account-arrow-right" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitText}>Check In & Record Bill</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Doctor Picker Modal ───────────────────────────────────────────── */}
      <Modal visible={doctorPickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDoctorPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Doctor</Text>
            {doctors.length === 0 ? (
              <Text style={styles.emptyText}>No doctors found in this facility.</Text>
            ) : (
              doctors.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.modalOption, selectedDoctor?.id === doc.id && styles.modalOptionSelected]}
                  onPress={() => { setSelectedDoctor(doc); setDoctorPickerVisible(false); }}
                >
                  <MaterialCommunityIcons name="doctor" size={18} color="#0f766e" />
                  <Text style={styles.modalOptionText}>Dr. {doc.firstName} {doc.lastName}</Text>
                  {selectedDoctor?.id === doc.id && (
                    <Ionicons name="checkmark" size={18} color="#0f766e" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Service Type Picker Modal ─────────────────────────────────────── */}
      <Modal visible={servicePickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setServicePickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Service Type</Text>
            {SERVICE_TYPES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.modalOption, serviceType === s.value && styles.modalOptionSelected]}
                onPress={() => { setServiceType(s.value); setServicePickerVisible(false); }}
              >
                <Text style={styles.modalOptionText}>{s.label}</Text>
                {serviceType === s.value && (
                  <Ionicons name="checkmark" size={18} color="#0f766e" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Insurance Scheme Picker Modal ─────────────────────────────────── */}
      <Modal visible={schemePickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
          onPress={() => setSchemePickerVisible(false)}>
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerModalTitle}>Select Insurance Scheme</Text>
            {insuranceSchemes.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.pickerOption}
                onPress={() => { setSelectedScheme(s); setSchemePickerVisible(false); }}
              >
                <Text style={styles.pickerOptionText}>{s.name}</Text>
                <Text style={styles.pickerOptionSub}>{s.code}</Text>
              </TouchableOpacity>
            ))}
            {insuranceSchemes.length === 0 && (
              <Text style={styles.emptyText}>No insurance schemes found</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },

  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { marginLeft: 6, color: '#64748b', fontSize: 15 },

  screenTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  screenSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#0f766e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18, marginTop: 8 },

  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginTop: 12, marginBottom: 6 },
  optional: { color: '#94a3b8', fontWeight: '400' },

  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#f8fafc' },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },

  resultsBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  resultName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  resultMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  selectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  selectedName: { fontSize: 14, fontWeight: '600', color: '#166534' },
  selectedMeta: { fontSize: 12, color: '#16a34a', marginTop: 2 },

  textArea: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a', minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },

  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc' },

  pickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#f8fafc', gap: 8, marginBottom: 10 },
  pickerText: { flex: 1, fontSize: 15, color: '#94a3b8' },
  pickerTextSelected: { color: '#0f172a' },

  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f766e', borderRadius: 12, height: 52, marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  modalOptionSelected: { backgroundColor: '#f0fdf4' },
  modalOptionText: { fontSize: 15, color: '#0f172a' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Payment mode selector
  payModeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  payModeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e2e8f0', alignItems: 'center',
  },
  payModeBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  payModeTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  payModeTxtActive: { color: '#0f766e', fontWeight: '700' },

  // Amount input
  amountInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#1e293b', marginTop: 10, backgroundColor: '#fff',
  },

  // Insurance scheme picker modal
  pickerModal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
  },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  pickerOption: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  pickerOptionSub: { fontSize: 12, color: '#94a3b8' },
});
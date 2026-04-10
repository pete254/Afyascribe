// src/screens/PrescriptionScreen.js
// Doctor writes a prescription after saving a SOAP note.
// Supports multiple medications, special instructions, and printing.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { printPrescription } from '../utils/printPrescription';

// ── Common medication frequencies ────────────────────────────────────────────
const FREQUENCIES = [
  'Once daily',
  'Twice daily (morning & night)',
  'Three times daily',
  'Four times daily',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'At bedtime',
  'With meals',
  'When required (PRN)',
  'Weekly',
  'Stat (single dose)',
];

// ── Common durations ──────────────────────────────────────────────────────────
const DURATIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days',
  '1 month', '2 months', '3 months', '6 months', 'Ongoing',
  'Until symptoms resolve',
];

// ── Common drugs (quick suggestions) ─────────────────────────────────────────
const COMMON_DRUGS = [
  { name: 'Amoxicillin 500mg', dosage: '500mg', defaultFreq: 'Three times daily', defaultDuration: '7 days', defaultQty: '21 caps' },
  { name: 'Metformin 500mg', dosage: '500mg', defaultFreq: 'Twice daily (morning & night)', defaultDuration: 'Ongoing', defaultQty: '60 tablets' },
  { name: 'Paracetamol 500mg', dosage: '500mg', defaultFreq: 'Three times daily', defaultDuration: '5 days', defaultQty: '15 tablets' },
  { name: 'Ibuprofen 400mg', dosage: '400mg', defaultFreq: 'Three times daily', defaultDuration: '5 days', defaultQty: '15 tablets', defaultInst: 'Take with food' },
  { name: 'Amlodipine 5mg', dosage: '5mg', defaultFreq: 'Once daily', defaultDuration: 'Ongoing', defaultQty: '30 tablets' },
  { name: 'Lisinopril 10mg', dosage: '10mg', defaultFreq: 'Once daily', defaultDuration: 'Ongoing', defaultQty: '30 tablets' },
  { name: 'Atorvastatin 20mg', dosage: '20mg', defaultFreq: 'Once daily (at bedtime)', defaultDuration: 'Ongoing', defaultQty: '30 tablets' },
  { name: 'Cotrimoxazole 480mg', dosage: '480mg', defaultFreq: 'Twice daily (morning & night)', defaultDuration: '7 days', defaultQty: '14 tablets' },
  { name: 'Metronidazole 400mg', dosage: '400mg', defaultFreq: 'Three times daily', defaultDuration: '7 days', defaultQty: '21 tablets', defaultInst: 'Avoid alcohol' },
  { name: 'Ciprofloxacin 500mg', dosage: '500mg', defaultFreq: 'Twice daily (morning & night)', defaultDuration: '7 days', defaultQty: '14 tablets' },
  { name: 'Omeprazole 20mg', dosage: '20mg', defaultFreq: 'Once daily', defaultDuration: '14 days', defaultQty: '14 capsules', defaultInst: 'Take 30 min before meals' },
  { name: 'Salbutamol Inhaler', dosage: '100mcg/puff', defaultFreq: 'When required (PRN)', defaultDuration: 'Ongoing', defaultQty: '1 inhaler' },
  { name: 'Prednisolone 5mg', dosage: '5mg', defaultFreq: 'Once daily', defaultDuration: '5 days', defaultQty: '5 tablets', defaultInst: 'Take with food. Do not stop abruptly.' },
  { name: 'Doxycycline 100mg', dosage: '100mg', defaultFreq: 'Twice daily (morning & night)', defaultDuration: '7 days', defaultQty: '14 tablets', defaultInst: 'Take with a full glass of water. Avoid sunlight.' },
  { name: 'Artemether-Lumefantrine (Coartem)', dosage: '4 tablets per dose', defaultFreq: 'Twice daily (morning & night)', defaultDuration: '3 days', defaultQty: '24 tablets', defaultInst: 'Take with food or whole milk' },
  { name: 'Oral Rehydration Salts (ORS)', dosage: '1 sachet', defaultFreq: 'After each loose stool', defaultDuration: 'Until diarrhoea stops', defaultQty: '10 sachets', defaultInst: 'Mix in 1 litre of clean water' },
  { name: 'Vitamin C 500mg', dosage: '500mg', defaultFreq: 'Once daily', defaultDuration: '1 month', defaultQty: '30 tablets' },
  { name: 'Folic Acid 5mg', dosage: '5mg', defaultFreq: 'Once daily', defaultDuration: '3 months', defaultQty: '90 tablets' },
  { name: 'Ferrous Sulphate 200mg', dosage: '200mg', defaultFreq: 'Twice daily (morning & night)', defaultDuration: '3 months', defaultQty: '180 tablets', defaultInst: 'Take with Vitamin C to improve absorption' },
  { name: 'Diclofenac 50mg', dosage: '50mg', defaultFreq: 'Three times daily', defaultDuration: '5 days', defaultQty: '15 tablets', defaultInst: 'Take with food' },
];

// ── Medication card ───────────────────────────────────────────────────────────
function MedicationCard({ med, index, onUpdate, onRemove }) {
  const [freqPickerVisible, setFreqPickerVisible] = useState(false);
  const [durPickerVisible, setDurPickerVisible] = useState(false);

  return (
    <View style={mc.card}>
      <View style={mc.cardHeader}>
        <View style={mc.numberBadge}>
          <Text style={mc.numberBadgeText}>{index + 1}</Text>
        </View>
        <Text style={mc.cardTitle} numberOfLines={1}>{med.name || 'New Medication'}</Text>
        <TouchableOpacity onPress={onRemove} style={mc.removeBtn}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Drug name */}
      <View style={mc.field}>
        <Text style={mc.fieldLabel}>Drug Name <Text style={mc.req}>*</Text></Text>
        <TextInput
          style={mc.input}
          value={med.name}
          onChangeText={v => onUpdate({ ...med, name: v })}
          placeholder="e.g. Amoxicillin 500mg"
          placeholderTextColor="#cbd5e1"
        />
      </View>

      {/* Dosage & Quantity */}
      <View style={mc.row}>
        <View style={[mc.field, { flex: 1, marginRight: 8 }]}>
          <Text style={mc.fieldLabel}>Dosage</Text>
          <TextInput
            style={mc.input}
            value={med.dosage}
            onChangeText={v => onUpdate({ ...med, dosage: v })}
            placeholder="e.g. 500mg"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={[mc.field, { flex: 1 }]}>
          <Text style={mc.fieldLabel}>Quantity</Text>
          <TextInput
            style={mc.input}
            value={med.quantity}
            onChangeText={v => onUpdate({ ...med, quantity: v })}
            placeholder="e.g. 21 tabs"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Frequency picker */}
      <View style={mc.field}>
        <Text style={mc.fieldLabel}>Frequency</Text>
        <TouchableOpacity
          style={[mc.input, mc.pickerTrigger]}
          onPress={() => setFreqPickerVisible(true)}
        >
          <MaterialCommunityIcons name="clock-outline" size={15} color={med.frequency ? '#0f766e' : '#94a3b8'} />
          <Text style={[mc.pickerText, !med.frequency && mc.placeholderText]}>
            {med.frequency || 'Select frequency…'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Duration picker */}
      <View style={mc.field}>
        <Text style={mc.fieldLabel}>Duration</Text>
        <TouchableOpacity
          style={[mc.input, mc.pickerTrigger]}
          onPress={() => setDurPickerVisible(true)}
        >
          <MaterialCommunityIcons name="calendar-range" size={15} color={med.duration ? '#0f766e' : '#94a3b8'} />
          <Text style={[mc.pickerText, !med.duration && mc.placeholderText]}>
            {med.duration || 'Select duration…'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={mc.field}>
        <Text style={mc.fieldLabel}>Special Instructions</Text>
        <TextInput
          style={mc.input}
          value={med.instructions}
          onChangeText={v => onUpdate({ ...med, instructions: v })}
          placeholder="e.g. Take with food, avoid alcohol…"
          placeholderTextColor="#cbd5e1"
        />
      </View>

      {/* Frequency modal */}
      <Modal visible={freqPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={() => setFreqPickerVisible(false)}>
          <View style={pm.sheet} onStartShouldSetResponder={() => true}>
            <Text style={pm.title}>Frequency</Text>
            <FlatList
              data={FREQUENCIES}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[pm.option, med.frequency === item && pm.optionActive]}
                  onPress={() => { onUpdate({ ...med, frequency: item }); setFreqPickerVisible(false); }}
                >
                  <Text style={[pm.optionText, med.frequency === item && pm.optionTextActive]}>{item}</Text>
                  {med.frequency === item && <Ionicons name="checkmark-circle" size={18} color="#0f766e" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Duration modal */}
      <Modal visible={durPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={() => setDurPickerVisible(false)}>
          <View style={pm.sheet} onStartShouldSetResponder={() => true}>
            <Text style={pm.title}>Duration</Text>
            <FlatList
              data={DURATIONS}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[pm.option, med.duration === item && pm.optionActive]}
                  onPress={() => { onUpdate({ ...med, duration: item }); setDurPickerVisible(false); }}
                >
                  <Text style={[pm.optionText, med.duration === item && pm.optionTextActive]}>{item}</Text>
                  {med.duration === item && <Ionicons name="checkmark-circle" size={18} color="#0f766e" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Drug suggestion picker ────────────────────────────────────────────────────
function DrugSuggestionPicker({ visible, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = COMMON_DRUGS.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={[pm.sheet, { maxHeight: '80%' }]}>
          <View style={pm.header}>
            <Text style={pm.title}>Quick Add Medication</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={pm.searchBox}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={pm.searchInput}
              placeholder="Search common medications…"
              value={search}
              onChangeText={setSearch}
              autoFocus
              placeholderTextColor="#94a3b8"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={i => i.name}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8' }}>No matches found</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={pm.drugRow} onPress={() => { onSelect(item); setSearch(''); }} activeOpacity={0.7}>
                <View style={pm.drugIcon}>
                  <MaterialCommunityIcons name="pill" size={18} color="#0f766e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pm.drugName}>{item.name}</Text>
                  <Text style={pm.drugMeta}>
                    {[item.defaultFreq, item.defaultDuration].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color="#0f766e" />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PrescriptionScreen({
  patient,
  soapNoteId,
  diagnosis,
  onBack,
  onDone,
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [medications, setMedications] = useState([]);
  const [notes, setNotes] = useState('');
  const [printing, setPrinting] = useState(false);
  const [drugPickerVisible, setDrugPickerVisible] = useState(false);

  const addBlankMedication = () => {
    setMedications(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: '',
      instructions: '',
    }]);
  };

  const handleSelectDrug = (drug) => {
    setDrugPickerVisible(false);
    setMedications(prev => [...prev, {
      id: Date.now().toString(),
      name: drug.name,
      dosage: drug.dosage || '',
      frequency: drug.defaultFreq || '',
      duration: drug.defaultDuration || '',
      quantity: drug.defaultQty || '',
      instructions: drug.defaultInst || '',
    }]);
  };

  const updateMedication = (id, updated) => {
    setMedications(prev => prev.map(m => m.id === id ? updated : m));
  };

  const removeMedication = (id) => {
    Alert.alert('Remove', 'Remove this medication?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setMedications(prev => prev.filter(m => m.id !== id)),
      },
    ]);
  };

  const handlePrint = async () => {
    if (medications.length === 0) {
      Alert.alert('No Medications', 'Add at least one medication before printing.');
      return;
    }

    // Validate required fields
    const incomplete = medications.find(m => !m.name?.trim());
    if (incomplete) {
      Alert.alert('Missing Info', 'Please enter a drug name for all medications.');
      return;
    }

    setPrinting(true);
    try {
      await printPrescription({
        patient,
        doctor: {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
        },
        medications,
        notes: notes.trim() || undefined,
        diagnosis: diagnosis || undefined,
        facility: {
          name: user?.facilityName || 'AfyaScribe Facility',
          phone: user?.facilityPhone || '',
          address: user?.facilityAddress || '',
        },
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate prescription.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Write Prescription</Text>
          <Text style={styles.headerSub}>
            {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
          </Text>
        </View>
        <View style={styles.rxBadge}>
          <Text style={styles.rxSymbol}>Rx</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Diagnosis banner (from SOAP note) */}
        {diagnosis ? (
          <View style={styles.diagnosisBanner}>
            <MaterialCommunityIcons name="stethoscope" size={16} color="#0f766e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.diagnosisBannerLabel}>Diagnosis</Text>
              <Text style={styles.diagnosisBannerText}>{diagnosis}</Text>
            </View>
          </View>
        ) : null}

        {/* Patient pill */}
        {patient && (
          <View style={styles.patientPill}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>
                {patient.firstName?.[0]}{patient.lastName?.[0]}
              </Text>
            </View>
            <View>
              <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
              <Text style={styles.patientId}>{patient.patientId}</Text>
            </View>
          </View>
        )}

        {/* Medications section */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="pill" size={16} color="#0f766e" />
          <Text style={styles.sectionTitle}>Medications</Text>
          {medications.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{medications.length}</Text>
            </View>
          )}
        </View>

        {/* Medication cards */}
        {medications.map((med, idx) => (
          <MedicationCard
            key={med.id}
            med={med}
            index={idx}
            onUpdate={updated => updateMedication(med.id, updated)}
            onRemove={() => removeMedication(med.id)}
          />
        ))}

        {/* Add medication buttons */}
        <TouchableOpacity
          style={styles.addFromSuggestionBtn}
          onPress={() => setDrugPickerVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="flash" size={18} color="#0f766e" />
          <Text style={styles.addFromSuggestionText}>Quick Add from Common Drugs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addCustomBtn}
          onPress={addBlankMedication}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color="#7c3aed" />
          <Text style={styles.addCustomText}>Add Custom Medication</Text>
        </TouchableOpacity>

        {/* Special instructions */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>
            <MaterialCommunityIcons name="note-text-outline" size={15} color="#0f766e" />{' '}
            Special Instructions / Notes
          </Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Drink plenty of fluids. Return if no improvement in 3 days. Avoid smoking…"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor="#cbd5e1"
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onDone}
          >
            <Text style={styles.skipBtnText}>Skip & Discharge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.printBtn, (printing || medications.length === 0) && styles.printBtnDisabled]}
            onPress={handlePrint}
            disabled={printing || medications.length === 0}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="printer" size={20} color="#fff" />
                <Text style={styles.printBtnText}>Print & Discharge</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Drug suggestion picker */}
      <DrugSuggestionPicker
        visible={drugPickerVisible}
        onSelect={handleSelectDrug}
        onClose={() => setDrugPickerVisible(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  rxBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  rxSymbol: { fontSize: 20, fontWeight: '900', color: '#0f766e', fontStyle: 'italic' },

  content: { padding: 16, paddingBottom: 40 },

  diagnosisBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12,
  },
  diagnosisBannerLabel: { fontSize: 10, fontWeight: '700', color: '#0f766e', textTransform: 'uppercase', letterSpacing: 0.5 },
  diagnosisBannerText: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },

  patientPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16,
  },
  patientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  countBadge: { backgroundColor: '#ccfbf1', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#0f766e' },

  addFromSuggestionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#bbf7d0', borderStyle: 'dashed',
    marginBottom: 10,
  },
  addFromSuggestionText: { fontSize: 14, fontWeight: '700', color: '#0f766e' },

  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f5f3ff', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#ddd6fe', borderStyle: 'dashed',
    marginBottom: 20,
  },
  addCustomText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },

  notesSection: { marginBottom: 20 },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  notesInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
    padding: 12, fontSize: 14, color: '#1e293b', minHeight: 80, lineHeight: 20,
  },

  actionRow: { flexDirection: 'row', gap: 12 },
  skipBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9',
  },
  skipBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  printBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#0f766e',
    shadowColor: '#0f766e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  printBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  printBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Medication card styles ─────────────────────────────────────────────────────
const mc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  numberBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0f766e', alignItems: 'center', justifyContent: 'center' },
  numberBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  removeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  row: { flexDirection: 'row' },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 5 },
  req: { color: '#ef4444' },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 14, color: '#0f172a',
  },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerText: { flex: 1, fontSize: 14, color: '#0f172a' },
  placeholderText: { color: '#cbd5e1' },
});

// ── Picker modal styles ────────────────────────────────────────────────────────
const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  optionActive: { backgroundColor: '#f0fdf9' },
  optionText: { fontSize: 14, color: '#0f172a' },
  optionTextActive: { color: '#0f766e', fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  drugRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  drugIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  drugName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  drugMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
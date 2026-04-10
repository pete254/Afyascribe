// src/screens/DischargeScreen.js
// UPDATED: Added "Write Prescription" option after SOAP note save
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Alert, ActivityIndicator, TextInput, Platform, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/apiService';

const APPOINTMENT_REASONS = [
  'Follow-up', 'Review Results', 'Wound Dressing', 'Medication Review',
  'Physiotherapy', 'Post-procedure Check', 'Vaccination', 'Antenatal Visit',
  'Chronic Disease Management', 'Specialist Referral', 'Other',
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const getDays = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < getFirstDay(viewYear, viewMonth); i++) cells.push(null);
  for (let d = 1; d <= getDays(viewYear, viewMonth); d++) cells.push(d);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const isPast = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d <= t;
  };
  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === selectedDate;
  };
  const handleDay = (day) => {
    if (!day || isPast(day)) return;
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(d);
  };

  return (
    <View style={cal.container}>
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Ionicons name="chevron-back" size={18} color="#0f766e" /></TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}><Ionicons name="chevron-forward" size={18} color="#0f766e" /></TouchableOpacity>
      </View>
      <View style={cal.weekRow}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <Text key={d} style={cal.weekLabel}>{d}</Text>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={cal.row}>
          {Array.from({ length: 7 }).map((_, di) => {
            const day = row[di] ?? null;
            const past = day ? isPast(day) : false;
            const sel = isSelected(day);
            return (
              <TouchableOpacity key={di} style={[cal.cell, sel && cal.selectedCell, past && cal.pastCell, !day && { opacity: 0 }]}
                onPress={() => handleDay(day)} disabled={!day || past}>
                <Text style={[cal.cellText, sel && cal.selectedCellText, past && cal.pastCellText]}>{day || ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DischargeScreen({
  patient,
  soapNoteId,
  diagnosis,
  onDischarge,
  onWritePrescription,
  onBack,
}) {
  const insets = useSafeAreaInsets();
  // 'options' | 'appointment' | 'prescription_confirm'
  const [mode, setMode] = useState('options');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedReason, setSelectedReason] = useState('Follow-up');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [reasonPickerVisible, setReasonPickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const hasEmail = !!patient?.email;

  const displayDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-KE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const handleDischargeNow = () => {
    Alert.alert(
      'Discharge Patient',
      `Discharge ${patient?.firstName} without a prescription or follow-up?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discharge', onPress: () => onDischarge?.({ scheduled: false }) },
      ],
    );
  };

  const handleSaveAppointment = async () => {
    if (!selectedDate) { Alert.alert('Missing', 'Please select a date'); return; }
    if (!selectedTime) { Alert.alert('Missing', 'Please select a time'); return; }

    setSaving(true);
    try {
      await apiService.createAppointment({
        patientId: patient.id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        reason: selectedReason,
        customReason: selectedReason === 'Other' ? customReason : undefined,
        notes: notes.trim() || undefined,
        soapNoteId: soapNoteId || undefined,
      });

      Alert.alert(
        '✅ Appointment Scheduled',
        `Follow-up booked for ${displayDate} at ${selectedTime}.${hasEmail ? '\n\nA confirmation email has been sent to the patient.' : ''}`,
        [{ text: 'Discharge Patient', onPress: () => onDischarge?.({ scheduled: true }) }],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to schedule appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconBox}>
          <MaterialCommunityIcons name="check-circle-outline" size={40} color="#0f766e" />
        </View>
        <Text style={styles.headerTitle}>SOAP Note Saved ✓</Text>
        <Text style={styles.headerSub}>
          What would you like to do next for {patient?.firstName}?
        </Text>
      </View>

      {/* Patient pill */}
      <View style={styles.patientPill}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarText}>
            {patient?.firstName?.[0]}{patient?.lastName?.[0]}
          </Text>
        </View>
        <View>
          <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
          <Text style={styles.patientId}>{patient?.patientId}</Text>
        </View>
      </View>

      {/* ── Main option cards ── */}
      {mode === 'options' && (
        <View style={styles.optionsGrid}>

          {/* Write Prescription */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardPurple]}
            onPress={() => onWritePrescription?.()}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIconBox, { backgroundColor: '#ede9fe' }]}>
              <MaterialCommunityIcons name="pill" size={32} color="#7c3aed" />
            </View>
            <Text style={[styles.optionTitle, { color: '#7c3aed' }]}>Write Prescription</Text>
            <Text style={styles.optionSubtitle}>
              Create a printable prescription with medications
            </Text>
          </TouchableOpacity>

          {/* Schedule Follow-up */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardTeal]}
            onPress={() => setMode('appointment')}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIconBox, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="calendar-plus" size={32} color="#0f766e" />
            </View>
            <Text style={[styles.optionTitle, { color: '#0f766e' }]}>Schedule Follow-up</Text>
            <Text style={styles.optionSubtitle}>
              Book a return appointment and discharge the patient
            </Text>
          </TouchableOpacity>

          {/* Discharge Now */}
          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardGray]}
            onPress={handleDischargeNow}
            activeOpacity={0.85}
          >
            <View style={[styles.optionIconBox, { backgroundColor: '#f1f5f9' }]}>
              <MaterialCommunityIcons name="exit-run" size={32} color="#64748b" />
            </View>
            <Text style={[styles.optionTitle, { color: '#374151' }]}>Discharge Now</Text>
            <Text style={styles.optionSubtitle}>
              Discharge without a prescription or follow-up
            </Text>
          </TouchableOpacity>

        </View>
      )}

      {/* ── Appointment form ── */}
      {mode === 'appointment' && (
        <View style={styles.apptForm}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setMode('options')}>
              <Ionicons name="arrow-back" size={20} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Schedule Follow-up</Text>
          </View>

          {!hasEmail && (
            <View style={styles.noEmailWarning}>
              <Ionicons name="warning-outline" size={16} color="#b45309" />
              <Text style={styles.noEmailWarningText}>
                Patient has no email — confirmation cannot be sent. Update profile to add one.
              </Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Select Date <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
          {selectedDate && (
            <View style={styles.selectedDateBadge}>
              <Ionicons name="calendar" size={14} color="#0f766e" />
              <Text style={styles.selectedDateText}>{displayDate}</Text>
            </View>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Select Time <Text style={{ color: '#ef4444' }}>*</Text>
          </Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setTimePickerVisible(true)}>
            <Ionicons name="time-outline" size={18} color={selectedTime ? '#0f766e' : '#94a3b8'} />
            <Text style={[styles.pickerBtnText, selectedTime && { color: '#0f172a' }]}>
              {selectedTime || 'Select time slot...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Reason for Visit</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setReasonPickerVisible(true)}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={18} color="#0f766e" />
            <Text style={[styles.pickerBtnText, { color: '#0f172a' }]}>{selectedReason}</Text>
            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {selectedReason === 'Other' && (
            <TextInput
              style={styles.textInput}
              placeholder="Specify reason..."
              value={customReason}
              onChangeText={setCustomReason}
              placeholderTextColor="#94a3b8"
            />
          )}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 80 }]}
            placeholder="Instructions, preparations, things to bring..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveAppointment}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {hasEmail ? 'Book & Send Confirmation' : 'Book Appointment'}
                  </Text>
                </>
              )
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => onDischarge?.({ scheduled: false })} disabled={saving}>
            <Text style={styles.skipBtnText}>Skip & Discharge Without Appointment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Time picker modal */}
      <Modal visible={timePickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTimePickerVisible(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Time Slot</Text>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={t => t}
              numColumns={3}
              contentContainerStyle={{ gap: 8, padding: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.timeChip, selectedTime === item && styles.timeChipActive]}
                  onPress={() => { setSelectedTime(item); setTimePickerVisible(false); }}
                >
                  <Text style={[styles.timeChipText, selectedTime === item && styles.timeChipTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reason picker modal */}
      <Modal visible={reasonPickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReasonPickerVisible(false)}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Reason for Appointment</Text>
            {APPOINTMENT_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonOption, selectedReason === r && styles.reasonOptionActive]}
                onPress={() => { setSelectedReason(r); setReasonPickerVisible(false); }}
              >
                <Text style={[styles.reasonOptionText, selectedReason === r && styles.reasonOptionTextActive]}>{r}</Text>
                {selectedReason === r && <Ionicons name="checkmark" size={18} color="#0f766e" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  headerIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  headerSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  patientPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24,
  },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { fontSize: 16, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  patientId: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  optionsGrid: { gap: 12 },
  optionCard: {
    borderRadius: 16, padding: 20, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  optionCardPurple: { backgroundColor: '#faf5ff', borderColor: '#ddd6fe' },
  optionCardTeal: { backgroundColor: '#f0fdf4', borderColor: '#6ee7b7' },
  optionCardGray: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  optionIconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 5 },
  optionSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 18 },

  apptForm: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  noEmailWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 16,
  },
  noEmailWarningText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#f8fafc',
  },
  pickerBtnText: { flex: 1, fontSize: 15, color: '#94a3b8' },
  textInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#0f172a', backgroundColor: '#f8fafc',
  },
  selectedDateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0', marginTop: 8,
  },
  selectedDateText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 15, marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  skipBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '70%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  timeChip: {
    flex: 1, margin: 4, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center',
  },
  timeChipActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  timeChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  timeChipTextActive: { color: '#0f766e', fontWeight: '700' },
  reasonOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  reasonOptionActive: { backgroundColor: '#f0fdf9' },
  reasonOptionText: { fontSize: 15, color: '#0f172a' },
  reasonOptionTextActive: { color: '#0f766e', fontWeight: '600' },
});

const cal = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  weekLabel: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  cell: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  selectedCell: { backgroundColor: '#0f766e' },
  pastCell: { opacity: 0.35 },
  cellText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  selectedCellText: { color: '#fff', fontWeight: '800' },
  pastCellText: { color: '#94a3b8' },
});
// src/components/ColorCodedVitals.js
// Displays triage vitals with color coding based on normal ranges
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getVitalStatus,
  getStatusColor,
  getStatusBackgroundColor,
  getStatusBorderColor,
} from '../utils/triageColors';

// ── Single vital chip ─────────────────────────────────────────────────────────
function VitalChip({ icon, label, value, unit, status, compact = false }) {
  const bgColor = getStatusBackgroundColor(status);
  const textColor = getStatusColor(status);
  const borderColor = getStatusBorderColor(status);
  const isCritical = status === 'critical' || status === 'warning';

  if (compact) {
    return (
      <View style={[chip.compactContainer, { backgroundColor: bgColor, borderColor }]}>
        <MaterialCommunityIcons name={icon} size={13} color={textColor} />
        <Text style={[chip.compactValue, { color: textColor }]}>{value}</Text>
        <Text style={[chip.compactLabel, { color: textColor }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[chip.container, { backgroundColor: bgColor, borderColor }]}>
      {isCritical && (
        <View style={chip.alertDot} />
      )}
      <MaterialCommunityIcons name={icon} size={16} color={textColor} style={{ marginBottom: 4 }} />
      <Text style={[chip.value, { color: textColor }]}>{value}</Text>
      <Text style={[chip.unit, { color: textColor + '99' }]}>{unit}</Text>
      <Text style={[chip.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ColorCodedVitals({ triageData, compact = false }) {
  if (!triageData) return null;

  const { bloodPressure, temperature, pulse, spO2, weight, height, respiratoryRate, notes } = triageData;

  const vitals = [
    bloodPressure && {
      icon: 'heart-pulse',
      label: 'BP',
      value: bloodPressure,
      unit: 'mmHg',
      status: getVitalStatus('bloodPressure', bloodPressure),
    },
    temperature && {
      icon: 'thermometer',
      label: 'Temp',
      value: temperature,
      unit: '°C',
      status: getVitalStatus('temperature', temperature),
    },
    pulse && {
      icon: 'heart',
      label: 'Pulse',
      value: pulse,
      unit: 'bpm',
      status: getVitalStatus('pulse', pulse),
    },
    spO2 && {
      icon: 'lung',
      label: 'SpO₂',
      value: spO2,
      unit: '%',
      status: getVitalStatus('spO2', spO2),
    },
    weight && {
      icon: 'weight',
      label: 'Weight',
      value: weight,
      unit: 'kg',
      status: 'normal',
    },
    height && {
      icon: 'human-male-height',
      label: 'Height',
      value: height,
      unit: 'cm',
      status: 'normal',
    },
    respiratoryRate && {
      icon: 'wind-power',
      label: 'RR',
      value: respiratoryRate,
      unit: '/min',
      status: getVitalStatus('pulse', respiratoryRate), // Use pulse logic temporarily
    },
  ].filter(Boolean);

  const hasCritical = vitals.some(v => v.status === 'critical');

  if (compact) {
    return (
      <View style={s.compactGrid}>
        {vitals.map((v, i) => (
          <VitalChip key={i} {...v} compact={true} />
        ))}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {hasCritical && (
        <View style={s.criticalBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
          <Text style={s.criticalBannerText}>Critical vitals detected — review before consultation</Text>
        </View>
      )}

      <View style={s.grid}>
        {vitals.map((v, i) => (
          <VitalChip key={i} {...v} compact={false} />
        ))}
      </View>

      {notes ? (
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>Clinical Notes:</Text>
          <Text style={s.notesText}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 70,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
  compactContainer: {
    flex: 1,
    minWidth: 60,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  value: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  compactValue: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  unit: { fontSize: 10, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  compactLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statusLabel: { fontSize: 9, fontWeight: '500', marginTop: 3, textAlign: 'center' },
});

const s = StyleSheet.create({
  container: {},
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  criticalBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#374151', lineHeight: 18 },
});
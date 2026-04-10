// src/components/ColorCodedVitals.js
// Displays triage vitals with color coding based on normal ranges + legend
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
  const isCritical = status === 'critical';
  const isWarning = status === 'warning';

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
      {(isCritical || isWarning) && (
        <View style={[chip.alertDot, { backgroundColor: isCritical ? '#ef4444' : '#f59e0b' }]} />
      )}
      <MaterialCommunityIcons name={icon} size={18} color={textColor} style={{ marginBottom: 6 }} />
      <Text style={[chip.value, { color: textColor }]}>{value}</Text>
      {unit ? <Text style={[chip.unit, { color: textColor + '99' }]}>{unit}</Text> : null}
      <Text style={[chip.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function VitalLegend({ compact = false }) {
  const items = [
    { status: 'normal',  color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'Normal' },
    { status: 'warning', color: '#f59e0b', bg: '#fefce8', border: '#fde047', label: 'Caution' },
    { status: 'critical',color: '#ef4444', bg: '#fee2e2', border: '#fecaca', label: 'Critical' },
    { status: 'unknown', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Not recorded' },
  ];

  if (compact) {
    return (
      <View style={legend.compactContainer}>
        <View style={legend.compactItemsRow}>
          {items.map((item) => (
            <View key={item.status} style={legend.compactItem}>
              <View style={[legend.dot, { backgroundColor: item.bg, borderColor: item.border }]}>
                <View style={[legend.dotInner, { backgroundColor: item.color }]} />
              </View>
              <Text style={legend.compactItemLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={legend.container}>
      <View style={legend.titleRow}>
        <MaterialCommunityIcons name="information-outline" size={13} color="#64748b" />
        <Text style={legend.title}>Vital Signs Legend</Text>
      </View>
      <View style={legend.itemsRow}>
        {items.map((item) => (
          <View key={item.status} style={legend.item}>
            <View style={[legend.dot, { backgroundColor: item.bg, borderColor: item.border }]}>
              <View style={[legend.dotInner, { backgroundColor: item.color }]} />
            </View>
            <Text style={legend.itemLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={legend.rangesContainer}>
        <Text style={legend.rangesTitle}>Normal Ranges:</Text>
        <View style={legend.rangesGrid}>
          {[
            { v: 'BP', r: '<120/80 mmHg' },
            { v: 'Temp', r: '36.5–37.5°C' },
            { v: 'Pulse', r: '60–100 bpm' },
            { v: 'SpO₂', r: '95–100%' },
          ].map((r) => (
            <View key={r.v} style={legend.rangeRow}>
              <Text style={legend.rangeVital}>{r.v}</Text>
              <Text style={legend.rangeValue}>{r.r}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ColorCodedVitals({ triageData, compact = false, showLegend = false }) {
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
      icon: 'lungs',
      label: 'SpO₂',
      value: spO2,
      unit: '%',
      status: getVitalStatus('spO2', spO2),
    },
    weight && {
      icon: 'scale-bathroom',
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
      icon: 'lungs',
      label: 'RR',
      value: respiratoryRate,
      unit: '/min',
      status: getVitalStatus('respiratoryRate', respiratoryRate),
    },
  ].filter(Boolean);

  const hasCritical = vitals.some(v => v.status === 'critical');
  const hasWarning = vitals.some(v => v.status === 'warning');

  if (compact) {
    return (
      <View style={s.compactContainer}>
        <View style={s.compactGrid}>
          {vitals.map((v, i) => (
            <VitalChip key={i} {...v} compact={true} />
          ))}
        </View>
        {showLegend && <VitalLegend compact={true} />}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Alert banners */}
      {hasCritical && (
        <View style={s.criticalBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
          <Text style={s.criticalBannerText}>⚠ Critical vitals detected — review before consultation</Text>
        </View>
      )}
      {!hasCritical && hasWarning && (
        <View style={s.warningBanner}>
          <MaterialCommunityIcons name="alert" size={16} color="#d97706" />
          <Text style={s.warningBannerText}>Some vitals are outside normal range</Text>
        </View>
      )}

      {/* Vitals grid */}
      <View style={s.grid}>
        {vitals.map((v, i) => (
          <VitalChip key={i} {...v} compact={false} />
        ))}
      </View>

      {/* Clinical notes */}
      {notes ? (
        <View style={s.notesBox}>
          <View style={s.notesHeader}>
            <MaterialCommunityIcons name="note-text-outline" size={14} color="#64748b" />
            <Text style={s.notesLabel}>Clinical Notes</Text>
          </View>
          <Text style={s.notesText}>{notes}</Text>
        </View>
      ) : null}

      {/* Legend */}
      {showLegend && <VitalLegend />}
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 75,
    maxWidth: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  compactContainer: {
    flex: 1,
    minWidth: 58,
    borderRadius: 8,
    borderWidth: 1,
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: { fontSize: 16, fontWeight: '800', marginBottom: 2, marginTop: 2 },
  compactValue: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  unit: { fontSize: 10, marginBottom: 5 },
  label: { fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  compactLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
});

const legend = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactContainer: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  compactItemsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: '48%',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  compactItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  rangesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  rangesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  rangesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '47%',
  },
  rangeVital: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
    minWidth: 32,
  },
  rangeValue: {
    fontSize: 11,
    color: '#475569',
  },
});

const s = StyleSheet.create({
  container: {},
  compactContainer: {
    width: '100%',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  criticalBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fefce8',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#fde047',
    marginBottom: 12,
  },
  warningBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#b45309' },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 13, color: '#374151', lineHeight: 18 },
});
// src/screens/MyQueueScreen.js
// UPDATED: Embedded VisitBillingPanel so doctors can add/edit bills during consultation

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../services/apiService';
import VisitBillingPanel from '../components/VisitBillingPanel';

export default function MyQueueScreen({ onBack, onOpenSoapNote, onTriagePatient }) {
  const insets = useSafeAreaInsets();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Track which visit has billing expanded
  const [expandedBillingVisitId, setExpandedBillingVisitId] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiService.getMyQueue();
      setVisits(data);
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const handleOpenPatient = async (visit) => {
    try {
      await apiService.markWithDoctor(visit.id);
      onOpenSoapNote && onOpenSoapNote(visit);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to open patient');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  const waitingTime = (dateStr) => {
    if (!dateStr) return '';
    const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (mins < 60) return `${mins}m waiting`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m waiting`;
  };

  const toggleBilling = (visitId) => {
    setExpandedBillingVisitId(prev => prev === visitId ? null : visitId);
  };

  const renderVisit = ({ item, index }) => {
    const patient = item.patient;
    const isWithMe = item.status === 'with_doctor';
    const isBillingExpanded = expandedBillingVisitId === item.id;

    return (
      <View style={[styles.card, isWithMe && styles.cardActive]}>
        <View style={styles.queueNum}>
          <Text style={styles.queueNumText}>{index + 1}</Text>
        </View>

        <View style={{ flex: 1 }}>
          {/* Patient header */}
          <View style={styles.cardTop}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
              <Text style={styles.patientId}>{patient?.patientId}</Text>
            </View>
            {isWithMe && (
              <View style={styles.withMeBadge}>
                <Text style={styles.withMeText}>With You</Text>
              </View>
            )}
          </View>

          {/* Reason for visit */}
          <View style={styles.reasonRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color="#94a3b8" />
            <Text style={styles.reasonText} numberOfLines={2}>{item.reasonForVisit}</Text>
          </View>

          {/* Triage vitals */}
          {item.triageCompleted && item.triageData && (
            <View style={styles.triageBox}>
              <Text style={styles.triageBoxTitle}>
                <MaterialCommunityIcons name="heart-pulse" size={13} color="#0f766e" /> Triage Vitals
              </Text>
              <View style={styles.vitalsRow}>
                {item.triageData.bloodPressure && <View style={styles.vital}><Text style={styles.vitalVal}>{item.triageData.bloodPressure}</Text><Text style={styles.vitalLabel}>BP</Text></View>}
                {item.triageData.temperature && <View style={styles.vital}><Text style={styles.vitalVal}>{item.triageData.temperature}</Text><Text style={styles.vitalLabel}>Temp</Text></View>}
                {item.triageData.pulse && <View style={styles.vital}><Text style={styles.vitalVal}>{item.triageData.pulse}</Text><Text style={styles.vitalLabel}>Pulse</Text></View>}
                {item.triageData.spO2 && <View style={styles.vital}><Text style={styles.vitalVal}>{item.triageData.spO2}</Text><Text style={styles.vitalLabel}>SpO₂</Text></View>}
                {item.triageData.weight && <View style={styles.vital}><Text style={styles.vitalVal}>{item.triageData.weight}</Text><Text style={styles.vitalLabel}>Weight</Text></View>}
              </View>
              {item.triageData.notes ? <Text style={styles.triageNotes}>{item.triageData.notes}</Text> : null}
            </View>
          )}

          {!item.triageCompleted && (
            <View style={styles.noTriageBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
              <Text style={styles.noTriageText}>No triage recorded</Text>
            </View>
          )}

          <Text style={styles.waitTime}>{waitingTime(item.checkedInAt)}</Text>

          {/* ── BILLING SECTION ── */}
          <View style={styles.billingSectionContainer}>
            <TouchableOpacity
              style={[styles.billingToggle, isBillingExpanded && styles.billingToggleActive]}
              onPress={() => toggleBilling(item.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="cash-register"
                size={15}
                color={isBillingExpanded ? '#0f766e' : '#64748b'}
              />
              <Text style={[styles.billingToggleText, isBillingExpanded && styles.billingToggleTextActive]}>
                {isBillingExpanded ? 'Hide Bills' : 'Manage Bills'}
              </Text>
              <Ionicons
                name={isBillingExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={isBillingExpanded ? '#0f766e' : '#94a3b8'}
              />
            </TouchableOpacity>

            {isBillingExpanded && (
              <View style={styles.billingPanelWrapper}>
                <VisitBillingPanel
                  visit={item}
                  onBillsChanged={loadQueue}
                />
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {!item.triageCompleted && (
              <TouchableOpacity
                style={styles.triageBtn}
                onPress={() => onTriagePatient && onTriagePatient(item)}
              >
                <MaterialCommunityIcons name="heart-pulse" size={15} color="#7c3aed" />
                <Text style={styles.triagedBtnText}>Do Triage</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.soapBtn, !item.triageCompleted && styles.soapBtnSecondary]}
              onPress={() => handleOpenPatient(item)}
            >
              <MaterialCommunityIcons name="microphone-outline" size={15} color="#fff" />
              <Text style={styles.soapBtnText}>Open & Write SOAP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Queue</Text>
          <Text style={styles.headerSub}>{visits.length} patient{visits.length !== 1 ? 's' : ''} assigned to you</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#0f766e" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisit}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-clock-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No patients yet</Text>
            <Text style={styles.emptySub}>Patients assigned to you will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8' },
  refreshBtn: { marginLeft: 'auto', padding: 4 },
  list: { padding: 16, gap: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  cardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },

  queueNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  queueNumText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  withMeBadge: { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  withMeText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 },
  reasonText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18 },

  triageBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  triageBoxTitle: { fontSize: 12, fontWeight: '700', color: '#0f766e', marginBottom: 8 },
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vital: { backgroundColor: '#fff', borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 56, borderWidth: 1, borderColor: '#d1fae5' },
  vitalVal: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  vitalLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  triageNotes: { fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' },

  noTriageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  noTriageText: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },

  waitTime: { fontSize: 12, color: '#94a3b8', marginBottom: 10 },

  // ── Billing section ───────────────────────────────────────────────────────
  billingSectionContainer: { marginBottom: 12 },
  billingToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 9, paddingHorizontal: 12,
    backgroundColor: '#f8fafc', borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  billingToggleActive: {
    backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
  },
  billingToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#64748b' },
  billingToggleTextActive: { color: '#0f766e' },
  billingPanelWrapper: {
    marginTop: 8, padding: 14,
    backgroundColor: '#fafafa', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  actions: { flexDirection: 'row', gap: 8 },
  triageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe',
  },
  triagedBtnText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },
  soapBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f766e',
  },
  soapBtnSecondary: { backgroundColor: '#334155' },
  soapBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
// src/screens/QueueScreen.js
// Full facility queue — receptionist / nurse / admin view
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, Modal, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const STATUS_COLOR = {
  checked_in:         { bg: '#fef9c3', text: '#854d0e', label: 'Checked In' },
  triage:             { bg: '#fce7f3', text: '#9d174d', label: 'Triage' },
  waiting_for_doctor: { bg: '#dbeafe', text: '#1e40af', label: 'Waiting' },
  with_doctor:        { bg: '#dcfce7', text: '#166534', label: 'With Doctor' },
  completed:          { bg: '#f1f5f9', text: '#64748b', label: 'Completed' },
  cancelled:          { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' },
};

export default function QueueScreen({ onBack, onTriagePatient }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const canReassign = user?.role === 'receptionist' || user?.role === 'facility_admin' || user?.role === 'super_admin';
  const canCancel = canReassign;
  const canTriage = user?.role === 'nurse' || user?.role === 'doctor' || user?.role === 'facility_admin';

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiService.getActiveQueue();
      setVisits(data);
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    try {
      const data = await apiService.getFacilityDoctors();
      setDoctors(data);
    } catch (e) {
      console.error('Failed to load doctors:', e);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadDoctors();
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [loadQueue, loadDoctors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const handleCancel = (visit) => {
    Alert.alert(
      'Cancel Visit',
      `Cancel visit for ${visit.patient?.firstName} ${visit.patient?.lastName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.cancelVisit(visit.id);
              loadQueue();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to cancel visit');
            }
          },
        },
      ]
    );
  };

  const handleReassign = async (doctorId) => {
    if (!selectedVisit) return;
    setReassigning(true);
    try {
      await apiService.reassignVisit(selectedVisit.id, doctorId);
      setReassignModal(false);
      setSelectedVisit(null);
      loadQueue();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to reassign');
    } finally {
      setReassigning(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  const renderVisit = ({ item }) => {
    const s = STATUS_COLOR[item.status] || STATUS_COLOR.checked_in;
    const patient = item.patient;
    const doctor = item.assignedDoctor;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {patient?.firstName?.[0]}{patient?.lastName?.[0]}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
            <Text style={styles.patientId}>{patient?.patientId}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>{item.reasonForVisit}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="doctor" size={14} color="#94a3b8" />
            <Text style={styles.metaText}>
              {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Unassigned'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#94a3b8" />
            <Text style={styles.metaText}>{formatTime(item.checkedInAt)}</Text>
            {item.triageCompleted && (
              <View style={styles.triagedBadge}>
                <Text style={styles.triagedText}>✓ Triaged</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {canTriage && item.status !== 'completed' && item.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onTriagePatient && onTriagePatient(item)}
            >
              <MaterialCommunityIcons name="heart-pulse" size={15} color="#0f766e" />
              <Text style={styles.actionBtnText}>Triage</Text>
            </TouchableOpacity>
          )}
          {canReassign && item.status !== 'completed' && item.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelectedVisit(item); setReassignModal(true); }}
            >
              <MaterialCommunityIcons name="account-switch-outline" size={15} color="#2563eb" />
              <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Reassign</Text>
            </TouchableOpacity>
          )}
          {canCancel && item.status !== 'completed' && item.status !== 'cancelled' && (
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleCancel(item)}>
              <Ionicons name="close-circle-outline" size={15} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Cancel</Text>
            </TouchableOpacity>
          )}
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Today's Queue</Text>
          <Text style={styles.headerSub}>{visits.length} active patient{visits.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#0f766e" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisit}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySub}>No active patients today</Text>
          </View>
        }
      />

      {/* Reassign Modal */}
      <Modal visible={reassignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Doctor</Text>
              <TouchableOpacity onPress={() => setReassignModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {doctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.doctorOption,
                  selectedVisit?.assignedDoctorId === doc.id && styles.doctorOptionActive,
                ]}
                onPress={() => handleReassign(doc.id)}
                disabled={reassigning}
              >
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>{doc.firstName[0]}{doc.lastName[0]}</Text>
                </View>
                <Text style={styles.doctorName}>Dr. {doc.firstName} {doc.lastName}</Text>
                {selectedVisit?.assignedDoctorId === doc.id && (
                  <Text style={styles.currentLabel}>Current</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 12, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8' },
  refreshBtn: { marginLeft: 'auto', padding: 4 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardMeta: { gap: 6, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', flex: 1 },
  triagedBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  triagedText: { fontSize: 11, color: '#166534', fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
  },
  cancelBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#0f766e' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9ca3af', marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  doctorOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 10,
  },
  doctorOptionActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  doctorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center' },
  doctorAvatarText: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  doctorName: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  currentLabel: { fontSize: 12, color: '#0f766e', fontWeight: '600' },
});
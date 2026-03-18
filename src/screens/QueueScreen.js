// src/screens/QueueScreen.js
// Full facility queue — receptionist / nurse / admin view
// Updated: shows billing status badge; receptionist can mark bills as paid
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

  // Billing state
  const [billingData, setBillingData] = useState({}); // visitId → { bills, summary }
  const [billingModal, setBillingModal] = useState(false);
  const [billingVisit, setBillingVisit] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const canReassign = ['receptionist', 'facility_admin', 'super_admin'].includes(user?.role);
  const canCancel = canReassign;
  const canTriage = ['nurse', 'doctor', 'facility_admin'].includes(user?.role);
  const canManageBilling = ['receptionist', 'facility_admin', 'super_admin'].includes(user?.role);

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiService.getActiveQueue();
      setVisits(data);
      // Load billing summaries for all visits
      loadBillingSummaries(data);
    } catch (e) {
      console.error('Failed to load queue:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBillingSummaries = async (visitList) => {
    const summaries = {};
    await Promise.allSettled(
      visitList.map(async (v) => {
        try {
          const summary = await apiService.getVisitBillingSummary(v.id);
          summaries[v.id] = summary;
        } catch {
          // no bills yet — that's fine
        }
      })
    );
    setBillingData(summaries);
  };

  const loadBillsForVisit = async (visit) => {
    try {
      const bills = await apiService.getVisitBills(visit.id);
      const summary = await apiService.getVisitBillingSummary(visit.id);
      setBillingData(prev => ({ ...prev, [visit.id]: { ...summary, bills } }));
      return bills;
    } catch (e) {
      console.error('Failed to load bills:', e);
      return [];
    }
  };

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

  const handleOpenBilling = async (visit) => {
    setBillingVisit(visit);
    await loadBillsForVisit(visit);
    setBillingModal(true);
  };

  const handleMarkPaid = async (bill) => {
    Alert.alert(
      'Confirm Payment',
      `Mark KES ${parseFloat(bill.amount).toLocaleString()} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setMarkingPaid(true);
            try {
              await apiService.markBillPaid(bill.id);
              // Refresh bills and queue
              if (billingVisit) await loadBillsForVisit(billingVisit);
              await loadQueue();
              // If no more unpaid, close modal
              const summary = billingData[billingVisit?.id];
              if (summary && !summary.hasPendingBills) setBillingModal(false);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to mark as paid');
            } finally {
              setMarkingPaid(false);
            }
          },
        },
      ]
    );
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

  const renderBillingBadge = (visitId) => {
    const summary = billingData[visitId];
    if (!summary || summary.total === 0) return null;

    if (summary.hasPendingBills) {
      return (
        <View style={styles.billBadgeUnpaid}>
          <MaterialCommunityIcons name="cash-clock" size={12} color="#b45309" />
          <Text style={styles.billBadgeTextUnpaid}>KES {summary.unpaid?.toLocaleString()} unpaid</Text>
        </View>
      );
    }
    return (
      <View style={styles.billBadgePaid}>
        <MaterialCommunityIcons name="cash-check" size={12} color="#166534" />
        <Text style={styles.billBadgeTextPaid}>Bill cleared</Text>
      </View>
    );
  };

  const renderVisit = ({ item }) => {
    const s = STATUS_COLOR[item.status] || STATUS_COLOR.checked_in;
    const patient = item.patient;
    const doctor = item.assignedDoctor;
    const summary = billingData[item.id];
    const hasUnpaidBills = summary?.hasPendingBills;

    return (
      <View style={[styles.card, hasUnpaidBills && styles.cardWithUnpaidBill]}>
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

        {/* Billing badge */}
        <View style={styles.billingRow}>
          {renderBillingBadge(item.id)}
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
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          {/* Mark bill paid — only shown if there are unpaid bills and user can manage billing */}
          {hasUnpaidBills && canManageBilling && (
            <TouchableOpacity
              style={styles.actionBtnBill}
              onPress={() => handleOpenBilling(item)}
            >
              <MaterialCommunityIcons name="cash-register" size={14} color="#b45309" />
              <Text style={styles.actionBtnBillText}>Collect Payment</Text>
            </TouchableOpacity>
          )}

          {canTriage && item.status === 'checked_in' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onTriagePatient(item)}>
              <MaterialCommunityIcons name="stethoscope" size={14} color="#0f766e" />
              <Text style={styles.actionBtnText}>Triage</Text>
            </TouchableOpacity>
          )}

          {canReassign && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelectedVisit(item); setReassignModal(true); }}
            >
              <MaterialCommunityIcons name="account-switch-outline" size={14} color="#0f766e" />
              <Text style={styles.actionBtnText}>Reassign</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleCancel(item)}>
              <MaterialCommunityIcons name="close-circle-outline" size={14} color="#dc2626" />
              <Text style={styles.actionBtnDangerText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
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
          <Text style={styles.headerSub}>{visits.length} active visit{visits.length !== 1 ? 's' : ''}</Text>
        </View>
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
            <Text style={styles.emptyText}>No active visits today</Text>
          </View>
        }
      />

      {/* ── Billing Modal ──────────────────────────────────────────────────── */}
      <Modal visible={billingModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBillingModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                💰 Bill — {billingVisit?.patient?.firstName} {billingVisit?.patient?.lastName}
              </Text>
              <TouchableOpacity onPress={() => setBillingModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {(() => {
              const data = billingData[billingVisit?.id];
              const bills = data?.bills ?? [];
              return (
                <>
                  {bills.map((bill) => (
                    <View key={bill.id} style={styles.billRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.billService}>{bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)}</Text>
                        {bill.serviceDescription ? (
                          <Text style={styles.billDesc}>{bill.serviceDescription}</Text>
                        ) : null}
                        <Text style={styles.billAmt}>KES {parseFloat(bill.amount).toLocaleString()}</Text>
                      </View>
                      {bill.status === 'unpaid' ? (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => handleMarkPaid(bill)}
                          disabled={markingPaid}
                        >
                          {markingPaid ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.payBtnText}>Mark Paid</Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.paidTag}>
                          <Ionicons name="checkmark-circle" size={14} color="#166534" />
                          <Text style={styles.paidTagText}>{bill.status === 'waived' ? 'Waived' : 'Paid'}</Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {bills.length === 0 && (
                    <Text style={styles.noBillsText}>No bills recorded for this visit.</Text>
                  )}

                  {data && data.total > 0 && (
                    <View style={styles.billTotals}>
                      <Text style={styles.billTotalLabel}>Total: <Text style={styles.billTotalVal}>KES {data.total?.toLocaleString()}</Text></Text>
                      {data.hasPendingBills && (
                        <Text style={styles.billUnpaidLabel}>Unpaid: <Text style={styles.billUnpaidVal}>KES {data.unpaid?.toLocaleString()}</Text></Text>
                      )}
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reassign Modal ─────────────────────────────────────────────────── */}
      <Modal visible={reassignModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReassignModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Reassign to Doctor</Text>
            {doctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.modalOption}
                onPress={() => handleReassign(doc.id)}
                disabled={reassigning}
              >
                <MaterialCommunityIcons name="doctor" size={18} color="#0f766e" />
                <Text style={styles.modalOptionText}>Dr. {doc.firstName} {doc.lastName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b' },

  list: { padding: 16, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }) },
  cardWithUnpaidBill: { borderColor: '#fde68a', borderWidth: 1.5 },

  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatarBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  patientName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },

  billingRow: { marginBottom: 6, minHeight: 20 },
  billBadgeUnpaid: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  billBadgeTextUnpaid: { fontSize: 11, fontWeight: '600', color: '#b45309' },
  billBadgePaid: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  billBadgeTextPaid: { fontSize: 11, fontWeight: '600', color: '#166534' },

  cardMeta: { gap: 4, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', flex: 1 },

  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f0fdf4', borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#0f766e' },
  actionBtnBill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fffbeb', borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  actionBtnBillText: { fontSize: 12, fontWeight: '600', color: '#b45309' },
  actionBtnDanger: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff1f2', borderRadius: 6, borderWidth: 1, borderColor: '#fecdd3' },
  actionBtnDangerText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  modalOptionText: { fontSize: 15, color: '#0f172a' },

  // Bill rows inside modal
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  billService: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  billDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  billAmt: { fontSize: 15, fontWeight: '700', color: '#0f766e', marginTop: 4 },
  payBtn: { backgroundColor: '#0f766e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  paidTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  paidTagText: { fontSize: 12, fontWeight: '600', color: '#166534' },

  noBillsText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  billTotals: { paddingTop: 14, gap: 4 },
  billTotalLabel: { fontSize: 14, color: '#374151' },
  billTotalVal: { fontWeight: '700', color: '#0f172a' },
  billUnpaidLabel: { fontSize: 14, color: '#374151' },
  billUnpaidVal: { fontWeight: '700', color: '#b45309' },
});
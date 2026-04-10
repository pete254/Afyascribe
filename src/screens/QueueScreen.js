// src/screens/QueueScreen.js
// UPDATED: Partial payment, multi-method payments, persistent receipt, fixed reassign, receptionist triage
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl, Modal, Platform, TextInput, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { printReceipt } from '../utils/printReceipt';

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
  const [billingData, setBillingData] = useState({});

  // Billing modal state
  const [billingModal, setBillingModal] = useState(false);
  const [billingVisit, setBillingVisit] = useState(null);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [mpesaRef, setMpesaRef] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Reassign modal
  const [reassignModal, setReassignModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reassigning, setReassigning] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');

  const canReassign = ['receptionist', 'facility_admin', 'super_admin'].includes(user?.role);
  const canCancel = canReassign;
  // Receptionist can also do triage (doubles as nurse)
  const canTriage = ['nurse', 'doctor', 'facility_admin', 'receptionist'].includes(user?.role);
  const canManageBilling = ['receptionist', 'facility_admin', 'super_admin'].includes(user?.role);

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiService.getActiveQueue();
      setVisits(data);
      loadBillingSummaries(data);
    } catch (e) { console.error('Failed to load queue:', e); }
    finally { setLoading(false); }
  }, []);

  const loadBillingSummaries = async (visitList) => {
    const summaries = {};
    await Promise.allSettled(
      visitList.map(async (v) => {
        try {
          const summary = await apiService.getVisitBillingSummary(v.id);
          summaries[v.id] = summary;
        } catch { /* no bills yet */ }
      })
    );
    setBillingData(summaries);
  };

  const loadBillsForVisit = async (visit) => {
    try {
      const [bills, summary] = await Promise.all([
        apiService.getVisitBills(visit.id),
        apiService.getVisitBillingSummary(visit.id),
      ]);
      setBillingData(prev => ({ ...prev, [visit.id]: { ...summary, bills } }));
      return { bills, summary };
    } catch (e) { console.error('Failed to load bills:', e); return { bills: [], summary: null }; }
  };

  const loadDoctors = useCallback(async () => {
    try {
      const data = await apiService.getFacilityDoctors();
      setDoctors(data);
    } catch (e) { console.error('Failed to load doctors:', e); }
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
    setBillingModal(true);
    await loadBillsForVisit(visit);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setMpesaRef('');
    setCurrentBillId(null);
  };

  // Select a specific bill to pay
  const selectBillToPay = (billId) => {
    setCurrentBillId(billId === currentBillId ? null : billId);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setMpesaRef('');
  };

  const handleCollectPayment = async () => {
    if (!currentBillId) { Alert.alert('Select Bill', 'Tap a bill row to select it for payment'); return; }
    const parsed = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Missing', 'Enter the amount being paid now');
      return;
    }

    const data = billingData[billingVisit?.id];
    const bill = data?.bills?.find(b => b.id === currentBillId);
    if (!bill) return;

    const remaining = Number(bill.amount) - Number(bill.amountPaid || 0);
    if (parsed > remaining) {
      Alert.alert('Too Much', `Maximum you can collect is KES ${remaining.toLocaleString()}`);
      return;
    }

    setMarkingPaid(true);
    try {
      const result = await apiService.collectPayment(currentBillId, {
        paymentMethod,
        amountReceived: parsed,
        mpesaReference: mpesaRef.trim() || undefined,
      });

      // Refresh billing data
      const refreshed = await loadBillsForVisit(billingVisit);
      await loadQueue();

      // Show receipt if bill is now fully paid or all bills cleared
      const allCleared = (refreshed.summary?.unpaid ?? 0) === 0;
      if (result.isFullyPaid || allCleared) {
        setReceiptData({
          patient: billingVisit?.patient,
          bills: refreshed.bills,
          summary: refreshed.summary,
          facility: { name: user?.facilityName || 'AfyaScribe Facility' },
          collectedBy: `${user?.firstName} ${user?.lastName}`,
        });
        setReceiptVisible(true);
      }

      setPaymentAmount('');
      setMpesaRef('');
      setCurrentBillId(null);

      if (allCleared) setBillingModal(false);
    } catch (e) {
      Alert.alert('Payment Error', e.message || 'Failed to collect payment');
    } finally {
      setMarkingPaid(false);
    }
  };

  // FIXED: Reassign uses correct endpoint
  const handleReassign = async (doctorId) => {
    if (!selectedVisit) return;
    setReassigning(true);
    try {
      await apiService.reassignVisit(selectedVisit.id, doctorId);
      setReassignModal(false);
      setSelectedVisit(null);
      setDoctorSearch('');
      await loadQueue();
      Alert.alert('Reassigned', 'Patient has been reassigned successfully.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to reassign. Please try again.');
      console.error('Reassign error:', e);
    } finally {
      setReassigning(false);
    }
  };

  const handleCancel = (visit) => {
    Alert.alert(
      'Cancel Visit',
      `Cancel visit for ${visit.patient?.firstName} ${visit.patient?.lastName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel', style: 'destructive',
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
          <Text style={styles.billBadgeTextUnpaid}>KES {summary.unpaid?.toFixed(0)} unpaid</Text>
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

  const filteredDoctors = doctors.filter(d => {
    if (!doctorSearch.trim()) return true;
    return `${d.firstName} ${d.lastName}`.toLowerCase().includes(doctorSearch.toLowerCase());
  });

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
            <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.patientName}>{patient?.firstName} {patient?.lastName}</Text>
            <Text style={styles.patientId}>{patient?.patientId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.billingRow}>{renderBillingBadge(item.id)}</View>

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

        <View style={styles.cardActions}>
          {hasUnpaidBills && canManageBilling && (
            <TouchableOpacity style={styles.actionBtnBill} onPress={() => handleOpenBilling(item)}>
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
              onPress={() => {
                setSelectedVisit(item);
                setDoctorSearch('');
                setReassignModal(true);
              }}
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#0f766e" /></View>;
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

      {/* ── BILLING MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={billingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                💰 {billingVisit?.patient?.firstName} {billingVisit?.patient?.lastName}
              </Text>
              <TouchableOpacity onPress={() => setBillingModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                const data = billingData[billingVisit?.id];
                const bills = data?.bills ?? [];
                const summary = data;

                return (
                  <>
                    {/* Summary bar */}
                    {summary && summary.total > 0 && (
                      <View style={styles.summaryBar}>
                        <View style={styles.summaryBarItem}>
                          <Text style={styles.summaryBarLabel}>Total</Text>
                          <Text style={styles.summaryBarValue}>KES {Number(summary.total || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryBarItem}>
                          <Text style={[styles.summaryBarLabel, { color: '#166534' }]}>Collected</Text>
                          <Text style={[styles.summaryBarValue, { color: '#166534' }]}>
                            KES {Number(summary.amountPaid || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.summaryBarItem}>
                          <Text style={[styles.summaryBarLabel, { color: '#b45309' }]}>Balance</Text>
                          <Text style={[styles.summaryBarValue, { color: '#b45309' }]}>
                            KES {Number(summary.unpaid || 0).toFixed(0)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Instructions */}
                    <Text style={styles.payInstructions}>
                      Tap a bill to select it, then enter the payment amount below.
                    </Text>

                    {/* Bills list */}
                    {bills.map((bill) => {
                      const remaining = Number(bill.amount) - Number(bill.amountPaid || 0);
                      const isPaid = bill.status === 'paid' || bill.status === 'waived';
                      const isSelected = currentBillId === bill.id;
                      const isPartiallyPaid = !isPaid && Number(bill.amountPaid || 0) > 0;

                      return (
                        <TouchableOpacity
                          key={bill.id}
                          style={[
                            styles.billRow,
                            isSelected && styles.billRowSelected,
                            isPaid && styles.billRowPaid,
                          ]}
                          onPress={() => !isPaid && selectBillToPay(bill.id)}
                          activeOpacity={isPaid ? 1 : 0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.billService}>{bill.serviceDescription || bill.serviceType}</Text>
                            <Text style={styles.billTotalAmt}>KES {Number(bill.amount).toLocaleString()}</Text>

                            {isPartiallyPaid && (
                              <View style={styles.partialPayInfo}>
                                <Text style={styles.partialPaidText}>
                                  Paid: KES {Number(bill.amountPaid).toLocaleString()}
                                </Text>
                                <Text style={styles.partialRemText}>
                                  Balance: KES {remaining.toFixed(0)}
                                </Text>
                              </View>
                            )}

                            {/* Payment history */}
                            {bill.paymentHistory?.length > 0 && (
                              <View style={styles.paymentHistoryList}>
                                {bill.paymentHistory.map((ph, idx) => (
                                  <Text key={idx} style={styles.paymentHistoryItem}>
                                    ✓ KES {Number(ph.amount).toLocaleString()} via {ph.paymentMethod}
                                    {ph.mpesaReference ? ` (${ph.mpesaReference})` : ''}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>

                          <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                            {isPaid ? (
                              <View style={styles.paidBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#166534" />
                                <Text style={styles.paidBadgeText}>
                                  {bill.status === 'waived' ? 'Waived' : 'Paid'}
                                </Text>
                              </View>
                            ) : (
                              <View style={[styles.pendingBadge, isSelected && styles.pendingBadgeSelected]}>
                                <Text style={[styles.pendingBadgeText, isSelected && { color: '#1e40af' }]}>
                                  {isSelected ? '✓ Selected' : `KES ${remaining.toFixed(0)} due`}
                                </Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {bills.length === 0 && (
                      <Text style={styles.noBillsText}>No bills recorded for this visit.</Text>
                    )}

                    {/* Payment form — shown when a bill is selected */}
                    {currentBillId && (() => {
                      const selectedBill = bills.find(b => b.id === currentBillId);
                      if (!selectedBill) return null;
                      const remaining = Number(selectedBill.amount) - Number(selectedBill.amountPaid || 0);
                      return (
                        <View style={styles.paymentForm}>
                          <Text style={styles.paymentFormTitle}>
                            Collecting for: {selectedBill.serviceDescription || selectedBill.serviceType}
                          </Text>
                          <Text style={styles.paymentFormBalance}>
                            Outstanding: KES {remaining.toFixed(0)}
                          </Text>

                          {/* Payment method */}
                          <Text style={styles.payLabel}>Payment Method</Text>
                          <View style={styles.payMethodRow}>
                            {['cash', 'mpesa', 'card'].map((m) => (
                              <TouchableOpacity
                                key={m}
                                style={[styles.payMethodBtn, paymentMethod === m && styles.payMethodBtnActive]}
                                onPress={() => { setPaymentMethod(m); setMpesaRef(''); }}
                              >
                                <MaterialCommunityIcons
                                  name={m === 'cash' ? 'cash' : m === 'mpesa' ? 'cellphone' : 'credit-card-outline'}
                                  size={14} color={paymentMethod === m ? '#0f766e' : '#64748b'}
                                />
                                <Text style={[styles.payMethodText, paymentMethod === m && styles.payMethodTextActive]}>
                                  {m === 'mpesa' ? 'M-Pesa' : m.charAt(0).toUpperCase() + m.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Quick amount buttons */}
                          <Text style={styles.payLabel}>Amount Receiving Now</Text>
                          <View style={styles.quickAmounts}>
                            {[remaining, remaining / 2, remaining / 4].filter(v => v > 0 && Number.isInteger(v) || v === remaining).slice(0, 3).map((amt, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.quickAmtBtn, paymentAmount === String(Math.round(amt)) && styles.quickAmtBtnActive]}
                                onPress={() => setPaymentAmount(String(Math.round(amt)))}
                              >
                                <Text style={[styles.quickAmtText, paymentAmount === String(Math.round(amt)) && { color: '#0f766e', fontWeight: '700' }]}>
                                  {idx === 0 ? 'Full' : idx === 1 ? 'Half' : 'Quarter'}{'\n'}
                                  KES {Math.round(amt).toLocaleString()}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TextInput
                            style={styles.payInput}
                            placeholder={`Amount (max KES ${remaining.toFixed(0)})`}
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            keyboardType="numeric"
                            placeholderTextColor="#94a3b8"
                          />

                          {paymentMethod === 'mpesa' && (
                            <TextInput
                              style={styles.payInput}
                              placeholder="M-Pesa reference (optional)"
                              value={mpesaRef}
                              onChangeText={setMpesaRef}
                              autoCapitalize="characters"
                              placeholderTextColor="#94a3b8"
                            />
                          )}

                          <TouchableOpacity
                            style={[styles.collectBtn, markingPaid && { opacity: 0.6 }]}
                            onPress={handleCollectPayment}
                            disabled={markingPaid}
                          >
                            {markingPaid ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="cash-check" size={18} color="#fff" />
                                <Text style={styles.collectBtnText}>
                                  Collect KES {paymentAmount ? Number(paymentAmount).toLocaleString() : '—'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })()}

                    {/* Print receipt button — always visible if any payments */}
                    {bills.some(b => Number(b.amountPaid || 0) > 0 || b.status === 'paid') && (
                      <TouchableOpacity
                        style={styles.printBtn}
                        onPress={() => {
                          const data = billingData[billingVisit?.id];
                          setReceiptData({
                            patient: billingVisit?.patient,
                            bills: data?.bills || [],
                            summary: data,
                            facility: { name: user?.facilityName || 'AfyaScribe Facility' },
                            collectedBy: `${user?.firstName} ${user?.lastName}`,
                          });
                          setReceiptVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons name="printer-outline" size={18} color="#0f766e" />
                        <Text style={styles.printBtnText}>Print Receipt</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── RECEIPT MODAL (persistent — doesn't auto-close) ─────────────────── */}
      <Modal visible={receiptVisible} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <MaterialCommunityIcons name="receipt" size={24} color="#0f766e" />
              <Text style={styles.receiptTitle}>Payment Receipt</Text>
            </View>

            {receiptData && (
              <View style={styles.receiptBody}>
                <Text style={styles.receiptPatient}>
                  {receiptData.patient?.firstName} {receiptData.patient?.lastName}
                </Text>
                <Text style={styles.receiptPatientId}>{receiptData.patient?.patientId}</Text>

                <View style={styles.receiptDivider} />

                {receiptData.bills?.map((bill, idx) => (
                  <View key={idx} style={styles.receiptBillRow}>
                    <Text style={styles.receiptBillName} numberOfLines={1}>
                      {bill.serviceDescription || bill.serviceType}
                    </Text>
                    <View style={styles.receiptBillAmounts}>
                      <Text style={styles.receiptBillTotal}>KES {Number(bill.amount).toLocaleString()}</Text>
                      {Number(bill.amountPaid || 0) > 0 && Number(bill.amountPaid) < Number(bill.amount) && (
                        <Text style={styles.receiptBillPaid}>
                          Paid: KES {Number(bill.amountPaid).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptTotals}>
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Total Billed</Text>
                    <Text style={styles.receiptTotalVal}>
                      KES {Number(receiptData.summary?.total || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptTotalRow}>
                    <Text style={[styles.receiptTotalLabel, { color: '#166534' }]}>Amount Collected</Text>
                    <Text style={[styles.receiptTotalVal, { color: '#166534' }]}>
                      KES {Number(receiptData.summary?.amountPaid || 0).toLocaleString()}
                    </Text>
                  </View>
                  {(receiptData.summary?.unpaid || 0) > 0 && (
                    <View style={styles.receiptTotalRow}>
                      <Text style={[styles.receiptTotalLabel, { color: '#b45309' }]}>Balance Due</Text>
                      <Text style={[styles.receiptTotalVal, { color: '#b45309' }]}>
                        KES {Number(receiptData.summary?.unpaid || 0).toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptPrintBtn}
                onPress={async () => {
                  if (receiptData) await printReceipt(receiptData);
                }}
              >
                <MaterialCommunityIcons name="printer" size={18} color="#fff" />
                <Text style={styles.receiptPrintBtnText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setReceiptVisible(false)}
              >
                <Text style={styles.receiptCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── REASSIGN MODAL (FIXED — with search & scrollable list) ────────────── */}
      <Modal visible={reassignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Doctor</Text>
              <TouchableOpacity onPress={() => { setReassignModal(false); setSelectedVisit(null); setDoctorSearch(''); }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedVisit && (
              <View style={styles.reassignPatientPill}>
                <MaterialCommunityIcons name="account-outline" size={16} color="#0f766e" />
                <Text style={styles.reassignPatientName}>
                  {selectedVisit.patient?.firstName} {selectedVisit.patient?.lastName}
                </Text>
              </View>
            )}

            {/* Doctor search */}
            <View style={styles.doctorSearchBox}>
              <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.doctorSearchInput}
                placeholder="Search doctor by name…"
                placeholderTextColor="#94a3b8"
                value={doctorSearch}
                onChangeText={setDoctorSearch}
              />
              {doctorSearch.length > 0 && (
                <TouchableOpacity onPress={() => setDoctorSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 350 }} keyboardShouldPersistTaps="handled">
              {filteredDoctors.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Text style={styles.emptyText}>
                    {doctorSearch ? 'No doctors match your search' : 'No doctors found'}
                  </Text>
                </View>
              ) : (
                filteredDoctors.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      styles.modalOption,
                      selectedVisit?.assignedDoctorId === doc.id && styles.currentDoctorOption,
                    ]}
                    onPress={() => handleReassign(doc.id)}
                    disabled={reassigning}
                  >
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorAvatarText}>{doc.firstName[0]}{doc.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalOptionText}>Dr. {doc.firstName} {doc.lastName}</Text>
                      {selectedVisit?.assignedDoctorId === doc.id && (
                        <Text style={styles.currentDoctorLabel}>Currently assigned</Text>
                      )}
                    </View>
                    {reassigning ? (
                      <ActivityIndicator size="small" color="#0f766e" />
                    ) : (
                      <Ionicons name="arrow-forward" size={18} color="#0f766e" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b' },
  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
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
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
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
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 28,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  currentDoctorOption: { backgroundColor: '#f0fdf4' },
  currentDoctorLabel: { fontSize: 11, color: '#0f766e', fontWeight: '600', marginTop: 2 },
  modalOptionText: { fontSize: 15, color: '#0f172a', flex: 1 },

  // Doctor search
  doctorSearchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  doctorSearchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  doctorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  doctorAvatarText: { fontSize: 13, fontWeight: '700', color: '#065f46' },

  reassignPatientPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12,
  },
  reassignPatientName: { fontSize: 14, fontWeight: '600', color: '#166534' },

  // Billing modal
  summaryBar: {
    flexDirection: 'row', backgroundColor: '#f8fafc',
    borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 4,
  },
  summaryBarItem: { flex: 1, alignItems: 'center' },
  summaryBarLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  summaryBarValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  payInstructions: { fontSize: 12, color: '#64748b', marginBottom: 10, fontStyle: 'italic' },

  billRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    borderRadius: 8, paddingHorizontal: 8, marginBottom: 4,
  },
  billRowSelected: { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#93c5fd' },
  billRowPaid: { backgroundColor: '#f0fdf4', opacity: 0.8 },
  billService: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  billTotalAmt: { fontSize: 13, color: '#64748b', marginTop: 2 },
  partialPayInfo: { marginTop: 4, gap: 1 },
  partialPaidText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  partialRemText: { fontSize: 11, color: '#b45309', fontWeight: '700' },
  paymentHistoryList: { marginTop: 4 },
  paymentHistoryItem: { fontSize: 11, color: '#94a3b8', marginBottom: 1 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  paidBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  pendingBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pendingBadgeSelected: { backgroundColor: '#dbeafe' },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  noBillsText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  // Payment form
  paymentForm: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1.5, borderColor: '#93c5fd' },
  paymentFormTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 2 },
  paymentFormBalance: { fontSize: 13, color: '#b45309', fontWeight: '600', marginBottom: 12 },
  payLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  payMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payMethodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  payMethodBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  payMethodText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  payMethodTextActive: { color: '#0f766e', fontWeight: '700' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickAmtBtn: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, alignItems: 'center' },
  quickAmtBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  quickAmtText: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  payInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#1e293b', marginBottom: 8, backgroundColor: '#fff',
  },
  collectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 14,
  },
  collectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 12,
    marginTop: 12, borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  printBtnText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },

  // Receipt modal
  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  receiptCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  receiptTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  receiptBody: {},
  receiptPatient: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  receiptPatientId: { fontSize: 13, color: '#94a3b8', marginTop: 2, marginBottom: 12 },
  receiptDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  receiptBillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  receiptBillName: { flex: 1, fontSize: 13, color: '#374151', marginRight: 8 },
  receiptBillAmounts: { alignItems: 'flex-end' },
  receiptBillTotal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  receiptBillPaid: { fontSize: 11, color: '#166534', marginTop: 2 },
  receiptTotals: { gap: 6 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  receiptTotalVal: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  receiptActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  receiptPrintBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 14,
  },
  receiptPrintBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  receiptCloseBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14,
  },
  receiptCloseBtnText: { fontSize: 15, fontWeight: '600', color: '#475569' },
});
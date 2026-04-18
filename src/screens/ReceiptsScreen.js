// src/screens/ReceiptsScreen.js
// Finance module: view and reprint receipts, filtered by day/week/month
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Platform, ScrollView, Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { printReceipt } from '../utils/printReceipt';
import apiService from '../services/apiService';
import BluetoothPrinterManager from '../components/BluetoothPrinterManager';

const PERIODS = [
  { label: 'Today', getValue: () => { const d = fmt(new Date()); return { from: d, to: d }; } },
  { label: 'This Week', getValue: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); return { from: fmt(mon), to: fmt(now) }; } },
  { label: 'This Month', getValue: () => { const now = new Date(); return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }; } },
  { label: 'Last Month', getValue: () => { const now = new Date(); return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) }; } },
];

const fmt = (d) => d.toISOString().slice(0, 10);

export default function ReceiptsScreen({ onBack }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState(0);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);

  // Group bills by visit (patient)
  const [groupedReceipts, setGroupedReceipts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = PERIODS[period].getValue();
      const data = await apiService.getPaidBills(from, to);
      setBills(Array.isArray(data) ? data : []);
      groupBills(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load receipts:', e);
      setBills([]);
      setGroupedReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const groupBills = (billList) => {
    // Group by visitId — each visit = one receipt
    const groups = {};
    billList.forEach(bill => {
      if (!groups[bill.visitId]) {
        groups[bill.visitId] = {
          visitId: bill.visitId,
          patient: bill.patient,
          bills: [],
          totalBilled: 0,
          amountPaid: 0,
          paidAt: bill.paidAt,
        };
      }
      groups[bill.visitId].bills.push(bill);
      groups[bill.visitId].totalBilled += Number(bill.amount);
      groups[bill.visitId].amountPaid += Number(bill.amountPaid || 0);
      // Use latest paidAt
      if (bill.paidAt && new Date(bill.paidAt) > new Date(groups[bill.visitId].paidAt || 0)) {
        groups[bill.visitId].paidAt = bill.paidAt;
      }
    });
    setGroupedReceipts(Object.values(groups).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)));
  };

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handlePrint = async (receipt) => {
    setPrinting(receipt.visitId);
    try {
      const summary = {
        total: receipt.totalBilled,
        paid: receipt.amountPaid,
        amountPaid: receipt.amountPaid,
        unpaid: Math.max(0, receipt.totalBilled - receipt.amountPaid),
        hasPendingBills: receipt.amountPaid < receipt.totalBilled,
      };
      await printReceipt({
        patient: receipt.patient,
        bills: receipt.bills,
        summary,
        facility: { name: user?.facilityName || 'AfyaScribe Facility', logoUrl: user?.facilityLogoUrl || null },
        collectedBy: `${user?.firstName} ${user?.lastName}`,
      }, { onNeedPrinterSetup: () => setPrinterModalVisible(true) });
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      setPrinting(null);
    }
  };

  const handlePreview = (receipt) => {
    const summary = {
      total: receipt.totalBilled,
      paid: receipt.amountPaid,
      amountPaid: receipt.amountPaid,
      unpaid: Math.max(0, receipt.totalBilled - receipt.amountPaid),
    };
    setPreviewData({
      patient: receipt.patient,
      bills: receipt.bills,
      summary,
      facility: { name: user?.facilityName || 'AfyaScribe Facility', logoUrl: user?.facilityLogoUrl || null },
      collectedBy: `${user?.firstName} ${user?.lastName}`,
      paidAt: receipt.paidAt,
    });
    setPreviewVisible(true);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderReceipt = ({ item }) => {
    const isPrinting = printing === item.visitId;
    const isFullyPaid = item.amountPaid >= item.totalBilled;

    return (
      <View style={styles.receiptCard}>
        <View style={styles.receiptTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.patient?.firstName?.[0]}{item.patient?.lastName?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.patientName}>
              {item.patient?.firstName} {item.patient?.lastName}
            </Text>
            <Text style={styles.patientId}>{item.patient?.patientId}</Text>
            <Text style={styles.paidTime}>{formatDateTime(item.paidAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isFullyPaid ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.statusText, { color: isFullyPaid ? '#166534' : '#b45309' }]}>
              {isFullyPaid ? 'Paid' : 'Partial'}
            </Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.servicesSection}>
          {item.bills.slice(0, 3).map((bill, idx) => (
            <View key={idx} style={styles.serviceRow}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {bill.serviceDescription || bill.serviceType}
              </Text>
              <Text style={styles.serviceAmt}>KES {Number(bill.amount).toLocaleString()}</Text>
            </View>
          ))}
          {item.bills.length > 3 && (
            <Text style={styles.moreServices}>+{item.bills.length - 3} more services</Text>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalLabel}>Total Billed</Text>
            <Text style={styles.totalValue}>KES {item.totalBilled.toLocaleString()}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.totalLabel}>Collected</Text>
            <Text style={[styles.totalValue, { color: '#166534' }]}>
              KES {item.amountPaid.toLocaleString()}
            </Text>
          </View>
          {!isFullyPaid && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalLabel}>Balance</Text>
              <Text style={[styles.totalValue, { color: '#b45309' }]}>
                KES {(item.totalBilled - item.amountPaid).toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.receiptActions}>
          <TouchableOpacity style={styles.previewBtn} onPress={() => handlePreview(item)}>
            <Ionicons name="eye-outline" size={16} color="#0f766e" />
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.printBtn, isPrinting && { opacity: 0.6 }]}
            onPress={() => handlePrint(item)}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="printer" size={16} color="#fff" />
                <Text style={styles.printBtnText}>Print</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Summary stats
  const totalCollected = bills.reduce((s, b) => s + Number(b.amountPaid || 0), 0);
  const totalBilled = bills.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Receipts</Text>
          <Text style={styles.headerSub}>Print and reprint payment receipts</Text>
        </View>
      </View>

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.periodBtn, period === i && styles.periodBtnActive]}
            onPress={() => setPeriod(i)}
          >
            <Text style={[styles.periodTxt, period === i && styles.periodTxtActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      {!loading && bills.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Receipts</Text>
            <Text style={styles.summaryValue}>{groupedReceipts.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Billed</Text>
            <Text style={styles.summaryValue}>KES {totalBilled.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: '#166534' }]}>Collected</Text>
            <Text style={[styles.summaryValue, { color: '#166534' }]}>
              KES {totalCollected.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading receipts…</Text>
        </View>
      ) : (
        <FlatList
          data={groupedReceipts}
          keyExtractor={(item) => item.visitId}
          renderItem={renderReceipt}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="receipt" size={52} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No receipts found</Text>
              <Text style={styles.emptySub}>No payments collected in this period</Text>
            </View>
          }
        />
      )}

      {/* Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Receipt Preview</Text>
              <TouchableOpacity onPress={() => setPreviewVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {previewData && (
              <ScrollView style={styles.previewBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.previewPatient}>
                  {previewData.patient?.firstName} {previewData.patient?.lastName}
                </Text>
                <Text style={styles.previewMeta}>{previewData.patient?.patientId}</Text>
                <Text style={styles.previewMeta}>{formatDateTime(previewData.paidAt)}</Text>

                <View style={styles.previewDivider} />

                {previewData.bills?.map((bill, idx) => (
                  <View key={idx} style={styles.previewBillRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewBillName}>{bill.serviceDescription || bill.serviceType}</Text>
                      {bill.paymentHistory?.length > 0 && (
                        <View style={{ marginTop: 3 }}>
                          {bill.paymentHistory.map((ph, i) => (
                            <Text key={i} style={styles.previewPayment}>
                              ✓ KES {Number(ph.amount).toLocaleString()} via {ph.paymentMethod}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.previewBillAmt}>KES {Number(bill.amount).toLocaleString()}</Text>
                      {Number(bill.amountPaid || 0) > 0 && (
                        <Text style={styles.previewPaidAmt}>
                          Paid: KES {Number(bill.amountPaid).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}

                <View style={styles.previewDivider} />

                <View style={styles.previewTotals}>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>Total Billed</Text>
                    <Text style={styles.previewTotalVal}>KES {previewData.summary?.total?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.previewTotalRow}>
                    <Text style={[styles.previewTotalLabel, { color: '#166534' }]}>Collected</Text>
                    <Text style={[styles.previewTotalVal, { color: '#166534' }]}>
                      KES {previewData.summary?.amountPaid?.toLocaleString()}
                    </Text>
                  </View>
                  {(previewData.summary?.unpaid || 0) > 0 && (
                    <View style={styles.previewTotalRow}>
                      <Text style={[styles.previewTotalLabel, { color: '#b45309' }]}>Balance</Text>
                      <Text style={[styles.previewTotalVal, { color: '#b45309' }]}>
                        KES {previewData.summary?.unpaid?.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.printBtnFull}
                onPress={async () => {
                  if (previewData) {
                    setPreviewVisible(false);
                    await printReceipt(previewData, { onNeedPrinterSetup: () => setPrinterModalVisible(true) });
                  }
                }}
              >
                <MaterialCommunityIcons name="printer" size={18} color="#fff" />
                <Text style={styles.printBtnText}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtnFull} onPress={() => setPreviewVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bluetooth Printer Manager */}
      <BluetoothPrinterManager
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
        onPrinterSelected={() => setPrinterModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8' },

  periodRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  periodBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  periodTxt: { fontSize: 13, color: '#64748b' },
  periodTxtActive: { color: '#0f766e', fontWeight: '700' },

  summaryBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#94a3b8' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 14, color: '#94a3b8' },

  receiptCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  receiptTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#065f46' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  patientId: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  paidTime: { fontSize: 11, color: '#64748b', marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },

  servicesSection: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 12 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  serviceName: { flex: 1, fontSize: 13, color: '#374151', marginRight: 8 },
  serviceAmt: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  moreServices: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginBottom: 12 },
  totalLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  totalValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  receiptActions: { flexDirection: 'row', gap: 10 },
  previewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#f0fdf4',
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  previewBtnText: { fontSize: 13, fontWeight: '600', color: '#0f766e' },
  printBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f766e',
  },
  printBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Preview modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  previewCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380,
    maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  previewTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  previewBody: { flex: 1 },
  previewPatient: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  previewMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  previewDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  previewBillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  previewBillName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  previewPayment: { fontSize: 11, color: '#166534', marginTop: 2 },
  previewBillAmt: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  previewPaidAmt: { fontSize: 11, color: '#166534', marginTop: 2 },
  previewTotals: { gap: 8 },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewTotalLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  previewTotalVal: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  printBtnFull: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 14,
  },
  closeBtnFull: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14,
  },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
});
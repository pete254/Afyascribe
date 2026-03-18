// src/screens/ReportsScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, FlatList, Alert, Linking, Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const TABS = ['Patients Today', 'Financials', 'Insurance Claims'];

const PERIODS = [
  { label: 'Today', getValue: () => { const d = today(); return { from: d, to: d }; } },
  { label: 'This Week', getValue: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); return { from: fmt(mon), to: fmt(now) }; } },
  { label: 'This Month', getValue: () => { const now = new Date(); return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }; } },
  { label: 'Last Month', getValue: () => { const now = new Date(); const f = new Date(now.getFullYear(), now.getMonth() - 1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: fmt(f), to: fmt(t) }; } },
];

const today = () => fmt(new Date());
const fmt = (d) => d.toISOString().slice(0, 10);

const STATUS_COLOR = {
  checked_in:        { bg: '#fff7ed', text: '#ea580c', label: 'Checked In' },
  triage:            { bg: '#eff6ff', text: '#2563eb', label: 'Triage' },
  waiting_for_doctor:{ bg: '#fefce8', text: '#ca8a04', label: 'Waiting' },
  with_doctor:       { bg: '#f0fdf4', text: '#16a34a', label: 'With Doctor' },
  completed:         { bg: '#f0fdf4', text: '#166534', label: 'Completed' },
  cancelled:         { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
};

export default function ReportsScreen({ onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Patients Today state
  const [patientsData, setPatientsData] = useState(null);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Financials state
  const [finData, setFinData] = useState(null);
  const [finLoading, setFinLoading] = useState(false);
  const [finPeriod, setFinPeriod] = useState(0); // index into PERIODS

  // Insurance Claims state
  const [claimsData, setClaimsData] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsPeriod, setClaimsPeriod] = useState(2); // default: this month
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemeModalVisible, setSchemeModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load data per tab ──────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const data = await apiService.getReportsPatientsToday();
      setPatientsData(data);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load patients');
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const loadFinancials = useCallback(async () => {
    setFinLoading(true);
    try {
      const { from, to } = PERIODS[finPeriod].getValue();
      const data = await apiService.getFinancialReport(from, to);
      setFinData(data);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load financials');
    } finally {
      setFinLoading(false);
    }
  }, [finPeriod]);

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      const { from, to } = PERIODS[claimsPeriod].getValue();
      const data = await apiService.getInsuranceClaimsReport(from, to, selectedScheme?.name);
      setClaimsData(data);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to load claims');
    } finally {
      setClaimsLoading(false);
    }
  }, [claimsPeriod, selectedScheme]);

  const loadSchemes = useCallback(async () => {
    try {
      const data = await apiService.getInsuranceSchemes();
      setSchemes(data);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { if (activeTab === 0) loadPatients(); }, [activeTab, loadPatients]);
  useEffect(() => { if (activeTab === 1) loadFinancials(); }, [activeTab, loadFinancials]);
  useEffect(() => { if (activeTab === 2) { loadClaims(); loadSchemes(); } }, [activeTab, loadClaims, loadSchemes]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 0) await loadPatients();
    if (activeTab === 1) await loadFinancials();
    if (activeTab === 2) await loadClaims();
    setRefreshing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { from, to } = PERIODS[claimsPeriod].getValue();
      const token = await require('../services/storage').default.getToken();
      const url = apiService.getInsuranceClaimsExportUrl(from, to, selectedScheme?.name);
      // Open URL with auth token as query param — simplest approach for mobile
      const urlWithToken = `${url}&token=${token}`;
      await Linking.openURL(urlWithToken);
    } catch (e) {
      Alert.alert('Export Failed', 'Could not open the export link');
    } finally {
      setExporting(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const SummaryCard = ({ label, value, color = '#0f766e', icon }) => (
    <View style={styles.summaryCard}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.summaryValue, { color }]}>
        {typeof value === 'number' ? `KES ${value.toLocaleString()}` : value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  const PeriodSelector = ({ value, onChange }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow}>
      {PERIODS.map((p, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.periodBtn, value === i && styles.periodBtnActive]}
          onPress={() => onChange(i)}
        >
          <Text style={[styles.periodTxt, value === i && styles.periodTxtActive]}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ── Tab: Patients Today ────────────────────────────────────────────────────
  const renderPatientsTab = () => {
    if (patientsLoading) return <ActivityIndicator style={styles.loader} color="#0f766e" size="large" />;
    if (!patientsData) return null;

    const { total, byStatus, visits } = patientsData;

    return (
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
      >
        {/* Summary chips */}
        <View style={styles.chipsRow}>
          {Object.entries(byStatus).filter(([, v]) => v > 0).map(([key, count]) => {
            const s = STATUS_COLOR[key] || { bg: '#f1f5f9', text: '#64748b', label: key };
            return (
              <View key={key} style={[styles.chip, { backgroundColor: s.bg }]}>
                <Text style={[styles.chipText, { color: s.text }]}>{s.label}: {count}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.totalLabel}>{total} patient{total !== 1 ? 's' : ''} today</Text>

        {/* Visit list */}
        {visits.map((v) => {
          const s = STATUS_COLOR[v.status] || STATUS_COLOR.checked_in;
          const p = v.patient;
          const doc = v.assignedDoctor;
          return (
            <View key={v.id} style={styles.visitCard}>
              <View style={styles.visitTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{p?.firstName?.[0]}{p?.lastName?.[0]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.visitName}>{p?.firstName} {p?.lastName}</Text>
                  <Text style={styles.visitMeta}>{p?.patientId}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusTxt, { color: s.text }]}>{s.label}</Text>
                </View>
              </View>
              <View style={styles.visitDetails}>
                <Text style={styles.visitDetailTxt}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={13} color="#94a3b8" /> {v.reasonForVisit}
                </Text>
                {doc && (
                  <Text style={styles.visitDetailTxt}>
                    <MaterialCommunityIcons name="doctor" size={13} color="#94a3b8" /> Dr. {doc.firstName} {doc.lastName}
                  </Text>
                )}
                <Text style={styles.visitDetailTxt}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color="#94a3b8" />{' '}
                  {new Date(v.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}

        {visits.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTxt}>No patients today yet</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Tab: Financials ────────────────────────────────────────────────────────
  const renderFinancialsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
    >
      <PeriodSelector value={finPeriod} onChange={(i) => setFinPeriod(i)} />

      {finLoading
        ? <ActivityIndicator style={styles.loader} color="#0f766e" size="large" />
        : finData && (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Total Billed" value={finData.summary.totalBilled} icon="cash-multiple" />
              <SummaryCard label="Collected" value={finData.summary.totalCollected} color="#16a34a" icon="cash-check" />
              <SummaryCard label="Outstanding" value={finData.summary.totalOutstanding} color="#dc2626" icon="cash-clock" />
              <SummaryCard label="Waived" value={finData.summary.totalWaived} color="#64748b" icon="cash-remove" />
              <SummaryCard label="Insurance Pending" value={finData.summary.totalInsurancePending} color="#7c3aed" icon="shield-check-outline" />
              <SummaryCard label="Transactions" value={finData.summary.transactionCount} color="#0f766e" icon="receipt" />
            </View>

            {/* By service type */}
            <Text style={styles.sectionTitle}>By Service Type</Text>
            {finData.byServiceType.map((row) => (
              <View key={row.type} style={styles.tableRow}>
                <Text style={styles.tableCell}>{row.type.charAt(0).toUpperCase() + row.type.slice(1)}</Text>
                <Text style={styles.tableCell}>{row.count} bills</Text>
                <Text style={[styles.tableCell, { color: '#0f766e', fontWeight: '600' }]}>
                  KES {row.total.toLocaleString()}
                </Text>
              </View>
            ))}

            {/* By payment method */}
            <Text style={styles.sectionTitle}>By Payment Method</Text>
            {finData.byPaymentMethod.filter(r => r.count > 0).map((row) => (
              <View key={row.method} style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  {row.method === 'mpesa' ? 'M-Pesa' : row.method.charAt(0).toUpperCase() + row.method.slice(1)}
                </Text>
                <Text style={styles.tableCell}>{row.count} transactions</Text>
                <Text style={[styles.tableCell, { color: '#0f766e', fontWeight: '600' }]}>
                  KES {row.total.toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        )
      }
    </ScrollView>
  );

  // ── Tab: Insurance Claims ──────────────────────────────────────────────────
  const renderClaimsTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
    >
      <PeriodSelector value={claimsPeriod} onChange={(i) => setClaimsPeriod(i)} />

      {/* Scheme filter */}
      <TouchableOpacity style={styles.schemeFilter} onPress={() => setSchemeModalVisible(true)}>
        <MaterialCommunityIcons name="shield-check-outline" size={16} color="#0f766e" />
        <Text style={styles.schemeFilterTxt}>
          {selectedScheme ? selectedScheme.name : 'All Insurance Schemes'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {claimsLoading
        ? <ActivityIndicator style={styles.loader} color="#0f766e" size="large" />
        : claimsData && (
          <>
            {/* Summary */}
            <View style={styles.summaryGrid}>
              <SummaryCard label="Total Claimed" value={claimsData.summary.totalClaimed} icon="shield-check-outline" color="#7c3aed" />
              <SummaryCard label="Pending" value={claimsData.summary.totalPending} color="#ca8a04" icon="clock-outline" />
              <SummaryCard label="Settled" value={claimsData.summary.totalSettled} color="#16a34a" icon="check-circle-outline" />
              <SummaryCard label="Claims" value={claimsData.summary.claimCount} color="#0f766e" icon="file-document-outline" />
            </View>

            {/* By scheme */}
            {claimsData.byScheme.length > 1 && (
              <>
                <Text style={styles.sectionTitle}>By Insurer</Text>
                {claimsData.byScheme.map((row) => (
                  <View key={row.scheme} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{row.scheme}</Text>
                    <Text style={styles.tableCell}>{row.count}</Text>
                    <Text style={[styles.tableCell, { color: '#7c3aed', fontWeight: '600' }]}>
                      KES {row.total.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Claims list */}
            <View style={styles.claimsHeader}>
              <Text style={styles.sectionTitle}>Claims ({claimsData.claims.length})</Text>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
                {exporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <MaterialCommunityIcons name="download" size={15} color="#fff" />
                      <Text style={styles.exportBtnTxt}>Export CSV</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {claimsData.claims.map((b) => (
              <View key={b.id} style={styles.claimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimName}>
                    {b.patient?.firstName} {b.patient?.lastName}
                  </Text>
                  <Text style={styles.claimMeta}>
                    {b.patient?.patientId} · {b.patient?.membershipNo || 'No membership no.'}
                  </Text>
                  <Text style={styles.claimMeta}>
                    {b.insuranceSchemeName} · {b.serviceType}
                  </Text>
                  <Text style={styles.claimMeta}>
                    {new Date(b.createdAt).toLocaleDateString('en-KE')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.claimAmount}>KES {Number(b.amount).toLocaleString()}</Text>
                  <View style={[styles.claimStatusBadge,
                    b.status === 'insurance_pending'
                      ? { backgroundColor: '#fefce8' }
                      : { backgroundColor: '#f0fdf4' }
                  ]}>
                    <Text style={[styles.claimStatusTxt,
                      b.status === 'insurance_pending' ? { color: '#ca8a04' } : { color: '#16a34a' }
                    ]}>
                      {b.status === 'insurance_pending' ? 'Pending' : 'Settled'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {claimsData.claims.length === 0 && (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="shield-off-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTxt}>No insurance claims for this period</Text>
              </View>
            )}
          </>
        )
      }

      {/* Scheme filter modal */}
      <Modal visible={schemeModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
          onPress={() => setSchemeModalVisible(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Filter by Insurer</Text>
            <TouchableOpacity style={styles.schemeOption}
              onPress={() => { setSelectedScheme(null); setSchemeModalVisible(false); }}>
              <Text style={styles.schemeOptionTxt}>All Schemes</Text>
              {!selectedScheme && <Ionicons name="checkmark" size={18} color="#0f766e" />}
            </TouchableOpacity>
            {schemes.map((s) => (
              <TouchableOpacity key={s.id} style={styles.schemeOption}
                onPress={() => { setSelectedScheme(s); setSchemeModalVisible(false); }}>
                <Text style={styles.schemeOptionTxt}>{s.name}</Text>
                {selectedScheme?.id === s.id && <Ionicons name="checkmark" size={18} color="#0f766e" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabTxt, activeTab === i && styles.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 0 && renderPatientsTab()}
        {activeTab === 1 && renderFinancialsTab()}
        {activeTab === 2 && renderClaimsTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#0f766e' },
  tabTxt: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  tabTxtActive: { color: '#0f766e', fontWeight: '700' },
  content: { flex: 1 },
  loader: { marginTop: 60 },

  // Period selector
  periodRow: { paddingHorizontal: 16, paddingVertical: 12 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8 },
  periodBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  periodTxt: { fontSize: 13, color: '#64748b' },
  periodTxtActive: { color: '#0f766e', fontWeight: '700' },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  summaryCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },

  // Section title + table
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { flex: 1, fontSize: 13, color: '#475569' },

  // Patients today
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },
  totalLabel: { fontSize: 13, color: '#64748b', marginHorizontal: 16, marginBottom: 8 },
  visitCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  visitTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf9', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  visitName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  visitMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 11, fontWeight: '600' },
  visitDetails: { marginTop: 10, gap: 3 },
  visitDetailTxt: { fontSize: 12, color: '#64748b' },

  // Insurance claims
  schemeFilter: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  schemeFilterTxt: { flex: 1, fontSize: 14, color: '#1e293b' },
  claimsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f766e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  exportBtnTxt: { fontSize: 13, color: '#fff', fontWeight: '600' },
  claimRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  claimName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  claimMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  claimAmount: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  claimStatusBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  claimStatusTxt: { fontSize: 11, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  schemeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  schemeOptionTxt: { fontSize: 15, color: '#1e293b' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: '#94a3b8' },
});
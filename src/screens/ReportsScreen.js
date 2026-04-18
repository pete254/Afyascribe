// src/screens/ReportsScreen.js
// UPDATED:
//  1. Summary cards are now tappable and navigate to a full-screen transaction list
//  2. Drill-down is a full screen (not a popup modal)
//  3. Safe area handled properly
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, FlatList, Alert, Linking, Modal,
  Platform, SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const TABS = ['Patients Today', 'Financials', 'Insurance Claims'];

const PERIODS = [
  { label: 'Today',      getValue: () => { const d = today(); return { from: d, to: d }; } },
  { label: 'This Week',  getValue: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); return { from: fmt(mon), to: fmt(now) }; } },
  { label: 'This Month', getValue: () => { const now = new Date(); return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }; } },
  { label: 'Last Month', getValue: () => { const now = new Date(); const f = new Date(now.getFullYear(), now.getMonth() - 1, 1); const t = new Date(now.getFullYear(), now.getMonth(), 0); return { from: fmt(f), to: fmt(t) }; } },
];

const today = () => fmt(new Date());
const fmt = (d) => d.toISOString().slice(0, 10);

const STATUS_COLOR = {
  checked_in:         { bg: '#fff7ed', text: '#ea580c', label: 'Checked In' },
  triage:             { bg: '#eff6ff', text: '#2563eb', label: 'Triage' },
  waiting_for_doctor: { bg: '#fefce8', text: '#ca8a04', label: 'Waiting' },
  with_doctor:        { bg: '#f0fdf4', text: '#16a34a', label: 'With Doctor' },
  completed:          { bg: '#f0fdf4', text: '#166534', label: 'Completed' },
  cancelled:          { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
};

// ── Full-screen transaction drill-down ────────────────────────────────────────
function TransactionDrillDown({ visible, title, subtitle, transactions, onBack }) {
  const insets = useSafeAreaInsets();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method) => {
    if (!method) return '';
    const labels = { mpesa: 'M-Pesa', cash: 'cash', card: 'Card', insurance_claim: 'Insurance' };
    return labels[method] || method;
  };

  const getPaymentMethodColor = (method) => {
    const colors = { mpesa: '#059669', cash: '#0f766e', card: '#2563eb', insurance_claim: '#7c3aed' };
    return colors[method] || '#64748b';
  };

  const getPaymentMethodBg = (method) => {
    const bgs = { mpesa: '#d1fae5', cash: '#ccfbf1', card: '#dbeafe', insurance_claim: '#ede9fe' };
    return bgs[method] || '#f1f5f9';
  };

  if (!visible) return null;

  return (
    <View style={[dd.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={dd.header}>
        <TouchableOpacity style={dd.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={dd.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={dd.headerSub}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <View style={dd.empty}>
          <MaterialCommunityIcons name="receipt" size={52} color="#cbd5e1" />
          <Text style={dd.emptyTitle}>No transactions</Text>
          <Text style={dd.emptySub}>No records found for this category</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, i) => item?.id || String(i)}
          contentContainerStyle={[dd.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const patient = item.patient;
            const isPaid = item.status === 'paid';
            const isWaived = item.status === 'waived';
            const isUnpaid = item.status === 'unpaid';
            const isInsurance = item.status === 'insurance_pending';
            const amountPaid = Number(item.amountPaid || 0);
            const amountBilled = Number(item.amount || 0);
            const isPartial = !isPaid && !isWaived && amountPaid > 0;

            let statusColor = '#dc2626';
            let statusBg = '#fee2e2';
            let statusLabel = 'Unpaid';
            if (isPaid)        { statusColor = '#166534'; statusBg = '#dcfce7'; statusLabel = 'Paid'; }
            if (isWaived)      { statusColor = '#64748b'; statusBg = '#f1f5f9'; statusLabel = 'Waived'; }
            if (isInsurance)   { statusColor = '#b45309'; statusBg = '#fef3c7'; statusLabel = 'Insurance'; }
            if (isPartial)     { statusColor = '#7c3aed'; statusBg = '#ede9fe'; statusLabel = 'Partial'; }

            return (
              <View style={dd.txCard}>
                {/* Row number + patient */}
                <View style={dd.txTop}>
                  <View style={dd.txNum}>
                    <Text style={dd.txNumText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={dd.txPatient}>
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                    </Text>
                    <Text style={dd.txPatientId}>{patient?.patientId || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={dd.txAmount}>KES {amountBilled.toLocaleString()}</Text>
                    {isPartial && (
                      <Text style={dd.txAmountPaid}>
                        Paid: KES {amountPaid.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Service + status + date */}
                <View style={dd.txMeta}>
                  <View style={dd.txMetaLeft}>
                    <Text style={dd.txService} numberOfLines={1}>
                      {item.serviceDescription || item.serviceType}
                    </Text>
                    <Text style={dd.txDate}>{formatDate(item.paidAt || item.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[dd.txStatusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[dd.txStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    {/* Payment method badges */}
                    {item.paymentMethod && (
                      <View style={[dd.txMethodBadge, { backgroundColor: getPaymentMethodBg(item.paymentMethod) }]}>
                        <MaterialCommunityIcons
                          name={item.paymentMethod === 'mpesa' ? 'cellphone' : item.paymentMethod === 'card' ? 'credit-card-outline' : 'cash'}
                          size={11}
                          color={getPaymentMethodColor(item.paymentMethod)}
                        />
                        <Text style={[dd.txMethodText, { color: getPaymentMethodColor(item.paymentMethod) }]}>
                          {getPaymentMethodLabel(item.paymentMethod)}
                        </Text>
                      </View>
                    )}
                    {/* M-Pesa ref */}
                    {item.mpesaReference && (
                      <Text style={dd.txRef}>Ref: {item.mpesaReference}</Text>
                    )}
                  </View>
                </View>

                {/* Payment history */}
                {item.paymentHistory?.length > 1 && (
                  <View style={dd.txHistorySection}>
                    <Text style={dd.txHistoryLabel}>Payment history:</Text>
                    {item.paymentHistory.map((ph, i) => (
                      <View key={i} style={dd.txHistoryRow}>
                        <View style={[dd.txMethodBadge, { backgroundColor: getPaymentMethodBg(ph.paymentMethod) }]}>
                          <Text style={[dd.txMethodText, { color: getPaymentMethodColor(ph.paymentMethod) }]}>
                            {getPaymentMethodLabel(ph.paymentMethod)}
                          </Text>
                        </View>
                        <Text style={dd.txHistoryAmount}>KES {Number(ph.amount).toLocaleString()}</Text>
                        {ph.mpesaReference ? <Text style={dd.txRef}>{ph.mpesaReference}</Text> : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ReportsScreen({ onBack }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);

  // Drill-down state
  const [drillDown, setDrillDown] = useState(null); // { title, subtitle, transactions }

  // Patients Today
  const [patientsData, setPatientsData] = useState(null);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Financials
  const [finData, setFinData] = useState(null);
  const [finLoading, setFinLoading] = useState(false);
  const [finPeriod, setFinPeriod] = useState(0);

  // Insurance Claims
  const [claimsData, setClaimsData] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsPeriod, setClaimsPeriod] = useState(2);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemeModalVisible, setSchemeModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const data = await apiService.getReportsPatientsToday();
      setPatientsData(data);
    } catch (e) { Alert.alert('Error', e.message || 'Failed to load patients'); }
    finally { setPatientsLoading(false); }
  }, []);

  const loadFinancials = useCallback(async () => {
    setFinLoading(true);
    try {
      const { from, to } = PERIODS[finPeriod].getValue();
      const data = await apiService.getFinancialReport(from, to);
      setFinData(data);
    } catch (e) { Alert.alert('Error', e.message || 'Failed to load financials'); }
    finally { setFinLoading(false); }
  }, [finPeriod]);

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);
    try {
      const { from, to } = PERIODS[claimsPeriod].getValue();
      const data = await apiService.getInsuranceClaimsReport(from, to, selectedScheme?.name);
      setClaimsData(data);
    } catch (e) { Alert.alert('Error', e.message || 'Failed to load claims'); }
    finally { setClaimsLoading(false); }
  }, [claimsPeriod, selectedScheme]);

  const loadSchemes = useCallback(async () => {
    try { const data = await apiService.getInsuranceSchemes(); setSchemes(data); } catch { }
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
      const token = await require('../utils/storage').default.getToken();
      const url = apiService.getInsuranceClaimsExportUrl(from, to, selectedScheme?.name);
      await Linking.openURL(`${url}&token=${token}`);
    } catch { Alert.alert('Export Failed', 'Could not open the export link'); }
    finally { setExporting(false); }
  };

  // ── Drill-down helpers ─────────────────────────────────────────────────────
  const openDrillDown = (title, subtitle, transactions) => {
    setDrillDown({ title, subtitle, transactions: transactions || [] });
  };

  // From financial summary cards — filter bills by status
  const openFinancialDrillDown = (type, label) => {
    if (!finData?.bills) return;
    const { from, to } = PERIODS[finPeriod].getValue();
    const periodLabel = `${PERIODS[finPeriod].label} · ${from} to ${to}`;
    let filtered = [];
    if (type === 'total')     filtered = finData.bills;
    if (type === 'collected') filtered = finData.bills.filter(b => b.status === 'paid' || b.status === 'waived');
    if (type === 'unpaid')    filtered = finData.bills.filter(b => b.status === 'unpaid');
    if (type === 'waived')    filtered = finData.bills.filter(b => b.status === 'waived');
    if (type === 'insurance') filtered = finData.bills.filter(b => b.status === 'insurance_pending');
    if (type === 'all')       filtered = finData.bills;
    openDrillDown(label, periodLabel, filtered);
  };

  // From service type rows
  const openServiceTypeDrillDown = (serviceType) => {
    if (!finData?.bills) return;
    const { from, to } = PERIODS[finPeriod].getValue();
    const filtered = finData.bills.filter(b => b.serviceType === serviceType);
    openDrillDown(
      `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Transactions`,
      `${PERIODS[finPeriod].label} · ${filtered.length} bills`,
      filtered,
    );
  };

  // From payment method rows
  const openPaymentMethodDrillDown = (method) => {
    if (!finData?.bills) return;
    const filtered = finData.bills.filter(b => b.paymentMethod === method);
    const label = method === 'mpesa' ? 'M-Pesa' : method.charAt(0).toUpperCase() + method.slice(1);
    openDrillDown(`${label} Transactions`, `${PERIODS[finPeriod].label} · ${filtered.length} transactions`, filtered);
  };

  // From insurance summary cards
  const openClaimsDrillDown = (type, label) => {
    if (!claimsData?.claims) return;
    const { from, to } = PERIODS[claimsPeriod].getValue();
    const periodLabel = `${PERIODS[claimsPeriod].label} · ${from} to ${to}`;
    let filtered = [];
    if (type === 'total')   filtered = claimsData.claims;
    if (type === 'pending') filtered = claimsData.claims.filter(b => b.status === 'insurance_pending');
    if (type === 'settled') filtered = claimsData.claims.filter(b => b.status === 'paid');
    openDrillDown(label, periodLabel, filtered);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const SummaryCard = ({ label, value, color = '#0f766e', icon, onPress, tapHint }) => (
    <TouchableOpacity
      style={[styles.summaryCard, onPress && styles.summaryCardTappable]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.summaryValue, { color }]}>
        {typeof value === 'number' ? `KES ${value.toLocaleString()}` : value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {onPress && (
        <View style={styles.summaryTapHint}>
          <Ionicons name="arrow-forward-circle-outline" size={14} color={color} />
          <Text style={[styles.summaryTapHintText, { color }]}>View</Text>
        </View>
      )}
    </TouchableOpacity>
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
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}>
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
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}>
      <PeriodSelector value={finPeriod} onChange={setFinPeriod} />
      {finLoading
        ? <ActivityIndicator style={styles.loader} color="#0f766e" size="large" />
        : finData && (
          <>
            {/* Tappable summary cards */}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Summary</Text>
            <Text style={styles.tapHintText}>Tap a card to view transactions</Text>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total Billed" icon="cash-multiple"
                value={finData.summary.totalBilled}
                onPress={() => openFinancialDrillDown('total', 'All Transactions')}
              />
              <SummaryCard
                label="Collected" icon="cash-check" color="#16a34a"
                value={finData.summary.totalCollected}
                onPress={() => openFinancialDrillDown('collected', 'Collected Payments')}
              />
              <SummaryCard
                label="Outstanding" icon="cash-clock" color="#dc2626"
                value={finData.summary.totalOutstanding}
                onPress={() => openFinancialDrillDown('unpaid', 'Outstanding Bills')}
              />
              <SummaryCard
                label="Waived" icon="cash-remove" color="#64748b"
                value={finData.summary.totalWaived}
                onPress={() => openFinancialDrillDown('waived', 'Waived Bills')}
              />
              <SummaryCard
                label="Insurance Pending" icon="shield-check-outline" color="#7c3aed"
                value={finData.summary.totalInsurancePending}
                onPress={() => openFinancialDrillDown('insurance', 'Insurance Pending')}
              />
              <SummaryCard
                label="Transactions" icon="receipt" color="#0f766e"
                value={finData.summary.transactionCount}
                onPress={() => openFinancialDrillDown('all', 'All Transactions')}
              />
            </View>

            {/* By service type — tappable rows */}
            <Text style={styles.sectionTitle}>By Service Type</Text>
            {finData.byServiceType.map((row) => (
              <TouchableOpacity
                key={row.type}
                style={styles.tableRow}
                onPress={() => openServiceTypeDrillDown(row.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.tableCell}>
                  {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                </Text>
                <Text style={styles.tableCell}>{row.count} bills</Text>
                <View style={styles.tableRowRight}>
                  <Text style={[styles.tableCell, { color: '#0f766e', fontWeight: '600' }]}>
                    KES {row.total.toLocaleString()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}

            {/* By payment method — tappable rows */}
            <Text style={styles.sectionTitle}>By Payment Method</Text>
            {finData.byPaymentMethod.filter(r => r.count > 0).map((row) => (
              <TouchableOpacity
                key={row.method}
                style={styles.tableRow}
                onPress={() => openPaymentMethodDrillDown(row.method)}
                activeOpacity={0.7}
              >
                <Text style={styles.tableCell}>
                  {row.method === 'mpesa' ? 'M-Pesa' : row.method.charAt(0).toUpperCase() + row.method.slice(1)}
                </Text>
                <Text style={styles.tableCell}>{row.count} transactions</Text>
                <View style={styles.tableRowRight}>
                  <Text style={[styles.tableCell, { color: '#0f766e', fontWeight: '600' }]}>
                    KES {row.total.toLocaleString()}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )
      }
    </ScrollView>
  );

  // ── Tab: Insurance Claims ──────────────────────────────────────────────────
  const renderClaimsTab = () => (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}>
      <PeriodSelector value={claimsPeriod} onChange={setClaimsPeriod} />
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
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Summary</Text>
            <Text style={styles.tapHintText}>Tap a card to view transactions</Text>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total Claimed" icon="shield-check-outline" color="#7c3aed"
                value={claimsData.summary.totalClaimed}
                onPress={() => openClaimsDrillDown('total', 'All Claims')}
              />
              <SummaryCard
                label="Pending" icon="clock-outline" color="#ca8a04"
                value={claimsData.summary.totalPending}
                onPress={() => openClaimsDrillDown('pending', 'Pending Claims')}
              />
              <SummaryCard
                label="Settled" icon="check-circle-outline" color="#16a34a"
                value={claimsData.summary.totalSettled}
                onPress={() => openClaimsDrillDown('settled', 'Settled Claims')}
              />
              <SummaryCard
                label="Claims" icon="file-document-outline" color="#0f766e"
                value={claimsData.summary.claimCount}
                onPress={() => openClaimsDrillDown('total', 'All Claims')}
              />
            </View>

            {/* By scheme */}
            {claimsData.byScheme.length > 1 && (
              <>
                <Text style={styles.sectionTitle}>By Insurer</Text>
                {claimsData.byScheme.map((row) => (
                  <TouchableOpacity
                    key={row.scheme}
                    style={styles.tableRow}
                    onPress={() => {
                      const filtered = claimsData.claims.filter(b => b.insuranceSchemeName === row.scheme);
                      openDrillDown(row.scheme, `${row.count} claims`, filtered);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>{row.scheme}</Text>
                    <Text style={styles.tableCell}>{row.count}</Text>
                    <View style={styles.tableRowRight}>
                      <Text style={[styles.tableCell, { color: '#7c3aed', fontWeight: '600' }]}>
                        KES {row.total.toLocaleString()}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Export button */}
            <View style={styles.claimsHeader}>
              <Text style={styles.sectionTitle}>Claims ({claimsData.claims.length})</Text>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
                {exporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><MaterialCommunityIcons name="download" size={15} color="#fff" />
                      <Text style={styles.exportBtnTxt}>Export CSV</Text></>
                }
              </TouchableOpacity>
            </View>

            {claimsData.claims.map((b) => (
              <View key={b.id} style={styles.claimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimName}>{b.patient?.firstName} {b.patient?.lastName}</Text>
                  <Text style={styles.claimMeta}>{b.patient?.patientId} · {b.patient?.membershipNo || 'No membership no.'}</Text>
                  <Text style={styles.claimMeta}>{b.insuranceSchemeName} · {b.serviceType}</Text>
                  <Text style={styles.claimMeta}>{new Date(b.createdAt).toLocaleDateString('en-KE')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.claimAmount}>KES {Number(b.amount).toLocaleString()}</Text>
                  <View style={[styles.claimStatusBadge,
                    b.status === 'insurance_pending' ? { backgroundColor: '#fefce8' } : { backgroundColor: '#f0fdf4' }
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

      {/* Scheme modal */}
      <Modal visible={schemeModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSchemeModalVisible(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Filter by Insurer</Text>
            <TouchableOpacity style={styles.schemeOption} onPress={() => { setSelectedScheme(null); setSchemeModalVisible(false); }}>
              <Text style={styles.schemeOptionTxt}>All Schemes</Text>
              {!selectedScheme && <Ionicons name="checkmark" size={18} color="#0f766e" />}
            </TouchableOpacity>
            {schemes.map((s) => (
              <TouchableOpacity key={s.id} style={styles.schemeOption} onPress={() => { setSelectedScheme(s); setSchemeModalVisible(false); }}>
                <Text style={styles.schemeOptionTxt}>{s.name}</Text>
                {selectedScheme?.id === s.id && <Ionicons name="checkmark" size={18} color="#0f766e" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );

  // ── If drill-down is open, show it full-screen ─────────────────────────────
  if (drillDown) {
    return (
      <TransactionDrillDown
        visible={true}
        title={drillDown.title}
        subtitle={drillDown.subtitle}
        transactions={drillDown.transactions}
        onBack={() => setDrillDown(null)}
      />
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {activeTab === 0 && renderPatientsTab()}
        {activeTab === 1 && renderFinancialsTab()}
        {activeTab === 2 && renderClaimsTab()}
      </View>
    </View>
  );
}

// ── Drill-down styles ─────────────────────────────────────────────────────────
const dd = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 14, color: '#94a3b8' },
  list: { padding: 16, gap: 10 },
  txCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  txTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  txNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txNumText: { fontSize: 12, fontWeight: '700', color: '#0f766e' },
  txPatient: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  txPatientId: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  txAmountPaid: { fontSize: 11, color: '#166534', marginTop: 2, fontWeight: '600' },
  txMeta: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  txMetaLeft: { flex: 1, marginRight: 10 },
  txService: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 4 },
  txDate: { fontSize: 11, color: '#94a3b8' },
  txStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  txStatusText: { fontSize: 11, fontWeight: '700' },
  txMethodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  txMethodText: { fontSize: 11, fontWeight: '700' },
  txRef: { fontSize: 10, color: '#94a3b8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  txHistorySection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  txHistoryLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  txHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  txHistoryAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
});

// ── Main screen styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingTop: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
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
  tapHintText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },

  periodRow: { paddingHorizontal: 16, paddingVertical: 12 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8 },
  periodBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  periodTxt: { fontSize: 13, color: '#64748b' },
  periodTxtActive: { color: '#0f766e', fontWeight: '700' },

  // Summary cards — now tappable
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  summaryCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 4, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  summaryCardTappable: {
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  summaryTapHint: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 2,
  },
  summaryTapHintText: { fontSize: 10, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tableRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tableCell: { flex: 1, fontSize: 13, color: '#475569' },

  // Patients today
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },
  totalLabel: { fontSize: 13, color: '#64748b', marginHorizontal: 16, marginBottom: 8 },
  visitCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  visitTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf9', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  visitName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  visitMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontSize: 11, fontWeight: '600' },
  visitDetails: { marginTop: 10, gap: 3 },
  visitDetailTxt: { fontSize: 12, color: '#64748b' },

  // Insurance
  schemeFilter: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    gap: 8, borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  schemeFilterTxt: { flex: 1, fontSize: 14, color: '#1e293b' },
  claimsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f766e',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6,
  },
  exportBtnTxt: { fontSize: 13, color: '#fff', fontWeight: '600' },
  claimRow: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  claimName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  claimMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  claimAmount: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  claimStatusBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  claimStatusTxt: { fontSize: 11, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '60%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  schemeOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  schemeOptionTxt: { fontSize: 15, color: '#1e293b' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: '#94a3b8' },
});
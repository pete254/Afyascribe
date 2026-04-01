// src/components/TranscriptionBillingTab.js
// Billing tab inside TranscriptionScreen — doctor picks services, creates bills.
// Receptionist collects payment from QueueScreen; payment unblocks the visit.
// The SOAP note is kept as a draft until billing is acknowledged.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_META = {
  consultation:  { label: 'Consultation',  icon: 'stethoscope',            color: '#0f766e', bg: '#f0fdf4' },
  lab:           { label: 'Lab',           icon: 'flask',                  color: '#2563eb', bg: '#eff6ff' },
  imaging:       { label: 'Imaging',       icon: 'radiobox-marked',        color: '#7c3aed', bg: '#f5f3ff' },
  procedure:     { label: 'Procedure',     icon: 'needle',                 color: '#d97706', bg: '#fffbeb' },
  pharmacy:      { label: 'Pharmacy',      icon: 'pill',                   color: '#dc2626', bg: '#fef2f2' },
  nursing:       { label: 'Nursing',       icon: 'heart-pulse',            color: '#db2777', bg: '#fdf2f8' },
  theatre:       { label: 'Theatre',       icon: 'hospital-box',           color: '#0891b2', bg: '#ecfeff' },
  physiotherapy: { label: 'Physio',        icon: 'human-handsup',          color: '#65a30d', bg: '#f7fee7' },
  other:         { label: 'Other',         icon: 'dots-horizontal-circle', color: '#64748b', bg: '#f8fafc' },
};
const getCat = (cat) => CATEGORY_META[cat] || CATEGORY_META.other;

// Map service catalog category → billing ServiceType
const CAT_TO_SERVICE_TYPE = {
  consultation: 'consultation',
  lab: 'lab',
  imaging: 'imaging',
  procedure: 'procedure',
  pharmacy: 'pharmacy',
  nursing: 'other',
  theatre: 'procedure',
  physiotherapy: 'other',
  other: 'other',
};

// ── Service Picker Modal ──────────────────────────────────────────────────────
function ServicePickerModal({ visible, onClose, onSelect, onCustom }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (visible) {
      setSearch('');
      setActiveCategory('all');
      apiService.getServiceCatalog()
        .then(setCatalog)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const categories = ['all', ...new Set(catalog.map((i) => i.category))];
  const filtered = catalog.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>Add Service to Bill</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={pm.searchRow}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={pm.searchInput}
              placeholder="Search services..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#94a3b8"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pm.catScroll}
          >
            {categories.map((cat) => {
              const meta = cat === 'all'
                ? { label: 'All', color: '#0f766e', bg: '#f0fdf4' }
                : getCat(cat);
              const isActive = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[pm.catPill, isActive && { backgroundColor: meta.bg, borderColor: meta.color }]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[pm.catPillText, isActive && { color: meta.color, fontWeight: '700' }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List */}
          {loading ? (
            <View style={pm.loader}>
              <ActivityIndicator color="#0f766e" />
              <Text style={pm.loaderText}>Loading catalog...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={pm.empty}>
                  <MaterialCommunityIcons name="clipboard-search-outline" size={40} color="#cbd5e1" />
                  <Text style={pm.emptyText}>
                    {catalog.length === 0
                      ? 'No services in catalog yet. Use the seed button on the Service Catalog screen.'
                      : 'No matches'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const meta = getCat(item.category);
                return (
                  <TouchableOpacity
                    style={pm.serviceRow}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[pm.serviceIconBox, { backgroundColor: meta.bg }]}>
                      <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={pm.serviceInfo}>
                      <Text style={pm.serviceName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={pm.serviceDesc} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={pm.priceText}>KES {Number(item.defaultPrice).toLocaleString()}</Text>
                      <Ionicons name="add-circle" size={22} color="#0f766e" style={{ marginTop: 4 }} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Custom service */}
          <TouchableOpacity style={pm.customBtn} onPress={onCustom}>
            <Ionicons name="create-outline" size={18} color="#7c3aed" />
            <Text style={pm.customBtnText}>Add Custom Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Confirm Amount Modal ──────────────────────────────────────────────────────
function ConfirmAmountModal({ visible, onClose, onAdd, prefill }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('consultation');

  useEffect(() => {
    if (visible && prefill) {
      setName(prefill.name || '');
      setAmount(prefill.defaultPrice != null ? String(Math.round(prefill.defaultPrice)) : '');
      setCategory(prefill.category || 'consultation');
    } else if (visible && !prefill) {
      setName('');
      setAmount('');
      setCategory('consultation');
    }
  }, [visible, prefill]);

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert('Missing', 'Please enter a service name'); return; }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < 0) {
      Alert.alert('Missing', 'Please enter a valid amount (0 or more)');
      return;
    }
    onAdd({ name: name.trim(), amount: parsed, category, catalogItemId: prefill?.id });
  };

  const catMeta = getCat(category);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={[pm.sheet, { maxHeight: '60%' }]}>
          <View style={pm.header}>
            <Text style={pm.title}>{prefill ? prefill.name : 'Custom Service'}</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            {!prefill && (
              <View style={{ marginBottom: 16 }}>
                <Text style={cm.label}>Service Name *</Text>
                <TextInput
                  style={cm.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. CBC Blood Test"
                  placeholderTextColor="#cbd5e1"
                  autoFocus
                />
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <Text style={cm.label}>Amount (KES) *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748b' }}>KES</Text>
                <TextInput
                  style={[cm.input, { flex: 1 }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#cbd5e1"
                  autoFocus={!!prefill}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={[pm.customBtn, { backgroundColor: '#0f766e', margin: 20, marginTop: 0, borderRadius: 14, borderWidth: 0 }]} onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={[pm.customBtnText, { color: '#fff' }]}>Add to Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TranscriptionBillingTab({ visitContext, selectedPatient, onUnpaidBillsChange }) {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [prefillService, setPrefillService] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const visitId = visitContext?.id;

  const load = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    try {
      const [billData, summaryData] = await Promise.all([
        apiService.getVisitBills(visitId),
        apiService.getVisitBillingSummary(visitId),
      ]);
      setBills(Array.isArray(billData) ? billData : []);
      setSummary(summaryData);
      // Notify parent about unpaid status
      const unpaid = summaryData?.unpaid ?? 0;
      onUnpaidBillsChange?.(unpaid > 0);
    } catch (e) {
      console.error('Failed to load bills:', e);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => { load(); }, [load]);

  const handleSelectService = (item) => {
    setPickerVisible(false);
    setPrefillService(item);
    setConfirmVisible(true);
  };

  const handleCustom = () => {
    setPickerVisible(false);
    setPrefillService(null);
    setConfirmVisible(true);
  };

  const handleConfirmAdd = async ({ name, amount, category }) => {
    setConfirmVisible(false);
    if (!visitId) {
      Alert.alert('No Visit Found', 'This patient does not have an active visit today. Ask the receptionist to check them in first.');
      return;
    }
    setAdding(true);
    try {
      await apiService.createBill(
        visitId,
        CAT_TO_SERVICE_TYPE[category] || 'other',
        name,
        amount,
        'cash',
        null,
      );
      await load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add bill');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (bill) => {
    Alert.alert(
      'Remove Bill',
      `Remove "${bill.serviceDescription || bill.serviceType}" (KES ${Number(bill.amount).toLocaleString()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(bill.id);
            try {
              await apiService.deleteBill(bill.id);
              await load();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete bill');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // ── No visit — explain the flow ───────────────────────────────────────────
  if (!visitId) {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.noVisitCard}>
          <View style={s.noVisitIconBox}>
            <MaterialCommunityIcons name="cash-register" size={40} color="#94a3b8" />
          </View>
          <Text style={s.noVisitTitle}>No Active Visit</Text>
          <Text style={s.noVisitBody}>
            Billing is linked to today's patient visit. To add a bill:
          </Text>
          <View style={s.stepList}>
            {[
              { icon: 'account-arrow-right-outline', text: 'Ask the receptionist to check in this patient', color: '#0f766e' },
              { icon: 'cash-register', text: 'Return here to add services to their bill', color: '#2563eb' },
              { icon: 'cash-check', text: 'The receptionist collects payment — the visit then moves to your queue', color: '#7c3aed' },
            ].map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepIcon, { backgroundColor: step.color + '18' }]}>
                  <MaterialCommunityIcons name={step.icon} size={18} color={step.color} />
                </View>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {selectedPatient && (
          <View style={s.patientInfoCard}>
            <MaterialCommunityIcons name="account-circle-outline" size={18} color="#0f766e" />
            <View style={{ flex: 1 }}>
              <Text style={s.patientInfoName}>{selectedPatient.firstName} {selectedPatient.lastName}</Text>
              <Text style={s.patientInfoId}>{selectedPatient.patientId}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Has visit — show billing panel ────────────────────────────────────────
  const hasUnpaid = (summary?.unpaid ?? 0) > 0;
  const totalBilled = summary?.total ?? 0;

  return (
    <ScrollView
      contentContainerStyle={[s.container, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Status banner */}
      {hasUnpaid ? (
        <View style={s.unpaidBanner}>
          <MaterialCommunityIcons name="cash-clock" size={18} color="#b45309" />
          <View style={{ flex: 1 }}>
            <Text style={s.unpaidBannerTitle}>Payment Pending</Text>
            <Text style={s.unpaidBannerBody}>
              KES {(summary?.unpaid ?? 0).toLocaleString()} unpaid. The SOAP note will be saved as a draft.
              The receptionist must collect payment before the visit is cleared.
            </Text>
          </View>
        </View>
      ) : totalBilled > 0 ? (
        <View style={s.paidBanner}>
          <MaterialCommunityIcons name="cash-check" size={18} color="#166534" />
          <Text style={s.paidBannerText}>All bills cleared ✓</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={s.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="receipt" size={18} color="#0f766e" />
          <Text style={s.sectionTitle}>Visit Bills</Text>
          {bills.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{bills.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[s.addBtn, (adding || loading) && s.addBtnDisabled]}
          onPress={() => setPickerVisible(true)}
          disabled={adding || loading}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnText}>Add Service</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && bills.length === 0 && (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#0f766e" size="small" />
          <Text style={s.loadingText}>Loading bills...</Text>
        </View>
      )}

      {/* Empty state */}
      {!loading && bills.length === 0 && (
        <TouchableOpacity style={s.emptyBox} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="receipt" size={36} color="#cbd5e1" />
          <Text style={s.emptyTitle}>No bills yet</Text>
          <Text style={s.emptySubtitle}>
            Add services from your facility catalog. The patient pays at reception before being cleared.
          </Text>
          <View style={[s.addBtn, { alignSelf: 'center', marginTop: 12 }]}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add First Service</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Bills list */}
      {bills.map((bill) => {
        const isDeleting = deletingId === bill.id;
        const isPaid = bill.status === 'paid' || bill.status === 'waived';
        const isInsurance = bill.status === 'insurance_pending';

        let statusColor = '#dc2626'; let statusBg = '#fee2e2'; let statusLabel = 'Unpaid';
        if (isPaid) { statusColor = '#166534'; statusBg = '#dcfce7'; statusLabel = bill.status === 'waived' ? 'Waived' : 'Paid'; }
        if (isInsurance) { statusColor = '#b45309'; statusBg = '#fef3c7'; statusLabel = 'Insurance'; }

        return (
          <View key={bill.id} style={[s.billCard, isDeleting && { opacity: 0.4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.billName}>{bill.serviceDescription || bill.serviceType}</Text>
              <View style={[s.statusTag, { backgroundColor: statusBg }]}>
                <Text style={[s.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={s.billAmount}>KES {Number(bill.amount).toLocaleString()}</Text>
              {bill.status === 'unpaid' && (
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDelete(bill)}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? <ActivityIndicator size="small" color="#dc2626" />
                    : <Ionicons name="trash-outline" size={15} color="#dc2626" />
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Summary footer */}
      {totalBilled > 0 && (
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total Billed</Text>
            <Text style={s.summaryTotal}>KES {totalBilled.toLocaleString()}</Text>
          </View>
          {hasUnpaid && (
            <View style={[s.summaryRow, { marginTop: 4 }]}>
              <Text style={[s.summaryLabel, { color: '#b45309' }]}>Unpaid</Text>
              <Text style={[s.summaryTotal, { color: '#b45309' }]}>
                KES {(summary?.unpaid ?? 0).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Info note about draft */}
      {bills.length > 0 && hasUnpaid && (
        <View style={s.draftInfoCard}>
          <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
          <Text style={s.draftInfoText}>
            Your SOAP note is auto-saved as a <Text style={{ fontWeight: '700' }}>draft</Text> while payment is outstanding.
            After the receptionist collects payment, you can finalise the note.
          </Text>
        </View>
      )}

      {/* Modals */}
      <ServicePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectService}
        onCustom={handleCustom}
      />
      <ConfirmAmountModal
        visible={confirmVisible}
        onClose={() => { setConfirmVisible(false); setPrefillService(null); }}
        onAdd={handleConfirmAdd}
        prefill={prefillService}
      />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { padding: 16 },

  noVisitCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 16,
  },
  noVisitIconBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  noVisitTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  noVisitBody: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  stepList: { width: '100%', gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  patientInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  patientInfoName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  patientInfoId: { fontSize: 12, color: '#64748b', marginTop: 2 },

  unpaidBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#fde68a', marginBottom: 16,
  },
  unpaidBannerTitle: { fontSize: 14, fontWeight: '700', color: '#b45309', marginBottom: 4 },
  unpaidBannerBody: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  paidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dcfce7', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#86efac', marginBottom: 16,
  },
  paidBannerText: { fontSize: 14, fontWeight: '600', color: '#166534' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  countBadge: { backgroundColor: '#ccfbf1', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#0f766e' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0f766e', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 24, justifyContent: 'center' },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  emptyBox: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20,
    backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed', gap: 8, marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  billCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  billName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  statusTag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  billAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff1f2',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecdd3',
  },

  summaryCard: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8, marginBottom: 12,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  draftInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  draftInfoText: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 18 },
});

// ── Picker Modal Styles ────────────────────────────────────────────────────────
const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  catScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  catPillText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  loader: { alignItems: 'center', padding: 40, gap: 10 },
  loaderText: { fontSize: 14, color: '#94a3b8' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 12,
  },
  serviceIconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  serviceDesc: { fontSize: 12, color: '#94a3b8' },
  priceText: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, padding: 14, backgroundColor: '#f5f3ff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ddd6fe',
  },
  customBtnText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
});

const cm = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 15, color: '#0f172a',
  },
});
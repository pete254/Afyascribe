// src/components/VisitBillingPanel.js
// Shown to doctors/nurses during a patient visit.
// Lets them pick from the facility service catalog or add custom services.
// Unpaid bills block patient discharge.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  TextInput, Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

// Category metadata
const CATEGORY_META = {
  consultation:   { label: 'Consultation',   icon: 'stethoscope',         color: '#0f766e', bg: '#f0fdf4' },
  lab:            { label: 'Lab',            icon: 'flask',               color: '#2563eb', bg: '#eff6ff' },
  imaging:        { label: 'Imaging',        icon: 'radiobox-marked',     color: '#7c3aed', bg: '#f5f3ff' },
  procedure:      { label: 'Procedure',      icon: 'needle',              color: '#d97706', bg: '#fffbeb' },
  pharmacy:       { label: 'Pharmacy',       color: '#dc2626', bg: '#fef2f2',
                    icon: 'pill' },
  nursing:        { label: 'Nursing',        icon: 'heart-pulse',         color: '#db2777', bg: '#fdf2f8' },
  theatre:        { label: 'Theatre',        icon: 'hospital-box',        color: '#0891b2', bg: '#ecfeff' },
  physiotherapy:  { label: 'Physio',         icon: 'human-handsup',       color: '#65a30d', bg: '#f7fee7' },
  other:          { label: 'Other',          icon: 'dots-horizontal-circle', color: '#64748b', bg: '#f8fafc' },
};

const getCatMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.other;

// ── Service Picker Modal ───────────────────────────────────────────────────────
function ServicePickerModal({ visible, onClose, onSelectService, onAddCustom }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getServiceCatalog();
      setCatalog(data);
    } catch (e) {
      console.error('Failed to load catalog:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) { loadCatalog(); setSearch(''); setActiveCategory('all'); }
  }, [visible]);

  const categories = ['all', ...new Set(catalog.map(i => i.category))];

  const filtered = catalog.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          {/* Header */}
          <View style={pm.header}>
            <Text style={pm.title}>Add Service</Text>
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

          {/* Category filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pm.catScroll}
          >
            {categories.map(cat => {
              const meta = cat === 'all' ? { label: 'All', color: '#0f766e', bg: '#f0fdf4' } : getCatMeta(cat);
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
              <Text style={pm.loaderText}>Loading services...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={i => i.id}
              style={pm.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={pm.empty}>
                  <MaterialCommunityIcons name="clipboard-search-outline" size={40} color="#cbd5e1" />
                  <Text style={pm.emptyText}>No services found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const meta = getCatMeta(item.category);
                return (
                  <TouchableOpacity
                    style={pm.serviceRow}
                    onPress={() => onSelectService(item)}
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
                      <View style={[pm.catTag, { backgroundColor: meta.bg }]}>
                        <Text style={[pm.catTagText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <View style={pm.priceBox}>
                      <Text style={pm.priceText}>KES {Number(item.defaultPrice).toLocaleString()}</Text>
                      <Ionicons name="add-circle" size={22} color="#0f766e" />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Custom service button */}
          <TouchableOpacity style={pm.customBtn} onPress={onAddCustom}>
            <Ionicons name="create-outline" size={18} color="#7c3aed" />
            <Text style={pm.customBtnText}>Add Custom Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Custom Service Modal ───────────────────────────────────────────────────────
function CustomServiceModal({ visible, onClose, onAdd, prefill }) {
  const [name, setName] = useState(prefill?.name || '');
  const [amount, setAmount] = useState(prefill?.defaultPrice ? String(prefill.defaultPrice) : '');
  const [category, setCategory] = useState(prefill?.category || 'consultation');
  const [catPickerVisible, setCatPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(prefill?.name || '');
      setAmount(prefill?.defaultPrice ? String(Math.round(prefill.defaultPrice)) : '');
      setCategory(prefill?.category || 'consultation');
    }
  }, [visible, prefill]);

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert('Missing', 'Please enter a service name'); return; }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < 0) {
      Alert.alert('Missing', 'Please enter a valid amount');
      return;
    }
    onAdd({ name: name.trim(), amount: parsed, category, catalogItemId: prefill?.id });
  };

  const catMeta = getCatMeta(category);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={[pm.sheet, { paddingBottom: 40 }]}>
          <View style={pm.header}>
            <Text style={pm.title}>{prefill ? `Add: ${prefill.name}` : 'Custom Service'}</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={cm.form}>
            {/* Service name */}
            <View style={cm.field}>
              <Text style={cm.label}>Service Name <Text style={cm.req}>*</Text></Text>
              <TextInput
                style={cm.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Malaria RDT Test"
                placeholderTextColor="#cbd5e1"
              />
            </View>

            {/* Amount */}
            <View style={cm.field}>
              <Text style={cm.label}>Amount (KES) <Text style={cm.req}>*</Text></Text>
              <View style={cm.amountRow}>
                <Text style={cm.currencyLabel}>KES</Text>
                <TextInput
                  style={[cm.input, cm.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </View>

            {/* Category */}
            <View style={cm.field}>
              <Text style={cm.label}>Category</Text>
              <TouchableOpacity
                style={[cm.input, cm.catTrigger]}
                onPress={() => setCatPickerVisible(true)}
              >
                <View style={[cm.catDot, { backgroundColor: catMeta.bg }]}>
                  <MaterialCommunityIcons name={catMeta.icon} size={14} color={catMeta.color} />
                </View>
                <Text style={cm.catText}>{catMeta.label}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Category picker inline */}
            {catPickerVisible && (
              <View style={cm.catGrid}>
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <TouchableOpacity
                    key={key}
                    style={[cm.catChip, category === key && { borderColor: meta.color, backgroundColor: meta.bg }]}
                    onPress={() => { setCategory(key); setCatPickerVisible(false); }}
                  >
                    <MaterialCommunityIcons name={meta.icon} size={14} color={category === key ? meta.color : '#94a3b8'} />
                    <Text style={[cm.catChipText, category === key && { color: meta.color, fontWeight: '700' }]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={cm.addBtn} onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={cm.addBtnText}>Add to Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit Bill Modal ────────────────────────────────────────────────────────────
function EditBillModal({ visible, bill, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (bill && visible) {
      setAmount(String(Math.round(Number(bill.amount))));
      setDesc(bill.serviceDescription || '');
    }
  }, [bill, visible]);

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('Invalid', 'Please enter a valid amount');
      return;
    }
    onSave({ amount: parsed, serviceDescription: desc.trim() || undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View style={[pm.sheet, { paddingBottom: 36 }]}>
          <View style={pm.header}>
            <Text style={pm.title}>Edit Bill Line</Text>
            <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={[cm.form, { marginBottom: 16 }]}>
            <Text style={cm.billName}>{bill?.serviceType} — {bill?.serviceDescription || 'Service'}</Text>

            <View style={cm.field}>
              <Text style={cm.label}>Amount (KES)</Text>
              <View style={cm.amountRow}>
                <Text style={cm.currencyLabel}>KES</Text>
                <TextInput
                  style={[cm.input, cm.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
            </View>

            <View style={cm.field}>
              <Text style={cm.label}>Description (optional)</Text>
              <TextInput
                style={cm.input}
                value={desc}
                onChangeText={setDesc}
                placeholder="Add details..."
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>

          <TouchableOpacity style={cm.addBtn} onPress={handleSave}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={cm.addBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function VisitBillingPanel({ visit, onBillsChanged }) {
  const [bills, setBills]                       = useState([]);
  const [summary, setSummary]                   = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [adding, setAdding]                     = useState(false);
  const [pickerVisible, setPickerVisible]       = useState(false);
  const [customVisible, setCustomVisible]       = useState(false);
  const [editVisible, setEditVisible]           = useState(false);
  const [prefillService, setPrefillService]     = useState(null);
  const [editingBill, setEditingBill]           = useState(null);
  const [deletingId, setDeletingId]             = useState(null);

  const load = useCallback(async () => {
    if (!visit?.id) return;
    try {
      setLoading(true);
      const [billData, summaryData] = await Promise.all([
        apiService.getVisitBills(visit.id),
        apiService.getVisitBillingSummary(visit.id),
      ]);
      setBills(Array.isArray(billData) ? billData : []);
      setSummary(summaryData);
    } catch (e) {
      console.error('❌ Failed to load bills:', e);
    } finally {
      setLoading(false);
    }
  }, [visit?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Add bill from catalog ──────────────────────────────────────────────────
  const handleSelectService = (item) => {
    setPickerVisible(false);
    setPrefillService(item);
    setCustomVisible(true);
  };

  const handleAddCustom = () => {
    setPickerVisible(false);
    setPrefillService(null);
    setCustomVisible(true);
  };

  const handleConfirmAdd = async ({ name, amount, category, catalogItemId }) => {
    setCustomVisible(false);
    setAdding(true);
    try {
      // Map category back to ServiceType
      const serviceTypeMap = {
        consultation: 'consultation',
        lab:          'lab',
        imaging:      'imaging',
        procedure:    'procedure',
        pharmacy:     'pharmacy',
        nursing:      'other',
        theatre:      'procedure',
        physiotherapy:'other',
        other:        'other',
      };

      await apiService.createBill(
        visit.id,
        serviceTypeMap[category] || 'other',
        name,
        amount,
        'cash',  // default — receptionist changes payment mode at checkout
        null,    // insuranceSchemeName
        catalogItemId,
      );
      await load();
      onBillsChanged?.();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add bill');
    } finally {
      setAdding(false);
    }
  };

  // ── Edit bill ──────────────────────────────────────────────────────────────
  const handleEditBill = (bill) => {
    if (bill.status !== 'unpaid') {
      Alert.alert('Cannot Edit', 'Only unpaid bills can be edited.');
      return;
    }
    setEditingBill(bill);
    setEditVisible(true);
  };

  const handleSaveEdit = async ({ amount, serviceDescription }) => {
    if (!editingBill) return;
    setEditVisible(false);
    try {
      await apiService.updateBill(editingBill.id, { amount, serviceDescription });
      await load();
      onBillsChanged?.();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update bill');
    }
  };

  // ── Delete bill ────────────────────────────────────────────────────────────
  const handleDeleteBill = (bill) => {
    if (bill.status !== 'unpaid') {
      Alert.alert('Cannot Delete', 'Only unpaid bills can be removed.');
      return;
    }
    Alert.alert(
      'Remove Bill',
      `Remove "${bill.serviceDescription || bill.serviceType}" (KES ${Number(bill.amount).toLocaleString()}) from this visit?`,
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
              onBillsChanged?.();
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderBillItem = (bill) => {
    const isPaid   = bill.status === 'paid' || bill.status === 'waived';
    const isInsurance = bill.status === 'insurance_pending';
    const isDeleting = deletingId === bill.id;

    let statusColor = '#dc2626';
    let statusBg    = '#fee2e2';
    let statusLabel = 'Unpaid';
    if (isPaid)        { statusColor = '#166534'; statusBg = '#dcfce7'; statusLabel = bill.status === 'waived' ? 'Waived' : 'Paid'; }
    if (isInsurance)   { statusColor = '#b45309'; statusBg = '#fef3c7'; statusLabel = 'Insurance'; }

    return (
      <View key={bill.id} style={[s.billRow, isDeleting && { opacity: 0.4 }]}>
        <View style={s.billLeft}>
          <Text style={s.billName} numberOfLines={1}>
            {bill.serviceDescription || bill.serviceType}
          </Text>
          <View style={[s.statusTag, { backgroundColor: statusBg }]}>
            <Text style={[s.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={s.billRight}>
          <Text style={s.billAmount}>KES {Number(bill.amount).toLocaleString()}</Text>

          {/* Edit / Delete only for unpaid */}
          {bill.status === 'unpaid' && (
            <View style={s.billActions}>
              <TouchableOpacity
                style={s.billActionBtn}
                onPress={() => handleEditBill(bill)}
                disabled={isDeleting}
              >
                <Ionicons name="pencil" size={14} color="#0f766e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.billActionBtn, { marginLeft: 4 }]}
                onPress={() => handleDeleteBill(bill)}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <ActivityIndicator size="small" color="#dc2626" />
                  : <Ionicons name="trash-outline" size={14} color="#dc2626" />
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator color="#0f766e" size="small" />
        <Text style={s.loadingText}>Loading bills...</Text>
      </View>
    );
  }

  const unpaidTotal  = summary?.unpaid ?? 0;
  const hasUnpaid    = unpaidTotal > 0;
  const totalBilled  = summary?.total ?? 0;

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <MaterialCommunityIcons name="cash-register" size={18} color="#0f766e" />
          <Text style={s.headerTitle}>Visit Bills</Text>
          {hasUnpaid && (
            <View style={s.unpaidBadge}>
              <Text style={s.unpaidBadgeText}>KES {unpaidTotal.toLocaleString()} unpaid</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[s.addBtn, adding && s.addBtnDisabled]}
          onPress={() => setPickerVisible(true)}
          disabled={adding}
        >
          {adding
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="add" size={16} color="#fff" /><Text style={s.addBtnText}>Add Service</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Bills list */}
      {bills.length === 0 ? (
        <TouchableOpacity style={s.emptyBox} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="receipt" size={32} color="#cbd5e1" />
          <Text style={s.emptyTitle}>No bills yet</Text>
          <Text style={s.emptySubtitle}>Tap to add services billed during this visit</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.billList}>
          {bills.map(renderBillItem)}

          {/* Summary footer */}
          {totalBilled > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Total Billed</Text>
              <Text style={s.summaryTotal}>KES {totalBilled.toLocaleString()}</Text>
            </View>
          )}

          {hasUnpaid && (
            <View style={s.unpaidWarning}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={s.unpaidWarningText}>
                KES {unpaidTotal.toLocaleString()} must be cleared at reception before discharge
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Modals */}
      <ServicePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectService={handleSelectService}
        onAddCustom={handleAddCustom}
      />

      <CustomServiceModal
        visible={customVisible}
        onClose={() => { setCustomVisible(false); setPrefillService(null); }}
        onAdd={handleConfirmAdd}
        prefill={prefillService}
      />

      <EditBillModal
        visible={editVisible}
        bill={editingBill}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {},
  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, backgroundColor: '#fff', borderRadius: 12,
  },
  loadingText: { fontSize: 13, color: '#94a3b8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  unpaidBadge: {
    backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  unpaidBadgeText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0f766e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyBox: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20,
    backgroundColor: '#f8fafc', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed', gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  billList: { gap: 2 },
  billRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 4,
  },
  billLeft: { flex: 1, marginRight: 12 },
  billName: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  statusTag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  billRight: { alignItems: 'flex-end', gap: 6 },
  billAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  billActions: { flexDirection: 'row', alignItems: 'center' },
  billActionBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  unpaidWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    marginTop: 8, borderWidth: 1, borderColor: '#fde68a',
  },
  unpaidWarningText: { flex: 1, fontSize: 12, color: '#b45309', lineHeight: 17 },
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
    margin: 16, backgroundColor: '#f8fafc', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  catScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  catPillText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  list: { flex: 1 },
  loader: { alignItems: 'center', padding: 40, gap: 10 },
  loaderText: { fontSize: 14, color: '#94a3b8' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 12,
  },
  serviceIconBox: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  serviceDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  catTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catTagText: { fontSize: 11, fontWeight: '600' },
  priceBox: { alignItems: 'flex-end', gap: 4 },
  priceText: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, padding: 14, backgroundColor: '#f5f3ff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ddd6fe',
  },
  customBtnText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
});

// ── Custom Modal Styles ────────────────────────────────────────────────────────
const cm = StyleSheet.create({
  form: { padding: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  req: { color: '#ef4444' },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9, fontSize: 15, color: '#0f172a',
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencyLabel: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  amountInput: { flex: 1 },
  catTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between',
  },
  catDot: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catText: { flex: 1, fontSize: 15, color: '#0f172a' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  catChipText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0f766e', borderRadius: 14, paddingVertical: 16,
    marginHorizontal: 20,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  billName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
});
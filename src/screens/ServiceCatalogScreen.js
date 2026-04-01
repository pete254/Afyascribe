// src/screens/ServiceCatalogScreen.js
// Facility admin manages the hospital's service price list.
// Doctors/nurses use this catalog when billing during visits.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, ActivityIndicator, RefreshControl, TextInput,
  Modal, ScrollView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

const CATEGORY_META = {
  consultation:   { label: 'Consultation',   icon: 'stethoscope',            color: '#0f766e', bg: '#f0fdf4' },
  lab:            { label: 'Lab',            icon: 'flask',                  color: '#2563eb', bg: '#eff6ff' },
  imaging:        { label: 'Imaging',        icon: 'radiobox-marked',        color: '#7c3aed', bg: '#f5f3ff' },
  procedure:      { label: 'Procedure',      icon: 'needle',                 color: '#d97706', bg: '#fffbeb' },
  pharmacy:       { label: 'Pharmacy',       icon: 'pill',                   color: '#dc2626', bg: '#fef2f2' },
  nursing:        { label: 'Nursing',        icon: 'heart-pulse',            color: '#db2777', bg: '#fdf2f8' },
  theatre:        { label: 'Theatre',        icon: 'hospital-box',           color: '#0891b2', bg: '#ecfeff' },
  physiotherapy:  { label: 'Physio',         icon: 'human-handsup',          color: '#65a30d', bg: '#f7fee7' },
  other:          { label: 'Other',          icon: 'dots-horizontal-circle', color: '#64748b', bg: '#f8fafc' },
};

const CATEGORIES = Object.keys(CATEGORY_META);
const getCatMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.other;

// ── Add / Edit Service Modal ────────────────────────────────────────────────
function ServiceFormModal({ visible, onClose, onSave, editItem }) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [price, setPrice]       = useState('');
  const [category, setCategory] = useState('consultation');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      if (editItem) {
        setName(editItem.name);
        setDesc(editItem.description || '');
        setPrice(String(Math.round(Number(editItem.defaultPrice))));
        setCategory(editItem.category);
      } else {
        setName(''); setDesc(''); setPrice(''); setCategory('consultation');
      }
    }
  }, [visible, editItem]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Missing', 'Service name is required'); return; }
    const parsedPrice = parseFloat(price);
    if (price === '' || isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Missing', 'Please enter a valid price (0 or more)');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: desc.trim() || undefined,
        defaultPrice: parsedPrice,
        category,
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const catMeta = getCatMeta(category);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={fm.overlay}>
        <View style={fm.sheet}>
          <View style={fm.header}>
            <Text style={fm.title}>{editItem ? 'Edit Service' : 'Add Service'}</Text>
            <TouchableOpacity onPress={onClose} style={fm.closeBtn}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={fm.body} keyboardShouldPersistTaps="handled">
            {/* Name */}
            <View style={fm.field}>
              <Text style={fm.label}>Service Name <Text style={fm.req}>*</Text></Text>
              <TextInput
                style={fm.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. General Consultation"
                placeholderTextColor="#cbd5e1"
                autoFocus={!editItem}
              />
            </View>

            {/* Description */}
            <View style={fm.field}>
              <Text style={fm.label}>Description <Text style={fm.opt}>(optional)</Text></Text>
              <TextInput
                style={[fm.input, fm.textArea]}
                value={desc}
                onChangeText={setDesc}
                placeholder="Brief description of this service..."
                placeholderTextColor="#cbd5e1"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Price */}
            <View style={fm.field}>
              <Text style={fm.label}>Default Price (KES) <Text style={fm.req}>*</Text></Text>
              <View style={fm.priceRow}>
                <Text style={fm.currency}>KES</Text>
                <TextInput
                  style={[fm.input, fm.priceInput]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
              <Text style={fm.hint}>This is the default — it can be changed per visit</Text>
            </View>

            {/* Category */}
            <View style={fm.field}>
              <Text style={fm.label}>Category</Text>
              <View style={fm.catGrid}>
                {CATEGORIES.map(cat => {
                  const meta = getCatMeta(cat);
                  const isActive = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[fm.catChip, isActive && { borderColor: meta.color, backgroundColor: meta.bg }]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={meta.icon} size={14} color={isActive ? meta.color : '#94a3b8'} />
                      <Text style={[fm.catChipText, isActive && { color: meta.color, fontWeight: '700' }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[fm.saveBtn, saving && fm.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={fm.saveBtnText}>{editItem ? 'Save Changes' : 'Add Service'}</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ServiceCatalogScreen({ onBack }) {
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [formVisible, setFormVisible]   = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [seeding, setSeeding]           = useState(false);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const load = useCallback(async (showAll = false) => {
    try {
      const data = await apiService.getServiceCatalog(showAll);
      setItems(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load service catalog');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSeedDefaults = async () => {
    Alert.alert(
      'Seed Default Services',
      'This will add common hospital services to your catalog. Existing services won\'t be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Defaults',
          onPress: async () => {
            setSeeding(true);
            try {
              await apiService.seedDefaultServices();
              await load();
              Alert.alert('✅ Done', 'Default services added to your catalog');
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setSeeding(false);
            }
          },
        },
      ],
    );
  };

  const handleAdd = async (data) => {
    await apiService.createServiceCatalogItem(data);
    await load();
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormVisible(true);
  };

  const handleUpdate = async (data) => {
    await apiService.updateServiceCatalogItem(editItem.id, data);
    setEditItem(null);
    await load();
  };

  const handleToggleActive = async (item) => {
    try {
      await apiService.updateServiceCatalogItem(item.id, { isActive: !item.isActive });
      await load(true);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Remove Service',
      `Remove "${item.name}" from the catalog? This won't affect existing bills.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await apiService.deleteServiceCatalogItem(item.id);
              await load();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // Filter + search
  const categories = ['all', ...new Set(items.map(i => i.category))];
  const filtered = items.filter(item => {
    const matchCat = activeFilter === 'all' || item.category === activeFilter;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Group by category for display
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const renderItem = (item) => {
    const meta = getCatMeta(item.category);
    const isDeleting = deletingId === item.id;

    return (
      <View key={item.id} style={[s.itemCard, !item.isActive && s.itemCardInactive, isDeleting && { opacity: 0.5 }]}>
        <View style={[s.itemIconBox, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={item.isActive ? meta.color : '#94a3b8'} />
        </View>

        <View style={s.itemInfo}>
          <Text style={[s.itemName, !item.isActive && s.itemNameInactive]}>{item.name}</Text>
          {item.description ? (
            <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={[s.itemPrice, { color: item.isActive ? meta.color : '#94a3b8' }]}>
            KES {Number(item.defaultPrice).toLocaleString()}
          </Text>
        </View>

        <View style={s.itemActions}>
          {/* Active toggle */}
          <TouchableOpacity
            style={[s.toggleBtn, item.isActive && s.toggleBtnActive]}
            onPress={() => handleToggleActive(item)}
          >
            <Ionicons
              name={item.isActive ? 'checkmark-circle' : 'remove-circle-outline'}
              size={18}
              color={item.isActive ? '#0f766e' : '#94a3b8'}
            />
          </TouchableOpacity>

          {/* Edit */}
          <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil-outline" size={16} color="#64748b" />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#dc2626" />
              : <Ionicons name="trash-outline" size={16} color="#dc2626" />
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) return (
      <View style={s.centerLoader}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={s.loaderText}>Loading catalog...</Text>
      </View>
    );

    if (items.length === 0) return (
      <View style={s.emptyState}>
        <MaterialCommunityIcons name="clipboard-list-outline" size={56} color="#cbd5e1" />
        <Text style={s.emptyTitle}>No Services Yet</Text>
        <Text style={s.emptySub}>
          Add your hospital's services and pricing. Staff will pick from this list when billing patients.
        </Text>
        <TouchableOpacity
          style={[s.seedBtn, seeding && { opacity: 0.6 }]}
          onPress={handleSeedDefaults}
          disabled={seeding}
        >
          {seeding
            ? <ActivityIndicator color="#0f766e" size="small" />
            : <><MaterialCommunityIcons name="magic-staff" size={18} color="#0f766e" />
                <Text style={s.seedBtnText}>Load Common Services</Text></>
          }
        </TouchableOpacity>
      </View>
    );

    if (filtered.length === 0) return (
      <View style={s.emptyState}>
        <Ionicons name="search-outline" size={48} color="#cbd5e1" />
        <Text style={s.emptyTitle}>No matches</Text>
        <Text style={s.emptySub}>Try a different search term</Text>
      </View>
    );

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
      >
        {Object.entries(grouped).map(([cat, catItems]) => {
          const meta = getCatMeta(cat);
          return (
            <View key={cat} style={s.categoryGroup}>
              <View style={s.categoryGroupHeader}>
                <View style={[s.catHeaderIcon, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                </View>
                <Text style={[s.categoryGroupTitle, { color: meta.color }]}>{meta.label}</Text>
                <View style={s.catCountBadge}>
                  <Text style={s.catCountText}>{catItems.length}</Text>
                </View>
              </View>
              {catItems.map(renderItem)}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Service Catalog</Text>
          <Text style={s.headerSub}>{items.length} services · tap to edit prices</Text>
        </View>
        <TouchableOpacity
          style={[s.seedBtnSmall, seeding && { opacity: 0.6 }]}
          onPress={handleSeedDefaults}
          disabled={seeding}
        >
          {seeding
            ? <ActivityIndicator color="#7c3aed" size="small" />
            : <MaterialCommunityIcons name="magic-staff" size={18} color="#7c3aed" />
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.addHeaderBtn} onPress={() => { setEditItem(null); setFormVisible(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
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
      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterContent}
          style={{ maxHeight: 44 }}
        >
          {categories.map(cat => {
            const meta = cat === 'all'
              ? { label: 'All', color: '#0f766e', bg: '#f0fdf4' }
              : getCatMeta(cat);
            const isActive = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[s.filterPill, isActive && { backgroundColor: meta.bg, borderColor: meta.color }]}
                onPress={() => setActiveFilter(cat)}
              >
                <Text style={[s.filterPillText, isActive && { color: meta.color, fontWeight: '700' }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Add/Edit modal */}
      <ServiceFormModal
        visible={formVisible}
        onClose={() => { setFormVisible(false); setEditItem(null); }}
        onSave={editItem ? handleUpdate : handleAdd}
        editItem={editItem}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  addHeaderBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#0f766e',
    alignItems: 'center', justifyContent: 'center',
  },
  seedBtnSmall: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f3ff',
    alignItems: 'center', justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },

  filterContent: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, alignItems: 'center' },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  filterPillText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  scrollContent: { padding: 12 },

  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: '#94a3b8' },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  seedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 13,
    backgroundColor: '#f0fdf4', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#bbf7d0',
  },
  seedBtnText: { fontSize: 14, fontWeight: '700', color: '#0f766e' },

  categoryGroup: { marginBottom: 16 },
  categoryGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  catHeaderIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryGroupTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  catCountBadge: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  catCountText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemCardInactive: { opacity: 0.55 },
  itemIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  itemNameInactive: { color: '#94a3b8' },
  itemDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: '#f0fdf4' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Form Modal Styles ──────────────────────────────────────────────────────────
const fm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 36 : 24,
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
  body: { padding: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  req: { color: '#ef4444' },
  opt: { color: '#94a3b8', fontWeight: '400' },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15, color: '#0f172a',
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currency: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  priceInput: { flex: 1 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  catChipText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0f766e', borderRadius: 14, paddingVertical: 15,
    marginHorizontal: 20, marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
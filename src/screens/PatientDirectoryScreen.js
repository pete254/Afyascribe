// src/screens/PatientDirectoryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

const FILTER_TABS = [
  { key: 'all',   label: 'All',        icon: 'people-outline'  },
  { key: 'name',  label: 'Name',       icon: 'person-outline'  },
  { key: 'id',    label: 'Patient ID', icon: 'id-card-outline' },
  { key: 'phone', label: 'Phone',      icon: 'call-outline'    },
];

const GENDER_COLORS = {
  male:   { bg: '#dbeafe', text: '#1e40af' },
  female: { bg: '#fce7f3', text: '#9d174d' },
  other:  { bg: '#ede9fe', text: '#5b21b6' },
};

export default function PatientDirectoryScreen({ onBack, onViewPatientHistory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode,  setFilterMode]  = useState('all');
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPatient,   setEditingPatient]   = useState(null);
  const [editForm,         setEditForm]         = useState({});
  const [saving,           setSaving]           = useState(false);

  const headerAnim  = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef(null);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadPatients(1, true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(searchQuery, filterMode), 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, filterMode]);

  const loadPatients = async (pageNum = 1, reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    try {
      const result = await apiService.getAllPatients(pageNum, 20);
      const data  = result.data  || result;
      const total = result.total || data.length;
      setTotalCount(total);
      setPatients(prev => reset ? data : [...prev, ...data]);
      setPage(pageNum);
      setHasMore(data.length === 20);
    } catch (err) {
      Alert.alert('Error', 'Failed to load patients.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const performSearch = async (query, mode) => {
    if (!query || query.trim().length < 2) { loadPatients(1, true); return; }
    setLoading(true);
    try {
      let results = [];
      if (mode === 'phone') {
        results = await apiService.searchPatientsByPhone(query.trim());
      } else {
        results = await apiService.searchPatients(query.trim());
        if (mode === 'name') {
          const q = query.toLowerCase();
          results = results.filter(p =>
            p.firstName?.toLowerCase().includes(q) || p.lastName?.toLowerCase().includes(q));
        } else if (mode === 'id') {
          results = results.filter(p => p.patientId?.toLowerCase().includes(query.toLowerCase()));
        }
      }
      setPatients(results);
      setTotalCount(results.length);
      setHasMore(false);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); setSearchQuery(''); loadPatients(1, true); };
  const loadMore  = () => { if (!hasMore || loading || searchQuery.trim().length >= 2) return; loadPatients(page + 1); };

  const openEditModal = patient => {
    setEditingPatient(patient);
    setEditForm({
      firstName:   patient.firstName   || '',
      lastName:    patient.lastName    || '',
      age:         String(patient.age  || ''),
      gender:      patient.gender      || 'other',
      phoneNumber: patient.phoneNumber || '',
      email:       patient.email       || '',
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => { setEditModalVisible(false); setEditingPatient(null); setEditForm({}); };

  const handleSaveEdit = async () => {
    if (!editForm.firstName?.trim() || !editForm.lastName?.trim()) {
      Alert.alert('Validation', 'First and last name are required.'); return;
    }
    setSaving(true);
    try {
      const updated = await apiService.updatePatient(editingPatient.id, {
        firstName:   editForm.firstName.trim(),
        lastName:    editForm.lastName.trim(),
        age:         parseInt(editForm.age, 10) || undefined,
        gender:      editForm.gender,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        email:       editForm.email.trim()       || undefined,
      });
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? { ...p, ...updated } : p));
      Alert.alert('✅ Saved', 'Patient updated successfully.');
      closeEditModal();
    } catch (err) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPlaceholder = () => ({
    name:  'Search by first or last name…',
    id:    'Search by Patient ID (e.g. P-2025-001)…',
    phone: 'Search by phone number…',
    all:   'Search by name, ID, or phone…',
  }[filterMode]);

  const renderGenderBadge = gender => {
    const c = GENDER_COLORS[gender] || GENDER_COLORS.other;
    return (
      <View style={[styles.genderBadge, { backgroundColor: c.bg }]}>
        <Text style={[styles.genderText, { color: c.text }]}>
          {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'N/A'}
        </Text>
      </View>
    );
  };

  const renderPatientCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.firstName?.[0] || '?').toUpperCase()}{(item.lastName?.[0] || '').toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.patientName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
          {renderGenderBadge(item.gender)}
        </View>
        <View style={styles.cardMetaRow}>
          <Ionicons name="id-card-outline" size={13} color="#6b7280" />
          <Text style={styles.metaText}>{item.patientId}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Ionicons name="person-outline" size={13} color="#6b7280" />
          <Text style={styles.metaText}>Age {item.age ?? 'N/A'}</Text>
        </View>
        {item.phoneNumber ? (
          <View style={styles.cardMetaRow}>
            <Ionicons name="call-outline" size={13} color="#6b7280" />
            <Text style={styles.metaText}>{item.phoneNumber}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={styles.cardMetaRow}>
            <Ionicons name="mail-outline" size={13} color="#6b7280" />
            <Text style={styles.metaText} numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={20} color="#0f766e" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { marginTop: 8 }]}
          onPress={() => onViewPatientHistory && onViewPatientHistory(item)}>
          <Ionicons name="document-text-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => loading ? null : (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>{searchQuery.trim().length >= 2 ? 'No patients found' : 'No patients yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim().length >= 2 ? 'Try a different search term.' : 'Patients will appear here once registered.'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading && hasMore) return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Load more</Text>
      </TouchableOpacity>
    );
    if (loading && patients.length > 0) return (
      <View style={styles.footerLoader}><ActivityIndicator size="small" color="#0f766e" /></View>
    );
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f766e" />

      {/* ── Header ── */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-20,0] }) }],
      }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerH1}>Patient Directory</Text>
            <Text style={styles.headerCount}>
              {totalCount > 0 ? `${totalCount} patient${totalCount !== 1 ? 's' : ''}` : 'Loading…'}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={getPlaceholder()}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          {FILTER_TABS.map(tab => (
            <TouchableOpacity key={tab.key}
              style={[styles.filterTab, filterMode === tab.key && styles.filterTabActive]}
              onPress={() => setFilterMode(tab.key)}>
              <Ionicons name={tab.icon} size={13} color={filterMode === tab.key ? '#0f766e' : '#fff'} />
              <Text style={[styles.filterTabText, filterMode === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Patient list ── */}
      {loading && patients.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loaderText}>Loading patients…</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={item => item.id}
          renderItem={renderPatientCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={closeEditModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Patient</Text>
                <Text style={styles.modalSubtitle}>{editingPatient?.patientId}</Text>
              </View>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>First Name *</Text>
                  <TextInput style={styles.formInput} value={editForm.firstName}
                    onChangeText={v => setEditForm(p => ({ ...p, firstName: v }))}
                    placeholder="First name" autoCapitalize="words" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Last Name *</Text>
                  <TextInput style={styles.formInput} value={editForm.lastName}
                    onChangeText={v => setEditForm(p => ({ ...p, lastName: v }))}
                    placeholder="Last name" autoCapitalize="words" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Age</Text>
                <TextInput style={styles.formInput} value={editForm.age}
                  onChangeText={v => setEditForm(p => ({ ...p, age: v }))}
                  placeholder="Age" keyboardType="numeric" maxLength={3} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {['male', 'female', 'other'].map(g => (
                    <TouchableOpacity key={g}
                      style={[styles.genderOption, editForm.gender === g && styles.genderOptionActive]}
                      onPress={() => setEditForm(p => ({ ...p, gender: g }))}>
                      <Text style={[styles.genderOptionText, editForm.gender === g && styles.genderOptionTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput style={styles.formInput} value={editForm.phoneNumber}
                  onChangeText={v => setEditForm(p => ({ ...p, phoneNumber: v }))}
                  placeholder="+254 700 000 000" keyboardType="phone-pad" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email Address</Text>
                <TextInput style={styles.formInput} value={editForm.email}
                  onChangeText={v => setEditForm(p => ({ ...p, email: v }))}
                  placeholder="patient@email.com" keyboardType="email-address" autoCapitalize="none" />
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveEdit} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save Changes</Text></>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#0f766e',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { marginRight: 10, padding: 4 },
  headerH1: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerCount: { fontSize: 13, color: '#a7f3d0', marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
  filterContent: { gap: 8, paddingRight: 8, paddingBottom: 4 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  filterTabActive: { backgroundColor: '#fff' },
  filterTabText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  filterTabTextActive: { color: '#0f766e', fontWeight: '600' },
  listContent: { padding: 12, paddingBottom: 40, flexGrow: 1 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 15, color: '#6b7280' },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, alignItems: 'flex-start',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#065f46', letterSpacing: -0.5 },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  genderBadge: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  genderText: { fontSize: 11, fontWeight: '600' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 13, color: '#6b7280' },
  metaDot: { color: '#d1d5db', fontSize: 12, marginHorizontal: 2 },
  cardActions: { marginLeft: 8, alignItems: 'center' },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f9fafb' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  loadMoreBtn: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 28,
    borderRadius: 20, backgroundColor: '#e6fffa', marginTop: 8,
  },
  loadMoreText: { color: '#0f766e', fontWeight: '600', fontSize: 14 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4, borderRadius: 8, backgroundColor: '#f3f4f6' },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  formRow: { flexDirection: 'row', marginBottom: 14 },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  formInput: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15, color: '#111827',
  },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  genderOptionActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  genderOptionText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  genderOptionTextActive: { color: '#0f766e', fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 15, marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '500' },
});
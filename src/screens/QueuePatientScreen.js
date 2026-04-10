// src/screens/QueuePatientScreen.js
// UPDATED: Doctor search, 'Other' reason shows input, service catalog billing, scrollable doctor list

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform, Modal, FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';

const VISIT_REASONS = [
  { value: 'New Patient', label: '🆕  New Patient', sub: 'First visit to this facility' },
  { value: 'Returning Patient', label: '🔄  Returning Patient', sub: 'Follow-up or repeat visit' },
  { value: 'Referral / Scheduled Appointment', label: '📋  Referral / Scheduled Appointment', sub: 'Referred or has a pre-booked slot' },
  { value: 'Other', label: '✏️  Other', sub: 'Enter a custom reason' },
];

const CATEGORY_META = {
  consultation: { label: 'Consultation', icon: 'stethoscope', color: '#0f766e', bg: '#f0fdf4' },
  lab:          { label: 'Lab',          icon: 'flask',       color: '#2563eb', bg: '#eff6ff' },
  imaging:      { label: 'Imaging',      icon: 'radiobox-marked', color: '#7c3aed', bg: '#f5f3ff' },
  procedure:    { label: 'Procedure',    icon: 'needle',      color: '#d97706', bg: '#fffbeb' },
  pharmacy:     { label: 'Pharmacy',     icon: 'pill',        color: '#dc2626', bg: '#fef2f2' },
  nursing:      { label: 'Nursing',      icon: 'heart-pulse', color: '#db2777', bg: '#fdf2f8' },
  other:        { label: 'Other',        icon: 'dots-horizontal-circle', color: '#64748b', bg: '#f8fafc' },
};

const CAT_TO_SERVICE_TYPE = {
  consultation: 'consultation', lab: 'lab', imaging: 'imaging',
  procedure: 'procedure', pharmacy: 'pharmacy', nursing: 'other', other: 'other',
};

export default function QueuePatientScreen({ onBack, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [reasonPickerVisible, setReasonPickerVisible] = useState(false);

  // Doctor state
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorPickerVisible, setDoctorPickerVisible] = useState(false);

  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Service catalog billing
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [catalogPickerVisible, setCatalogPickerVisible] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');

  // Custom service entry
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceAmount, setCustomServiceAmount] = useState('');
  const [showCustomService, setShowCustomService] = useState(false);

  // Payment mode
  const [paymentMode, setPaymentMode] = useState('cash');
  const [insuranceSchemes, setInsuranceSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemePickerVisible, setSchemePickerVisible] = useState(false);

  useEffect(() => {
    loadDoctors();
    loadSchemes();
    loadCatalog();
  }, []);

  const loadDoctors = async () => {
    try {
      const staff = await apiService.getFacilityDoctors();
      setDoctors(staff);
    } catch (e) { console.error('Failed to load doctors:', e); }
  };

  const loadSchemes = async () => {
    try {
      const schemes = await apiService.getInsuranceSchemes();
      setInsuranceSchemes(schemes);
    } catch (e) { console.error('Failed to load schemes:', e); }
  };

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const data = await apiService.getServiceCatalog();
      setCatalog(data);
    } catch (e) { console.error('Failed to load catalog:', e); }
    finally { setCatalogLoading(false); }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    setSelectedPatient(null);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await apiService.searchPatients(text.trim());
      setSearchResults(results);
    } catch (e) { console.error('Search failed:', e); }
    finally { setSearching(false); }
  };

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.firstName} ${patient.lastName}`);
    setSearchResults([]);
    try {
      const appointments = await apiService.getPatientAppointments(patient.id);
      const todayAppointment = appointments?.find(apt => {
        const aptDate = new Date(apt.scheduledTime).toDateString();
        return aptDate === new Date().toDateString() && apt.status === 'scheduled';
      });
      setAppointmentData(todayAppointment || null);
    } catch (e) { setAppointmentData(null); }
  };

  // Doctor search filter
  const filteredDoctors = doctors.filter(d => {
    if (!doctorSearch.trim()) return true;
    const name = `${d.firstName} ${d.lastName}`.toLowerCase();
    return name.includes(doctorSearch.toLowerCase());
  });

  // Catalog filter
  const filteredCatalog = catalog.filter(item => {
    const matchCat = catalogCategory === 'all' || item.category === catalogCategory;
    const matchSearch = !catalogSearch || item.name.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Add service from catalog
  const addCatalogService = (item) => {
    const existing = selectedServices.find(s => s.catalogId === item.id);
    if (existing) {
      Alert.alert('Already Added', `"${item.name}" is already in the bill.`);
      return;
    }
    setSelectedServices(prev => [...prev, {
      id: Date.now().toString(),
      catalogId: item.id,
      name: item.name,
      serviceType: CAT_TO_SERVICE_TYPE[item.category] || 'other',
      amount: Number(item.defaultPrice),
      category: item.category,
    }]);
  };

  // Add custom service
  const addCustomService = () => {
    if (!customServiceName.trim()) { Alert.alert('Missing', 'Enter a service name'); return; }
    const amt = parseFloat(customServiceAmount);
    if (!customServiceAmount || isNaN(amt) || amt < 0) {
      Alert.alert('Missing', 'Enter a valid amount');
      return;
    }
    setSelectedServices(prev => [...prev, {
      id: Date.now().toString(),
      catalogId: null,
      name: customServiceName.trim(),
      serviceType: 'other',
      amount: amt,
      category: 'other',
    }]);
    setCustomServiceName('');
    setCustomServiceAmount('');
    setShowCustomService(false);
  };

  const removeService = (id) => {
    setSelectedServices(prev => prev.filter(s => s.id !== id));
  };

  const totalAmount = selectedServices.reduce((s, sv) => s + sv.amount, 0);

  const effectiveReason = reasonForVisit === 'Other' ? otherReason.trim() : reasonForVisit;

  const handleSubmit = async () => {
    if (!selectedPatient) { Alert.alert('Missing', 'Please select a patient'); return; }
    if (!effectiveReason) {
      Alert.alert('Missing', reasonForVisit === 'Other' ? 'Please describe the reason for visit' : 'Please select the reason for visit');
      return;
    }
    if (!selectedDoctor) { Alert.alert('Missing', 'Please assign a doctor'); return; }
    if (selectedServices.length === 0) { Alert.alert('Missing', 'Please add at least one service to bill'); return; }
    if ((paymentMode === 'insurance' || paymentMode === 'split') && !selectedScheme) {
      Alert.alert('Missing', 'Please select an insurance scheme');
      return;
    }

    setSubmitting(true);
    try {
      const visit = await apiService.checkInPatient(
        selectedPatient.id,
        effectiveReason,
        selectedDoctor.id,
      );

      // Create bills for each service
      for (const svc of selectedServices) {
        await apiService.createBill(
          visit.id,
          svc.serviceType,
          svc.name,
          svc.amount,
          paymentMode,
          selectedScheme?.name || null,
        );
      }

      Alert.alert(
        'Patient Queued ✅',
        `${selectedPatient.firstName} ${selectedPatient.lastName} checked in.\n\nTotal Bill: KES ${totalAmount.toLocaleString()}`,
        [{ text: 'OK', onPress: onSuccess }],
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to queue patient');
    } finally {
      setSubmitting(false);
    }
  };

  const catalogCategories = ['all', ...new Set(catalog.map(i => i.category))];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Queue Patient</Text>
        <Text style={styles.screenSubtitle}>Check in, assign a doctor, and record the bill</Text>

        {/* ── Step 1 — Find Patient ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <MaterialCommunityIcons name="magnify" size={15} color="#0f766e" /> Step 1 — Find Patient
          </Text>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or patient ID…"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color="#0f766e" />}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsBox}>
              {searchResults.slice(0, 6).map((p) => (
                <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => selectPatient(p)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.firstName[0]}{p.lastName[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.resultName}>{p.firstName} {p.lastName}</Text>
                    <Text style={styles.resultMeta}>{p.patientId} · {p.gender}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedPatient && (
            <View>
              <View style={styles.selectedCard}>
                <MaterialCommunityIcons name="account-check" size={20} color="#0f766e" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.selectedName}>{selectedPatient.firstName} {selectedPatient.lastName}</Text>
                  <Text style={styles.selectedMeta}>{selectedPatient.patientId}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedPatient(null); setSearchQuery(''); }}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              {appointmentData && (
                <View style={styles.appointmentBadge}>
                  <MaterialCommunityIcons name="calendar-check" size={16} color="#0f766e" />
                  <Text style={styles.appointmentBadgeTitle}>📅 Has Appointment Today</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Step 2 — Reason for Visit ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={15} color="#0f766e" /> Step 2 — Reason for Visit
          </Text>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setReasonPickerVisible(true)}
          >
            <MaterialCommunityIcons name="clipboard-list-outline" size={18}
              color={reasonForVisit ? '#0f766e' : '#94a3b8'} />
            <Text style={[styles.pickerText, reasonForVisit && styles.pickerTextSelected]}>
              {reasonForVisit || 'Select reason for visit…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Show text input when 'Other' is selected */}
          {reasonForVisit === 'Other' && (
            <View style={styles.otherReasonContainer}>
              <TextInput
                style={styles.otherReasonInput}
                placeholder="Please describe the reason for visit…"
                placeholderTextColor="#94a3b8"
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          )}
        </View>

        {/* ── Step 3 — Assign Doctor (with search) ─────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <MaterialCommunityIcons name="doctor" size={15} color="#0f766e" /> Step 3 — Assign Doctor
          </Text>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => { setDoctorSearch(''); setDoctorPickerVisible(true); }}
          >
            <MaterialCommunityIcons name="doctor" size={18} color={selectedDoctor ? '#0f766e' : '#94a3b8'} />
            <Text style={[styles.pickerText, selectedDoctor && styles.pickerTextSelected]}>
              {selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Select a doctor…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* ── Step 4 — Billing with Service Catalog ────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            <MaterialCommunityIcons name="cash-register" size={15} color="#0f766e" /> Step 4 — Billing
          </Text>

          {/* Payment mode */}
          <View style={styles.payModeRow}>
            {[
              { value: 'cash', label: 'Cash' },
              { value: 'insurance', label: 'Insurance' },
              { value: 'split', label: 'Split' },
            ].map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.payModeBtn, paymentMode === m.value && styles.payModeBtnActive]}
                onPress={() => { setPaymentMode(m.value); setSelectedScheme(null); }}
              >
                <Text style={[styles.payModeTxt, paymentMode === m.value && styles.payModeTxtActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Insurance scheme picker */}
          {(paymentMode === 'insurance' || paymentMode === 'split') && (
            <TouchableOpacity style={styles.pickerButton} onPress={() => setSchemePickerVisible(true)}>
              <MaterialCommunityIcons name="shield-check-outline" size={18}
                color={selectedScheme ? '#0f766e' : '#94a3b8'} />
              <Text style={[styles.pickerText, selectedScheme && styles.pickerTextSelected]}>
                {selectedScheme ? selectedScheme.name : 'Select insurance scheme…'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* Services list */}
          {selectedServices.length > 0 && (
            <View style={styles.servicesContainer}>
              {selectedServices.map((svc) => {
                const meta = CATEGORY_META[svc.category] || CATEGORY_META.other;
                return (
                  <View key={svc.id} style={styles.serviceRow}>
                    <View style={[styles.serviceIconBox, { backgroundColor: meta.bg }]}>
                      <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <Text style={styles.serviceAmount}>KES {svc.amount.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeService(svc.id)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>KES {totalAmount.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {/* Add service buttons */}
          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={() => { setCatalogSearch(''); setCatalogCategory('all'); setCatalogPickerVisible(true); }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#0f766e" />
            <Text style={styles.addServiceBtnText}>Add from Service Catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addServiceBtn, { borderColor: '#7c3aed' }]}
            onPress={() => setShowCustomService(!showCustomService)}
          >
            <Ionicons name="create-outline" size={18} color="#7c3aed" />
            <Text style={[styles.addServiceBtnText, { color: '#7c3aed' }]}>Add Custom Service</Text>
          </TouchableOpacity>

          {/* Custom service form */}
          {showCustomService && (
            <View style={styles.customServiceForm}>
              <TextInput
                style={styles.customInput}
                placeholder="Service name e.g. Blood Test"
                placeholderTextColor="#94a3b8"
                value={customServiceName}
                onChangeText={setCustomServiceName}
              />
              <View style={styles.customAmountRow}>
                <Text style={styles.currencyLabel}>KES</Text>
                <TextInput
                  style={[styles.customInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Amount"
                  placeholderTextColor="#94a3b8"
                  value={customServiceAmount}
                  onChangeText={setCustomServiceAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.customAddBtn} onPress={addCustomService}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="account-arrow-right" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>
                Check In{selectedServices.length > 0 ? ` · KES ${totalAmount.toLocaleString()}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />

        {/* ── Reason Picker Modal ── */}
        <Modal visible={reasonPickerVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReasonPickerVisible(false)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Reason for Visit</Text>
              {VISIT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonOption, reasonForVisit === r.value && styles.reasonOptionActive]}
                  onPress={() => { setReasonForVisit(r.value); setReasonPickerVisible(false); if (r.value !== 'Other') setOtherReason(''); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reasonOptionLabel, reasonForVisit === r.value && styles.reasonOptionLabelActive]}>
                      {r.label}
                    </Text>
                    <Text style={styles.reasonOptionSub}>{r.sub}</Text>
                  </View>
                  {reasonForVisit === r.value && <Ionicons name="checkmark-circle" size={20} color="#0f766e" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Doctor Picker Modal (with search) ── */}
        <Modal visible={doctorPickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Doctor</Text>
                <TouchableOpacity onPress={() => setDoctorPickerVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Doctor search */}
              <View style={styles.doctorSearchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.doctorSearchInput}
                  placeholder="Search doctor by name…"
                  placeholderTextColor="#94a3b8"
                  value={doctorSearch}
                  onChangeText={setDoctorSearch}
                  autoFocus
                />
                {doctorSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setDoctorSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.doctorList} keyboardShouldPersistTaps="handled">
                {filteredDoctors.length === 0 ? (
                  <View style={styles.emptyDoctors}>
                    <Text style={styles.emptyText}>
                      {doctorSearch ? 'No doctors match your search' : 'No doctors found'}
                    </Text>
                  </View>
                ) : (
                  filteredDoctors.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.doctorOption, selectedDoctor?.id === doc.id && styles.doctorOptionActive]}
                      onPress={() => { setSelectedDoctor(doc); setDoctorPickerVisible(false); setDoctorSearch(''); }}
                    >
                      <View style={styles.doctorAvatar}>
                        <Text style={styles.doctorAvatarText}>{doc.firstName[0]}{doc.lastName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.doctorName, selectedDoctor?.id === doc.id && { color: '#0f766e' }]}>
                          Dr. {doc.firstName} {doc.lastName}
                        </Text>
                        <Text style={styles.doctorRole}>{doc.role}</Text>
                      </View>
                      {selectedDoctor?.id === doc.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#0f766e" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Service Catalog Modal ── */}
        <Modal visible={catalogPickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '85%' }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Service Catalog</Text>
                <TouchableOpacity onPress={() => setCatalogPickerVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Catalog search */}
              <View style={styles.doctorSearchBox}>
                <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.doctorSearchInput}
                  placeholder="Search services…"
                  placeholderTextColor="#94a3b8"
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
              </View>

              {/* Category pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                {catalogCategories.map(cat => {
                  const meta = cat === 'all' ? { label: 'All', color: '#0f766e', bg: '#f0fdf4' } : (CATEGORY_META[cat] || CATEGORY_META.other);
                  const isActive = catalogCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, isActive && { backgroundColor: meta.bg, borderColor: meta.color }]}
                      onPress={() => setCatalogCategory(cat)}
                    >
                      <Text style={[styles.catPillText, isActive && { color: meta.color, fontWeight: '700' }]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {catalogLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator color="#0f766e" />
                </View>
              ) : (
                <FlatList
                  data={filteredCatalog}
                  keyExtractor={i => i.id}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                        {catalog.length === 0
                          ? 'No services in catalog. Ask admin to add services.'
                          : 'No matches found'}
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                    const alreadyAdded = selectedServices.some(s => s.catalogId === item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.catalogServiceRow, alreadyAdded && styles.catalogServiceRowAdded]}
                        onPress={() => { if (!alreadyAdded) addCatalogService(item); }}
                        activeOpacity={alreadyAdded ? 1 : 0.7}
                      >
                        <View style={[styles.catServiceIcon, { backgroundColor: meta.bg }]}>
                          <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.catServiceName}>{item.name}</Text>
                          {item.description ? <Text style={styles.catServiceDesc} numberOfLines={1}>{item.description}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={styles.catServicePrice}>KES {Number(item.defaultPrice).toLocaleString()}</Text>
                          {alreadyAdded ? (
                            <View style={styles.addedBadge}><Text style={styles.addedBadgeText}>Added</Text></View>
                          ) : (
                            <Ionicons name="add-circle" size={22} color="#0f766e" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.donePickingBtn}
                onPress={() => setCatalogPickerVisible(false)}
              >
                <Text style={styles.donePickingBtnText}>Done ({selectedServices.length} selected)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Insurance Scheme Modal ── */}
        <Modal visible={schemePickerVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSchemePickerVisible(false)}>
            <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Select Insurance Scheme</Text>
              <ScrollView>
                {insuranceSchemes.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.schemeOption}
                    onPress={() => { setSelectedScheme(s); setSchemePickerVisible(false); }}
                  >
                    <Text style={styles.schemeOptionText}>{s.name}</Text>
                    <Text style={styles.schemeOptionCode}>{s.code}</Text>
                  </TouchableOpacity>
                ))}
                {insuranceSchemes.length === 0 && (
                  <Text style={styles.emptyText}>No insurance schemes found</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { marginLeft: 6, color: '#64748b', fontSize: 15 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  screenSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#0f766e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  resultsBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  resultName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  resultMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  selectedName: { fontSize: 14, fontWeight: '600', color: '#166534' },
  selectedMeta: { fontSize: 12, color: '#16a34a', marginTop: 2 },
  appointmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dbeafe', borderRadius: 8, padding: 10, marginTop: 8 },
  appointmentBadgeTitle: { fontSize: 13, fontWeight: '600', color: '#1e40af' },

  // Reason picker
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, height: Platform.OS === 'ios' ? 48 : 44,
    backgroundColor: '#f8fafc', gap: 8, marginBottom: 10,
  },
  pickerText: { flex: 1, fontSize: 15, color: '#94a3b8' },
  pickerTextSelected: { color: '#0f172a' },

  // Other reason input
  otherReasonContainer: {
    marginTop: 4, marginBottom: 4,
    borderWidth: 1.5, borderColor: '#0f766e', borderRadius: 10,
    backgroundColor: '#f0fdf4',
    padding: 2,
  },
  otherReasonInput: {
    fontSize: 15, color: '#0f172a', padding: 12, minHeight: 72,
    textAlignVertical: 'top',
  },

  // Doctor picker
  doctorSearchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  doctorSearchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  doctorList: { maxHeight: 320 },
  emptyDoctors: { padding: 30, alignItems: 'center' },
  doctorOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  doctorOptionActive: { backgroundColor: '#f0fdf4' },
  doctorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' },
  doctorAvatarText: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  doctorName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  doctorRole: { fontSize: 12, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' },

  // Payment mode
  payModeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  payModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  payModeBtnActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf9' },
  payModeTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  payModeTxtActive: { color: '#0f766e', fontWeight: '700' },

  // Services
  servicesContainer: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  serviceIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  serviceAmount: { fontSize: 13, color: '#0f766e', fontWeight: '600', marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#0f766e' },

  addServiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#0f766e', borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 12, marginBottom: 8, backgroundColor: '#f0fdf4',
  },
  addServiceBtnText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },

  customServiceForm: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  customInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15, color: '#0f172a', backgroundColor: '#fff', marginBottom: 8,
  },
  customAmountRow: { flexDirection: 'row', alignItems: 'center' },
  currencyLabel: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  customAddBtn: { backgroundColor: '#0f766e', borderRadius: 8, padding: 10, marginLeft: 8 },

  // Catalog modal
  catScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 8, alignItems: 'center' },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  catPillText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  catalogServiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  catalogServiceRowAdded: { backgroundColor: '#f0fdf4' },
  catServiceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catServiceName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  catServiceDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  catServicePrice: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  addedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  addedBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  donePickingBtn: {
    margin: 16, backgroundColor: '#0f766e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  donePickingBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0f766e', borderRadius: 12, height: 52, marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 28,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 0 },
  reasonOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  reasonOptionActive: { backgroundColor: '#f0fdf4' },
  reasonOptionLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  reasonOptionLabelActive: { color: '#0f766e' },
  reasonOptionSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  schemeOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  schemeOptionCode: { fontSize: 12, color: '#94a3b8' },
});
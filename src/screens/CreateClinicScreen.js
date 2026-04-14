// src/screens/CreateClinicScreen.js
// New screen: a doctor creates their clinic in one step.
// They choose solo / team / multi, name the clinic, pick a code,
// and their account is created as owner + doctor.
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MODES = [
  {
    value: 'solo',
    icon: 'account-circle-outline',
    title: 'Solo Practice',
    desc: 'Just you. You can queue patients, do SOAP notes, and handle billing — all from one account.',
  },
  {
    value: 'team',
    icon: 'account-group-outline',
    title: 'Small Team',
    desc: 'Up to ~5 staff. Doctors can queue and bill. Flexible roles. You invite staff with a code.',
  },
  {
    value: 'multi',
    icon: 'hospital-building',
    title: 'Multi-Department',
    desc: 'Strict separation. Receptionists queue, nurses triage, doctors write notes, reception bills.',
  },
];

export default function CreateClinicScreen({ navigation }) {
  const { createClinic } = useAuth();

  const [step, setStep] = useState(1);       // 1: mode, 2: details, 3: account
  const [clinicMode, setClinicMode] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const autoCode = (name) => {
    // Suggest a short code from the clinic name
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
    return name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
  };

  const handleNameChange = (text) => {
    setFacilityName(text);
    if (!facilityCode) setFacilityCode(autoCode(text));
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing', 'Please enter your first and last name'); return;
    }
    if (!email.trim()) {
      Alert.alert('Missing', 'Please enter your email address'); return;
    }
    if (password.length < 8) {
      Alert.alert('Missing', 'Password must be at least 8 characters'); return;
    }

    setLoading(true);
    const result = await createClinic({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      facilityName: facilityName.trim(),
      facilityCode: facilityCode.toUpperCase().trim(),
      clinicMode,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to create clinic');
    }
    // On success, AuthContext sets isAuthenticated = true → App.js renders MainApp
  };

  // ── Step 1: Choose mode ───────────────────────────────────────────────────
  if (step === 1) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={s.stepHint}>Step 1 of 3</Text>
        <Text style={s.heading}>How do you run your clinic?</Text>
        <Text style={s.sub}>
          This controls how staff permissions work. You can change it later.
        </Text>

        {MODES.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[s.modeCard, clinicMode === m.value && s.modeCardActive]}
            onPress={() => setClinicMode(m.value)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={m.icon}
              size={28}
              color={clinicMode === m.value ? '#0f766e' : '#94a3b8'}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[s.modeTitle, clinicMode === m.value && { color: '#0f766e' }]}>
                {m.title}
              </Text>
              <Text style={s.modeDesc}>{m.desc}</Text>
            </View>
            {clinicMode === m.value && (
              <Ionicons name="checkmark-circle" size={22} color="#0f766e" />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.nextBtn, !clinicMode && s.nextBtnDisabled]}
          onPress={() => setStep(2)}
          disabled={!clinicMode}
        >
          <Text style={s.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step 2: Clinic details ────────────────────────────────────────────────
  if (step === 2) {
    const valid = facilityName.trim().length >= 3 && facilityCode.trim().length >= 2;
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={s.stepHint}>Step 2 of 3</Text>
        <Text style={s.heading}>Name your clinic</Text>
        <Text style={s.sub}>
          The short code appears in patient IDs (e.g. WFC/2026/00001).
        </Text>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Clinic Name *</Text>
          <TextInput
            style={s.input}
            value={facilityName}
            onChangeText={handleNameChange}
            placeholder="e.g. Wanjiru Family Clinic"
            placeholderTextColor="#cbd5e1"
            autoFocus
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Short Code * (2–8 chars)</Text>
          <TextInput
            style={s.input}
            value={facilityCode}
            onChangeText={t => setFacilityCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g. WFC"
            placeholderTextColor="#cbd5e1"
            autoCapitalize="characters"
            maxLength={8}
          />
          <Text style={s.hint}>Patient IDs will look like: {facilityCode || 'CODE'}/2026/00001</Text>
        </View>

        <TouchableOpacity
          style={[s.nextBtn, !valid && s.nextBtnDisabled]}
          onPress={() => setStep(3)}
          disabled={!valid}
        >
          <Text style={s.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step 3: Doctor account ────────────────────────────────────────────────
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
        <Ionicons name="arrow-back" size={20} color="#64748b" />
        <Text style={s.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={s.stepHint}>Step 3 of 3</Text>
      <Text style={s.heading}>Create your account</Text>
      <Text style={s.sub}>
        You'll be the owner-doctor for {facilityName || 'your clinic'}.
      </Text>

      <View style={s.nameRow}>
        <View style={[s.fieldGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={s.label}>First Name *</Text>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Jane"
            placeholderTextColor="#cbd5e1"
            autoFocus
          />
        </View>
        <View style={[s.fieldGroup, { flex: 1 }]}>
          <Text style={s.label}>Last Name *</Text>
          <TextInput
            style={s.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Email *</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="doctor@clinic.co.ke"
          placeholderTextColor="#cbd5e1"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={s.fieldGroup}>
        <Text style={s.label}>Password *</Text>
        <View style={s.passwordRow}>
          <TextInput
            style={[s.input, { flex: 1, borderWidth: 0, padding: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            placeholderTextColor="#cbd5e1"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[s.nextBtn, loading && s.nextBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
            <Text style={s.nextBtnText}>Create Clinic</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={s.termsHint}>
        You'll receive an invite code to share with your staff after setup.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontSize: 14, color: '#64748b' },
  stepHint: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 28 },
  modeCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  modeCardActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  modeDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  nameRow: { flexDirection: 'row' },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15, color: '#0f172a',
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 5 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0f766e', borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  nextBtnDisabled: { backgroundColor: '#94a3b8' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  termsHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16 },
});
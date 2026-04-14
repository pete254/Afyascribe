// src/screens/AuthScreen.js
// UPDATED: Added "Register Facility" button on login screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const ROLES = [
  { value: 'doctor', label: '👨‍⚕️ Doctor' },
  { value: 'nurse', label: '👩‍⚕️ Nurse' },
  { value: 'receptionist', label: '🗂️ Receptionist' },
];

export default function AuthScreen({ navigation }) {
  // 'login' | 'invite-code' | 'register-details'
  const [mode, setMode] = useState('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Invite code step
  const [inviteCode, setInviteCode] = useState('');
  const [facilityInfo, setFacilityInfo] = useState(null);

  // Register details step
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('doctor');

  const [loading, setLoading] = useState(false);

  const { login, registerWithInviteCode } = useAuth();

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) Alert.alert('Login Failed', result.error);
  };

  // ── INVITE CODE STEP ───────────────────────────────────────────────────────

  const handleValidateInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 8) {
      Alert.alert('Invalid Code', 'Invite codes are 8 characters long');
      return;
    }
    setLoading(true);
    try {
      const result = await apiService.validateInviteCode(code);
      setFacilityInfo(result);
      setMode('register-details');
    } catch (error) {
      Alert.alert('Invalid Code', error.message || 'This invite code is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (regPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await registerWithInviteCode({
      inviteCode: inviteCode.trim().toUpperCase(),
      email: regEmail.trim(),
      password: regPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: selectedRole,
    });
    setLoading(false);

    if (!result.success) Alert.alert('Registration Failed', result.error);
  };

  const resetToLogin = () => {
    setMode('login');
    setInviteCode('');
    setFacilityInfo(null);
    setFirstName('');
    setLastName('');
    setRegEmail('');
    setRegPassword('');
    setSelectedRole('doctor');
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🏥</Text>
            <Text style={styles.title}>AfyaScribe</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'invite-code' && 'Enter your facility invite code'}
              {mode === 'register-details' && `Joining: ${facilityInfo?.facilityName}`}
            </Text>
          </View>

          {/* ── LOGIN FORM ────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="doctor@hospital.go.ke"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotContainer}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <Text style={styles.dividerText}>New staff member?</Text>
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setMode('invite-code')}
              >
                <Text style={styles.secondaryButtonText}>Join with Invite Code</Text>
              </TouchableOpacity>

              {/* Register Facility */}
              <View style={styles.facilityDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.facilityDividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.facilityButton}
                onPress={() => navigation.navigate('CreateClinic')}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#0f766e" />
                <Text style={styles.facilityButtonText}>Start Your Clinic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.facilityButton, { marginTop: 8, borderColor: '#e2e8f0' }]}
                onPress={() => navigation.navigate('RegisterFacility')}
              >
                <MaterialCommunityIcons name="email-outline" size={18} color="#64748b" />
                <Text style={[styles.facilityButtonText, { color: '#64748b' }]}>
                  Large facility? Contact us
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── INVITE CODE FORM ───────────────────────────────────────────── */}
          {mode === 'invite-code' && (
            <View style={styles.form}>
              <Text style={styles.infoText}>
                Ask your facility administrator for an 8-character invite code to create your account.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Invite Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={inviteCode}
                  onChangeText={(t) => setInviteCode(t.toUpperCase())}
                  placeholder="AB3X9K2M"
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleValidateInviteCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={resetToLogin}>
                <Ionicons name="arrow-back" size={18} color="#64748b" />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── REGISTER DETAILS FORM ─────────────────────────────────────── */}
          {mode === 'register-details' && (
            <View style={styles.form}>
              {/* Facility badge */}
              <View style={styles.facilityBadge}>
                <Text style={styles.facilityBadgeLabel}>Joining facility</Text>
                <Text style={styles.facilityBadgeName}>{facilityInfo?.facilityName}</Text>
                <Text style={styles.facilityBadgeCode}>Code: {facilityInfo?.facilityCode}</Text>
              </View>

              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="John" />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Doe" />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Work Email</Text>
                <TextInput
                  style={styles.input}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  placeholder="john.doe@hospital.go.ke"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="Min 8 characters"
                    secureTextEntry={!showRegPassword}
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowRegPassword(!showRegPassword)}>
                    <Ionicons name={showRegPassword ? 'eye-off' : 'eye'} size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.roleChip, selectedRole === r.value && styles.roleChipActive]}
                      onPress={() => setSelectedRole(r.value)}
                    >
                      <Text style={[styles.roleChipText, selectedRole === r.value && styles.roleChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => setMode('invite-code')}>
                <Ionicons name="arrow-back" size={18} color="#64748b" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoText: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 16, color: '#1e293b' },
  eyeIcon: { padding: 14 },
  forgotContainer: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  secondaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0f766e',
    marginTop: 8,
  },
  secondaryButtonText: { color: '#0f766e', fontSize: 16, fontWeight: '600' },
  divider: { alignItems: 'center', marginVertical: 16 },
  dividerText: { fontSize: 14, color: '#94a3b8' },

  // ── Register Facility section ──────────────────────────────────────────────
  facilityDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  facilityDividerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  facilityButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  facilityButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '600',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  backButtonText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  facilityBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
  },
  facilityBadgeLabel: { fontSize: 12, color: '#15803d', fontWeight: '600', marginBottom: 4 },
  facilityBadgeName: { fontSize: 18, fontWeight: '800', color: '#14532d', marginBottom: 2 },
  facilityBadgeCode: { fontSize: 12, color: '#16a34a' },
  roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  roleChipActive: { borderColor: '#0f766e', backgroundColor: '#f0fdf4' },
  roleChipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleChipTextActive: { color: '#0f766e', fontWeight: '700' },
});
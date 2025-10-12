// src/screens/ResetPasswordScreen.js
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
import apiService from '../services/apiService';

export default function ResetPasswordScreen({ route, navigation }) {
  const { token } = route.params || {};
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Error',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Invalid or missing reset token');
      return;
    }

    setLoading(true);

    try {
      await apiService.resetPassword(token, password);
      
      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Auth'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return null;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { text: 'Weak', color: '#ef4444' };
    if (strength <= 3) return { text: 'Medium', color: '#f59e0b' };
    return { text: 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* New Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <View style={styles.strengthContainer}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Strength: {passwordStrength.text}
                  </Text>
                </View>
              )}

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <Text style={[styles.requirement, password.length >= 8 && styles.requirementMet]}>
                  • At least 8 characters {password.length >= 8 && '✓'}
                </Text>
                <Text style={[styles.requirement, /[A-Z]/.test(password) && styles.requirementMet]}>
                  • One uppercase letter {/[A-Z]/.test(password) && '✓'}
                </Text>
                <Text style={[styles.requirement, /[a-z]/.test(password) && styles.requirementMet]}>
                  • One lowercase letter {/[a-z]/.test(password) && '✓'}
                </Text>
                <Text style={[styles.requirement, /\d/.test(password) && styles.requirementMet]}>
                  • One number {/\d/.test(password) && '✓'}
                </Text>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeIconText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <Text
                  style={[
                    styles.matchText,
                    password === confirmPassword ? styles.matchTextSuccess : styles.matchTextError,
                  ]}
                >
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLinkContainer}
              onPress={() => navigation.navigate('Auth')}
              disabled={loading}
            >
              <Text style={styles.backLinkText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeIcon: {
    padding: 16,
  },
  eyeIconText: {
    fontSize: 20,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  requirement: {
    fontSize: 12,
    color: '#94a3b8',
    marginVertical: 2,
  },
  requirementMet: {
    color: '#22c55e',
    fontWeight: '600',
  },
  matchText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  matchTextSuccess: {
    color: '#22c55e',
  },
  matchTextError: {
    color: '#ef4444',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLinkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  backLinkText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
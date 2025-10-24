// src/screens/ResetPasswordScreen.js - UPDATED WITH TOKEN INPUT
import React, { useState, useEffect } from 'react';
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
import * as Linking from 'expo-linking';
import apiService from '../services/apiService';

export default function ResetPasswordScreen({ route, navigation }) {
  // Get token from route params (if navigated from ForgotPassword success screen)
  const { token: routeToken } = route.params || {};
  
  // State
  const [token, setToken] = useState(routeToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualTokenEntry, setManualTokenEntry] = useState(!routeToken);

  // Listen for deep links
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      console.log('🔗 Deep link received:', url);
      
      // Parse URL: afyascribe://reset-password?token=xyz
      if (url && url.includes('token=')) {
        const urlToken = url.split('token=')[1].split('&')[0]; // Handle multiple params
        if (urlToken) {
          setToken(decodeURIComponent(urlToken));
          setManualTokenEntry(false);
          Alert.alert(
            'Token Received',
            'Your reset token has been filled automatically. Please enter your new password.',
          );
        }
      }
    };

    // Subscribe to URL events (when app is already open)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a URL (when app was closed)
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('token=')) {
        const urlToken = url.split('token=')[1].split('&')[0];
        if (urlToken) {
          setToken(decodeURIComponent(urlToken));
          setManualTokenEntry(false);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleResetPassword = async () => {
    // Validation
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter your reset token');
      return;
    }

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

    setLoading(true);

    try {
      await apiService.resetPassword(token.trim(), password);
      
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
              {manualTokenEntry 
                ? 'Enter your reset token and new password'
                : 'Enter your new password below'
              }
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Token Input - Show if no token from deep link */}
            {manualTokenEntry && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reset Token</Text>
                <TextInput
                  style={[styles.tokenInput]}
                  placeholder="Paste your reset token from email"
                  value={token}
                  onChangeText={setToken}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  💡 Check your email for the reset token or click the link in your email
                </Text>
              </View>
            )}

            {/* Show token status if received via deep link */}
            {!manualTokenEntry && token && (
              <View style={styles.tokenReceivedBanner}>
                <Text style={styles.tokenReceivedText}>✓ Reset token received from email link</Text>
              </View>
            )}

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
                  autoFocus={!manualTokenEntry} // Only autofocus if token is already filled
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
              
              {/* Password strength indicator */}
              {passwordStrength && (
                <View style={styles.strengthContainer}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Strength: {passwordStrength.text}
                  </Text>
                </View>
              )}

              {/* Password requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <Text style={[
                  styles.requirement,
                  password.length >= 8 && styles.requirementMet
                ]}>
                  • At least 8 characters
                </Text>
                <Text style={[
                  styles.requirement,
                  /[A-Z]/.test(password) && styles.requirementMet
                ]}>
                  • One uppercase letter
                </Text>
                <Text style={[
                  styles.requirement,
                  /[a-z]/.test(password) && styles.requirementMet
                ]}>
                  • One lowercase letter
                </Text>
                <Text style={[
                  styles.requirement,
                  /\d/.test(password) && styles.requirementMet
                ]}>
                  • One number
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
              
              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <Text
                  style={[
                    styles.matchText,
                    password === confirmPassword
                      ? styles.matchTextSuccess
                      : styles.matchTextError,
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
  tokenInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tokenReceivedBanner: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  tokenReceivedText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
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
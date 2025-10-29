// src/screens/ForgotPasswordScreen.js - UPDATED WITH 6-DIGIT CODE FLOW
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

export default function ForgotPasswordScreen({ navigation }) {
  // Step 1: Email input
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  
  // Step 2: Code verification
  const [code, setCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  
  // Step 3: New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);

  // Start countdown timer
  React.useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            Alert.alert('Code Expired', 'Your reset code has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  // Format time remaining as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Send reset code to email
  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await apiService.requestResetCode(email.trim());
      setEmailSubmitted(true);
      setTimeRemaining(600); // Reset to 10 minutes
      setTimerActive(true);
      Alert.alert('Success', 'Reset code sent! Check your email and enter the 6-digit code below.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the code
  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.verifyResetCode(email.trim(), code);
      
      if (response.valid) {
        setCodeVerified(true);
        setTimerActive(false); // Stop timer when code verified
        Alert.alert('Success', 'Code verified! Now enter your new password.');
      } else {
        Alert.alert('Invalid Code', response.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiService.resetPasswordWithCode(email.trim(), code, newPassword);
      Alert.alert(
        'Success!',
        'Your password has been reset successfully. You can now login with your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Auth'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setCode('');
    setCodeVerified(false);
    await handleSendCode();
  };

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
              {!emailSubmitted
                ? 'Enter your email to receive a reset code'
                : !codeVerified
                ? 'Enter the 6-digit code sent to your email'
                : 'Create your new password'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Step 1: Email Input (always visible for reference) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, emailSubmitted && styles.inputDisabled]}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailSubmitted && !loading}
              />
            </View>

            {/* Step 2: Code Input (shown after email submitted) */}
            {emailSubmitted && !codeVerified && (
              <>
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>6-Digit Code</Text>
                    {timerActive && (
                      <Text style={styles.timer}>⏰ {formatTime(timeRemaining)}</Text>
                    )}
                  </View>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    autoFocus
                  />
                  <Text style={styles.hint}>
                    Check your email for the 6-digit code
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, (!code || code.length !== 6 || loading) && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={!code || code.length !== 6 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: New Password (shown after code verified) */}
            {codeVerified && (
              <>
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>✓ Code Verified</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChangeText={setNewPassword}
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
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm New Password</Text>
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
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    (!newPassword || !confirmPassword || newPassword !== confirmPassword || loading) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Step 1: Send Code Button (only shown initially) */}
            {!emailSubmitted && (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>← Back to Login</Text>
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
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  timer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputDisabled: {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
  },
  codeInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successBannerText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  backToLoginButton: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
  },
  backToLoginText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
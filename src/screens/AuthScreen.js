// src/screens/AuthScreen.js
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
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (!isLogin && (!firstName.trim() || !lastName.trim())) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isLogin) {
        // Login
        result = await login(email.trim(), password);
      } else {
        // Register
        result = await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'doctor', // Default role
        });
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
      // If successful, AuthContext will handle navigation
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Clear form
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
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
            <Text style={styles.logo}>🏥</Text>
            <Text style={styles.title}>Medical SOAP Notes</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to continue' : 'Create your account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* First Name & Last Name (Register only) */}
            {!isLogin && (
              <View style={styles.nameRow}>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="John"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="doctor@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder={isLogin ? 'Enter password' : 'Min. 8 characters'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
              {!isLogin && (
                <Text style={styles.hint}>
                  Must contain uppercase, lowercase, and number
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={loading}>
                <Text style={styles.toggleButton}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo Credentials (for testing) */}
          {isLogin && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoText}>Demo Credentials:</Text>
              <Text style={styles.demoCredentials}>doctor@test.com / Test123456</Text>
            </View>
          )}
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
  logo: {
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
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  nameInputContainer: {
    flex: 1,
  },
  nameInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#64748b',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  demoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  demoCredentials: {
    fontSize: 13,
    color: '#92400e',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
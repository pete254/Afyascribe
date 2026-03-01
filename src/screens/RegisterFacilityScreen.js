// src/screens/RegisterFacilityScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CONTACT_EMAIL = 'afyascribeadmin@co.ke';

export default function RegisterFacilityScreen({ navigation }) {
  const handleEmailPress = async () => {
    const subject = encodeURIComponent('Facility Registration Request – AfyaScribe');
    const body = encodeURIComponent(
      `Hello AfyaScribe Team,\n\nI would like to register our facility on AfyaScribe.\n\nFacility Name: \nFacility Type: \nCounty: \nContact Person: \nPhone Number: \n\nPlease get back to me with the next steps.\n\nThank you.`
    );
    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        'No Email App Found',
        `Please send an email manually to:\n\n${CONTACT_EMAIL}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#64748b" />
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🏥</Text>
        <Text style={styles.heroTitle}>Register Your Facility</Text>
        <Text style={styles.heroSubtitle}>
          Get your hospital, clinic, or health centre onboarded onto AfyaScribe
        </Text>
      </View>

      {/* Steps Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contact Us</Text>
            <Text style={styles.stepDesc}>
              Send us an email with your facility details using the button below.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Verification</Text>
            <Text style={styles.stepDesc}>
              Our team will verify your facility's details and registration within 1–2 business days.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Get Access</Text>
            <Text style={styles.stepDesc}>
              We'll create your facility admin account and send you login credentials to get started.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Onboard Your Staff</Text>
            <Text style={styles.stepDesc}>
              Use your admin dashboard to generate invite codes and add your team.
            </Text>
          </View>
        </View>
      </View>

      {/* What to Include Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What to Include in Your Email</Text>
        {[
          'Facility name and type (hospital, clinic, etc.)',
          'County and sub-county location',
          'Contact person name and phone number',
          'Facility license or registration number (if available)',
        ].map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#0f766e" />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.emailButton} onPress={handleEmailPress}>
        <Ionicons name="mail" size={20} color="#fff" />
        <Text style={styles.emailButtonText}>Email Us to Register</Text>
      </TouchableOpacity>

      <Text style={styles.emailLabel}>{CONTACT_EMAIL}</Text>

      {/* Response time note */}
      <View style={styles.note}>
        <Ionicons name="time-outline" size={16} color="#64748b" />
        <Text style={styles.noteText}>We typically respond within 1–2 business days</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
    marginTop: Platform.OS === 'ios' ? 44 : 16,
  },
  backText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 18,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  stepDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#e2e8f0',
    marginLeft: 15,
    marginVertical: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emailButton: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emailLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noteText: {
    fontSize: 13,
    color: '#64748b',
  },
});
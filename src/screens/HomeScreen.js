// src/screens/HomeScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ onOnboardPatient, onTranscribeNotes, onViewPatientDirectory }) {
  const today = new Date();
  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dateStr = today.toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingBadge}>
          <MaterialCommunityIcons name="hospital-box-outline" size={14} color="#0f766e" />
          <Text style={styles.greetingBadgeText}>AfyaScribe</Text>
        </View>
        <Text style={styles.greetingText}>{greeting()} 👋</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* Section Label */}
      <Text style={styles.sectionTitle}>What would you like to do?</Text>

      {/* Action Cards */}
      <View style={styles.actionsGrid}>

        {/* Onboard Patient */}
        <TouchableOpacity
          style={[styles.actionCard, styles.cardTeal]}
          onPress={onOnboardPatient}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, styles.iconCircleTeal]}>
            <MaterialCommunityIcons name="account-plus-outline" size={30} color="#0f766e" />
          </View>
          <View style={styles.arrowBadge}>
            <Ionicons name="arrow-forward" size={14} color="#0f766e" />
          </View>
          <Text style={styles.cardTitle}>Onboard Patient</Text>
          <Text style={styles.cardSubtitle}>Register a new patient and capture their full details</Text>
        </TouchableOpacity>

        {/* Transcribe Notes */}
        <TouchableOpacity
          style={[styles.actionCard, styles.cardPurple]}
          onPress={onTranscribeNotes}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, styles.iconCirclePurple]}>
            <MaterialCommunityIcons name="microphone-outline" size={30} color="#7c3aed" />
          </View>
          <View style={[styles.arrowBadge, styles.arrowBadgePurple]}>
            <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
          </View>
          <Text style={styles.cardTitle}>Transcribe Notes</Text>
          <Text style={styles.cardSubtitle}>Record and transcribe SOAP notes for a patient visit</Text>
        </TouchableOpacity>

        {/* Patient Directory */}
        <TouchableOpacity
          style={[styles.actionCard, styles.cardBlue]}
          onPress={onViewPatientDirectory}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, styles.iconCircleBlue]}>
            <MaterialCommunityIcons name="folder-account-outline" size={30} color="#1e40af" />
          </View>
          <View style={[styles.arrowBadge, styles.arrowBadgeBlue]}>
            <Ionicons name="arrow-forward" size={14} color="#1e40af" />
          </View>
          <Text style={styles.cardTitle}>Patient Directory</Text>
          <Text style={styles.cardSubtitle}>Search and manage all registered patients</Text>
        </TouchableOpacity>

      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={16} color="#0f766e" />
        <Text style={styles.tipText}>
          <Text style={{ fontWeight: '700' }}>Tip: </Text>
          Onboard a patient first, then transcribe their consultation notes in real-time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  greetingSection: {
    marginBottom: 32,
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ccfbf1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  greetingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTeal: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#99f6e4',
  },
  cardPurple: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
  },
  cardBlue: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleTeal: {
    backgroundColor: '#e6fdf8',
  },
  iconCirclePurple: {
    backgroundColor: '#f5f3ff',
  },
  iconCircleBlue: {
    backgroundColor: '#eff6ff',
  },
  arrowBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#e6fdf8',
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBadgePurple: {
    backgroundColor: '#f5f3ff',
  },
  arrowBadgeBlue: {
    backgroundColor: '#eff6ff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
});
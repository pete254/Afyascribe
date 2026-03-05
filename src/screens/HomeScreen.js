// src/screens/HomeScreen.js
// UPDATED: Role-based cards + live queue stats
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

export default function HomeScreen({
  onOnboardPatient,
  onTranscribeNotes,
  onViewPatientDirectory,
  onQueuePatient,
  onViewQueue,
  onViewMyQueue,
  onViewTriageQueue,
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const role = user?.role;

  const loadStats = useCallback(async () => {
    try {
      const data = await apiService.getQueueStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load queue stats:', e);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // Poll every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

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

  const roleTitle = () => {
    switch (role) {
      case 'doctor': return `Dr. ${user?.firstName || ''}`;
      case 'nurse': return `Nurse ${user?.firstName || ''}`;
      case 'receptionist': return user?.firstName || 'Receptionist';
      case 'facility_admin': return `Admin ${user?.firstName || ''}`;
      default: return user?.firstName || 'User';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingBadge}>
          <MaterialCommunityIcons name="hospital-box-outline" size={14} color="#0f766e" />
          <Text style={styles.greetingBadgeText}>AfyaScribe</Text>
        </View>
        <Text style={styles.greetingText}>{greeting()}, {roleTitle()} 👋</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* ── QUEUE STATS BAR (all roles) ─────────────────────────────────── */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.waitingForDoctor ?? 0}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={[styles.statNumber, { color: '#7c3aed' }]}>{stats.withDoctor ?? 0}</Text>
            <Text style={styles.statLabel}>With Doctor</Text>
          </View>
          {role === 'doctor' && (
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0f766e' }]}>{stats.myQueue ?? 0}</Text>
              <Text style={styles.statLabel}>My Queue</Text>
            </View>
          )}
          {role !== 'doctor' && (
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0f766e' }]}>{stats.checkedIn ?? 0}</Text>
              <Text style={styles.statLabel}>Checked In</Text>
            </View>
          )}
        </View>
      )}

      {/* ── ROLE-BASED ACTION CARDS ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>What would you like to do?</Text>
      <View style={styles.actionsGrid}>

        {/* ── RECEPTIONIST / FACILITY_ADMIN ──────────────────────────────── */}
        {(role === 'receptionist' || role === 'facility_admin') && (
          <>
            <TouchableOpacity style={[styles.actionCard, styles.cardOrange]} onPress={onQueuePatient} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleOrange]}>
                <MaterialCommunityIcons name="account-arrow-right-outline" size={30} color="#ea580c" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeOrange]}>
                <Ionicons name="arrow-forward" size={14} color="#ea580c" />
              </View>
              <Text style={styles.cardTitle}>Queue Patient</Text>
              <Text style={styles.cardSubtitle}>Check in a patient and assign them to a doctor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewQueue} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleTeal]}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={30} color="#0f766e" />
              </View>
              <View style={[styles.arrowBadge]}>
                <Ionicons name="arrow-forward" size={14} color="#0f766e" />
              </View>
              <Text style={styles.cardTitle}>Today's Queue</Text>
              <Text style={styles.cardSubtitle}>View and manage all patients in the facility today</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardBlue]} onPress={onOnboardPatient} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleBlue]}>
                <MaterialCommunityIcons name="account-plus-outline" size={30} color="#2563eb" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeBlue]}>
                <Ionicons name="arrow-forward" size={14} color="#2563eb" />
              </View>
              <Text style={styles.cardTitle}>Onboard Patient</Text>
              <Text style={styles.cardSubtitle}>Register a new patient into the system</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardGray]} onPress={onViewPatientDirectory} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleGray]}>
                <MaterialCommunityIcons name="folder-account-outline" size={30} color="#475569" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeGray]}>
                <Ionicons name="arrow-forward" size={14} color="#475569" />
              </View>
              <Text style={styles.cardTitle}>Patient Directory</Text>
              <Text style={styles.cardSubtitle}>Search and browse all registered patients</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── NURSE ──────────────────────────────────────────────────────── */}
        {role === 'nurse' && (
          <>
            <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewTriageQueue} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleTeal]}>
                <MaterialCommunityIcons name="heart-pulse" size={30} color="#0f766e" />
              </View>
              <View style={[styles.arrowBadge]}>
                <Ionicons name="arrow-forward" size={14} color="#0f766e" />
              </View>
              <Text style={styles.cardTitle}>Triage Queue</Text>
              <Text style={styles.cardSubtitle}>Record vitals for waiting patients</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardBlue]} onPress={onViewQueue} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleBlue]}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={30} color="#2563eb" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeBlue]}>
                <Ionicons name="arrow-forward" size={14} color="#2563eb" />
              </View>
              <Text style={styles.cardTitle}>Today's Queue</Text>
              <Text style={styles.cardSubtitle}>View all patients in the facility today</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── DOCTOR ─────────────────────────────────────────────────────── */}
        {role === 'doctor' && (
          <>
            <TouchableOpacity style={[styles.actionCard, styles.cardOrange]} onPress={onViewMyQueue} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleOrange]}>
                <MaterialCommunityIcons name="account-clock-outline" size={30} color="#ea580c" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeOrange]}>
                <Ionicons name="arrow-forward" size={14} color="#ea580c" />
              </View>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>My Queue</Text>
                {stats?.myQueue > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.myQueue}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSubtitle}>Patients assigned and waiting for you</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardPurple]} onPress={onTranscribeNotes} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCirclePurple]}>
                <MaterialCommunityIcons name="microphone-outline" size={30} color="#7c3aed" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgePurple]}>
                <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
              </View>
              <Text style={styles.cardTitle}>New SOAP Note</Text>
              <Text style={styles.cardSubtitle}>Transcribe a new clinical note for a patient</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewTriageQueue} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleTeal]}>
                <MaterialCommunityIcons name="heart-pulse" size={30} color="#0f766e" />
              </View>
              <View style={[styles.arrowBadge]}>
                <Ionicons name="arrow-forward" size={14} color="#0f766e" />
              </View>
              <Text style={styles.cardTitle}>Do Triage</Text>
              <Text style={styles.cardSubtitle}>Record vitals for a patient before consultation</Text>
            </TouchableOpacity>

            {/* ✅ NEW: Onboard Patient card for doctors */}
            <TouchableOpacity style={[styles.actionCard, styles.cardBlue]} onPress={onOnboardPatient} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleBlue]}>
                <MaterialCommunityIcons name="account-plus-outline" size={30} color="#2563eb" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeBlue]}>
                <Ionicons name="arrow-forward" size={14} color="#2563eb" />
              </View>
              <Text style={styles.cardTitle}>Onboard Patient</Text>
              <Text style={styles.cardSubtitle}>Register a new patient into the system</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, styles.cardGray]} onPress={onViewPatientDirectory} activeOpacity={0.85}>
              <View style={[styles.iconCircle, styles.iconCircleGray]}>
                <MaterialCommunityIcons name="folder-account-outline" size={30} color="#475569" />
              </View>
              <View style={[styles.arrowBadge, styles.arrowBadgeGray]}>
                <Ionicons name="arrow-forward" size={14} color="#475569" />
              </View>
              <Text style={styles.cardTitle}>Patient Directory</Text>
              <Text style={styles.cardSubtitle}>Search and browse all registered patients</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  greetingSection: { marginBottom: 24 },
  greetingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ccfbf1', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12,
  },
  greetingBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f766e', letterSpacing: 1, textTransform: 'uppercase' },
  greetingText: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4, letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  // Stats bar
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#f59e0b' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16,
  },
  actionsGrid: { gap: 16, marginBottom: 24 },
  actionCard: {
    borderRadius: 20, padding: 24, position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  cardTeal:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#99f6e4' },
  cardPurple: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd6fe' },
  cardBlue:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#bfdbfe' },
  cardOrange: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fed7aa' },
  cardGray:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },

  iconCircle: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconCircleTeal:   { backgroundColor: '#e6fdf8' },
  iconCirclePurple: { backgroundColor: '#f5f3ff' },
  iconCircleBlue:   { backgroundColor: '#eff6ff' },
  iconCircleOrange: { backgroundColor: '#fff7ed' },
  iconCircleGray:   { backgroundColor: '#f8fafc' },

  arrowBadge: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: '#e6fdf8', width: 30, height: 30,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  arrowBadgePurple: { backgroundColor: '#f5f3ff' },
  arrowBadgeBlue:   { backgroundColor: '#eff6ff' },
  arrowBadgeOrange: { backgroundColor: '#fff7ed' },
  arrowBadgeGray:   { backgroundColor: '#f8fafc' },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  badge: { backgroundColor: '#ea580c', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
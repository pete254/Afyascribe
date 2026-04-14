// src/screens/HomeScreen.js
// UPDATED: Role-based cards replaced with capability-based cards.
// Works correctly for solo doctors, team setups, and multi-department facilities.
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
import { getHomeCards, getRoleTitle, getClinicModeLabel } from '../utils/capabilities';

export default function HomeScreen({
  onOnboardPatient,
  onTranscribeNotes,
  onViewPatientDirectory,
  onQueuePatient,
  onViewQueue,
  onViewMyQueue,
  onViewTriageQueue,
  onViewReports,
  onViewServiceCatalog,
  onViewOwnerCard,     // NEW — opens invite-code / clinic settings
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const cards = getHomeCards(user);

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
          {user?.clinicMode && (
            <Text style={styles.modeBadgeText}> · {getClinicModeLabel(user)}</Text>
          )}
        </View>
        <Text style={styles.greetingText}>{greeting()}, {getRoleTitle(user)} 👋</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>

      {/* Owner Card — shown to clinic owner in solo/team mode */}
      {cards.ownerCard && (
        <TouchableOpacity style={styles.ownerCard} onPress={onViewOwnerCard} activeOpacity={0.85}>
          <View style={styles.ownerCardLeft}>
            <MaterialCommunityIcons name="shield-crown-outline" size={22} color="#7c3aed" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.ownerCardTitle}>Owner Card</Text>
              <Text style={styles.ownerCardSub}>Invite staff · manage clinic settings</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#7c3aed" />
        </TouchableOpacity>
      )}

      {/* Queue stats */}
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
          {user?.role === 'doctor' ? (
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0f766e' }]}>{stats.myQueue ?? 0}</Text>
              <Text style={styles.statLabel}>My Queue</Text>
            </View>
          ) : (
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0f766e' }]}>{stats.checkedIn ?? 0}</Text>
              <Text style={styles.statLabel}>Checked In</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>What would you like to do?</Text>
      <View style={styles.actionsGrid}>

        {/* Queue Patient */}
        {cards.queuePatient && (
          <TouchableOpacity style={[styles.actionCard, styles.cardOrange]} onPress={onQueuePatient} activeOpacity={0.85}>
            <View style={[styles.iconCircle, styles.iconCircleOrange]}>
              <MaterialCommunityIcons name="account-arrow-right-outline" size={30} color="#ea580c" />
            </View>
            <View style={[styles.arrowBadge, styles.arrowBadgeOrange]}>
              <Ionicons name="arrow-forward" size={14} color="#ea580c" />
            </View>
            <Text style={styles.cardTitle}>Queue Patient</Text>
            <Text style={styles.cardSubtitle}>Check in a patient and assign to a doctor</Text>
          </TouchableOpacity>
        )}

        {/* My Queue */}
        {cards.myQueue && (
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
        )}

        {/* New SOAP Note */}
        {cards.newSoapNote && (
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
        )}

        {/* Today's Queue */}
        {cards.todaysQueue && (
          <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewQueue} activeOpacity={0.85}>
            <View style={[styles.iconCircle, styles.iconCircleTeal]}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={30} color="#0f766e" />
            </View>
            <View style={[styles.arrowBadge]}>
              <Ionicons name="arrow-forward" size={14} color="#0f766e" />
            </View>
            <Text style={styles.cardTitle}>Today's Queue</Text>
            <Text style={styles.cardSubtitle}>View and manage all patients today</Text>
          </TouchableOpacity>
        )}

        {/* Triage Queue */}
        {cards.triageQueue && (
          <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewTriageQueue} activeOpacity={0.85}>
            <View style={[styles.iconCircle, styles.iconCircleTeal]}>
              <MaterialCommunityIcons name="heart-pulse" size={30} color="#0f766e" />
            </View>
            <View style={[styles.arrowBadge]}>
              <Ionicons name="arrow-forward" size={14} color="#0f766e" />
            </View>
            <Text style={styles.cardTitle}>
              {user?.role === 'doctor' ? 'Do Triage' : 'Triage Queue'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {user?.role === 'doctor'
                ? 'Record vitals before consultation'
                : 'Record vitals for waiting patients'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Onboard Patient */}
        {cards.onboardPatient && (
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
        )}

        {/* Patient Directory */}
        {cards.patientDirectory && (
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
        )}

        {/* Reports */}
        {cards.reports && (
          <TouchableOpacity style={[styles.actionCard, styles.cardPurple]} onPress={onViewReports} activeOpacity={0.85}>
            <View style={[styles.iconCircle, styles.iconCirclePurple]}>
              <MaterialCommunityIcons name="chart-bar" size={30} color="#7c3aed" />
            </View>
            <View style={[styles.arrowBadge, styles.arrowBadgePurple]}>
              <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.cardTitle}>Reports</Text>
            <Text style={styles.cardSubtitle}>Patients today, financials and insurance claims</Text>
          </TouchableOpacity>
        )}

        {/* Service Catalog */}
        {cards.serviceCatalog && (
          <TouchableOpacity style={[styles.actionCard, styles.cardTeal]} onPress={onViewServiceCatalog} activeOpacity={0.85}>
            <View style={[styles.iconCircle, styles.iconCircleTeal]}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={30} color="#0f766e" />
            </View>
            <View style={[styles.arrowBadge]}>
              <Ionicons name="arrow-forward" size={14} color="#0f766e" />
            </View>
            <Text style={styles.cardTitle}>Service Catalog</Text>
            <Text style={styles.cardSubtitle}>Manage services and pricing for billing</Text>
          </TouchableOpacity>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  greetingSection: { marginBottom: 16 },
  greetingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ccfbf1', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12,
  },
  greetingBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f766e', letterSpacing: 1, textTransform: 'uppercase' },
  modeBadgeText: { fontSize: 11, color: '#0f766e', fontWeight: '600' },
  greetingText: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4, letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  // Owner card
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#faf5ff', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#ddd6fe',
  },
  ownerCardLeft: { flexDirection: 'row', alignItems: 'center' },
  ownerCardTitle: { fontSize: 15, fontWeight: '700', color: '#6d28d9' },
  ownerCardSub: { fontSize: 12, color: '#8b5cf6', marginTop: 2 },

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
  cardPurple: { backgroundColor: '#faf5ff', borderWidth: 1.5, borderColor: '#ddd6fe' },
  cardBlue:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#bfdbfe' },
  cardOrange: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fed7aa' },
  cardGray:   { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0' },

  iconCircle: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconCircleTeal:   { backgroundColor: '#e6fdf8' },
  iconCirclePurple: { backgroundColor: '#ede9fe' },
  iconCircleBlue:   { backgroundColor: '#eff6ff' },
  iconCircleOrange: { backgroundColor: '#fff7ed' },
  iconCircleGray:   { backgroundColor: '#f8fafc' },

  arrowBadge: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: '#e6fdf8', width: 30, height: 30,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  arrowBadgePurple: { backgroundColor: '#ede9fe' },
  arrowBadgeBlue:   { backgroundColor: '#eff6ff' },
  arrowBadgeOrange: { backgroundColor: '#fff7ed' },
  arrowBadgeGray:   { backgroundColor: '#f8fafc' },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  badge: { backgroundColor: '#ea580c', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
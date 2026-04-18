// src/screens/OwnerCardScreen.js
// The owner-doctor's hub: displays their invite code prominently,
// shows staff list, and lets them change clinic mode.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Share, Platform, RefreshControl, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const MODES = [
  { value: 'solo', label: 'Solo Practice', icon: 'account-circle-outline' },
  { value: 'team', label: 'Small Team',    icon: 'account-group-outline' },
  { value: 'multi', label: 'Multi-Dept',  icon: 'hospital-building' },
];

export default function OwnerCardScreen({ onBack }) {
  const { user, updateUser } = useAuth();
  const [inviteCode, setInviteCode] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [codeData, staffData] = await Promise.all([
        apiService.getMyInviteCode(),
        apiService.getFacilityStaff(),
      ]);
      setInviteCode(codeData);
      setStaff(staffData);
    } catch (e) {
      console.error('Failed to load owner card:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleShareCode = async () => {
    if (!inviteCode?.code) return;
    try {
      await Share.share({
        message: `Join ${user?.facilityName || 'my clinic'} on AfyaScribe!\n\nYour invite code: ${inviteCode.code}\n\nDownload AfyaScribe and use "Join with Invite Code" at login.`,
        title: 'AfyaScribe Invite Code',
      });
    } catch (e) { /* user dismissed */ }
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Code',
      'This will invalidate the current code. Any staff who hasn\'t joined yet will need the new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const newCode = await apiService.regenerateInviteCode();
              setInviteCode(newCode);
              Alert.alert('New code generated', `Your new code is: ${newCode.code}`);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to regenerate code');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = (staffMember) => {
    Alert.alert(
      'Deactivate Staff',
      `Remove ${staffMember.firstName} ${staffMember.lastName}'s access?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deactivateStaff(staffMember.id);
              await load();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to deactivate');
            }
          },
        },
      ]
    );
  };

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setLogoUploading(true);
    try {
      const data = await apiService.uploadFacilityLogo({
        uri: asset.uri,
        name: `logo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      updateUser({ facilityLogoUrl: data.logoUrl });
      Alert.alert('✅ Logo Updated', 'Your clinic logo has been saved.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert('Remove Logo', 'Remove your clinic logo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.removeFacilityLogo();
            updateUser({ facilityLogoUrl: null });
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const daysLeft = inviteCode?.expiresAt
    ? Math.max(0, Math.ceil((new Date(inviteCode.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const activeStaff = staff.filter(s => !s.isDeactivated && s.id !== user?.id);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Owner Card</Text>
          <Text style={styles.headerSub}>{user?.facilityName || 'Your Clinic'}</Text>
        </View>
        <View style={styles.crownBadge}>
          <MaterialCommunityIcons name="shield-crown-outline" size={22} color="#7c3aed" />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f766e" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Clinic Logo */}
          <View style={[styles.sectionCard, { alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Clinic Logo</Text>
            {user?.facilityLogoUrl ? (
              <Image
                source={{ uri: user.facilityLogoUrl }}
                style={{ width: 100, height: 100, borderRadius: 16, marginBottom: 16 }}
                resizeMode="contain"
              />
            ) : (
              <View style={{
                width: 100, height: 100, borderRadius: 16, backgroundColor: '#f0fdf4',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                borderWidth: 2, borderColor: '#bbf7d0', borderStyle: 'dashed',
              }}>
                <MaterialCommunityIcons name="hospital-building" size={40} color="#0f766e" />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.shareBtn, { flex: 1 }]}
                onPress={handlePickLogo}
                disabled={logoUploading}
              >
                {logoUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><MaterialCommunityIcons name="camera-outline" size={16} color="#fff" />
                      <Text style={styles.shareBtnText}>
                        {user?.facilityLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Text></>
                }
              </TouchableOpacity>
              {user?.facilityLogoUrl && (
                <TouchableOpacity style={styles.regenBtn} onPress={handleRemoveLogo}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#dc2626" />
                  <Text style={[styles.regenBtnText, { color: '#dc2626' }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.codeHint, { marginTop: 10, marginBottom: 0 }]}>
              Appears on receipts, prescriptions, and emails
            </Text>
          </View>

          {/* Invite Code */}
          <View style={styles.codeCard}>
            <View style={styles.codeCardHeader}>
              <MaterialCommunityIcons name="key-outline" size={18} color="#7c3aed" />
              <Text style={styles.codeCardTitle}>Staff Invite Code</Text>
              {daysLeft !== null && (
                <View style={styles.expiry}>
                  <Text style={styles.expiryText}>{daysLeft}d left</Text>
                </View>
              )}
            </View>

            {inviteCode?.code ? (
              <>
                <Text style={styles.codeDisplay}>{inviteCode.code}</Text>
                <Text style={styles.codeHint}>
                  Share this code with staff. They use "Join with Invite Code" at login.
                </Text>

                <View style={styles.codeActions}>
                  <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>Share Code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.regenBtn}
                    onPress={handleRegenerate}
                    disabled={regenerating}
                  >
                    {regenerating
                      ? <ActivityIndicator size="small" color="#7c3aed" />
                      : <MaterialCommunityIcons name="refresh" size={18} color="#7c3aed" />
                    }
                    <Text style={styles.regenBtnText}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View>
                <Text style={styles.codeHint}>No active invite code. Generate one to invite staff.</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleRegenerate} disabled={regenerating}>
                  {regenerating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialCommunityIcons name="key-plus" size={18} color="#fff" />
                  }
                  <Text style={styles.shareBtnText}>Generate Invite Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Clinic Mode */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="tune" size={16} color="#0f766e" />
              <Text style={styles.sectionTitle}>Clinic Mode</Text>
            </View>
            <Text style={styles.sectionSub}>
              Controls how permissions work across your team.
            </Text>
            {MODES.map(m => {
              const active = user?.clinicMode === m.value;
              return (
                <View key={m.value} style={[styles.modeRow, active && styles.modeRowActive]}>
                  <MaterialCommunityIcons
                    name={m.icon}
                    size={18}
                    color={active ? '#0f766e' : '#94a3b8'}
                  />
                  <Text style={[styles.modeLabel, active && { color: '#0f766e', fontWeight: '700' }]}>
                    {m.label}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color="#0f766e" />}
                </View>
              );
            })}
            <TouchableOpacity
              style={styles.changeModeBtn}
              onPress={() => Alert.alert(
                'Change Clinic Mode',
                'To change your clinic mode, please contact AfyaScribe support at afyascribeadmin@co.ke with your facility code.',
              )}
            >
              <Text style={styles.changeModeBtnText}>Request Mode Change</Text>
            </TouchableOpacity>
          </View>

          {/* Staff List */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-group-outline" size={16} color="#0f766e" />
              <Text style={styles.sectionTitle}>Your Team ({activeStaff.length})</Text>
            </View>

            {activeStaff.length === 0 ? (
              <Text style={styles.emptyText}>
                No staff yet. Share the invite code above to add team members.
              </Text>
            ) : (
              activeStaff.map(member => (
                <View key={member.id} style={styles.staffRow}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarText}>
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.staffName}>{member.firstName} {member.lastName}</Text>
                    <Text style={styles.staffRole}>{member.role}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deactivateBtn}
                    onPress={() => handleDeactivate(member)}
                  >
                    <Text style={styles.deactivateBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 12, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1 },
  headerSub: { fontSize: 12, color: '#94a3b8' },
  crownBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 16 },

  codeCard: {
    backgroundColor: '#faf5ff', borderRadius: 16, padding: 20,
    borderWidth: 1.5, borderColor: '#ddd6fe', marginBottom: 14,
  },
  codeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  codeCardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#6d28d9' },
  expiry: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  expiryText: { fontSize: 11, fontWeight: '700', color: '#6d28d9' },
  codeDisplay: {
    fontSize: 36, fontWeight: '900', color: '#0f172a',
    letterSpacing: 8, textAlign: 'center', marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: '#ddd6fe',
  },
  codeHint: { fontSize: 13, color: '#7c3aed', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  codeActions: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  regenBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ede9fe', borderRadius: 10, paddingVertical: 12,
  },
  regenBtnText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  sectionSub: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },

  modeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modeRowActive: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 },
  modeLabel: { flex: 1, fontSize: 14, color: '#475569' },
  changeModeBtn: {
    alignItems: 'center', paddingVertical: 10, marginTop: 8,
  },
  changeModeBtnText: { fontSize: 13, color: '#94a3b8' },

  staffRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  staffAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#ccfbf1',
    alignItems: 'center', justifyContent: 'center',
  },
  staffAvatarText: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  staffName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  staffRole: { fontSize: 12, color: '#94a3b8', marginTop: 2, textTransform: 'capitalize' },
  deactivateBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#fff1f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecdd3',
  },
  deactivateBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  emptyText: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
});
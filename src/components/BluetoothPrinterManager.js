// src/components/BluetoothPrinterManager.js
// Modal component for scanning, pairing, and selecting a Bluetooth thermal printer.
// Shown before printing if no printer is saved, or from settings.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  scanForPrinters,
  savePrinterDevice,
  getSavedPrinterDevice,
  clearSavedPrinter,
  isBluetoothPrintingAvailable,
} from '../utils/thermalPrinter';

export default function BluetoothPrinterManager({ visible, onClose, onPrinterSelected }) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [savedPrinter, setSavedPrinter] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [available] = useState(isBluetoothPrintingAvailable());

  useEffect(() => {
    if (visible) {
      loadSavedPrinter();
    }
  }, [visible]);

  const loadSavedPrinter = async () => {
    const saved = await getSavedPrinterDevice();
    setSavedPrinter(saved);
  };

  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    try {
      const found = await scanForPrinters();
      setDevices(found);
      if (found.length === 0) {
        Alert.alert(
          'No Devices Found',
          'Make sure your Bluetooth printer is turned on and in pairing mode, then try again.',
        );
      }
    } catch (error) {
      Alert.alert('Scan Error', error.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectDevice = async (device) => {
    setConnecting(device.address);
    try {
      await savePrinterDevice(device);
      setSavedPrinter(device);
      Alert.alert('✅ Printer Saved', `${device.name || device.address} is now your default printer.`);
      onPrinterSelected?.(device);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleClearPrinter = async () => {
    Alert.alert(
      'Remove Printer',
      `Remove "${savedPrinter?.name || savedPrinter?.address}" from saved printers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearSavedPrinter();
            setSavedPrinter(null);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="printer-wireless" size={22} color="#0f766e" />
              <Text style={styles.title}>Bluetooth Printer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Library not available warning */}
          {!available && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b45309" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.warningTitle}>Bluetooth printing not available</Text>
                <Text style={styles.warningText}>
                  Install <Text style={styles.code}>react-native-bluetooth-escpos-printer</Text> and rebuild the app with a development build (not Expo Go).
                </Text>
              </View>
            </View>
          )}

          {/* Saved printer */}
          {savedPrinter && (
            <View style={styles.savedSection}>
              <Text style={styles.sectionLabel}>Current Printer</Text>
              <View style={styles.savedPrinterRow}>
                <View style={styles.printerIconBox}>
                  <MaterialCommunityIcons name="printer-check" size={22} color="#0f766e" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.printerName}>{savedPrinter.name || 'Unknown Printer'}</Text>
                  <Text style={styles.printerAddress}>{savedPrinter.address}</Text>
                </View>
                <TouchableOpacity onPress={handleClearPrinter} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.useSavedBtn}
                onPress={() => { onPrinterSelected?.(savedPrinter); onClose(); }}
              >
                <MaterialCommunityIcons name="printer" size={16} color="#fff" />
                <Text style={styles.useSavedBtnText}>Use This Printer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scan button */}
          <TouchableOpacity
            style={[styles.scanBtn, (!available || scanning) && styles.scanBtnDisabled]}
            onPress={handleScan}
            disabled={!available || scanning}
          >
            {scanning ? (
              <><ActivityIndicator size="small" color="#0f766e" /><Text style={styles.scanBtnText}>Scanning...</Text></>
            ) : (
              <><MaterialCommunityIcons name="bluetooth-audio" size={18} color="#0f766e" /><Text style={styles.scanBtnText}>Scan for Printers</Text></>
            )}
          </TouchableOpacity>

          {/* Device list */}
          {devices.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Found Devices ({devices.length})</Text>
              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                style={styles.deviceList}
                renderItem={({ item }) => {
                  const isConnecting = connecting === item.address;
                  const isSaved = savedPrinter?.address === item.address;
                  return (
                    <TouchableOpacity
                      style={[styles.deviceRow, isSaved && styles.deviceRowSaved]}
                      onPress={() => handleSelectDevice(item)}
                      disabled={isConnecting}
                    >
                      <View style={styles.deviceIconBox}>
                        <MaterialCommunityIcons
                          name="printer-outline"
                          size={18}
                          color={isSaved ? '#0f766e' : '#64748b'}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
                        <Text style={styles.deviceAddress}>{item.address}</Text>
                      </View>
                      {isConnecting ? (
                        <ActivityIndicator size="small" color="#0f766e" />
                      ) : isSaved ? (
                        <View style={styles.savedBadge}>
                          <Text style={styles.savedBadgeText}>Selected</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle-outline" size={20} color="#0f766e" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}

          {/* Tips */}
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips for Bluetooth printing:</Text>
            <Text style={styles.tipText}>• Turn on your thermal printer first</Text>
            <Text style={styles.tipText}>• Ensure it's in pairing/discoverable mode</Text>
            <Text style={styles.tipText}>• Works with most 58mm ESC/POS printers</Text>
            <Text style={styles.tipText}>• For Android: enable location permission</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 16,
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#b45309', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#92400e', lineHeight: 17 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 },

  savedSection: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  savedPrinterRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#bbf7d0', marginBottom: 10,
  },
  printerIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
  },
  printerName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  printerAddress: { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeBtn: { padding: 6 },
  useSavedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 10,
  },
  useSavedBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#0f766e', borderRadius: 12,
    paddingVertical: 12, marginBottom: 16, backgroundColor: '#f0fdf4',
  },
  scanBtnDisabled: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },

  deviceList: { maxHeight: 220, marginBottom: 12 },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderRadius: 8,
  },
  deviceRowSaved: { backgroundColor: '#f0fdf9' },
  deviceIconBox: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  deviceAddress: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  savedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  savedBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  tipsBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8,
  },
  tipsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  tipText: { fontSize: 12, color: '#64748b', marginBottom: 3, lineHeight: 17 },
});

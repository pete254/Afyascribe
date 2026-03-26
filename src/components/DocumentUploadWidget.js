// src/components/DocumentUploadWidget.js
// Reusable widget for picking + naming a document before upload
// Props:
//   onFileReady(fileObj)   - called when user has picked a file and named it
//   onDiscard()            - called when user discards the staged file
//   disabled               - boolean
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export const CATEGORY_OPTIONS = [
  { value: 'lab_result',     label: 'Lab Result',       icon: 'flask-outline',            color: '#2563eb' },
  { value: 'radiology',      label: 'Radiology / X-Ray', icon: 'image-outline',            color: '#7c3aed' },
  { value: 'referral',       label: 'Referral Letter',   icon: 'document-text-outline',    color: '#d97706' },
  { value: 'insurance',      label: 'Insurance',         icon: 'shield-checkmark-outline', color: '#059669' },
  { value: 'prescription',   label: 'Prescription',      icon: 'medical-outline',          color: '#dc2626' },
  { value: 'identification', label: 'Identification',    icon: 'card-outline',             color: '#0891b2' },
  { value: 'other',          label: 'Other',             icon: 'attach-outline',           color: '#64748b' },
];

export const getCategoryInfo = (value) =>
  CATEGORY_OPTIONS.find((c) => c.value === value) || CATEGORY_OPTIONS[6];

// ── Source picker modal ───────────────────────────────────────────────────────
function SourcePicker({ visible, onCamera, onGallery, onPdf, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <Text style={s.sheetTitle}>Choose Source</Text>

          <TouchableOpacity style={s.sourceRow} onPress={onCamera}>
            <View style={[s.sourceIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="camera-outline" size={22} color="#0f766e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sourceLabel}>Take Photo</Text>
              <Text style={s.sourceSub}>Capture with camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.sourceRow} onPress={onGallery}>
            <View style={[s.sourceIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="images-outline" size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sourceLabel}>Choose from Gallery</Text>
              <Text style={s.sourceSub}>Select an image</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.sourceRow} onPress={onPdf}>
            <View style={[s.sourceIcon, { backgroundColor: '#fef2f2' }]}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#dc2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sourceLabel}>Upload PDF</Text>
              <Text style={s.sourceSub}>Pick a PDF file</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelRow} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Category picker modal ─────────────────────────────────────────────────────
function CategoryPicker({ visible, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <Text style={s.sheetTitle}>Document Category</Text>
          {CATEGORY_OPTIONS.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[s.catRow, selected === cat.value && s.catRowActive]}
              onPress={() => onSelect(cat.value)}
            >
              <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={18} color={cat.color} />
              </View>
              <Text style={s.catLabel}>{cat.label}</Text>
              {selected === cat.value && (
                <Ionicons name="checkmark-circle" size={18} color="#0f766e" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function DocumentUploadWidget({ onFileReady, disabled = false, compact = false }) {
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [stagedFile, setStagedFile] = useState(null); // raw file from picker
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState('other');
  const [nameError, setNameError] = useState('');

  const pickCamera = async () => {
    setSourcePickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setStagedFile({
        uri: a.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: a.fileSize || 0,
      });
    }
  };

  const pickGallery = async () => {
    setSourcePickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      const ext = a.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      setStagedFile({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.${ext}`,
        type: mime[ext] || 'image/jpeg',
        size: a.fileSize || 0,
      });
    }
  };

  const pickPdf = async () => {
    setSourcePickerVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setStagedFile({
          uri: a.uri,
          name: a.name,
          type: 'application/pdf',
          size: a.size || 0,
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker');
    }
  };

  const handleDiscard = () => {
    setStagedFile(null);
    setDocumentName('');
    setCategory('other');
    setNameError('');
  };

  const handleConfirm = () => {
    if (!documentName.trim()) {
      setNameError('Please enter a document name');
      return;
    }
    setNameError('');
    onFileReady({
      ...stagedFile,
      documentName: documentName.trim(),
      category,
    });
    // Reset widget
    setStagedFile(null);
    setDocumentName('');
    setCategory('other');
  };

  const catInfo = getCategoryInfo(category);
  const sizeLabel = stagedFile?.size
    ? stagedFile.size > 1024 * 1024
      ? `${(stagedFile.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(stagedFile.size / 1024)} KB`
    : '';

  // ── No file staged — show pick button ─────────────────────────────────────
  if (!stagedFile) {
    return (
      <>
        <TouchableOpacity
          style={[s.pickBtn, compact && s.pickBtnCompact, disabled && s.pickBtnDisabled]}
          onPress={() => setSourcePickerVisible(true)}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons name="cloud-upload-outline" size={compact ? 16 : 18} color="#0f766e" />
          <Text style={[s.pickBtnText, compact && s.pickBtnTextCompact]}>
            {compact ? 'Attach File' : 'Attach Document'}
          </Text>
        </TouchableOpacity>

        <SourcePicker
          visible={sourcePickerVisible}
          onCamera={pickCamera}
          onGallery={pickGallery}
          onPdf={pickPdf}
          onClose={() => setSourcePickerVisible(false)}
        />
      </>
    );
  }

  // ── File staged — show name input + category + confirm/discard ─────────────
  return (
    <View style={s.stagedContainer}>
      {/* File info row */}
      <View style={s.stagedFileRow}>
        <View style={s.stagedFileIcon}>
          {stagedFile.type === 'application/pdf' ? (
            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#dc2626" />
          ) : (
            <Ionicons name="image-outline" size={24} color="#2563eb" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.stagedFileName} numberOfLines={1}>{stagedFile.name}</Text>
          {sizeLabel ? <Text style={s.stagedFileSize}>{sizeLabel}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleDiscard} style={s.discardBtn}>
          <Ionicons name="close-circle" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Document name input */}
      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Document Name <Text style={s.required}>*</Text></Text>
        <TextInput
          style={[s.nameInput, nameError && s.nameInputError]}
          placeholder="e.g. Chest X-Ray Jan 2025"
          value={documentName}
          onChangeText={(t) => { setDocumentName(t); setNameError(''); }}
          autoCapitalize="words"
          placeholderTextColor="#cbd5e1"
        />
        {nameError ? <Text style={s.errorText}>{nameError}</Text> : null}
      </View>

      {/* Category picker */}
      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Category</Text>
        <TouchableOpacity
          style={s.catTrigger}
          onPress={() => setCategoryPickerVisible(true)}
        >
          <View style={[s.catTriggerIcon, { backgroundColor: catInfo.color + '20' }]}>
            <Ionicons name={catInfo.icon} size={16} color={catInfo.color} />
          </View>
          <Text style={s.catTriggerText}>{catInfo.label}</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Confirm button */}
      <View style={s.confirmRow}>
        <TouchableOpacity style={s.discardFullBtn} onPress={handleDiscard}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={s.discardFullBtnText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={s.confirmBtnText}>Attach</Text>
        </TouchableOpacity>
      </View>

      <CategoryPicker
        visible={categoryPickerVisible}
        selected={category}
        onSelect={(val) => { setCategory(val); setCategoryPickerVisible(false); }}
        onClose={() => setCategoryPickerVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // Pick button
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#0f766e',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  pickBtnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickBtnDisabled: { opacity: 0.5 },
  pickBtnText: { fontSize: 14, fontWeight: '600', color: '#0f766e' },
  pickBtnTextCompact: { fontSize: 13 },

  // Staged container
  stagedContainer: {
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#eff6ff',
    gap: 12,
  },
  stagedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stagedFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stagedFileName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  stagedFileSize: { fontSize: 11, color: '#64748b', marginTop: 1 },
  discardBtn: { padding: 2 },

  // Inputs
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#ef4444' },
  nameInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    color: '#0f172a',
  },
  nameInputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444' },

  // Category trigger
  catTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catTriggerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTriggerText: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },

  // Confirm row
  confirmRow: { flexDirection: 'row', gap: 10 },
  discardFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  discardFullBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f766e',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 14,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sourceLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  sourceSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cancelRow: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  catRowActive: { backgroundColor: '#f0fdf4' },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catLabel: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
});
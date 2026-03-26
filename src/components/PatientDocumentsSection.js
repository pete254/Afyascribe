// src/components/PatientDocumentsSection.js
// Uses only expo-image-picker, expo-document-picker, expo-linking
// No react-native-reanimated / gesture-handler dependency
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import apiService from '../services/apiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_OPTIONS = [
  { value: 'lab_result',   label: 'Lab Result',       icon: 'flask-outline',            color: '#2563eb' },
  { value: 'radiology',    label: 'Radiology / X-Ray', icon: 'image-outline',            color: '#7c3aed' },
  { value: 'referral',     label: 'Referral Letter',   icon: 'document-text-outline',    color: '#d97706' },
  { value: 'insurance',    label: 'Insurance',         icon: 'shield-checkmark-outline', color: '#059669' },
  { value: 'prescription', label: 'Prescription',      icon: 'medical-outline',          color: '#dc2626' },
  { value: 'other',        label: 'Other',             icon: 'attach-outline',           color: '#64748b' },
];

const getCategoryInfo = (value) =>
  CATEGORY_OPTIONS.find((c) => c.value === value) || CATEGORY_OPTIONS[5];

// ── Zoomable Image Viewer (pure RN, no reanimated) ────────────────────────────
function ZoomableImageViewer({ uri, onClose }) {
  // We use ScrollView's built-in zoom support
  return (
    <View style={viewer.container}>
      <TouchableOpacity style={viewer.closeBtn} onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <View style={viewer.closeBtnInner}>
          <Ionicons name="close" size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      <Text style={viewer.hint}>Pinch to zoom · Double-tap to fit</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={viewer.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
      >
        <Image
          source={{ uri }}
          style={viewer.image}
          resizeMode="contain"
        />
      </ScrollView>
    </View>
  );
}

// ── Category Picker Modal ─────────────────────────────────────────────────────
function CategoryPicker({ visible, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>Select Document Category</Text>
          {CATEGORY_OPTIONS.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={styles.categoryOption}
              onPress={() => onSelect(cat.value)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelOption} onPress={onClose}>
            <Text style={styles.cancelOptionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PatientDocumentsSection({ patient }) {
  const [documents, setDocuments]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [uploading, setUploading]               = useState(false);
  const [viewerVisible, setViewerVisible]       = useState(false);
  const [viewerDoc, setViewerDoc]               = useState(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [pendingFile, setPendingFile]           = useState(null);
  const [uploadPickerVisible, setUploadPickerVisible] = useState(false);

  useEffect(() => {
    if (patient?.id) loadDocuments();
  }, [patient?.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPatientDocuments(patient.id);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── File pickers ───────────────────────────────────────────────────────────
  const pickFromCamera = async () => {
    setUploadPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingFile({
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: asset.fileSize || 0,
      });
      setCategoryPickerVisible(true);
    }
  };

  const pickFromGallery = async () => {
    setUploadPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      setPendingFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.${ext}`,
        type: mimeMap[ext] || 'image/jpeg',
        size: asset.fileSize || 0,
      });
      setCategoryPickerVisible(true);
    }
  };

  const pickPdf = async () => {
    setUploadPickerVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setPendingFile({
          uri: asset.uri,
          name: asset.name,
          type: 'application/pdf',
          size: asset.size || 0,
        });
        setCategoryPickerVisible(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open document picker');
    }
  };

  // ── Upload after category selected ────────────────────────────────────────
  const handleCategorySelected = async (category) => {
    setCategoryPickerVisible(false);
    if (!pendingFile) return;

    setUploading(true);
    try {
      await apiService.uploadPatientDocument(patient.id, pendingFile, category);
      await loadDocuments();
      Alert.alert('✅ Uploaded', 'Document uploaded successfully');
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (doc) => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.fileName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deletePatientDocument(doc.id);
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete document');
            }
          },
        },
      ],
    );
  };

  // ── Open ───────────────────────────────────────────────────────────────────
  const openDocument = (doc) => {
    if (doc.fileType === 'application/pdf') {
      Alert.alert('Open PDF', `Open "${doc.fileName}" in browser?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(doc.fileUrl) },
      ]);
      return;
    }
    setViewerDoc(doc);
    setViewerVisible(true);
  };

  // ── Render doc card ────────────────────────────────────────────────────────
  const renderDoc = ({ item }) => {
    const cat = getCategoryInfo(item.category);
    const isImage = item.fileType?.startsWith('image/');
    const sizeLabel = item.fileSize
      ? item.fileSize > 1024 * 1024
        ? `${(item.fileSize / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(item.fileSize / 1024)} KB`
      : '';

    return (
      <TouchableOpacity style={styles.docCard} onPress={() => openDocument(item)} activeOpacity={0.8}>
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          {isImage ? (
            <Image source={{ uri: item.fileUrl }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPdf}>
              <MaterialCommunityIcons name="file-pdf-box" size={34} color="#dc2626" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.docInfo}>
          <Text style={styles.docFileName} numberOfLines={1}>{item.fileName}</Text>
          <View style={styles.docMeta}>
            <View style={[styles.catBadge, { backgroundColor: cat.color + '18' }]}>
              <Ionicons name={cat.icon} size={11} color={cat.color} />
              <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {sizeLabel ? <Text style={styles.sizeText}>{sizeLabel}</Text> : null}
          </View>
          <Text style={styles.uploadedBy}>
            {item.uploadedBy
              ? `${item.uploadedBy.firstName} ${item.uploadedBy.lastName}`
              : ''}
            {' · '}
            {new Date(item.createdAt).toLocaleDateString('en-KE', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
          {item.notes ? (
            <Text style={styles.docNotes} numberOfLines={2}>{item.notes}</Text>
          ) : null}
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="folder-multiple-image" size={20} color="#0f766e" />
          <Text style={styles.sectionTitle}>Documents & Images</Text>
          {documents.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{documents.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, uploading && styles.addBtnDisabled]}
          onPress={() => setUploadPickerVisible(true)}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0f766e" size="small" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : documents.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyBox}
          onPress={() => setUploadPickerVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="folder-open-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No documents yet</Text>
          <Text style={styles.emptySubtitle}>
            Add lab results, X-rays, referrals, or PDFs
          </Text>
          <View style={styles.emptyAddBtn}>
            <Ionicons name="cloud-upload-outline" size={16} color="#0f766e" />
            <Text style={styles.emptyAddBtnText}>Upload Document</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 10 }}>
          {documents.map((doc) => (
            <View key={doc.id}>{renderDoc({ item: doc })}</View>
          ))}
        </View>
      )}

      {/* Upload options modal */}
      <Modal
        visible={uploadPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUploadPickerVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Document</Text>

            <TouchableOpacity style={styles.uploadOption} onPress={pickFromCamera}>
              <View style={[styles.uploadOptionIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="camera-outline" size={22} color="#0f766e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadOptionLabel}>Take Photo</Text>
                <Text style={styles.uploadOptionSub}>Use camera to capture a document</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={pickFromGallery}>
              <View style={[styles.uploadOptionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="images-outline" size={22} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadOptionLabel}>Choose from Gallery</Text>
                <Text style={styles.uploadOptionSub}>Select an image from your photos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={pickPdf}>
              <View style={[styles.uploadOptionIcon, { backgroundColor: '#fef2f2' }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={22} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadOptionLabel}>Upload PDF</Text>
                <Text style={styles.uploadOptionSub}>Select a PDF from your files</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => setUploadPickerVisible(false)}
            >
              <Text style={styles.cancelOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category picker */}
      <CategoryPicker
        visible={categoryPickerVisible}
        onSelect={handleCategorySelected}
        onClose={() => {
          setCategoryPickerVisible(false);
          setPendingFile(null);
        }}
      />

      {/* Zoomable image viewer */}
      <Modal
        visible={viewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
        statusBarTranslucent
      >
        {viewerDoc && (
          <ZoomableImageViewer
            uri={viewerDoc.fileUrl}
            onClose={() => setViewerVisible(false)}
          />
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  countBadge: {
    backgroundColor: '#ccfbf1',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  emptyAddBtnText: { fontSize: 13, fontWeight: '600', color: '#0f766e' },

  // Document card
  docCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#f1f5f9',
  },
  thumbImage: { width: 68, height: 68 },
  thumbPdf: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  docInfo: { flex: 1, gap: 4 },
  docFileName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  sizeText: { fontSize: 11, color: '#94a3b8' },
  uploadedBy: { fontSize: 12, color: '#94a3b8' },
  docNotes: { fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 16 },
  deleteBtn: { paddingTop: 2 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  // Upload option rows
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 14,
  },
  uploadOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadOptionLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  uploadOptionSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  // Category option rows
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 14,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryLabel: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  cancelOption: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  cancelOptionText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
});

// ── Viewer styles ─────────────────────────────────────────────────────────────
const viewer = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 62 : 38,
    left: 0,
    right: 56,
    paddingLeft: 16,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    zIndex: 5,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_HEIGHT,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.88,
  },
});
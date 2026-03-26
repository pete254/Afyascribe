// src/components/NoteDocumentsPanel.js
// Shows documents attached to one SOAP note.
// When editable=true: allows adding + deleting.
// When editable=false: view + zoom only.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import DocumentUploadWidget, { getCategoryInfo } from './DocumentUploadWidget';
import apiService from '../services/apiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Zoomable viewer (pure RN ScrollView zoom) ─────────────────────────────────
function ImageViewer({ uri, fileName, onClose }) {
  return (
    <View style={viewer.container}>
      <View style={viewer.topBar}>
        <Text style={viewer.topBarTitle} numberOfLines={1}>{fileName}</Text>
        <TouchableOpacity onPress={onClose} style={viewer.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={viewer.closeBtnCircle}>
            <Ionicons name="close" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={viewer.hint}>Pinch to zoom</Text>

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

// ── Single document card ───────────────────────────────────────────────────────
function DocCard({ doc, onDelete, editable, onView }) {
  const cat = getCategoryInfo(doc.category);
  const isImage = doc.fileType?.startsWith('image/');
  const sizeLabel = doc.fileSize
    ? doc.fileSize > 1024 * 1024
      ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(doc.fileSize / 1024)} KB`
    : '';

  return (
    <TouchableOpacity style={c.card} onPress={() => onView(doc)} activeOpacity={0.8}>
      {/* Thumbnail */}
      <View style={c.thumb}>
        {isImage ? (
          <Image source={{ uri: doc.fileUrl }} style={c.thumbImg} resizeMode="cover" />
        ) : (
          <View style={c.thumbPdf}>
            <MaterialCommunityIcons name="file-pdf-box" size={28} color="#dc2626" />
          </View>
        )}
        <View style={c.thumbOverlay}>
          <Ionicons name={isImage ? 'expand-outline' : 'open-outline'} size={14} color="#fff" />
        </View>
      </View>

      {/* Info */}
      <View style={c.info}>
        <Text style={c.docName} numberOfLines={1}>{doc.documentName}</Text>
        <View style={c.metaRow}>
          <View style={[c.catBadge, { backgroundColor: cat.color + '18' }]}>
            <Ionicons name={cat.icon} size={10} color={cat.color} />
            <Text style={[c.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          {sizeLabel ? <Text style={c.sizeText}>{sizeLabel}</Text> : null}
        </View>
        {doc.uploadedBy && (
          <Text style={c.uploader}>
            {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}
          </Text>
        )}
      </View>

      {/* Delete (only when editable) */}
      {editable && (
        <TouchableOpacity
          style={c.deleteBtn}
          onPress={() => onDelete(doc)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function NoteDocumentsPanel({
  soapNoteId,        // required
  patientId,         // required
  facilityId,        // optional — used for upload context only
  editable = false,  // true on TranscriptionScreen when editing
  onDocCountChange,  // optional callback (count) => void
}) {
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [viewerDoc, setViewerDoc]   = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    if (soapNoteId) loadDocs();
  }, [soapNoteId]);

  const loadDocs = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSoapNoteDocs(soapNoteId);
      const list = Array.isArray(data) ? data : [];
      setDocs(list);
      onDocCountChange?.(list.length);
    } catch (e) {
      console.error('❌ NoteDocumentsPanel load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileReady = async (fileObj) => {
    setUploading(true);
    try {
      await apiService.uploadSoapNoteDocument(patientId, soapNoteId, fileObj);
      await loadDocs();
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc) => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.documentName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deletePatientDocument(doc.id);
              const updated = docs.filter((d) => d.id !== doc.id);
              setDocs(updated);
              onDocCountChange?.(updated.length);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to delete');
            }
          },
        },
      ],
    );
  };

  const handleView = (doc) => {
    if (doc.fileType === 'application/pdf') {
      Alert.alert('Open PDF', `Open "${doc.documentName}" in browser?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(doc.fileUrl) },
      ]);
      return;
    }
    setViewerDoc(doc);
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={c.loadingRow}>
        <ActivityIndicator size="small" color="#0f766e" />
        <Text style={c.loadingText}>Loading attachments...</Text>
      </View>
    );
  }

  return (
    <View style={c.container}>
      {/* Header */}
      <View style={c.header}>
        <View style={c.headerLeft}>
          <MaterialCommunityIcons name="paperclip" size={16} color="#0f766e" />
          <Text style={c.headerTitle}>Attachments</Text>
          {docs.length > 0 && (
            <View style={c.badge}>
              <Text style={c.badgeText}>{docs.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Documents */}
      {docs.length > 0 && (
        <View style={c.docList}>
          {docs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              editable={editable}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </View>
      )}

      {/* Upload widget (editable only) */}
      {editable && (
        <View style={{ marginTop: docs.length > 0 ? 10 : 0 }}>
          {uploading ? (
            <View style={c.uploadingRow}>
              <ActivityIndicator size="small" color="#0f766e" />
              <Text style={c.uploadingText}>Uploading...</Text>
            </View>
          ) : (
            <DocumentUploadWidget
              onFileReady={handleFileReady}
              compact={docs.length > 0}
            />
          )}
        </View>
      )}

      {/* Empty state (view-only) */}
      {!editable && docs.length === 0 && (
        <View style={c.emptyRow}>
          <MaterialCommunityIcons name="paperclip" size={16} color="#cbd5e1" />
          <Text style={c.emptyText}>No attachments</Text>
        </View>
      )}

      {/* Image viewer */}
      <Modal
        visible={viewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
        statusBarTranslucent
      >
        {viewerDoc && (
          <ImageViewer
            uri={viewerDoc.fileUrl}
            fileName={viewerDoc.documentName}
            onClose={() => setViewerVisible(false)}
          />
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  container: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  badge: {
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0f766e' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: '#94a3b8' },

  docList: { gap: 8 },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  uploadingText: { fontSize: 13, color: '#0f766e' },

  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  emptyText: { fontSize: 13, color: '#cbd5e1' },

  // Doc card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  thumbImg: { width: 52, height: 52 },
  thumbPdf: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    padding: 2,
  },
  info: { flex: 1, gap: 3 },
  docName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  sizeText: { fontSize: 10, color: '#94a3b8' },
  uploader: { fontSize: 11, color: '#94a3b8' },
  deleteBtn: { padding: 4 },
});

// ── Viewer styles ─────────────────────────────────────────────────────────────
const viewer = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    gap: 10,
  },
  topBarTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  closeBtn: {},
  closeBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    paddingVertical: 6,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.78,
  },
});
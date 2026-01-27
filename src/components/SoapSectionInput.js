// src/components/SoapSectionInput.js
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ICD10SearchDropdown from './ICD10SearchDropdown';

function SoapSectionInput({
  title,
  value,
  onChangeText,
  onFormat,
  onClear,
  onStartRecording,
  isRecording,
  isFormatting,
  placeholder,
  isCollapsed = false,
  onToggleCollapse,

  // ICD-10 props
  showIcd10Search = false,
  selectedIcd10Code = null,
  onIcd10Select,
}) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color="#6b7280"
            style={{ marginRight: 8 }}
          />

          <Text style={styles.title}>{title}</Text>

          {value.trim() && (
            <View style={styles.badge}>
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          )}

          {showIcd10Search && selectedIcd10Code && (
            <View style={styles.icd10Badge}>
              <Text style={styles.icd10BadgeText}>
                {selectedIcd10Code.code}
              </Text>
            </View>
          )}
        </View>

        {!isCollapsed && value.trim() && (
          <Text style={styles.charCount}>{value.length} chars</Text>
        )}
      </TouchableOpacity>

      {/* Content */}
      {!isCollapsed && (
        <View style={styles.content}>
          {/* Input + Mic */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive,
              ]}
              onPress={onStartRecording}
              disabled={isFormatting}
            >
              <MaterialCommunityIcons
                name={isRecording ? 'stop' : 'microphone'}
                size={24}
                color="#ffffff"
              />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={value}
              onChangeText={onChangeText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isRecording && !isFormatting}
            />
          </View>

          {/* ICD-10 Dropdown */}
          {showIcd10Search && (
            <View style={styles.icd10Container}>
              <ICD10SearchDropdown
                selectedCode={selectedIcd10Code}
                onCodeSelect={onIcd10Select}
                disabled={isRecording || isFormatting}
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionButtons}>
            {value.trim() && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={onClear}
                disabled={isRecording || isFormatting}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color="#dc2626"
                />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.formatButton,
                (!value.trim() || isRecording) &&
                  styles.formatButtonDisabled,
              ]}
              onPress={onFormat}
              disabled={isFormatting || !value.trim() || isRecording}
            >
              {isFormatting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.formatButtonText}>
                    Format with AI
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Recording indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <MaterialCommunityIcons
                name="record-circle"
                size={12}
                color="#ef4444"
              />
              <Text style={styles.recordingText}>Recording…</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  badge: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  icd10Badge: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  icd10BadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  micButtonActive: {
    backgroundColor: '#ef4444',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  icd10Container: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  clearButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  formatButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f766e',
  },
  formatButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  formatButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordingText: {
    color: '#d97706',
    fontWeight: '600',
  },
});

export default SoapSectionInput;

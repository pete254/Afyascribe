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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // ✅ Import icons

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
          {/* ✅ Replace emoji with icon */}
          <Ionicons 
            name={isCollapsed ? "chevron-forward" : "chevron-down"} 
            size={16} 
            color="#6b7280" 
            style={{ marginRight: 8 }}
          />
          <Text style={styles.title}>{title}</Text>
          {value.trim() && (
            <View style={styles.badge}>
              {/* ✅ Replace emoji with icon */}
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            </View>
          )}
        </View>
        {!isCollapsed && value.trim() && (
          <Text style={styles.charCount}>{value.length} chars</Text>
        )}
      </TouchableOpacity>

      {/* Content (only show if not collapsed) */}
      {!isCollapsed && (
        <View style={styles.content}>
          {/* Input Area with Mic Button */}
          <View style={styles.inputContainer}>
            {/* ✅ Microphone Button - WhatsApp Style! */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive,
              ]}
              onPress={onStartRecording}
              disabled={isFormatting}
            >
              {isRecording ? (
                <MaterialCommunityIcons name="stop" size={24} color="#ffffff" />
              ) : (
                <MaterialCommunityIcons name="microphone" size={24} color="#ffffff" />
              )}
            </TouchableOpacity>

            {/* Text Input */}
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* ✅ Clear Button with icon */}
            {value.trim() && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={onClear}
                disabled={isRecording || isFormatting}
              >
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}

            {/* ✅ Format with AI Button with icon */}
            <TouchableOpacity
              style={[
                styles.formatButton,
                (!value.trim() || isRecording) && styles.formatButtonDisabled,
              ]}
              onPress={onFormat}
              disabled={isFormatting || !value.trim() || isRecording}
            >
              {isFormatting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                  <Text style={styles.formatButtonText}>Format with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ✅ Recording indicator with icon */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <MaterialCommunityIcons name="record-circle" size={12} color="#ef4444" />
              <Text style={styles.recordingText}>Recording...</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: '#ef4444',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 6,
  },
  clearButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  formatButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0f766e',
    gap: 6,
  },
  formatButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  formatButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    gap: 8,
  },
  recordingText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SoapSectionInput;
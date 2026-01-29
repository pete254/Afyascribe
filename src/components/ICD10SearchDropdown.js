// src/components/ICD10SearchDropdown.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView
} from 'react-native';
import apiService from '../services/apiService';

export default function ICD10SearchDropdown({ 
  selectedCode, 
  onCodeSelect,
  placeholder = "Search ICD-10 diagnosis code...",
  disabled = false 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [popularCodes, setPopularCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Load popular codes on mount
  useEffect(() => {
    loadPopularCodes();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchCodes(query);
      }, 300); // 300ms debounce
    } else if (query.length === 0) {
      // Show popular codes when query is empty
      setResults(popularCodes);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, popularCodes]);

  const loadPopularCodes = async () => {
    try {
      console.log('📊 Loading popular ICD-10 codes...');
      const codes = await apiService.getPopularIcd10Codes(50);
      console.log(`✅ Loaded ${codes.length} popular codes`);
      setPopularCodes(codes);
      setResults(codes);
    } catch (error) {
      console.error('❌ Failed to load popular codes:', error);
    }
  };

  const searchCodes = async (searchQuery) => {
    setLoading(true);
    try {
      console.log(`🔍 Searching ICD-10 for: "${searchQuery}"`);
      const codes = await apiService.searchIcd10Codes(searchQuery, 100);
      console.log(`✅ Found ${codes.length} codes`);
      setResults(codes);
    } catch (error) {
      console.error('❌ ICD-10 search error:',  error);
      // Fallback to popular codes on error
      setResults(popularCodes);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCode = (code) => {
    console.log('✅ Selected ICD-10 code:', code.code, '-', code.short_description);
    // Call the callback first to ensure selection is registered
    onCodeSelect(code);
    // Clear state after a minimal delay to ensure event propagation completes
    setTimeout(() => {
      setQuery('');
      setShowDropdown(false);
      Keyboard.dismiss();
    }, 50);
  };

  const handleClearSelection = () => {
    console.log('🗑️ Clearing ICD-10 selection');
    // Reset dropdown state
    setQuery('');
    setResults(popularCodes);
    setShowDropdown(false);
    // Notify parent component
    onCodeSelect(null);
  };

  const handleFocus = () => {
    setShowDropdown(true);
    // Show popular codes if no query
    if (query.length === 0) {
      setResults(popularCodes);
    }
  };

  const handleBlur = () => {
    // Delay to allow tap on dropdown item
    setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  const renderCodeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectCode(item)}
      activeOpacity={0.7}
      delayPressIn={0}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultCode}>{item.code}</Text>
        <Text style={styles.resultDescription} numberOfLines={2}>
          {item.short_description}
        </Text>
        {item.usage_count > 0 && (
          <Text style={styles.usageCount}>
            Used {item.usage_count}x
          </Text>
        )}
      </View>
      <Text style={styles.resultArrow}>→</Text>
    </TouchableOpacity>
  );

  // If code is already selected, show it
  if (selectedCode) {
    return (
      <View style={styles.selectedContainer}>
        <View style={styles.selectedCard}>
          <View style={styles.selectedContent}>
            <Text style={styles.selectedLabel}>ICD-10 Code:</Text>
            <Text style={styles.selectedCode}>{selectedCode.code}</Text>
            <Text style={styles.selectedDescription} numberOfLines={2}>
              {selectedCode.short_description}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearSelection}
            disabled={disabled}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        ICD-10 Diagnosis Code <Text style={styles.optional}>(Optional)</Text>
      </Text>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#9ca3af"
        />
        {loading && (
          <ActivityIndicator 
            size="small" 
            color="#0f766e" 
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {/* Helper Text */}
      <Text style={styles.helperText}>
        Start typing to search by code or disease name
      </Text>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <View style={styles.dropdownContainer}>
          {/* Header */}
          {query.length === 0 && (
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>
                📊 Most Used Codes
              </Text>
            </View>
          )}

          {/* Results List */}
            <ScrollView 
              style={styles.resultsList}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="always"
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
            >
              {results.map((item) => (
                <View key={item.id || item.code}>
                  {renderCodeItem({ item })}
                </View>
              ))}
            </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    marginLeft: 4,
  },
  dropdownContainer: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  resultsList: {
    flexGrow: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultContent: {
    flex: 1,
  },
  resultCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 18,
  },
  usageCount: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  resultArrow: {
    fontSize: 18,
    color: '#0f766e',
    marginLeft: 8,
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  // Selected code styles
  selectedContainer: {
    marginBottom: 16,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  selectedContent: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 4,
  },
  selectedCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: 4,
  },
  selectedDescription: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 18,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
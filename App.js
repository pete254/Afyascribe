import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import TranscriptionScreen from './src/screens/TranscriptionScreen';
import SavedNotesScreen from './src/screens/SavedNotesScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('transcription');

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        {activeTab === 'transcription' ? (
          <TranscriptionScreen />
        ) : (
          <SavedNotesScreen />
        )}
      </View>
      
      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'transcription' && styles.activeTab]}
          onPress={() => setActiveTab('transcription')}
        >
          <Text style={styles.tabIcon}>🎙️</Text>
          <Text style={[styles.tabText, activeTab === 'transcription' && styles.activeTabText]}>
            Transcription
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={styles.tabIcon}>💾</Text>
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved Notes
          </Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    marginBottom: 80, // Make room for fixed tab bar
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 10,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: '#f1f5f9',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

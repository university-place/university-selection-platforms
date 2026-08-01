import React, { useState, useCallback } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function AppealsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetTab, setTargetTab] = useState<'MOE' | 'UNIVERSITY'>('MOE');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appealForm, setAppealForm] = useState({
    type: 'placement',
    description: '',
    target: 'MOE',
    preferenceId: '',
    universityId: ''
  });

  // Auto-fetch every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAppeals();
    }, [token])
  );

  const fetchAppeals = async (isRefresh = false) => {
    try {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const result = await apiClient.getAppeals(token);
      if (result.success) {
        setAppeals(result.data || []);
      } else {
        Alert.alert('Error', result.message || 'Failed to fetch appeals');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleSubmitAppeal = async () => {
    if (!appealForm.description || !appealForm.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (!token) return;
    setSubmitting(true);
    
    try {
      const data = {
        ...appealForm,
        target: targetTab,
      };
      
      const result = await apiClient.submitAppeal(token, data);
      
      if (result.success) {
        Alert.alert('Success', 'Appeal submitted successfully');
        setShowModal(false);
        setAppealForm({ type: 'placement', description: '', target: 'MOE', preferenceId: '', universityId: '' });
        fetchAppeals();
      } else {
        Alert.alert('Error', result.message || 'Failed to submit appeal');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading appeals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredAppeals = appeals.filter(a => a.target === targetTab);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAppeals(true)}
            colors={['#4f46e5']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Appeals</Text>
          <Text style={styles.subtitle}>Pull down to refresh · {appeals.length} total</Text>
        </View>

        {/* Target Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, targetTab === 'MOE' && styles.activeTab]}
            onPress={() => setTargetTab('MOE')}
          >
            <Text style={[styles.tabText, targetTab === 'MOE' && styles.activeTabText]}>
              MOE ({appeals.filter(a => a.target === 'MOE').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, targetTab === 'UNIVERSITY' && styles.activeTab]}
            onPress={() => setTargetTab('UNIVERSITY')}
          >
            <Text style={[styles.tabText, targetTab === 'UNIVERSITY' && styles.activeTabText]}>
              University ({appeals.filter(a => a.target === 'UNIVERSITY').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.actionRow}>
            <Text style={styles.sectionTitle}>
              {targetTab === 'MOE' ? 'Ministry of Education' : 'University Appeals'}
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
              <Text style={styles.addButtonText}>+ New Appeal</Text>
            </TouchableOpacity>
          </View>

          {filteredAppeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📢</Text>
              <Text style={styles.emptyStateTitle}>No Appeals Yet</Text>
              <Text style={styles.emptyStateText}>
                No appeals submitted to {targetTab === 'MOE' ? 'Ministry of Education' : 'a University'} yet.
              </Text>
            </View>
          ) : (
            filteredAppeals.map((appeal, index) => {
              const isMoe = appeal.target === 'MOE';
              const isResolved = appeal.status === 'resolved' || appeal.status === 'approved';
              const isRejected = appeal.status === 'rejected';
              return (
                <View key={appeal.id || index} style={styles.appealCard}>
                  {/* Header */}
                  <View style={styles.appealHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appealType}>
                        {(appeal.type || 'general').charAt(0).toUpperCase() + (appeal.type || 'general').slice(1)} Appeal
                      </Text>
                      <Text style={styles.appealDate}>
                        #{appeal.id} · {new Date(appeal.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      isResolved ? styles.statusApproved :
                      isRejected ? styles.statusRejected :
                      styles.statusPending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isResolved ? styles.statusTextApproved :
                        isRejected ? styles.statusTextRejected :
                        styles.statusTextPending
                      ]}>
                        {(appeal.status || 'pending').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Related info */}
                  {appeal.preference && (
                    <Text style={styles.appealMeta}>
                      📎 {appeal.preference.university?.name} — {appeal.preference.program?.name}
                    </Text>
                  )}
                  {!appeal.preference && appeal.university?.name && (
                    <Text style={styles.appealMeta}>🏫 {appeal.university.name}</Text>
                  )}

                  {/* Description */}
                  <Text style={styles.appealDescription}>"{appeal.description}"</Text>

                  {/* Pending */}
                  {!isResolved && !isRejected && (
                    <View style={styles.pendingBox}>
                      <Text style={styles.pendingText}>
                        ⏳ Under review by {isMoe ? 'Ministry of Education' : 'University'}
                      </Text>
                    </View>
                  )}

                  {/* Resolved response */}
                  {appeal.resolution && isResolved && (
                    <View style={[styles.responseBox, isMoe ? styles.responseBoxMoe : styles.responseBoxUniversity]}>
                      <Text style={[styles.responseLabel, isMoe ? styles.responseLabelMoe : styles.responseLabelUni]}>
                        ✓ {isMoe ? 'MOE Resolution' : `${appeal.university?.name || 'University'} Response`}:
                      </Text>
                      <Text style={styles.responseText}>{appeal.resolution}</Text>
                    </View>
                  )}

                  {/* Rejected response */}
                  {appeal.resolution && isRejected && (
                    <View style={styles.rejectedBox}>
                      <Text style={styles.rejectedLabel}>
                        ✗ Rejected by {isMoe ? 'MOE' : (appeal.university?.name || 'University')}:
                      </Text>
                      <Text style={styles.responseText}>{appeal.resolution}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Appeal Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit New Appeal</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Appeal Type *</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity 
                    style={[styles.typeOption, appealForm.type === 'placement' && styles.activeTypeOption]}
                    onPress={() => setAppealForm({...appealForm, type: 'placement'})}
                  >
                    <Text style={[styles.typeOptionText, appealForm.type === 'placement' && styles.activeTypeOptionText]}>Placement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeOption, appealForm.type === 'result' && styles.activeTypeOption]}
                    onPress={() => setAppealForm({...appealForm, type: 'result'})}
                  >
                    <Text style={[styles.typeOptionText, appealForm.type === 'result' && styles.activeTypeOptionText]}>Result</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.typeOption, appealForm.type === 'other' && styles.activeTypeOption]}
                    onPress={() => setAppealForm({...appealForm, type: 'other'})}
                  >
                    <Text style={[styles.typeOptionText, appealForm.type === 'other' && styles.activeTypeOptionText]}>Other</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {targetTab === 'UNIVERSITY' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>University ID (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={appealForm.universityId}
                    onChangeText={(val) => setAppealForm({...appealForm, universityId: val})}
                    placeholder="Enter University ID if applicable"
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={appealForm.description}
                  onChangeText={(val) => setAppealForm({...appealForm, description: val})}
                  placeholder="Explain your appeal in detail..."
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitAppeal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Appeal</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  header: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#4f46e5' },
  content: { padding: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  addButton: { backgroundColor: '#f97316', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 12 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  // Appeal card
  appealCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, borderWidth: 1, borderColor: '#e8e8e8' },
  appealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  appealType: { fontSize: 15, fontWeight: '700', color: '#111' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  statusPending: { backgroundColor: '#FFF8E1' },
  statusApproved: { backgroundColor: '#E8F5E9' },
  statusRejected: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusTextPending: { color: '#F57C00' },
  statusTextApproved: { color: '#2E7D32' },
  statusTextRejected: { color: '#C62828' },
  appealDate: { fontSize: 11, color: '#999', marginBottom: 6 },
  appealMeta: { fontSize: 13, color: '#4f46e5', marginBottom: 8, fontWeight: '500' },
  appealDescription: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 10, fontStyle: 'italic' },
  // Status boxes
  pendingBox: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  pendingText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  responseBox: { borderRadius: 10, padding: 12, marginTop: 6, borderLeftWidth: 3 },
  responseBoxMoe: { backgroundColor: '#f5f3ff', borderLeftColor: '#7c3aed' },
  responseBoxUniversity: { backgroundColor: '#eff6ff', borderLeftColor: '#2563eb' },
  responseLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  responseLabelMoe: { color: '#6d28d9' },
  responseLabelUni: { color: '#1d4ed8' },
  responseText: { fontSize: 13, color: '#333', lineHeight: 19 },
  rejectedBox: { backgroundColor: '#FFF1F2', borderRadius: 10, padding: 12, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#E11D48' },
  rejectedLabel: { fontSize: 11, fontWeight: '800', color: '#9F1239', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  closeModalText: { fontSize: 24, color: '#666', padding: 4 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#333' },
  textArea: { height: 120 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: 'transparent' },
  activeTypeOption: { backgroundColor: '#EDE9FE', borderColor: '#4f46e5' },
  typeOptionText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTypeOptionText: { color: '#4f46e5' },
  submitButton: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});


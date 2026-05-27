import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function AppealsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      if (!token) return;
      setLoading(true);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Appeals</Text>
          <Text style={styles.subtitle}>Submit and track your appeals</Text>
        </View>

        {/* Target Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, targetTab === 'MOE' && styles.activeTab]}
            onPress={() => setTargetTab('MOE')}
          >
            <Text style={[styles.tabText, targetTab === 'MOE' && styles.activeTabText]}>MOE Appeals</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, targetTab === 'UNIVERSITY' && styles.activeTab]}
            onPress={() => setTargetTab('UNIVERSITY')}
          >
            <Text style={[styles.tabText, targetTab === 'UNIVERSITY' && styles.activeTabText]}>University Appeals</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.actionRow}>
            <Text style={styles.sectionTitle}>
              {targetTab === 'MOE' ? 'Ministry of Education Appeals' : 'University Appeals'}
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.addButtonText}>+ New Appeal</Text>
            </TouchableOpacity>
          </View>

          {filteredAppeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📢</Text>
              <Text style={styles.emptyStateTitle}>No Appeals Found</Text>
              <Text style={styles.emptyStateText}>
                You have not submitted any appeals to {targetTab === 'MOE' ? 'MOE' : 'a University'} yet.
              </Text>
            </View>
          ) : (
            filteredAppeals.map((appeal, index) => (
              <View key={appeal.id || index} style={styles.appealCard}>
                <View style={styles.appealHeader}>
                  <Text style={styles.appealType}>
                    {appeal.type.charAt(0).toUpperCase() + appeal.type.slice(1)} Appeal
                  </Text>
                  <View style={[
                    styles.statusBadge, 
                    (appeal.status === 'approved' || appeal.status === 'resolved') ? styles.statusApproved : 
                    appeal.status === 'rejected' ? styles.statusRejected : 
                    styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusText,
                      (appeal.status === 'approved' || appeal.status === 'resolved') ? styles.statusTextApproved : 
                      appeal.status === 'rejected' ? styles.statusTextRejected : 
                      styles.statusTextPending
                    ]}>
                      {appeal.status || 'Pending'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.appealDate}>
                  {new Date(appeal.createdAt).toLocaleDateString()}
                </Text>
                
                {appeal.university?.name && (
                  <Text style={styles.appealMeta}>University: {appeal.university.name}</Text>
                )}
                
                <Text style={styles.appealDescription}>{appeal.description}</Text>
                
                {appeal.resolution && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Response:</Text>
                    <Text style={styles.responseText}>{appeal.resolution}</Text>
                  </View>
                )}
              </View>
            ))
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
  header: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#007AFF' },
  content: { padding: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  appealCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  appealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  appealType: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusApproved: { backgroundColor: '#E8F5E9' },
  statusRejected: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusTextPending: { color: '#F57C00' },
  statusTextApproved: { color: '#2E7D32' },
  statusTextRejected: { color: '#C62828' },
  appealDate: { fontSize: 12, color: '#666', marginBottom: 8 },
  appealMeta: { fontSize: 13, color: '#444', marginBottom: 8, fontStyle: 'italic' },
  appealDescription: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  responseBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#007AFF' },
  responseLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4 },
  responseText: { fontSize: 13, color: '#333', lineHeight: 18 },
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
  activeTypeOption: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
  typeOptionText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTypeOptionText: { color: '#007AFF' },
  submitButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

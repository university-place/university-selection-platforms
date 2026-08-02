import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { InvitationCard } from '@/components/InvitationCard';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function InvitationsScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for response
  const [submitting, setSubmitting] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const result = await apiClient.getProfile(token);
      if (result.success && result.data?.invitations) {
        setInvitations(result.data.invitations);
      } else {
        Alert.alert('Error', result.message || 'Failed to load invitations');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const result = await apiClient.respondToInvitation(token, invitationId, 'ACCEPTED');
      if (result.success) {
        Alert.alert('Success', '✅ You have accepted the invitation.');
        fetchData();
      } else {
        Alert.alert('Error', result.message || 'Failed to accept invitation');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineClick = (inv: any) => {
    setSelectedInvitation(inv);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const executeDecline = async () => {
    if (!token || !selectedInvitation) return;
    setSubmitting(true);
    try {
      const result = await apiClient.respondToInvitation(token, selectedInvitation.id, 'DECLINED', declineReason);
      if (result.success) {
        Alert.alert('Declined', '❌ You have declined the invitation.');
        setShowDeclineModal(false);
        fetchData();
      } else {
        Alert.alert('Error', result.message || 'Failed to decline invitation');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');
  const historyInvitations = invitations.filter(inv => inv.status !== 'PENDING');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading invitations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Invitations</Text>
        <Text style={styles.subtitle}>Interview & Exam invitations</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingInvitations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History ({historyInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {activeTab === 'pending' ? (
          // Pending Invitations
          pendingInvitations.length > 0 ? (
            pendingInvitations.map((invitation) => {
              const isExpired = invitation.responseDeadline && new Date(invitation.responseDeadline) < new Date();
              return (
                <InvitationCard
                  key={invitation.id}
                  universityName={invitation.university?.name || 'Unknown University'}
                  eventType={invitation.type || 'Interview'}
                  date={new Date(invitation.date).toLocaleDateString()}
                  time={new Date(invitation.date).toLocaleTimeString()}
                  location={invitation.location || 'Online'}
                  status={isExpired ? "Expired" : "Pending"}
                  showButtons={!isExpired}
                  onAccept={() => handleAccept(invitation.id)}
                  onDecline={() => handleDeclineClick(invitation)}
                />
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No pending invitations</Text>
            </View>
          )
        ) : (
          // History
          historyInvitations.length > 0 ? (
            historyInvitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                universityName={invitation.university?.name || 'Unknown University'}
                eventType={invitation.type || 'Interview'}
                date={new Date(invitation.date).toLocaleDateString()}
                time={new Date(invitation.date).toLocaleTimeString()}
                location={invitation.location || 'Online'}
                status={invitation.status}
                showButtons={new Date(invitation.responseDeadline) > new Date()}
                acceptText={invitation.status === 'DECLINED' ? 'Change to Accept' : 'Accept'}
                declineText={invitation.status === 'ACCEPTED' ? 'Change to Decline' : 'Decline'}
                onAccept={() => handleAccept(invitation.id)}
                onDecline={() => handleDeclineClick(invitation)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No invitation history</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Custom Decline Modal */}
      <Modal
        visible={showDeclineModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Invitation</Text>
              <Text style={styles.modalSubtitle}>{selectedInvitation?.university?.name}</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Are you sure you want to decline this invitation?
              </Text>
              
              <Text style={styles.label}>Reason (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Schedule conflict..."
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>ℹ️</Text>
                <Text style={styles.warningText}>
                  By declining, you will lose this opportunity. This action cannot be undone.
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeclineModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, submitting && { opacity: 0.7 }]}
                onPress={executeDecline}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmText}>
                  {submitting ? 'Processing...' : 'Yes, Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

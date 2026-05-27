import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function PlacementsScreen() {
  const { token } = useAuth();
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'decline' | null>(null);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    fetchPlacements();
  }, []);

  const fetchPlacements = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const result = await apiClient.getMyPlacements(token);
      if (result.success && result.placements) {
        setPlacements(result.placements);
      } else {
        Alert.alert('Error', result.message || 'Failed to load placements');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = (placement: any, action: 'confirm' | 'decline') => {
    setSelectedPlacement(placement);
    setConfirmAction(action);
    setApiError('');
    setShowConfirmModal(true);
  };

  const executeConfirm = async () => {
    if (!token || !selectedPlacement) return;
    setSubmitting(true);
    try {
      const result = await apiClient.confirmPlacement(token, selectedPlacement.id, confirmAction as string);
      if (result.success) {
        Alert.alert('Success', confirmAction === 'confirm' ? 'Offer accepted successfully' : 'Offer declined successfully');
        setShowConfirmModal(false);
        fetchPlacements();
      } else {
        setApiError(result.message || 'Failed to process request');
      }
    } catch (error: any) {
      setApiError(error.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysLeft = (deadline: string) => {
    const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading placement offers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Placement Offers</Text>
          <Text style={styles.subtitle}>Review and respond to your offers</Text>
        </View>

        {placements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No Placement Offers Yet</Text>
            <Text style={styles.emptySubtitle}>You haven&apos;t received any placement offers yet.</Text>
          </View>
        ) : (
          placements.map((placement) => {
            const daysLeft = getDaysLeft(placement.confirmationDeadline);
            const expired = isExpired(placement.confirmationDeadline);
            const canRespond = !expired && placement.status !== 'NOT_PLACED';

            return (
              <View key={placement.id} style={styles.card}>
                {/* Banner */}
                <View style={styles.cardBanner}>
                  <Text style={styles.universityName}>{placement.universityName}</Text>
                  <Text style={styles.universityRegion}>📍 {placement.universityRegion}</Text>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <View style={styles.programInfo}>
                      <Text style={styles.programName}>🎓 {placement.status === 'NOT_PLACED' ? 'Not Placed' : (placement.programName || 'Program not specified')}</Text>
                      {placement.status !== 'NOT_PLACED' && (
                        <Text style={styles.deadlineInfo}>
                          📅 Deadline: {placement.confirmationDeadline ? new Date(placement.confirmationDeadline).toLocaleDateString() : 'N/A'} 
                          {!expired && daysLeft > 0 && ` (${daysLeft} days left)`}
                        </Text>
                      )}
                    </View>
                    
                    <View style={[
                      styles.statusBadge,
                      placement.status === 'CONFIRMED' ? styles.statusConfirmed :
                      placement.status === 'DECLINED' ? styles.statusDeclined :
                      placement.status === 'NOT_PLACED' ? styles.statusNotPlaced :
                      expired ? styles.statusExpired : styles.statusPending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        placement.status === 'CONFIRMED' ? styles.statusTextConfirmed :
                        placement.status === 'DECLINED' ? styles.statusTextDeclined :
                        placement.status === 'NOT_PLACED' ? styles.statusTextNotPlaced :
                        expired ? styles.statusTextExpired : styles.statusTextPending
                      ]}>
                        {placement.status === 'NOT_PLACED' ? 'Not Placed' :
                         placement.status === 'CONFIRMED' ? 'Accepted' :
                         placement.status === 'DECLINED' ? 'Declined' :
                         expired ? 'Expired' : 'Pending Response'}
                      </Text>
                    </View>
                  </View>

                  {/* Message */}
                  <View style={[
                    styles.messageContainer, 
                    placement.status === 'NOT_PLACED' ? styles.messageNotPlaced : styles.messageNormal
                  ]}>
                    <Text style={[
                      styles.messageTitle,
                      placement.status === 'NOT_PLACED' ? styles.messageTitleError : styles.messageTitleSuccess
                    ]}>
                      {placement.status === 'NOT_PLACED' ? 'Selection Result' : 'Message from University'}
                    </Text>
                    <Text style={[
                      styles.messageText,
                      placement.status === 'NOT_PLACED' ? styles.messageTextError : styles.messageTextSuccess
                    ]}>
                      {placement.acceptanceMessage}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  {canRespond && placement.status !== 'NOT_PLACED' && (
                    <View style={styles.actionsRow}>
                      {placement.status !== 'CONFIRMED' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.acceptBtn]}
                          onPress={() => handleConfirmClick(placement, 'confirm')}
                          disabled={submitting}
                        >
                          <Text style={styles.acceptBtnText}>
                            {placement.status === 'DECLINED' ? 'Change to Accept' : 'Accept Offer'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {placement.status !== 'DECLINED' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.declineBtn]}
                          onPress={() => handleConfirmClick(placement, 'decline')}
                          disabled={submitting}
                        >
                          <Text style={styles.declineBtnText}>
                            {placement.status === 'CONFIRMED' ? 'Change to Decline' : 'Decline Offer'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Custom Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {confirmAction === 'confirm' ? 'Accept Offer' : 'Decline Offer'}
              </Text>
            </View>

            <View style={styles.modalBody}>
              {apiError ? (
                <View style={styles.globalErrorContainer}>
                  <Text style={styles.globalErrorText}>{apiError}</Text>
                </View>
              ) : null}

              <Text style={styles.modalText}>
                {confirmAction === 'confirm'
                  ? `Are you sure you want to accept the offer from ${selectedPlacement?.universityName}?`
                  : `Are you sure you want to decline the offer from ${selectedPlacement?.universityName}?`}
              </Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>ℹ️</Text>
                <Text style={styles.warningText}>
                  {confirmAction === 'confirm'
                    ? 'By accepting this offer, you will be committed to this university. This action cannot be undone.'
                    : 'By declining this offer, you will lose your spot at this university.'}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  confirmAction === 'confirm' ? styles.modalAcceptBg : styles.modalDeclineBg,
                  submitting && { opacity: 0.7 }
                ]}
                onPress={executeConfirm}
                disabled={submitting}
              >
                <Text style={styles.modalConfirmText}>
                  {submitting ? 'Processing...' : (confirmAction === 'confirm' ? 'Yes, Accept' : 'Yes, Decline')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardBanner: {
    backgroundColor: '#2563EB', // Blue 600
    padding: 20,
  },
  universityName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  universityRegion: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  programInfo: {
    flex: 1,
    paddingRight: 12,
  },
  programName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 6,
  },
  deadlineInfo: {
    fontSize: 13,
    color: '#687076',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusConfirmed: { backgroundColor: '#E8F5E9' },
  statusDeclined: { backgroundColor: '#FFEBEE' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusNotPlaced: { backgroundColor: '#FFEBEE' },
  statusExpired: { backgroundColor: '#F3F4F6' },
  
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextConfirmed: { color: '#2E7D32' },
  statusTextDeclined: { color: '#C62828' },
  statusTextPending: { color: '#E65100' },
  statusTextNotPlaced: { color: '#C62828' },
  statusTextExpired: { color: '#4B5563' },

  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  messageNormal: {
    backgroundColor: '#F0FDF4', // green-50
    borderColor: '#BBF7D0',
  },
  messageNotPlaced: {
    backgroundColor: '#FEF2F2', // red-50
    borderColor: '#FECACA',
  },
  messageTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageTitleSuccess: { color: '#166534' },
  messageTitleError: { color: '#991B1B' },
  
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextSuccess: { color: '#15803D' },
  messageTextError: { color: '#B91C1C' },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#16A34A', // green-600
  },
  declineBtn: {
    backgroundColor: '#DC2626', // red-600
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declineBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
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
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
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
  globalErrorContainer: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  globalErrorText: {
    color: '#dc3545',
    fontSize: 13,
    textAlign: 'center',
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAcceptBg: {
    backgroundColor: '#16A34A',
  },
  modalDeclineBg: {
    backgroundColor: '#DC2626',
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

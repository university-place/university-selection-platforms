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
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function ApplicationsScreen() {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<any[]>([]);
  const [submissionInfo, setSubmissionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<number | null>(null);
  
  // Edit Modal State
  const [editingPref, setEditingPref] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchData = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const result = await apiClient.getApplications(token);
      if (result.success) {
        setPreferences((result.applications || []).filter((p: any) => !p.isCancelled));
        if (result.submissionInfo) {
          setSubmissionInfo(result.submissionInfo);
        }
      } else {
        showAlert('Error', result.message || 'Failed to load preferences');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setSelectedUniversity(null);
    setSelectedProgram(null);
    setSelectedTrack(null);
    setPrograms([]);
    setTracks([]);
    setLoadingOptions(true);
    try {
      if (token) {
        const uRes = await apiClient.getUniversities(token);
        if (uRes.success) setUniversities(uRes.data.universities || uRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleUniversitySelect = async (uniId: number) => {
    setSelectedUniversity(uniId);
    setSelectedProgram(null);
    setSelectedTrack(null);
    if (!token) return;
    try {
      setLoadingOptions(true);
      const pRes = await apiClient.getPrograms(token, uniId);
      if (pRes.success) setPrograms(pRes.programs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAddPreference = async () => {
    if (!token || !selectedUniversity) {
      if (Platform.OS === 'web') window.alert('Please select a university');
      else Alert.alert('Error', 'Please select a university');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.addPreference(token, selectedUniversity, selectedProgram, selectedTrack);
      if (res.success) {
        if (Platform.OS === 'web') window.alert('Preference added successfully');
        else Alert.alert('Success', 'Preference added successfully');
        setShowAddModal(false);
        fetchData();
      } else {
        if (Platform.OS === 'web') window.alert(res.message || 'Failed to add preference');
        else Alert.alert('Error', res.message || 'Failed to add preference');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = async (pref: any) => {
    setEditingPref(pref);
    setSelectedProgram(pref.programId);
    setSelectedTrack(pref.admissionTrackId);
    setPrograms([]);
    setTracks([]);
    setShowEditModal(true);
    setLoadingOptions(true);

    try {
      if (token) {
        const pRes = await apiClient.getPrograms(token, pref.universityId);
        if (pRes.success) setPrograms(pRes.programs);

        if (pref.programId) {
          const tRes = await apiClient.getTracks(token, pref.programId);
          if (tRes.success) setTracks(tRes.tracks);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleProgramSelect = async (progId: number) => {
    setSelectedProgram(progId);
    setSelectedTrack(null);
    if (!token) return;
    try {
      setLoadingOptions(true);
      const tRes = await apiClient.getTracks(token, progId);
      if (tRes.success) setTracks(tRes.tracks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const saveEdit = async () => {
    if (!token || !editingPref) return;
    setSubmitting(true);
    try {
      const res = await apiClient.updatePreference(token, editingPref.id, selectedProgram, selectedTrack);
      if (res.success) {
        showAlert('Success', 'Preference updated successfully');
        setShowEditModal(false);
        fetchData();
      } else {
        showAlert('Error', res.message);
      }
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (prefId: number, name: string) => {
    const performCancel = async () => {
      if (!token) return;
      const res = await apiClient.deletePreference(token, prefId, 'Student cancelled via mobile app');
      if (res.success) {
        if (Platform.OS === 'web') window.alert('Application cancelled successfully');
        else Alert.alert('Success', 'Application cancelled successfully');
        fetchData();
      } else {
        if (Platform.OS === 'web') window.alert(res.message);
        else Alert.alert('Error', res.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to cancel your application to ${name}?`)) {
        performCancel();
      }
    } else {
      Alert.alert('Cancel Application', `Are you sure you want to cancel your application to ${name}?`, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: performCancel }
      ]);
    }
  };

  const handleSubmit = async (pref: any) => {
    if (!token) return;
    const remAttempts = pref.remainingAttempts !== undefined ? pref.remainingAttempts : 6;
    
    const performSubmit = async () => {
      setLoading(true);
      const res = await apiClient.submitPreference(token, pref.id);
      if (res.success) {
        if (Platform.OS === 'web') window.alert('Application submitted successfully');
        else Alert.alert('Success', 'Application submitted successfully');
        fetchData();
      } else {
        if (Platform.OS === 'web') window.alert(res.message);
        else Alert.alert('Error', res.message);
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Submit your application to ${pref.universityName}? Remaining attempts: ${remAttempts}`)) {
        performSubmit();
      }
    } else {
      Alert.alert('Submit Application', `Submit your application to ${pref.universityName}? Remaining attempts: ${remAttempts}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: performSubmit }
      ]);
    }
  };

  const handleUploadDocument = async (pref: any) => {
    if (!token) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoading(true);
        const uploadRes = await apiClient.uploadDocument(
          token,
          file.uri,
          file.name,
          file.mimeType || 'application/octet-stream',
          'OTHER', // Type
          'university', // Scope
          pref.universityId,
          (file as any).file // Add this for web support
        );
        if (uploadRes.success) {
          showAlert('Success', `Document uploaded for ${pref.universityName}`);
        } else {
          showAlert('Error', uploadRes.message);
        }
      }
    } catch (err: any) {
      showAlert('Upload Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Your Preferences</Text>
            <Text style={styles.subtitle}>{preferences.length} preference(s) added</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.fullWidthAddBtn} onPress={handleOpenAddModal}>
          <Ionicons name="add-circle" size={20} color="#FFF" style={{marginRight: 8}} />
          <Text style={styles.fullWidthAddBtnText}>Add New Preference</Text>
        </TouchableOpacity>
        {submissionInfo && (
          <View style={styles.attemptsBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
            <Text style={styles.attemptsBannerText}>
              Submission Attempts: {submissionInfo.attemptsUsed} of {submissionInfo.maxAttempts} used
            </Text>
          </View>
        )}
      </View>

      {/* Applications List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {preferences.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No preferences found.</Text>
          </View>
        ) : (
          preferences.map((pref, index) => {
            const isSubmitted = pref.status === 'SUBMITTED' || pref.status === 'UNDER_REVIEW' || pref.status === 'ACCEPTED' || pref.status === 'REJECTED';
            const isCancelled = pref.isCancelled;

            return (
              <View key={pref.id} style={[styles.card, isCancelled && styles.cardCancelled]}>
                <View style={styles.cardMainRow}>
                  {/* Left: Number circle */}
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>

                  {/* Middle: Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.uniRow}>
                      <Text style={styles.uniName}>{pref.universityName || 'Unknown University'}</Text>
                      {isSubmitted && (
                        <View style={styles.submittedBadge}>
                          <FontAwesome5 name="check-circle" size={12} color="#16A34A" />
                          <Text style={styles.submittedText}>Submitted</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.detailText}>
                      Program: {pref.programName || 'Not specified (University only)'}
                    </Text>
                    <Text style={styles.detailText}>
                      Track: {pref.admissionTrackName || 'Not specified (Default admission)'}
                    </Text>
                    
                    {/* Time / Status Info */}
                    <View style={styles.statusInfoContainer}>
                      <View style={styles.statusInfoRow}>
                        <Ionicons name="time-outline" size={16} color={isSubmitted ? "#10B981" : "#D97706"} />
                        <Text style={isSubmitted ? styles.deadlineClosed : styles.deadlineOpen}> Deadline: {pref.universityDeadline ? new Date(pref.universityDeadline).toLocaleDateString() : '5/26/2026'}</Text>
                      </View>
                      
                      {isSubmitted && (
                        <View style={styles.statusInfoRow}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                          <Text style={styles.submittedOnText}> Submitted on {pref.submittedAt ? new Date(pref.submittedAt).toLocaleString() : '5/20/2026'}</Text>
                          <View style={styles.attemptsBadge}>
                            <Ionicons name="checkmark" size={12} color="#10B981" />
                            <Text style={styles.attemptsBadgeText}> {pref.remainingAttempts !== undefined ? pref.remainingAttempts : 0} attempts left</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right/Bottom: Actions */}
                {!isCancelled && (
                  <View style={styles.cardActionsRow}>
                    <View style={styles.iconActionsRow}>
                      <TouchableOpacity onPress={() => handleEditClick(pref)} style={styles.actionIcon}>
                        <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleCancel(pref.id, pref.universityName || 'this university')} style={styles.actionIcon}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleUploadDocument(pref)} style={styles.actionIcon}>
                        <Ionicons name="push-outline" size={20} color="#8B5CF6" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.submitSection}>
                      <TouchableOpacity 
                        style={[styles.submitBtn, isSubmitted ? styles.submitBtnResubmit : styles.submitBtnNormal]}
                        onPress={() => handleSubmit(pref)}
                      >
                        {isSubmitted && <Ionicons name="return-down-back" size={16} color="#FFF" style={{marginRight: 4}} />}
                        <Text style={styles.submitBtnText}>
                          {isSubmitted ? `Resubmit` : 'Submit'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Preference</Text>
            {editingPref && <Text style={styles.modalSubtitle}>{editingPref.universityName}</Text>}
            
            {loadingOptions ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color="#007AFF" />
            ) : (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.label}>Select Program:</Text>
                {programs.length === 0 ? <Text style={styles.noDataText}>No programs available</Text> : null}
                {programs.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.optionBtn, selectedProgram === p.id && styles.optionBtnActive]}
                    onPress={() => handleProgramSelect(p.id)}
                  >
                    <Text style={[styles.optionText, selectedProgram === p.id && styles.optionTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}

                {selectedProgram && tracks.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Select Admission Track:</Text>
                    {tracks.map(t => (
                      <TouchableOpacity 
                        key={t.id} 
                        style={[styles.optionBtn, selectedTrack === t.id && styles.optionBtnActive]}
                        onPress={() => setSelectedTrack(t.id)}
                      >
                        <Text style={[styles.optionText, selectedTrack === t.id && styles.optionTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEdit} disabled={submitting}>
                <Text style={styles.modalSaveText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Preference</Text>
            <Text style={styles.modalSubtitle}>Select a university and program</Text>
            
            {loadingOptions ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color="#007AFF" />
            ) : (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.label}>Select University:</Text>
                {universities.length === 0 ? <Text style={styles.noDataText}>No universities available</Text> : null}
                {universities
                  .filter(u => !preferences.some(p => p.universityId === u.id))
                  .map(u => (
                  <TouchableOpacity 
                    key={u.id} 
                    style={[styles.optionBtn, selectedUniversity === u.id && styles.optionBtnActive]}
                    onPress={() => handleUniversitySelect(u.id)}
                  >
                    <Text style={[styles.optionText, selectedUniversity === u.id && styles.optionTextActive]}>{u.name}</Text>
                  </TouchableOpacity>
                ))}

                {selectedUniversity && programs.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Select Program:</Text>
                    {programs.map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={[styles.optionBtn, selectedProgram === p.id && styles.optionBtnActive]}
                        onPress={() => handleProgramSelect(p.id)}
                      >
                        <Text style={[styles.optionText, selectedProgram === p.id && styles.optionTextActive]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {selectedProgram && tracks.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>Select Admission Track:</Text>
                    {tracks.map(t => (
                      <TouchableOpacity 
                        key={t.id} 
                        style={[styles.optionBtn, selectedTrack === t.id && styles.optionBtnActive]}
                        onPress={() => setSelectedTrack(t.id)}
                      >
                        <Text style={[styles.optionText, selectedTrack === t.id && styles.optionTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveBtn, !selectedUniversity && {opacity: 0.5}]} 
                onPress={handleAddPreference} 
                disabled={submitting || !selectedUniversity}
              >
                <Text style={styles.modalSaveText}>{submitting ? 'Adding...' : 'Add Preference'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#687076' },
  fullWidthAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  fullWidthAddBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  attemptsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginTop: 12 },
  attemptsBannerText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  listContent: { padding: 20, paddingBottom: 40, gap: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#666', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#3B82F6', overflow: 'hidden' },
  cardCancelled: { opacity: 0.6 },
  cardMainRow: { flexDirection: 'row', padding: 16 },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16, marginTop: 4 },
  rankText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14 },
  cardContent: { flex: 1 },
  uniRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  uniName: { fontSize: 16, fontWeight: 'bold', color: '#11181C', marginRight: 8 },
  submittedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  submittedText: { color: '#16A34A', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  detailText: { fontSize: 13, color: '#4B5563', marginBottom: 4 },
  statusInfoContainer: { marginTop: 8 },
  statusInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  deadlineOpen: { fontSize: 12, color: '#D97706', marginLeft: 4 },
  deadlineClosed: { fontSize: 12, color: '#10B981', marginLeft: 4 },
  submittedOnText: { fontSize: 12, color: '#10B981', marginLeft: 4 },
  attemptsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  attemptsBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '600', marginLeft: 2 },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', padding: 12, backgroundColor: '#F9FAFB' },
  iconActionsRow: { flexDirection: 'row', gap: 12 },
  actionIcon: { padding: 8, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  submitSection: { alignItems: 'flex-end' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  submitBtnNormal: { backgroundColor: '#16A34A' },
  submitBtnResubmit: { backgroundColor: '#F59E0B' },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  attemptsLeftText: { fontSize: 11, color: '#9CA3AF' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  modalScroll: { flex: 1 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  noDataText: { color: '#999', fontStyle: 'italic', marginBottom: 10 },
  optionBtn: { padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  optionBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextActive: { color: '#1D4ED8', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#f5f5f5' },
  modalCancelText: { color: '#333', fontWeight: 'bold' },
  modalSaveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#007AFF' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
});


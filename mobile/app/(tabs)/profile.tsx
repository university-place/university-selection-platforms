import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
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
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, token, studentData } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      if (!token) {
        router.replace('/login');
        return;
      }

      setLoading(true);
      const result = await apiClient.getProfile(token);

      if (result.success) {
        setProfileData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
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
          'general', // Scope
          undefined,
          (file as any).file // Add this for web support
        );
        if (uploadRes.success) {
          Alert.alert('Success', `Your document has been successfully uploaded to your profile.`);
          fetchProfileData(); // refresh profile after upload
        } else {
          Alert.alert('Error', uploadRes.message);
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordClick = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const submitChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'New password and confirm password do not match');
      return;
    }
    if (!token) return;

    setChangingPassword(true);
    try {
      const res = await apiClient.changePassword(token, currentPassword, newPassword);
      if (res.success) {
        showAlert('Success', res.message || 'Password changed successfully');
        setShowPasswordModal(false);
      } else {
        showAlert('Error', res.message || 'Failed to change password');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'An error occurred');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout().then(() => {
          router.replace('/login');
        }).catch(() => {
          window.alert('Failed to logout');
        });
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profileData?.firstName 
    ? `${profileData.firstName} ${profileData.lastName || ''}` 
    : studentData?.firstName 
    ? `${studentData.firstName} ${studentData.lastName || ''}`
    : 'Student';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Profile Photo */}
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoIcon}>👤</Text>
          </View>

          {/* Basic Info */}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.examId}>{profileData?.examID || studentData?.examID || 'N/A'}</Text>

          {/* Info Grid */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profileData?.email || studentData?.email || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profileData?.phone || studentData?.phone || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region</Text>
              <Text style={styles.infoValue}>{profileData?.region || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stream</Text>
              <Text style={styles.infoValue}>{profileData?.stream || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Score</Text>
              <Text style={styles.infoValue}>{profileData?.totalScore || 'N/A'}</Text>
            </View>
            {profileData?.subjects && profileData.subjects.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Subjects ({profileData.subjects.length})</Text>
                  <Text style={styles.infoValue}>{profileData.subjects.map((s: any) => s.name).join(', ')}</Text>
                </View>
              </>
            )}

            {/* Custom Attributes */}
            {profileData?.customAttributes && Object.keys(profileData.customAttributes).length > 0 && (
              <>
                {Object.entries(profileData.customAttributes).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                      <Text style={styles.infoValue}>{String(value)}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </>
            )}
          </View>

          {/* Application Status */}
          {profileData?.applications && profileData.applications.length > 0 && (
            <View style={styles.statusSection}>
              <Text style={styles.statusTitle}>Applications ({profileData.applications.length})</Text>
              {profileData.applications.slice(0, 3).map((app: any, idx: number) => (
                <Text key={idx} style={styles.statusText}>
                  {app.university?.name || 'Unknown University'} - {app.status || 'Pending'}
                </Text>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUploadDocument}>
              <Text style={styles.primaryBtnText}>📄 Upload Document</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleChangePasswordClick}>
              <Text style={styles.secondaryBtnText}>🔒 Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn} 
                onPress={submitChangePassword} 
                disabled={changingPassword}
              >
                <Text style={styles.modalSaveText}>{changingPassword ? 'Saving...' : 'Change Password'}</Text>
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
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#E3F2FD',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoIcon: {
    fontSize: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 4,
  },
  examId: {
    fontSize: 12,
    color: '#687076',
    marginBottom: 20,
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#11181C',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  statusSection: {
    width: '100%',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryBtnText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutBtnText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, paddingTop: 16, marginTop: 'auto' },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#f5f5f5' },
  modalCancelText: { color: '#333', fontWeight: 'bold' },
  modalSaveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#007AFF' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
});

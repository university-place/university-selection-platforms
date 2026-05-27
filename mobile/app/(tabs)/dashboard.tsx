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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { JourneyCard } from '@/components/JourneyCard';
import { StatItem } from '@/components/StatItem';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import * as DocumentPicker from 'expo-document-picker';

export default function DashboardScreen() {
  const router = useRouter();
  const { token, studentData, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuExpanded, setMenuExpanded] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!token) {
        router.replace('/login');
        return;
      }

      setLoading(true);
      const result = await apiClient.getDashboardData(token);

      if (result.success) {
        setDashboardData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load dashboard data');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    Alert.alert('Coming Soon', `${action} feature will be available soon`);
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        try {
          setMenuExpanded(false);
          await logout();
          router.replace('/login');
        } catch (error) {
          window.alert('Failed to logout');
        }
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              setMenuExpanded(false);
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

  const handleUploadGeneralDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLoading(true);
        if (token) {
          const uploadRes = await apiClient.uploadDocument(
            token,
            file.uri,
            file.name,
            file.mimeType || 'application/octet-stream',
            'OTHER',
            'general',
            undefined,
            (file as any).file
          );
          if (uploadRes.success) {
            Alert.alert('Success', 'General document uploaded successfully');
            fetchDashboardData();
          } else {
            Alert.alert('Error', uploadRes.message);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: '📊', label: 'Dashboard', onPress: () => { setMenuExpanded(false); } },
    { icon: '👤', label: 'Profile & Documents', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/profile'); } },
    { icon: '📝', label: 'Exam Results', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/exam-results'); } },
    { icon: '🎓', label: 'Universities', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/universities'); } },
    { icon: '❤️', label: 'My Preferences', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/applications'); } },
    { icon: '📢', label: 'Appeals', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/appeals'); } },
    { icon: '💬', label: 'My Invitations', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/invitations'); } },
    { icon: '🏆', label: 'My Placement Offers', onPress: () => { setMenuExpanded(false); router.push('/(tabs)/placements'); } },
    { icon: '🚪', label: 'Logout', onPress: handleLogout },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = dashboardData?.firstName 
    ? `${dashboardData.firstName} ${dashboardData.lastName || ''}`
    : studentData?.firstName
    ? `${studentData.firstName} ${studentData.lastName || ''}`
    : 'Student';

  const examId = dashboardData?.examID || studentData?.examID || 'N/A';
  const examScore = dashboardData?.totalScore || dashboardData?.examScore || studentData?.totalScore || 0;
  const preferencesCount = dashboardData?.applications?.length || 0;
  const invitationsCount = dashboardData?.invitations?.length || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Student Info */}
        <View style={styles.header}>
          <View style={styles.studentCard}>
            <View style={styles.studentPhotoPlaceholder}>
              <Text style={styles.photoEmoji}>👤</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{displayName}</Text>
              <Text style={styles.studentExamId}>{examId}</Text>
            </View>
            <TouchableOpacity onPress={() => setMenuExpanded(!menuExpanded)}>
              <Text style={styles.menuIcon}>{menuExpanded ? '✕' : '☰'}</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>
            {displayName} • {examId}
          </Text>
        </View>

        {/* Your Application Journey */}
        {dashboardData?.applications && dashboardData.applications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Applications</Text>
            <View style={styles.applicationsList}>
              {dashboardData.applications.slice(0, 3).map((app: any, idx: number) => (
                <View key={idx} style={styles.applicationCard}>
                  <Text style={styles.appUniversity}>{app.university?.name || 'Unknown'}</Text>
                  <Text style={styles.appProgram}>{app.program?.name || 'Program'}</Text>
                  <View style={[styles.appStatus, { backgroundColor: app.status === 'ACCEPTED' ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={[styles.appStatusText, { color: app.status === 'ACCEPTED' ? '#2E7D32' : '#F57C00' }]}>
                      {app.status || 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.section}>
          <View style={styles.statsHeader}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Exam Score</Text>
              <Text style={[styles.statValue, { color: '#007AFF' }]}>{examScore}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Applications</Text>
              <Text style={[styles.statValue, { color: '#34C759' }]}>{preferencesCount}</Text>
            </View>
          </View>

          <View style={styles.statsHeader}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Invitations</Text>
              <Text style={[styles.statValue, { color: '#9C27B0' }]}>{invitationsCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Stream</Text>
              <Text style={[styles.statValue, { color: '#FF9500', fontSize: 16 }]}>
                {dashboardData?.stream || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Invitations */}
        {dashboardData?.invitations && dashboardData.invitations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Invitations</Text>
            {dashboardData.invitations.slice(0, 3).map((inv: any, idx: number) => (
              <View key={idx} style={styles.invitationCard}>
                <Text style={styles.invUniversity}>{inv.university?.name || 'Unknown University'}</Text>
                <Text style={styles.invType}>{inv.type || 'Interview'} - {inv.date ? new Date(inv.date).toLocaleDateString() : 'TBD'}</Text>
                <View style={[styles.invStatus, { backgroundColor: inv.status === 'CONFIRMED' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.invStatusText, { color: inv.status === 'CONFIRMED' ? '#2E7D32' : '#F57C00' }]}>
                    {inv.status || 'Pending Response'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('Upload Documents')}
          >
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel}>Upload Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('Find Universities')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Find Universities</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleQuickAction('Manage Preferences')}
          >
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.actionLabel}>Manage Preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleUploadGeneralDocument}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Upload General Documents</Text>
          </TouchableOpacity>
        </View>

        {/* Extra Spacing */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Full Screen Overlay Menu */}
      {menuExpanded && (
        <View style={styles.fullScreenMenu}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>🎓 Student Portal</Text>
              <TouchableOpacity onPress={() => setMenuExpanded(false)}>
                <Text style={styles.menuCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.fullScreenMenuItem}
                  onPress={item.onPress}
                >
                  <Text style={styles.fullScreenMenuItemIcon}>{item.icon}</Text>
                  <Text style={styles.fullScreenMenuItemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    padding: 16,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  studentPhotoPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#E3F2FD',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoEmoji: {
    fontSize: 29,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  studentExamId: {
    fontSize: 14,
    color: '#666',
  },
  menuIcon: {
    fontSize: 26,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  fullScreenMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
    zIndex: 1000,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  menuCloseIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  fullScreenMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  fullScreenMenuItemIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  fullScreenMenuItemLabel: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '600',
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeTitle: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  applicationsList: {
    gap: 10,
  },
  applicationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  appUniversity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appProgram: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  appStatus: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  appStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invitationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
    marginBottom: 10,
  },
  invUniversity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  invType: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  invStatus: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  invStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  journeyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 29,
    fontWeight: 'bold',
  },
  documentStatus: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusDot: {
    fontSize: 10,
    color: '#FF9500',
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionLabel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});


import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Feather, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, token, studentData } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout().then(() => router.replace('/login')).catch(() => window.alert('Failed to logout'));
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

  const comingSoon = () => Alert.alert('Coming Soon', 'This feature is currently under development.');

  const toggleSwitch = () => setIsDarkMode(previousState => !previousState);

  const displayName = profileData?.firstName 
    ? `${profileData.firstName} ${profileData.lastName || ''}` 
    : studentData?.firstName 
    ? `${studentData.firstName} ${studentData.lastName || ''}`
    : 'Student User';
    
  const examId = profileData?.examID || studentData?.examID || 'EXM-XXXX-XXX';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>Profile</Text>
        <View style={styles.headerRight}>
          <Feather name="moon" size={24} color={isDarkMode ? "#fff" : "#111"} />
          <Switch
            trackColor={{ false: "#D1D1D6", true: "#34C759" }}
            thumbColor={"#fff"}
            ios_backgroundColor="#D1D1D6"
            onValueChange={toggleSwitch}
            value={isDarkMode}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            <Text style={styles.userAvatarText}>{displayName.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, isDarkMode && styles.darkText]}>{displayName}</Text>
            <Text style={styles.userExamId}>Exam ID: {examId}</Text>
          </View>
        </View>

        {/* Transaction History */}
        <TouchableOpacity style={[styles.menuItem, isDarkMode && styles.darkMenuItem]} onPress={comingSoon}>
          <View style={[styles.iconContainer, { backgroundColor: '#F0F8FF' }]}>
            <MaterialCommunityIcons name="history" size={24} color="#007AFF" />
          </View>
          <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Transaction History</Text>
          <Feather name="chevron-right" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        {/* Verification Section */}
        <Text style={styles.sectionTitle}>Verification</Text>
        <View style={[styles.sectionGroup, isDarkMode && styles.darkSectionGroup]}>
          <TouchableOpacity style={styles.groupedMenuItem} onPress={comingSoon}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <MaterialCommunityIcons name="shield-account-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>National ID Verification</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={[styles.divider, isDarkMode && styles.darkDivider]} />
          <TouchableOpacity style={styles.groupedMenuItem} onPress={comingSoon}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="ribbon" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Program Certifications</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={[styles.sectionGroup, isDarkMode && styles.darkSectionGroup]}>
          <TouchableOpacity style={styles.groupedMenuItem} onPress={comingSoon}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Feather name="user" size={24} color="#FF9800" />
            </View>
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Edit Profile</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={[styles.divider, isDarkMode && styles.darkDivider]} />
          <TouchableOpacity style={styles.groupedMenuItem} onPress={comingSoon}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
              <Feather name="settings" size={24} color="#03A9F4" />
            </View>
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Setting and Privacy</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={[styles.divider, isDarkMode && styles.darkDivider]} />
          <TouchableOpacity style={styles.groupedMenuItem} onPress={comingSoon}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Feather name="life-buoy" size={24} color="#F44336" />
            </View>
            <Text style={[styles.menuItemText, isDarkMode && styles.darkText]}>Help and Support</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Session Section */}
        <Text style={styles.sectionTitle}>Session</Text>
        <View style={[styles.sectionGroup, isDarkMode && styles.darkSectionGroup]}>
          <TouchableOpacity style={styles.groupedMenuItem} onPress={handleLogout}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Feather name="power" size={24} color="#F44336" />
            </View>
            <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            <Feather name="chevron-right" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkText: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  userAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  userExamId: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 8,
    marginTop: 24,
    textTransform: 'capitalize',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  darkMenuItem: {
    backgroundColor: '#1C1C1E',
  },
  sectionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  darkSectionGroup: {
    backgroundColor: '#1C1C1E',
  },
  groupedMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  logoutText: {
    color: '#F44336',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C7C7CC',
    marginLeft: 72, // Aligns with text
  },
  darkDivider: {
    backgroundColor: '#38383A',
  }
});

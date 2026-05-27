import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

export default function ExamResultsScreen() {
  const { token } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const result = await apiClient.getProfile(token);
      if (result.success) {
        setProfileData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load exam results');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading exam results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const examResults = profileData?.examResults || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Exam Results</Text>
          <Text style={styles.subtitle}>Official national examination scores</Text>
        </View>

        {/* Main Score Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View>
              <Text style={styles.bannerLabel}>EXAMINATION STREAM</Text>
              <Text style={styles.bannerStream}>{profileData?.stream || 'N/A'}</Text>
            </View>
            <Text style={styles.bannerIcon}>🎗️</Text>
          </View>
          <View style={styles.bannerBottom}>
            <Text style={styles.bannerLabel}>TOTAL SCORE</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.totalScore}>{profileData?.totalScore || 0}</Text>
              <Text style={styles.maxScore}>/ {(profileData?.subjects?.length || 7) * 100}</Text>
            </View>
          </View>
        </View>

        {/* Subject Performance Breakdown */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>Subject Performance Breakdown</Text>
        </View>

        <View style={styles.grid}>
          {profileData?.subjects?.map((subj: any, index: number) => (
            <View key={index} style={styles.subjectCard}>
              <View style={styles.cardBgDeco} />
              <Text style={styles.subjectName}>{subj.name.toUpperCase()}</Text>
              <View style={styles.subjectScoreContainer}>
                <Text style={styles.subjectScore}>{String(subj.score)}</Text>
                <Text style={styles.ptsText}>pts</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    fontSize: 32,
    fontWeight: '900',
    color: '#11181C',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#687076',
    marginTop: 4,
    fontWeight: '500',
  },
  banner: {
    backgroundColor: '#2563EB', // Blue 600
    borderRadius: 24,
    padding: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 32,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  bannerStream: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bannerIcon: {
    fontSize: 32,
    opacity: 0.8,
  },
  bannerBottom: {
    marginTop: 40,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalScore: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  maxScore: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionIndicator: {
    width: 6,
    height: 24,
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#11181C',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  subjectCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBgDeco: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    backgroundColor: '#EFF6FF', // Blue 50
    borderRadius: 30,
  },
  subjectName: {
    color: '#A0AEC0',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    zIndex: 1,
  },
  subjectScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  subjectScore: {
    fontSize: 28,
    fontWeight: '900',
    color: '#11181C',
    letterSpacing: -1,
  },
  ptsText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
    marginBottom: 4,
  },
});

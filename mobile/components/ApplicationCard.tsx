import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStatusColor } from '@/constants/mockData';

interface ApplicationCardProps {
  universityName: string;
  program: string;
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'WAITLISTED';
  decisionDate?: string;
  message?: string;
}

export function ApplicationCard({
  universityName,
  program,
  status,
  decisionDate,
  message,
}: ApplicationCardProps) {
  const colors = getStatusColor(status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.university}>{universityName}</Text>
          <Text style={styles.program}>{program}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{status}</Text>
        </View>
      </View>

      {decisionDate && (
        <View style={styles.footer}>
          <Text style={styles.date}>{decisionDate}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  university: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  program: {
    fontSize: 14,
    color: '#687076',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#687076',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
});

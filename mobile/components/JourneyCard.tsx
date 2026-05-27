import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface JourneyCardProps {
  title: string;
  status: string;
  statusColor: string;
  icon: string;
  isCurrent?: boolean;
}

export function JourneyCard({ title, status, statusColor, icon, isCurrent }: JourneyCardProps) {
  return (
    <View style={[styles.container, isCurrent && styles.currentCard]}>
      <View style={[styles.iconContainer, { backgroundColor: statusColor + '15' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  currentCard: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
});

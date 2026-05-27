import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatItemProps {
  title: string;
  value: string;
  icon: string;
  bgColor: string;
  valueColor: string;
}

export function StatItem({ title, value, icon, bgColor, valueColor }: StatItemProps) {
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  title: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

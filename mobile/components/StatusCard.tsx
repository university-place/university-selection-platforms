import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatCard {
  title: string;
  count: number;
  color: string;
  bgColor: string;
}

export function StatusCard({ title, count, color, bgColor }: StatCard) {
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={[styles.title, { color }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

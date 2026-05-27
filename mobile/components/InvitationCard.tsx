import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InvitationCardProps {
  universityName: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  status?: 'Pending' | 'ACCEPTED' | 'DECLINED' | 'PENDING' | string;
  showButtons?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  acceptText?: string;
  declineText?: string;
}

export function InvitationCard({
  universityName,
  eventType,
  date,
  time,
  location,
  status,
  showButtons = false,
  onAccept,
  onDecline,
  acceptText = 'Accept',
  declineText = 'Decline',
}: InvitationCardProps) {
  const statusColor =
    status === 'ACCEPTED' ? '#34C759' : status === 'DECLINED' ? '#FF3B30' : '#FF9500';

  const handleAccept = () => {
    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.university}>{universityName}</Text>
          <Text style={styles.eventType}>{eventType}</Text>
        </View>
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Date & Time:</Text>
          <Text style={styles.detailValue}>
            {date} • {time}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Location:</Text>
          <Text style={styles.detailValue}>{location}</Text>
        </View>
      </View>

      {showButtons && (
        <View style={styles.buttonContainer}>
          {status !== 'ACCEPTED' && (
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptBtnText}>{acceptText}</Text>
            </TouchableOpacity>
          )}
          {status !== 'DECLINED' && (
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
              <Text style={styles.declineBtnText}>{declineText}</Text>
            </TouchableOpacity>
          )}
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
  university: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 14,
    color: '#687076',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#687076',
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 12,
    color: '#11181C',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

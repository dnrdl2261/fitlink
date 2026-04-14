import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Certification } from '../types';
import { COLORS } from '../utils/constants';

interface CertificationBadgeProps {
  cert: Certification;
}

export default function CertificationBadge({ cert }: CertificationBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🏅</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{cert.name}</Text>
          {cert.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>인증</Text>
            </View>
          )}
        </View>
        <Text style={styles.issuer}>{cert.issuer}</Text>
        <Text style={styles.date}>{cert.issuedDate} 취득</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124,110,232,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  issuer: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

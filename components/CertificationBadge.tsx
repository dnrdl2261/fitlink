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
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
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
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  verifiedText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  issuer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});

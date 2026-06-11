import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { GROUP_CAT_COLOR } from '../../data/community';
import { useCommunityStore } from '../../store/communityStore';

export default function CommunityGroupScreen() {
  const { groupId, from, returnPostId } = useLocalSearchParams<{ groupId: string; from?: string; returnPostId?: string }>();
  const router = useRouter();
  const { groups, joinedGroups, toggleJoinGroup } = useCommunityStore();

  const group = groups.find((g) => g.id === groupId);
  const isJoined = joinedGroups.includes(groupId ?? '');

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>모임을 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = GROUP_CAT_COLOR[group.category] ?? '#888';
  const fillPct = Math.min((group.memberCount / group.maxMembers) * 100, 100);

  const handleJoin = () => {
    if (!group.isRecruiting && !isJoined) {
      if (Platform.OS === 'web') {
        alert('모집이 마감된 모임입니다.');
      } else {
        Alert.alert('마감', '모집이 마감된 모임입니다.');
      }
      return;
    }

    const action = isJoined ? '탈퇴' : '가입';
    const msg = isJoined
      ? `"${group.name}" 모임에서 탈퇴하시겠습니까?`
      : `"${group.name}" 모임에 가입하시겠습니까?`;

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) toggleJoinGroup(group.id);
    } else {
      Alert.alert(action, msg, [
        { text: '취소', style: 'cancel' },
        { text: action, onPress: () => toggleJoinGroup(group.id) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(member)/community' as any)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>모임 상세</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: group.imageUrl }} style={styles.coverImage} />

        <View style={styles.infoSection}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.catText, { color: catColor }]}>{group.category}</Text>
          </View>
          <Text style={styles.groupName}>{group.name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{group.location}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-multiple" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{group.memberCount} / {group.maxMembers}명</Text>
            </View>
            <View style={[
              styles.recruitTag,
              { backgroundColor: group.isRecruiting ? '#E8F5E9' : '#F5F5F5' },
            ]}>
              <Text style={[
                styles.recruitText,
                { color: group.isRecruiting ? '#2E7D32' : COLORS.textSecondary },
              ]}>
                {group.isRecruiting ? '모집 중' : '마감'}
              </Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${fillPct}%` as any, backgroundColor: catColor }]} />
            </View>
            <Text style={styles.progressText}>{group.memberCount}명 참여 중</Text>
          </View>
        </View>

        <View style={styles.descSection}>
          <Text style={styles.descTitle}>모임 소개</Text>
          <Text style={styles.descContent}>{group.description}</Text>
        </View>

        <View style={styles.joinWrap}>
          <TouchableOpacity
            style={[
              styles.joinBtn,
              isJoined && styles.joinBtnLeave,
              !group.isRecruiting && !isJoined && styles.joinBtnDisabled,
            ]}
            onPress={handleJoin}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isJoined ? 'account-minus' : 'account-plus'}
              size={20}
              color={(!group.isRecruiting && !isJoined) ? COLORS.textSecondary : '#fff'}
            />
            <Text style={[
              styles.joinBtnText,
              !group.isRecruiting && !isJoined && { color: COLORS.textSecondary },
            ]}>
              {isJoined ? '모임 탈퇴' : !group.isRecruiting ? '모집 마감' : '모임 가입'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 15, color: COLORS.textSecondary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 32, fontWeight: '300', color: COLORS.text, lineHeight: 36 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },

  coverImage: { width: '100%', height: 200 },

  infoSection: {
    backgroundColor: COLORS.surface,
    padding: 20, gap: 10,
    borderBottomWidth: 8, borderBottomColor: COLORS.background,
  },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 12, fontWeight: '700' },
  groupName: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 14, color: COLORS.textSecondary },
  recruitTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  recruitText: { fontSize: 12, fontWeight: '700' },

  progressWrap: { gap: 6 },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textSecondary },

  descSection: {
    backgroundColor: COLORS.surface,
    padding: 20, gap: 12, marginTop: 8,
  },
  descTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  descContent: { fontSize: 15, color: COLORS.text, lineHeight: 24 },

  joinWrap: { padding: 20 },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  joinBtnLeave: { backgroundColor: COLORS.border },
  joinBtnDisabled: { backgroundColor: COLORS.border },
  joinBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});

import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useBlockStore } from '../store/blockStore';

/**
 * 내가 차단한 사용자 id 목록.
 *
 * 차단하면 상대의 게시글·댓글·채팅이 내 화면에서 보이지 않아야 한다(Apple Guideline 1.2).
 * 화면마다 같은 필터를 쓰므로 여기로 모았다.
 *
 * ⚠️ zustand 셀렉터 안에서 filter 하면 매번 새 배열이라 무한 재렌더가 난다.
 *    반드시 원본을 구독하고 useMemo로 파생할 것.
 */
export function useBlockedIds(): string[] {
  const myId = useAuthStore((s) => s.member?.id ?? s.trainer?.id ?? s.gymAdmin?.id ?? '');
  const blocks = useBlockStore((s) => s.blocks);
  return useMemo(
    () => (myId ? blocks.filter((b) => b.blockerId === myId).map((b) => b.blockedId) : []),
    [blocks, myId],
  );
}

/** 차단 목록에 걸리는지 (id가 없으면 통과 — 작성자 미상 데이터 보호) */
export function isBlockedBy(blockedIds: string[], userId?: string): boolean {
  return !!userId && blockedIds.includes(userId);
}

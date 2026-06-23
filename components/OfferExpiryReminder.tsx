import { useEffect } from 'react';
import { useOfferStore } from '../store/offerStore';
import { useNotificationStore } from '../store/notificationStore';

// 회원 진입 시 마감 임박(D-2 이하) 재등록 제안이 있으면 1회 알림 발송.
// 백엔드 스케줄러 없이도 동작하도록 클라이언트에서 체크하며, expiryReminded로 중복 방지.
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const REMIND_WITHIN_DAYS = 2;

export default function OfferExpiryReminder({ userId }: { userId: string }) {
  const offers = useOfferStore((s) => s.offers);
  const markReminded = useOfferStore((s) => s.markExpiryReminded);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!userId) return;
    const today = todayStr();
    offers.forEach((o) => {
      if (o.memberId !== userId || o.status !== '제안' || o.expiryReminded || !o.expiresAt) return;
      const daysLeft = Math.ceil((new Date(o.expiresAt).getTime() - new Date(today).getTime()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= REMIND_WITHIN_DAYS) {
        markReminded(o.id);
        addNotification({
          type: 'trainer_proposal',
          title: '⏰ 재등록 제안 마감 임박',
          body: `${o.trainerName} 트레이너의 ${o.sessionCount}회 맞춤 제안이 ${daysLeft === 0 ? '오늘' : `${daysLeft}일 뒤`} 마감돼요. 내 패키지에서 확인하세요.`,
          targetRole: 'member',
          userId,
          meta: {},
        });
      }
    });
  }, [offers, userId]);

  return null;
}

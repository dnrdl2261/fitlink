// 금액 포맷 (한국 원화)
export function formatPrice(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

// 날짜 포맷 (YYYY-MM-DD → YYYY년 MM월 DD일)
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${month}월 ${day}일`;
}

// 시간 포맷 (HH:MM → 오전/오후 H시 MM분)
export function formatTime(timeStr: string): string {
  const [hourStr, minute] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  if (hour < 12) {
    return `오전 ${hour === 0 ? 12 : hour}시 ${minute !== '00' ? minute + '분' : ''}`.trim();
  }
  return `오후 ${hour === 12 ? 12 : hour - 12}시 ${minute !== '00' ? minute + '분' : ''}`.trim();
}

// 날짜 + 시간 포맷
export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(timeStr)}`;
}

// 경력 연수 포맷
export function formatExperience(years: number): string {
  return `${years}년 경력`;
}

// 상대 날짜 포맷 (오늘, 어제, n일 전)
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

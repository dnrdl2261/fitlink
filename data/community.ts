export type FeedCat = '전체' | '운동팁' | '식단' | '인증샷' | '질문' | '자유' | '쇼츠';
export type GroupCat = '전체' | '운동' | '다이어트' | '아웃도어' | '자기계발';

export interface Post {
  id: string;
  category: Exclude<FeedCat, '전체'>;
  title: string;
  content: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  location: string;
  timeAgo: string;
  views: number;
  likes: number;
  comments: number;
  imageUrl?: string;
  isVideo?: boolean;
  videoUrl?: string;
  relatedGroupId?: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  content: string;
  timeAgo: string;
  likes: number;
}

export interface Group {
  id: string;
  category: Exclude<GroupCat, '전체'>;
  name: string;
  description: string;
  location: string;
  memberCount: number;
  maxMembers: number;
  isRecruiting: boolean;
  imageUrl: string;
}

export const CAT_COLOR: Record<string, string> = {
  운동팁: '#5B5FD6',
  식단: '#00B494',
  인증샷: '#FF6B6B',
  질문: '#FF9500',
  자유: '#888888',
  쇼츠: '#FF2D55',
};

export const GROUP_CAT_COLOR: Record<string, string> = {
  운동: '#FF6B6B',
  다이어트: '#FF9500',
  아웃도어: '#00B494',
  자기계발: '#5B5FD6',
};

export const FEED_CATS: FeedCat[] = ['전체', '운동팁', '식단', '인증샷', '질문', '자유', '쇼츠'];
export const GROUP_CATS: GroupCat[] = ['전체', '운동', '다이어트', '아웃도어', '자기계발'];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'p1', category: '인증샷',
    title: '오늘 벤치프레스 100kg 달성!! 🎉',
    content: '드디어 목표했던 100kg 찍었습니다!\n\n6개월 동안 꾸준히 했더니 되네요. 처음엔 60kg도 못 들었는데 정말 감격스럽습니다.\n\n비결은 단순해요. 주 3회 벤치 + 보조운동(딥스, 케이블 플라이) 빠지지 않고 했고, 식단은 단백질 위주로 하루 180g 이상 챙겼습니다. 다들 포기하지 마세요!',
    author: '헬스왕김철수', authorId: 'member_002', location: '강남구', timeAgo: '5시간 전',
    views: 1243, likes: 89, comments: 3,
    imageUrl: 'https://picsum.photos/seed/bench100/400/300',
  },
  {
    id: 'p2', category: '운동팁',
    title: '데드리프트 폼 꿀팁 — 허리 안 다치는 법',
    content: '많은 분들이 데드리프트 하다가 허리를 다치는데, 핵심 포인트 정리해드립니다.\n\n1. 바 잡기 전 엉덩이를 뒤로 빼고 가슴을 앞으로 내밀어 척추를 중립으로 만드세요.\n2. 숨을 크게 들이쉬고 복압을 꽉 잡은 상태에서 들어올립니다.\n3. 바가 정강이를 스치듯 올라와야 허리에 부담이 없습니다.\n4. 무게는 폼이 무너지지 않는 선에서만 올리세요.\n\n저도 처음에 허리 삐끗한 경험이 있는데, 이 포인트 지키고 나서 한 번도 안 다쳤습니다.',
    author: '이지수', authorId: 'trainer_002', location: '서초구', timeAgo: '10시간 전',
    views: 582, likes: 34, comments: 2,
  },
  {
    id: 'p3', category: '쇼츠',
    title: '30분 홈트 전신 루틴 📹',
    content: '장비 없이 집에서 할 수 있는 전신 운동 루틴입니다!\n\n초보자도 따라할 수 있도록 구성했어요.\n\n루틴:\n- 버피 10개 × 3세트\n- 플랭크 1분 × 3세트\n- 스쿼트 20개 × 3세트\n- 마운틴 클라이머 30초 × 3세트\n- 푸쉬업 15개 × 3세트\n\n세트 사이 휴식 1분. 주 3-4회 꾸준히 하면 3개월 안에 눈에 보이는 변화가 옵니다!',
    author: '김민준', authorId: 'trainer_001', location: '마포구', timeAgo: '1일 전',
    views: 2341, likes: 156, comments: 5,
    imageUrl: 'https://picsum.photos/seed/homegym30/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    relatedGroupId: 'g4',
  },
  {
    id: 'p4', category: '식단',
    title: '다이어트 중 단백질 섭취 방법 총정리',
    content: '다이어트 중 근손실 없이 체중을 빼려면 단백질이 핵심입니다.\n\n체중 1kg당 1.5~2g의 단백질을 섭취하는 게 목표예요.\n\n좋은 단백질 소스:\n- 닭가슴살 (100g당 23g)\n- 두부 (100g당 8g)\n- 달걀흰자 (1개당 3.6g)\n- 그릭 요거트 (100g당 10g)\n- 참치캔 (1캔 135g당 28g)\n\n단백질 쉐이크도 좋지만 음식으로 먼저 채우고 부족한 부분만 보충하는 걸 추천합니다.',
    author: '홍길동', authorId: 'member_001', location: '송파구', timeAgo: '8시간 전',
    views: 347, likes: 21, comments: 1,
  },
  {
    id: 'p5', category: '인증샷',
    title: '3개월 체중감량 전후 사진 공유 💪 83→69kg',
    content: '3개월 만에 83kg에서 69kg으로 14kg 감량 성공했습니다!\n\n방법:\n- 하루 1800kcal 칼로리 제한\n- 유산소: 매일 30분 러닝 또는 사이클\n- 웨이트: 주 3회 전신 운동\n- 술, 야식, 밀가루 완전 끊기\n\n솔직히 처음 2주가 제일 힘들었어요. 그 고비만 넘기면 몸이 적응합니다. 궁금한 거 뭐든 댓글 달아주세요!',
    author: '다이어터성공', authorId: 'member_003', location: '은평구', timeAgo: '2일 전',
    views: 3102, likes: 234, comments: 8,
    imageUrl: 'https://picsum.photos/seed/beforeafter33/400/300',
  },
  {
    id: 'p6', category: '자유',
    title: '헬스장 민폐 행동들 모아봤어요 😅',
    content: '헬스장 다니면서 제일 불편한 행동들 공유해봅니다 ㅋㅋ\n\n1. 기구 점유하고 폰만 보기 (20분째...)\n2. 땀 닦지 않고 기구 그냥 두기\n3. 거울 앞에서 사진 찍으면서 다른 사람 막기\n4. 너무 큰 소리로 통화하기\n5. 무게 원판 제자리에 안 돌려놓기\n\n여러분이 제일 싫은 행동은 뭔가요? 댓글로 공유해요!',
    author: '헬스러버', authorId: 'member_004', location: '영등포구', timeAgo: '4시간 전',
    views: 1567, likes: 102, comments: 7,
  },
  {
    id: 'p7', category: '운동팁',
    title: '스쿼트할 때 무릎 통증 없애는 법',
    content: '스쿼트 할 때 무릎이 아프신 분들 주목!\n\n대부분의 원인은 무릎이 발끝 방향과 다르게 안쪽으로 무너지는 "니인(knee cave)" 현상입니다.\n\n해결책:\n1. 발 너비를 어깨 너비 또는 조금 넓게 서세요\n2. 발끝을 약 15~30도 바깥으로 향하게 하세요\n3. 무릎을 발끝 방향으로 밀어내면서 내려가세요\n4. 엉덩이를 뒤로 빼는 느낌으로 앉으세요\n\n이것만 지켜도 무릎 통증 90%는 해결됩니다.',
    author: '이지수', authorId: 'trainer_002', location: '관악구', timeAgo: '6시간 전',
    views: 891, likes: 67, comments: 3,
  },
  {
    id: 'p8', category: '식단',
    title: '린매스 벌크업 식단 공유 (4000kcal)',
    content: '벌크업 중인 분들을 위한 하루 식단 공유합니다.\n\n아침 (800kcal):\n- 귀리 100g + 바나나 1개 + 달걀 3개\n\n점심 (1200kcal):\n- 현미밥 200g + 닭가슴살 200g + 샐러드\n\n간식 (500kcal):\n- 단백질 쉐이크 + 견과류\n\n저녁 (1200kcal):\n- 고구마 150g + 소고기 150g + 브로콜리\n\n자기 전 (300kcal):\n- 카제인 단백질 + 우유\n\n탄수화물 50%, 단백질 30%, 지방 20% 비율 유지하세요.',
    author: '박철수', authorId: 'trainer_003', location: '성동구', timeAgo: '12시간 전',
    views: 512, likes: 44, comments: 2,
  },
  {
    id: 'p9', category: '쇼츠',
    title: '5분 코어 운동 루틴 — 매일 하세요 🔥',
    content: '출근 전 5분만 투자해도 복근을 만들 수 있는 루틴입니다.\n\n매일 아침 일어나서 바로 실천해보세요!\n\n- 플랭크 60초\n- 크런치 20개\n- 레그레이즈 15개\n- 사이드 플랭크 30초 × 양쪽\n\n총 5분! 중간에 쉬지 말고 연속으로 하세요.',
    author: '김민준', authorId: 'trainer_001', location: '강동구', timeAgo: '3일 전',
    views: 4821, likes: 312, comments: 6,
    imageUrl: 'https://picsum.photos/seed/core5min/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
    relatedGroupId: 'g2',
  },
  {
    id: 'p10', category: '질문',
    title: '헬스 3개월차 — 루틴 추천해주세요',
    content: '안녕하세요! 헬스 시작한 지 3개월 됐습니다.\n\n지금 PPL(Push Pull Legs) 루틴으로 주 6회 운동하고 있는데 너무 힘들어서 지속이 어려워요 ㅠㅠ\n\n체중은 70kg이고 목표는 근육량 늘리기입니다.\n\n3개월차 초보자한테 맞는 루틴이 뭔가요? 전신 운동이 낫나요 아니면 분할이 나을까요?',
    author: '헬스초보', authorId: 'member_005', location: '노원구', timeAgo: '2시간 전',
    views: 189, likes: 5, comments: 4,
  },
  {
    id: 'p11', category: '자유',
    title: '운동 전 커피 마시는 사람 있어요?',
    content: '저는 운동 30분 전에 아메리카노 한 잔 마시면 집중력이랑 지구력이 눈에 띄게 올라가더라고요.\n\n카페인이 운동 수행 능력을 향상시켜준다는 연구도 많다고 하던데...\n\n혹시 프리워크아웃 음료 대신 커피 마시는 분 계신가요? 어느 정도 마시면 적당할까요?',
    author: '홍길동', authorId: 'member_001', location: '동대문구', timeAgo: '3시간 전',
    views: 423, likes: 31, comments: 2,
  },
  {
    id: 'p12', category: '운동팁',
    title: '풀업 0개 → 10개 만든 방법 (6주)',
    content: '철봉을 하나도 못 했던 제가 6주 만에 10개까지 늘린 방법 공개합니다!\n\n1~2주차: 네거티브 풀업 (천천히 내려오기) 5세트\n3~4주차: 밴드 보조 풀업 5세트 + 네거티브 3세트\n5~6주차: 맨몸 풀업 최대 반복 5세트\n\n보조 운동:\n- 렛 풀다운: 주 2회\n- 시티드 케이블 로우: 주 2회\n\n포기하지 말고 매주 1개씩 늘린다는 목표로 하세요!',
    author: '최유진', authorId: 'trainer_004', location: '마포구', timeAgo: '5일 전',
    views: 2198, likes: 178, comments: 3,
    imageUrl: 'https://picsum.photos/seed/pullup6w/400/300',
  },
  {
    id: 'p13', category: '쇼츠',
    title: '한강 10km 러닝 인증 🏃‍♀️',
    content: '오늘 한강에서 10km 완주! 날씨가 너무 좋아서 발걸음이 절로 빨라졌어요. 같이 달릴 분들 모여요 💨',
    author: '다이어터성공', authorId: 'member_003', location: '마포구', timeAgo: '2시간 전',
    views: 1820, likes: 94, comments: 12,
    imageUrl: 'https://picsum.photos/seed/running10k/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    relatedGroupId: 'g1',
  },
  {
    id: 'p14', category: '쇼츠',
    title: '등 넓이 운동 루틴 — 광배근 공략 💪',
    content: '랫풀다운 → 바벨로우 → 케이블 로우 3종 세트! 꾸준히 하면 등이 날개처럼 펴져요. 루틴 공유합니다.',
    author: '박철수', authorId: 'trainer_003', location: '강남구', timeAgo: '5시간 전',
    views: 3210, likes: 187, comments: 23,
    imageUrl: 'https://picsum.photos/seed/backworkout/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
    relatedGroupId: 'g6',
  },
  {
    id: 'p15', category: '쇼츠',
    title: '10분 전신 스트레칭 루틴 — 운동 전 필수! 🧘',
    content: '운동 전 이 스트레칭만 해도 부상 50% 예방 가능해요. 가동성 높이고 더 효율적으로 운동하세요!',
    author: '이지수', authorId: 'trainer_002', location: '서초구', timeAgo: '1일 전',
    views: 5440, likes: 331, comments: 45,
    imageUrl: 'https://picsum.photos/seed/stretching15/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    relatedGroupId: 'g8',
  },
  {
    id: 'p16', category: '쇼츠',
    title: '크로스핏 WOD — 오늘의 운동 소개 🔥',
    content: '버피 20개 + 로프 클라임 5회 + 박스점프 15개. 20분 안에 끝내기 도전! 초보자도 스케일링 가능해요.',
    author: '정태양', authorId: 'trainer_005', location: '연수구', timeAgo: '3일 전',
    views: 2890, likes: 156, comments: 31,
    imageUrl: 'https://picsum.photos/seed/crossfit16/400/600',
    isVideo: true,
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
    relatedGroupId: 'g7',
  },
];

export const INITIAL_COMMENTS: Comment[] = [
  { id: 'c1', postId: 'p1', author: '운동초보', content: '대박이에요!! 저도 100kg 목표로 하고 있는데 자극받고 갑니다 💪', timeAgo: '4시간 전', likes: 5 },
  { id: 'c2', postId: 'p1', author: '헬스마니아', content: '100kg 달성 축하드려요! 보조운동 세부 루틴도 알려주실 수 있나요?', timeAgo: '3시간 전', likes: 3 },
  { id: 'c3', postId: 'p1', author: 'PT선생님', content: '폼은 잘 유지하셨나요? 100kg 무게에서는 어깨 부상 조심하세요!', timeAgo: '2시간 전', likes: 8 },

  { id: 'c4', postId: 'p2', author: '데드입문자', content: '정말 도움됐어요. 항상 허리 걱정했는데 이 포인트 꼭 지켜볼게요!', timeAgo: '8시간 전', likes: 4 },
  { id: 'c5', postId: 'p2', author: '파워리프터', content: '복압 잡는 게 제일 중요하더라고요. 벨트도 도움이 많이 돼요.', timeAgo: '6시간 전', likes: 6 },

  { id: 'c6', postId: 'p3', author: '집돌이', content: '오늘 따라해봤는데 버피에서 완전 죽었어요 ㅋㅋㅋ 좋은 루틴 감사합니다!', timeAgo: '22시간 전', likes: 12 },
  { id: 'c7', postId: 'p3', author: '홈트시작', content: '영상 너무 좋아요! 다음 편도 올려주세요 🙏', timeAgo: '20시간 전', likes: 7 },
  { id: 'c8', postId: 'p3', author: '운동맘', content: '아이 재우고 따라하기 딱 좋은 루틴이에요. 감사합니다!', timeAgo: '18시간 전', likes: 9 },
  { id: 'c9', postId: 'p3', author: '다이어터', content: '몇 주 정도 해야 변화가 생기나요?', timeAgo: '15시간 전', likes: 2 },
  { id: 'c10', postId: 'p3', author: '김민준', authorId: 'trainer_001', content: '@다이어터 꾸준히 하면 4주 정도면 체력 변화 느껴지실 거예요!', timeAgo: '14시간 전', likes: 5 },

  { id: 'c11', postId: 'p4', author: '단백질충', content: '닭가슴살 매일 먹기 너무 힘든데 두부로 대체해도 괜찮을까요?', timeAgo: '6시간 전', likes: 3 },

  { id: 'c12', postId: 'p5', author: '자극받음', content: '진짜 대단하세요!! 저도 도전해봐야겠어요', timeAgo: '1일 전', likes: 15 },
  { id: 'c13', postId: 'p5', author: '다이어트중', content: '술 완전히 끊는 게 제일 어렵던데 어떻게 하셨어요?', timeAgo: '1일 전', likes: 8 },
  { id: 'c14', postId: 'p5', author: '다이어터성공', authorId: 'member_003', content: '@다이어트중 처음 2주만 참으면 생각보다 안 당기더라고요. 대신 탄산수로 대체했어요!', timeAgo: '22시간 전', likes: 11 },
  { id: 'c15', postId: 'p5', author: '헬린이', content: '운동은 어떤 것 위주로 하셨어요?', timeAgo: '20시간 전', likes: 3 },
  { id: 'c16', postId: 'p5', author: '식단도사', content: '14kg 감량이면 정말 대단한 의지력이에요 👏', timeAgo: '18시간 전', likes: 6 },
  { id: 'c17', postId: 'p5', author: '운동짱', content: '전후 사진 차이 실화인가요?? 정말 바뀌셨네요!', timeAgo: '16시간 전', likes: 9 },
  { id: 'c18', postId: 'p5', author: '나도할수있어', content: '따라해볼게요!! 응원합니다 🔥', timeAgo: '10시간 전', likes: 4 },
  { id: 'c19', postId: 'p5', author: '다이어터2', content: '칼로리 계산 앱은 어떤 거 쓰셨어요?', timeAgo: '8시간 전', likes: 2 },

  { id: 'c20', postId: 'p6', author: '헬스10년', content: '무게 원판 안 돌려놓는 거 정말 최악이에요 ㅠㅠ', timeAgo: '3시간 전', likes: 14 },
  { id: 'c21', postId: 'p6', author: '피트니스맘', content: '거울 앞 셀카 찍으면서 다른 사람 막는 거 완전 공감...', timeAgo: '2시간 전', likes: 11 },
  { id: 'c22', postId: 'p6', author: '근육맨', content: '통화 크게 하는 거 너무 불편해요. 이어폰 끼고 하면 되는데 ㅋㅋ', timeAgo: '1시간 전', likes: 8 },
  { id: 'c23', postId: 'p6', author: '청결제일', content: '땀 닦지 않는 거 진짜 너무해요. 매너 좀!', timeAgo: '30분 전', likes: 19 },
  { id: 'c24', postId: 'p6', author: '헬스초보2', content: '저는 기구 어떻게 써야 하는지 몰라서 눈치 보이는 게 제일 힘들어요 ㅋㅋ', timeAgo: '20분 전', likes: 5 },
  { id: 'c25', postId: 'p6', author: '트레이너박', content: '사실 초보자분들이 조용히 물어봐도 다 알려드리는데 너무 눈치 보지 않아도 돼요!', timeAgo: '10분 전', likes: 22 },
  { id: 'c26', postId: 'p6', author: '헬스광', content: '여기 추가: 크게 소리 지르면서 드는 분들... 집중 방해돼요 😅', timeAgo: '5분 전', likes: 7 },

  { id: 'c27', postId: 'p7', author: '무릎아픈', content: '이거 보고 자세 바꿨더니 진짜 통증이 줄었어요!! 감사합니다 🙏', timeAgo: '5시간 전', likes: 17 },
  { id: 'c28', postId: 'p7', author: '물리치료사', content: '좋은 정보네요. 추가로 힙힌지 동작을 함께 익히면 더 도움됩니다!', timeAgo: '3시간 전', likes: 8 },
  { id: 'c29', postId: 'p7', author: '스쿼트입문', content: '혹시 발 너비는 어느 정도가 적당한가요?', timeAgo: '1시간 전', likes: 2 },

  { id: 'c30', postId: 'p8', author: '린매스', content: '저도 벌크업 중인데 참고할게요! 탄단지 비율이 핵심이군요', timeAgo: '10시간 전', likes: 6 },
  { id: 'c31', postId: 'p8', author: '먹보', content: '4000kcal 먹으려니 밥 먹는 것도 일이네요 ㅋㅋ', timeAgo: '8시간 전', likes: 9 },

  { id: 'c32', postId: 'p9', author: '5분챌린지', content: '오늘부터 시작! 30일 후 인증하러 돌아올게요 💪', timeAgo: '2일 전', likes: 24 },
  { id: 'c33', postId: 'p9', author: '복근원해', content: '플랭크 1분이 넘 힘드네요... 처음엔 30초부터 시작해도 될까요?', timeAgo: '2일 전', likes: 8 },
  { id: 'c34', postId: 'p9', author: '김민준', authorId: 'trainer_001', content: '@복근원해 물론이죠! 30초부터 시작해서 매주 5초씩 늘려나가세요 😊', timeAgo: '2일 전', likes: 15 },
  { id: 'c35', postId: 'p9', author: '매일운동', content: '한 달째 하고 있는데 배가 좀 당겨지는 느낌이 나요!', timeAgo: '1일 전', likes: 11 },
  { id: 'c36', postId: 'p9', author: '아침운동', content: '아침에 일어나서 바로 하기 넘 힘든데 어떻게 동기부여 하세요?', timeAgo: '20시간 전', likes: 5 },
  { id: 'c37', postId: 'p9', author: '김민준', authorId: 'trainer_001', content: '@아침운동 알람 소리를 운동 영상으로 설정해보세요! 눈 뜨자마자 보게 돼요 ㅎㅎ', timeAgo: '19시간 전', likes: 18 },

  { id: 'c38', postId: 'p10', author: 'PT트레이너', content: '3개월차면 아직 초보! 주 3회 전신 운동으로 시작하는 게 훨씬 낫습니다. PPL은 중급자 이상에게 맞아요.', timeAgo: '1시간 전', likes: 21 },
  { id: 'c39', postId: 'p10', author: '운동3년차', content: '저도 처음엔 PPL 했다가 번아웃 왔어요. 주3회 전신으로 바꾸니까 오히려 근성장이 더 잘 되더라고요!', timeAgo: '45분 전', likes: 13 },
  { id: 'c40', postId: 'p10', author: '헬스코치', content: '3개월차는 신체가 운동에 적응하는 시기예요. 일단 3-4분할로 주 4회 해보세요!', timeAgo: '30분 전', likes: 9 },
  { id: 'c41', postId: 'p10', author: '경험자', content: 'SL5×5 같은 선형 증량 프로그램 추천드려요. 기초 근력 쌓는 데 최고예요.', timeAgo: '15분 전', likes: 7 },

  { id: 'c42', postId: 'p11', author: '카페인연구', content: '카페인 섭취 45-60분 전이 운동 수행 능력 최적화에 좋다고 해요!', timeAgo: '2시간 전', likes: 11 },
  { id: 'c43', postId: 'p11', author: '프리워크아웃', content: '저는 커피 대신 프리워크아웃 먹는데 훨씬 강력하더라고요 ㅋㅋ 근데 잠을 못 자서 큰일이에요 😅', timeAgo: '1시간 전', likes: 8 },

  { id: 'c44', postId: 'p12', author: '풀업도전', content: '저도 지금 0개인데 이 방법 따라해볼게요! 6주 후 인증할게요 💪', timeAgo: '4일 전', likes: 13 },
  { id: 'c45', postId: 'p12', author: '밴드있음', content: '밴드 사이즈는 어느 정도가 적당한가요? 처음엔 두꺼운 거 써야 하나요?', timeAgo: '3일 전', likes: 4 },
  { id: 'c46', postId: 'p12', author: '최유진', authorId: 'trainer_004', content: '@밴드있음 처음엔 저항력 높은 두꺼운 밴드(20-40kg급)로 시작해서 점점 얇은 걸로 바꿔가세요!', timeAgo: '3일 전', likes: 9 },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'g1', category: '운동',
    name: '강남 새벽 러닝 크루 🌅',
    description: '매일 새벽 6시 강남역 10번 출구에서 출발하는 러닝 모임입니다.\n\n5km 코스로 한강까지 달리고 돌아옵니다. 페이스는 6~7분/km 사이로 편안하게 달려요.\n\n초보자도 환영! 같이 달리면 훨씬 즐거워요. 카카오톡 오픈채팅으로 참여 신청해주세요.',
    location: '강남구', memberCount: 23, maxMembers: 30, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/running1/200/200',
  },
  {
    id: 'g2', category: '다이어트',
    name: '30대 다이어트 챌린지 🔥',
    description: '30대들의 체중 감량 프로젝트!\n\n매일 식단과 운동 인증을 하고 서로 응원하는 모임입니다. 함께하면 더 오래 지속할 수 있어요.\n\n규칙:\n1. 매일 저녁 식단 인증\n2. 주 3회 이상 운동 인증\n3. 월 1회 오프라인 만남\n\n목표 달성 시 소정의 상품도 있어요!',
    location: '서울 전체', memberCount: 47, maxMembers: 50, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/diet30/200/200',
  },
  {
    id: 'g3', category: '아웃도어',
    name: '주말 등산 헬스 클럽 ⛰️',
    description: '매주 토요일 서울 근교 산행을 함께 하는 모임입니다.\n\n등산은 유산소 운동에도 좋고 하체 근력에도 훌륭한 운동이에요.\n\n코스: 북한산, 도봉산, 청계산, 관악산 등 번갈아 가며\n출발: 매주 토요일 오전 8시\n등산 후 맛집 탐방도 함께 해요 😋',
    location: '서울', memberCount: 31, maxMembers: 40, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/hiking99/200/200',
  },
  {
    id: 'g4', category: '자기계발',
    name: '홈트 100일 챌린지 💪',
    description: '100일 동안 매일 30분 이상 홈트레이닝을 인증하는 모임!\n\n강력한 의지가 필요합니다. 중간에 포기하면 퇴출될 수 있어요 😤\n\n인증 방법: 매일 운동 영상 또는 사진 업로드\n\n100일 완주자에게는 단체 티셔츠 선물 예정!',
    location: '전국', memberCount: 128, maxMembers: 200, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/100day/200/200',
  },
  {
    id: 'g5', category: '아웃도어',
    name: '부산 해변 러닝 🏄',
    description: '해운대 해변을 달리는 러닝 모임입니다!\n\n바닷바람 맞으며 달리면 스트레스 확 풀려요.\n\n매주 일요일 오전 7시 해운대 해수욕장 앞 집합\n러닝 후 해변 카페에서 브런치도 함께해요.',
    location: '해운대구', memberCount: 19, maxMembers: 25, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/busan55/200/200',
  },
  {
    id: 'g6', category: '운동',
    name: '헬스 입문자 모임 🏋️',
    description: '헬스 처음 시작하는 분들끼리 모이는 모임입니다.\n\n눈치 없이 질문하고, 서로 피드백 주고받으며 함께 성장해요.\n\n매주 수요일 저녁 7시 수원 인계동 헬스장에서 만나요.\n기구 사용법, 기초 루틴 등 같이 배웁니다!',
    location: '수원시', memberCount: 34, maxMembers: 30, isRecruiting: false,
    imageUrl: 'https://picsum.photos/seed/begingym/200/200',
  },
  {
    id: 'g7', category: '운동',
    name: '인천 크로스핏 모임 💥',
    description: '주 3회 크로스핏 WOD(오늘의 운동)를 함께 소화하는 모임입니다.\n\n중급자 이상 환영. 기초 동작(스쿼트, 데드리프트, 클린 등)을 알고 계셔야 해요.\n\n화/목/토 오전 6시 30분 인천 연수구 크로스핏 박스에서 만나요.',
    location: '연수구', memberCount: 15, maxMembers: 20, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/crossfit7/200/200',
  },
  {
    id: 'g8', category: '다이어트',
    name: '간헐적 단식 챌린지 ⏰',
    description: '16:8 간헐적 단식을 함께 도전하는 모임!\n\n매일 식단 인증과 서로 응원을 통해 꾸준히 유지해요.\n\n단식 시간: 오후 8시 ~ 다음날 정오 (16시간)\n식사 시간: 정오 ~ 오후 8시 (8시간)\n\n함께하면 의지력이 2배!',
    location: '전국', memberCount: 89, maxMembers: 100, isRecruiting: true,
    imageUrl: 'https://picsum.photos/seed/fasting8/200/200',
  },
];

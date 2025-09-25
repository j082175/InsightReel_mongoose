/**
 * 🎨 공통 포맷팅 유틸리티 함수들
 * VideoCard에서 분리된 재사용 가능한 포맷팅 함수들
 */

/**
 * 조회수를 한국어 형식으로 포맷팅
 * @param num - 조회수 숫자
 * @returns 포맷된 문자열 (예: 1000 → "1천", 10000 → "1만", 100000000 → "1억")
 */
export const formatViews = (num: number): string => {
  if (num >= 100000000) {
    // 1억 이상: 소수점 1자리까지 표시
    const billions = num / 100000000;
    return billions % 1 === 0
      ? billions.toFixed(0) + '억'
      : billions.toFixed(1) + '억';
  }
  if (num >= 10000) {
    // 1만 이상: 소수점 1자리까지 표시 (단, 정수면 소수점 생략)
    const tenThousands = num / 10000;
    return tenThousands % 1 === 0
      ? tenThousands.toFixed(0) + '만'
      : tenThousands.toFixed(1) + '만';
  }
  if (num >= 1000) return (num / 1000).toFixed(1) + '천';
  return num.toLocaleString();
};

/**
 * 날짜를 사용자 친화적 형식으로 포맷팅
 * 한국어 날짜와 ISO 날짜 형식을 모두 지원
 * @param dateString - 날짜 문자열
 * @returns 포맷된 날짜 문자열
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '날짜 없음';

  // 한국어 날짜 형식 처리 ('2025. 9. 9. 오전 5:37:21' 등)
  if (dateString.includes('오전') || dateString.includes('오후')) {
    const timeMatch = dateString.match(
      /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})/
    );
    if (timeMatch) {
      const [, , month, day, ampm, hour, minute] = timeMatch;
      return `${month.padStart(2, '0')}.${day.padStart(2, '0')} ${ampm}${hour}:${minute.padStart(2, '0')}`;
    }

    // 시간 정보가 없는 경우 날짜만
    const dateMatch = dateString.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (dateMatch) {
      const [, , month, day] = dateMatch;
      return `${month.padStart(2, '0')}. ${day.padStart(2, '0')}`;
    }
  }

  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch (e) {
    console.warn('날짜 파싱 실패:', dateString);
  }

  // 파싱 실패 시 원본 문자열에서 날짜 부분만 추출 시도
  const dateMatch = dateString.match(/(\d{1,2})[./](\d{1,2})/);
  if (dateMatch) {
    const [, month, day] = dateMatch;
    return `${month}. ${day}`;
  }

  return '날짜 확인 필요';
};

/**
 * 영상 길이를 한국어 라벨로 변환
 * @param duration - 영상 길이 코드
 * @returns 한국어 라벨
 */
export const getDurationLabel = (duration: string): string => {
  switch (duration) {
    case 'SHORT':
      return '숏폼';
    case 'MID':
      return '미드폼';
    case 'LONG':
      return '롱폼';
    default:
      return duration;
  }
};

/**
 * 상대적 시간 표시 (예: "2일 전", "1주일 전")
 * @param dateString - 날짜 문자열
 * @returns 상대적 시간 문자열
 */
export const getRelativeTime = (dateString: string): string => {
  if (!dateString) return '알 수 없음';

  try {
    const now = new Date();
    const uploadTime = new Date(dateString);

    if (isNaN(uploadTime.getTime())) return '날짜 오류';

    const diffMs = now.getTime() - uploadTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;

    // 일 단위일 때 추가 시간 정보 포함
    if (diffDays < 7) {
      const remainingHours = diffHours % 24;
      if (remainingHours > 0) {
        return `${diffDays}일 ${remainingHours}시간 전`;
      }
      return `${diffDays}일 전`;
    }

    // 주 단위일 때 추가 일 정보 포함
    if (diffWeeks < 4) {
      const remainingDays = diffDays % 7;
      if (remainingDays > 0) {
        return `${diffWeeks}주일 ${remainingDays}일 전`;
      }
      return `${diffWeeks}주일 전`;
    }

    // 달 단위일 때 추가 일 정보 포함
    if (diffMonths < 12) {
      const remainingDays = diffDays % 30;
      if (remainingDays > 0) {
        return `${diffMonths}달 ${remainingDays}일 전`;
      }
      return `${diffMonths}달 전`;
    }

    // 년 단위일 때 추가 달 정보 포함
    const remainingMonths = diffMonths % 12;
    if (remainingMonths > 0) {
      return `${diffYears}년 ${remainingMonths}달 전`;
    }
    return `${diffYears}년 전`;
  } catch (e) {
    console.warn('상대 시간 계산 실패:', dateString);
    return '시간 오류';
  }
};

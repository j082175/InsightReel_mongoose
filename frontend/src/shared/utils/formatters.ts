/**
 * 🎨 공통 포맷팅 유틸리티 함수들
 * VideoCard에서 분리된 재사용 가능한 포맷팅 함수들
 */

/**
 * 조회수를 한국어 형식으로 포맷팅
 * @param num - 조회수 숫자
 * @returns 포맷된 문자열 (예: 1000 → "1천", 10000 → "1만")
 */
export const formatViews = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(0) + '만';
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
    const timeMatch = dateString.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{1,2})/);
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
        minute: '2-digit'
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
    case 'SHORT': return '숏폼';
    case 'MID': return '미드폼';
    case 'LONG': return '롱폼';
    default: return duration;
  }
};
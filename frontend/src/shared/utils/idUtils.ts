/**
 * 🎯 MongoDB Document ID 안전 접근 유틸리티
 * MongoDB _id와 변환된 id 필드를 안전하게 처리
 */

/**
 * MongoDB Document ID를 안전하게 추출
 * @param item - MongoDB 문서 객체
 * @returns string | undefined - 추출된 ID 또는 undefined
 */
export const getDocumentId = (item: any): string | undefined => {
  if (!item) return undefined;

  // _id 우선, 그 다음 id 필드
  const id = item._id || item.id;

  if (!id) {
    console.warn('🔍 Document ID not found:', item);
    return undefined;
  }

  // ID가 문자열이 아닌 경우 문자열로 변환
  if (typeof id !== 'string') {
    console.warn('⚠️ Converting non-string ID to string:', typeof id, id);
    return String(id);
  }

  return id;
};

/**
 * MongoDB Document ID를 필수로 추출 (없으면 에러 발생)
 * @param item - MongoDB 문서 객체
 * @param itemName - 에러 메시지에 표시할 아이템 이름
 * @returns string - 추출된 ID
 * @throws Error - ID가 없는 경우
 */
export const requireDocumentId = (item: any, itemName = 'item'): string => {
  const id = getDocumentId(item);

  if (!id) {
    const error = `❌ ${itemName}의 ID가 없습니다`;
    console.error(error, item);
    throw new Error(error);
  }

  return id;
};

/**
 * 여러 아이템의 ID를 안전하게 추출
 * @param items - MongoDB 문서 객체 배열
 * @returns string[] - 추출된 ID 배열 (undefined 제외)
 */
export const getDocumentIds = (items: any[]): string[] => {
  if (!Array.isArray(items)) {
    console.warn('⚠️ getDocumentIds: items is not an array:', items);
    return [];
  }

  return items
    .map(item => getDocumentId(item))
    .filter((id): id is string => id !== undefined);
};

/**
 * Set에서 아이템 ID 확인
 * @param selectedIds - 선택된 ID들의 Set
 * @param item - 확인할 아이템
 * @returns boolean - Set에 포함되어 있는지 여부
 */
export const isItemSelected = (selectedIds: Set<string>, item: any): boolean => {
  const itemId = getDocumentId(item);
  return itemId ? selectedIds.has(itemId) : false;
};

/**
 * 안전한 Key Prop 생성
 * @param item - MongoDB 문서 객체
 * @param fallbackPrefix - ID가 없을 때 사용할 접두사
 * @param index - fallback용 인덱스
 * @returns string - React key로 사용할 문자열
 */
export const getItemKey = (item: any, fallbackPrefix = 'item', index?: number): string => {
  const id = getDocumentId(item);

  if (id) {
    return id;
  }

  // ID가 없는 경우 fallback
  const suffix = index !== undefined ? `-${index}` : '-unknown';
  return `${fallbackPrefix}${suffix}`;
};
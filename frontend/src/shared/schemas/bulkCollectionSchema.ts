import { z } from 'zod';

// 트렌딩 수집을 위한 스키마
export const bulkCollectionFormSchema = z
  .object({
    // 배치 정보
    batchName: z
      .string()
      .max(100, '배치명은 100자 이내로 입력해주세요')
      .optional(),

    batchColor: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, '올바른 색상 코드를 입력해주세요')
      .default('#3B82F6'),

    // 수집 모드
    collectionMode: z.enum(['channels', 'group']).default('channels'),

    selectedGroup: z.string().optional(),

    // 시간 조건
    daysBack: z
      .number()
      .min(1, '최소 1일 이상 설정해주세요')
      .max(365, '최대 365일까지 설정 가능합니다')
      .default(7),

    // 조회수 조건
    minViews: z
      .number()
      .min(0, '최소 조회수는 0 이상이어야 합니다')
      .default(10000),

    maxViews: z
      .number()
      .min(0, '최대 조회수는 0 이상이어야 합니다')
      .nullable()
      .default(null),

    // 영상 길이 조건
    includeShorts: z.boolean().default(true),
    includeLongForm: z.boolean().default(true),

    // 키워드 필터
    keywords: z.array(z.string()).default([]),
    excludeKeywords: z.array(z.string()).default([]),

    // 선택된 채널들
    selectedChannels: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      // 그룹 모드일 때 그룹 선택 필요
      if (data.collectionMode === 'group') {
        return data.selectedGroup && data.selectedGroup.length > 0;
      }
      // 채널 모드일 때 채널 선택 필요
      if (data.collectionMode === 'channels') {
        return data.selectedChannels.length > 0;
      }
      return true;
    },
    {
      message: '수집 대상을 선택해주세요',
      path: ['selectedGroup'],
    }
  )
  .refine(
    (data) => {
      // 최소 하나의 영상 길이 타입 선택 필요
      return data.includeShorts || data.includeLongForm;
    },
    {
      message: '최소 하나의 영상 길이 타입을 선택해주세요',
      path: ['includeShorts'],
    }
  )
  .refine(
    (data) => {
      // maxViews가 설정된 경우 minViews보다 커야 함
      if (data.maxViews !== null && data.maxViews > 0) {
        return data.maxViews >= data.minViews;
      }
      return true;
    },
    {
      message: '최대 조회수는 최소 조회수보다 크거나 같아야 합니다',
      path: ['maxViews'],
    }
  );

// TypeScript 타입 추출
export type BulkCollectionFormData = z.infer<typeof bulkCollectionFormSchema>;

// 기본값 생성 함수
export const getDefaultBulkCollectionFormData = (): BulkCollectionFormData => ({
  batchName: '',
  batchColor: '#3B82F6',
  collectionMode: 'channels',
  selectedGroup: '',
  daysBack: 7,
  minViews: 10000,
  maxViews: null,
  includeShorts: true,
  includeLongForm: true,
  keywords: [],
  excludeKeywords: [],
  selectedChannels: [],
});

// 미리 정의된 색상 팔레트
export const batchColorPalette = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#F97316', // orange-500
];

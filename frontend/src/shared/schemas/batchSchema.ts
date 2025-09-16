import { z } from 'zod';

// 배치 생성/수정을 위한 스키마
export const batchFormSchema = z
  .object({
    name: z
      .string()
      .min(1, '배치명을 입력해주세요')
      .max(100, '배치명은 100자 이내로 입력해주세요'),

    description: z
      .string()
      .max(500, '설명은 500자 이내로 입력해주세요')
      .optional(),

    collectionType: z.enum(['group', 'channels']).default('group'),

    selectedGroups: z.array(z.string()).default([]),

    selectedChannels: z.array(z.string()).default([]),

    criteria: z
      .object({
        daysBack: z
          .number()
          .min(1, '최소 1일 이상 설정해주세요')
          .max(365, '최대 365일까지 설정 가능합니다')
          .default(7),

        minViews: z
          .number()
          .min(0, '최소 조회수는 0 이상이어야 합니다')
          .default(10000),

        maxViews: z
          .number()
          .min(0, '최대 조회수는 0 이상이어야 합니다')
          .default(0),

        includeShorts: z.boolean().default(true),

        includeMidform: z.boolean().default(true),

        includeLongForm: z.boolean().default(true),

        keywords: z.array(z.string()).default([]),

        excludeKeywords: z.array(z.string()).default([]),
      })
      .default({
        daysBack: 7,
        minViews: 10000,
        maxViews: 0,
        includeShorts: true,
        includeMidform: true,
        includeLongForm: true,
        keywords: [],
        excludeKeywords: [],
      }),
  })
  .refine(
    (data) => {
      // 그룹 선택 시 최소 1개 그룹 필요
      if (data.collectionType === 'group') {
        return data.selectedGroups.length > 0;
      }
      // 채널 선택 시 최소 1개 채널 필요
      if (data.collectionType === 'channels') {
        return data.selectedChannels.length > 0;
      }
      return true;
    },
    {
      message: '수집 대상을 최소 1개 이상 선택해주세요',
      path: ['selectedGroups'], // 에러 표시 위치
    }
  )
  .refine(
    (data) => {
      // 최소 하나의 영상 길이 타입 선택 필요
      return (
        data.criteria.includeShorts ||
        data.criteria.includeMidform ||
        data.criteria.includeLongForm
      );
    },
    {
      message: '최소 하나의 영상 길이 타입을 선택해주세요',
      path: ['criteria', 'includeShorts'],
    }
  )
  .refine(
    (data) => {
      // maxViews가 설정된 경우 minViews보다 커야 함
      if (data.criteria.maxViews > 0) {
        return data.criteria.maxViews >= data.criteria.minViews;
      }
      return true;
    },
    {
      message: '최대 조회수는 최소 조회수보다 크거나 같아야 합니다',
      path: ['criteria', 'maxViews'],
    }
  );

// TypeScript 타입 추출
export type BatchFormData = z.infer<typeof batchFormSchema>;

// 기본값 생성 함수
export const getDefaultBatchFormData = (): BatchFormData => ({
  name: '',
  description: '',
  collectionType: 'group',
  selectedGroups: [],
  selectedChannels: [],
  criteria: {
    daysBack: 7,
    minViews: 10000,
    maxViews: 0,
    includeShorts: true,
    includeMidform: true,
    includeLongForm: true,
    keywords: [],
    excludeKeywords: [],
  },
});

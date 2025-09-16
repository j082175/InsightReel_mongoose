import { z } from 'zod';

// 채널 그룹 생성/수정을 위한 스키마
export const channelGroupFormSchema = z.object({
  name: z
    .string()
    .min(1, '그룹명을 입력해주세요')
    .max(50, '그룹명은 50자 이내로 입력해주세요'),

  description: z
    .string()
    .max(200, '설명은 200자 이내로 입력해주세요')
    .optional(),

  color: z
    .string()
    .min(1, '색상을 선택해주세요')
    .regex(/^#[0-9A-F]{6}$/i, '올바른 색상 코드를 입력해주세요'),

  selectedChannels: z
    .array(z.string())
    .min(1, '최소 1개 이상의 채널을 선택해주세요'),

  keywords: z.array(z.string()).default([]),

  isActive: z.boolean().default(true),
});

// TypeScript 타입 추출
export type ChannelGroupFormData = z.infer<typeof channelGroupFormSchema>;

// 기본값 생성 함수
export const getDefaultChannelGroupFormData = (): ChannelGroupFormData => ({
  name: '',
  description: '',
  color: '#3B82F6', // 기본 파란색
  selectedChannels: [],
  keywords: [],
  isActive: true,
});

// 미리 정의된 색상 팔레트
export const colorPalette = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#6366F1', // indigo-500
  '#06B6D4', // cyan-500
  '#D946EF', // fuchsia-500
];

/**
 * 🚀 Video 스키마 정의 (실무 1위 패턴 - Interface + Schema)
 * Single Source of Truth: video-types.ts의 타입을 Mongoose Schema에 제네릭으로 연결
 */

import { Schema } from 'mongoose';
import type { FinalVideoData } from '../types/video-types';

/**
 * 🎯 진짜 실무 1위 패턴: Interface를 Schema 제네릭에 전달
 * 컴파일 타임에 타입과 스키마 일치성 검증
 */
export const createVideoSchema = (): Schema<FinalVideoData> => {
  return new Schema<FinalVideoData>({
    // ===== 핵심 성과 지표 =====
    views: { type: Number, default: 0, index: true },
    likes: { type: Number, default: 0, index: true },
    commentsCount: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },  // TikTok 전용

    // ===== 기본 정보 =====
    title: { type: String, default: '' },
    channelName: { type: String, default: '', index: true },
    uploadDate: { type: String, default: '', index: true },
    thumbnailUrl: { type: String, default: '' },
    description: { type: String, default: '' },

    // ===== 플랫폼 정보 =====
    platform: {
      type: String,
      required: true,
      enum: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK'],
      index: true
    },
    url: { type: String, default: '', unique: true },

    // ===== 채널 정보 =====
    channelUrl: { type: String, default: '' },
    subscribers: { type: Number, default: 0 },
    channelVideos: { type: Number, default: 0 },

    // ===== YouTube 전용 필드 =====
    youtubeHandle: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    monetized: { type: String, default: '' },
    youtubeCategory: { type: String, default: '' },
    license: { type: String, default: '' },
    quality: { type: String, default: '' },
    language: { type: String, default: '' },
    contentType: {
      type: String,
      enum: ['shortform', 'longform', 'mixed'],
      default: 'longform',
      index: true
    },

    // ===== AI 분석 결과 =====
    mainCategory: { type: String, default: '', index: true },
    middleCategory: { type: String, default: '' },
    fullCategoryPath: { type: String, default: '' },
    categoryDepth: { type: Number, default: 0 },
    keywords: [{ type: String }],
    hashtags: [{ type: String }],
    mentions: [{ type: String }],
    analysisContent: { type: String, default: '' },
    confidence: { type: String, default: '' },
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'unified-gemini'],
      default: 'pending'
    },
    categoryMatchRate: { type: String, default: '' },
    matchType: { type: String, default: '' },
    matchReason: { type: String, default: '' },

    // ===== 시스템 메타데이터 =====
    collectionTime: {
      type: String,
      default: () => new Date().toISOString()
    },
    processedAt: {
      type: String,
      default: () => new Date().toISOString()
    },
    rowNumber: { type: Number, default: 0, index: true },

    // ===== 레거시 호환성 =====
    topComments: { type: String, default: '' },
    comments: { type: String, default: '' }
  }, {
    // 스키마 옵션
    timestamps: true,
    collection: 'videos'
  });
};

/**
 * 기존 호환성을 위한 함수 (deprecated)
 * @deprecated createVideoSchema() 사용 권장
 */
export const createBasicVideoSchema = (): Schema<FinalVideoData> => {
  return createVideoSchema();
};

/**
 * 스키마 정의만 반환 (레거시 호환)
 * @deprecated createVideoSchema() 사용 권장
 */
export const VideoSchema = createVideoSchema().obj;

// CommonJS 호환성
export default {
  createVideoSchema,
  createBasicVideoSchema,
  VideoSchema
};
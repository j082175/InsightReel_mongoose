import mongoose, { Model, HydratedDocument, SortOrder } from 'mongoose';
import type { FinalVideoData } from '../types/video-types';
import { createVideoSchema } from '../schemas/video-schema';

/**
 * 🎯 실무 1위 패턴 완벽 적용 - TypeScript 버전 (개선됨)
 * Interface → Schema → Model 완전 타입 안전 체인
 */

// 🎯 간소화된 타입 정의 (video-types.ts와 중복 방지)
type VideoUrlData = {
  originalUrl: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  originalPublishDate?: string;
  processedAt?: string;
};

// 🎯 Mongoose HydratedDocument 타입 (인스턴스 메서드 포함)
type VideoDocumentType = HydratedDocument<FinalVideoData, {}> & {
  updateStats(likes?: number, views?: number, commentsCount?: number): Promise<VideoDocumentType>;
  getDisplayData(): {
    rowNumber: number;
    uploadDate: string;
    platform: string;
    channelName: string;
    title: string;
    url: string;
    thumbnailUrl: string;
    likes: number;
    views: number;
    mainCategory: string;
  };
  getChannelInfo(): {
    channelName: string;
    channelUrl?: string;
    subscribers?: number;
    channelVideos?: number;
  };
  getAnalysisResult(): {
    mainCategory?: string;
    middleCategory?: string;
    fullCategoryPath?: string;
    categoryDepth?: number;
    confidence?: string;
    analysisStatus?: string;
    keywords?: string[];
    hashtags?: string[];
  };
};

// 🎯 모델 타입 (정적 메서드 포함)
type VideoModelType = Model<FinalVideoData> & {
  findByPlatform(
    platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK',
    sortBy?: keyof FinalVideoData,
    order?: 'desc' | 'asc',
    limit?: number,
  ): mongoose.Query<VideoDocumentType[], VideoDocumentType>;

  getRecentVideos(
    limit?: number,
    sortBy?: keyof FinalVideoData,
    order?: 'desc' | 'asc',
  ): mongoose.Query<VideoDocumentType[], VideoDocumentType>;

  createOrUpdateFromVideoUrl(
    videoUrlData: VideoUrlData,
    metadata?: Partial<FinalVideoData>,
  ): Promise<VideoDocumentType>;
};

// 실무 표준: 타입이 완전히 연결된 스키마 생성
const videoSchema = createVideoSchema();

// toJSON transform 추가 (기존 호환성 유지)
videoSchema.set('toJSON', {
  transform: function (_doc: any, ret: any) {
    // Transform _id to id as per project field naming conventions
    ret.id = ret._id ? ret._id.toString() : undefined;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 복합 인덱스 생성
videoSchema.index({ platform: 1, uploadDate: -1 }); // 플랫폼별 최신순
videoSchema.index({ platform: 1, likes: -1 }); // 플랫폼별 인기순
videoSchema.index({ channelName: 1, uploadDate: -1 }); // 채널별 최신순

// 정적 메서드들 (완전한 타입 안전성)
videoSchema.statics.findByPlatform = function (
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK',
  sortBy: keyof FinalVideoData = 'uploadDate',
  order: 'desc' | 'asc' = 'desc',
  limit = 15,
) {
  const sortOrder: SortOrder = order === 'desc' ? -1 : 1;
  const sortObj: { [key: string]: SortOrder } = {};
  sortObj[sortBy as string] = sortOrder;

  return this.find({ platform }).sort(sortObj).limit(limit);
};

videoSchema.statics.getRecentVideos = function (
  limit = 15,
  sortBy: keyof FinalVideoData = 'uploadDate',
  order: 'desc' | 'asc' = 'desc',
) {
  const sortOrder: SortOrder = order === 'desc' ? -1 : 1;
  const sortObj: { [key: string]: SortOrder } = {};
  sortObj[sortBy as string] = sortOrder;

  return this.find({}).sort(sortObj).limit(limit);
};

// VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트 (완전한 타입 안전성)
videoSchema.statics.createOrUpdateFromVideoUrl = async function (
  videoUrlData: VideoUrlData,
  metadata: Partial<FinalVideoData> = {},
) {
  const { originalUrl, platform, originalPublishDate, processedAt } = videoUrlData;

  // Instagram URL에서 사용자명 추출 함수
  const extractInstagramUsername = (url: string): string | null => {
    if (!url || !url.includes('instagram.com/')) return null;

    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    if (
      match &&
      match[1] &&
      !['reels', 'reel', 'p', 'stories'].includes(match[1])
    ) {
      return match[1];
    }
    return null;
  };

  // 플랫폼별 채널명 처리
  let channelName =
    metadata.channelName || metadata.youtubeHandle || 'Unknown Channel';

  if (platform === 'INSTAGRAM' && !channelName) {
    const extractedUsername = extractInstagramUsername(originalUrl);
    channelName = extractedUsername || 'Instagram 사용자';
  }

  // 완전히 타입 안전한 비디오 데이터 구조
  const videoData: Partial<FinalVideoData> = {
    platform,
    channelName: channelName || '알 수 없는 채널',
    url: originalUrl,
    uploadDate: originalPublishDate || new Date().toISOString(),

    // AI 분석 필드
    mainCategory: metadata.mainCategory || '미분류',
    middleCategory: metadata.middleCategory || '',
    fullCategoryPath: metadata.fullCategoryPath || '',
    categoryDepth: metadata.categoryDepth || 0,
    keywords: Array.isArray(metadata.keywords)
      ? metadata.keywords
      : metadata.keywords
      ? [metadata.keywords]
      : [],
    hashtags: Array.isArray(metadata.hashtags)
      ? metadata.hashtags
      : metadata.hashtags
      ? [metadata.hashtags]
      : [],
    mentions: Array.isArray(metadata.mentions)
      ? metadata.mentions
      : metadata.mentions
      ? [metadata.mentions]
      : [],
    description: metadata.description || '',
    analysisContent: metadata.analysisContent || '',

    // 성과 지표
    likes: metadata.likes || 0,
    commentsCount: metadata.commentsCount || 0,
    views: metadata.views || 0,
    shares: metadata.shares || 0,  // TikTok 전용

    // URL 및 메타데이터
    thumbnailUrl: metadata.thumbnailUrl || '',
    channelUrl: metadata.channelUrl || '',
    confidence: metadata.confidence || '',
    analysisStatus: metadata.analysisStatus || 'completed',
    collectionTime: new Date().toISOString(),

    // YouTube 전용 필드
    youtubeHandle: metadata.youtubeHandle || '',
    comments: metadata.comments || '',
    duration: typeof metadata.duration === 'number' ? String(metadata.duration) : (metadata.duration ? String(metadata.duration) : '0'),
    subscribers: metadata.subscribers || 0,
    channelVideos: metadata.channelVideos || 0,
    monetized: metadata.monetized || '',
    youtubeCategory: metadata.youtubeCategory || '',
    license: metadata.license || '',
    quality: metadata.quality || '',
    language: metadata.language || '',
    contentType: metadata.contentType || 'longform',
    categoryMatchRate: metadata.categoryMatchRate || '',
    matchType: metadata.matchType || '',
    matchReason: metadata.matchReason || '',

    // 레거시 호환성 필드
    title: metadata.title || originalUrl.split('/').pop() || '미분류',
    processedAt: processedAt || new Date().toISOString(),
    topComments: metadata.topComments || '',

    // 시스템 메타데이터 (누락 필드 추가)
    rowNumber: metadata.rowNumber || 0,
  };

  return this.findOneAndUpdate(
    { url: originalUrl, platform },
    { $set: videoData },
    { upsert: true, new: true },
  );
};

// 인스턴스 메서드들 (완전한 타입 안전성)
videoSchema.methods.updateStats = function (
  this: VideoDocumentType,
  likes?: number,
  views?: number,
  commentsCount?: number,
): Promise<VideoDocumentType> {
  if (likes !== undefined) this.likes = likes;
  if (views !== undefined) this.views = views;
  if (commentsCount !== undefined) this.commentsCount = commentsCount;

  return this.save();
};

videoSchema.methods.getDisplayData = function (this: VideoDocumentType) {
  return {
    rowNumber: this.rowNumber || 0,
    uploadDate: this.uploadDate || '',
    platform: this.platform || '',
    channelName: this.channelName || '',
    title: this.title || '',
    url: this.url || '',
    thumbnailUrl: this.thumbnailUrl || '',
    likes: this.likes || 0,
    views: this.views || 0,
    mainCategory: this.mainCategory || '',
  };
};

videoSchema.methods.getChannelInfo = function (this: VideoDocumentType) {
  return {
    channelName: this.channelName || '',
    channelUrl: this.channelUrl,
    subscribers: this.subscribers,
    channelVideos: this.channelVideos,
  };
};

videoSchema.methods.getAnalysisResult = function (this: VideoDocumentType) {
  return {
    mainCategory: this.mainCategory,
    middleCategory: this.middleCategory,
    fullCategoryPath: this.fullCategoryPath,
    categoryDepth: this.categoryDepth,
    confidence: this.confidence,
    analysisStatus: this.analysisStatus,
    keywords: this.keywords,
    hashtags: this.hashtags,
  };
};

// 🎯 완전한 타입 안전성을 가진 모델 생성 (중복 방지)
const VideoModel = mongoose.model<FinalVideoData>('Video', videoSchema) as VideoModelType;

export default VideoModel;
export type { VideoDocumentType, VideoUrlData };
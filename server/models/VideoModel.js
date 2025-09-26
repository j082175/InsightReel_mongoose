"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const video_schema_1 = require("../schemas/video-schema");
// 실무 표준: 타입이 완전히 연결된 스키마 생성
const videoSchema = (0, video_schema_1.createVideoSchema)();
// toJSON transform 추가 (기존 호환성 유지)
videoSchema.set('toJSON', {
    transform: function (_doc, ret) {
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
videoSchema.statics.findByPlatform = function (platform, sortBy = 'uploadDate', order = 'desc', limit = 15) {
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;
    return this.find({ platform }).sort(sortObj).limit(limit);
};
videoSchema.statics.getRecentVideos = function (limit = 15, sortBy = 'uploadDate', order = 'desc') {
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;
    return this.find({}).sort(sortObj).limit(limit);
};
// VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트 (완전한 타입 안전성)
videoSchema.statics.createOrUpdateFromVideoUrl = async function (videoUrlData, metadata = {}) {
    const { originalUrl, platform, originalPublishDate, processedAt } = videoUrlData;
    // Instagram URL에서 사용자명 추출 함수
    const extractInstagramUsername = (url) => {
        if (!url || !url.includes('instagram.com/'))
            return null;
        const match = url.match(/instagram\.com\/([^\/\?]+)/);
        if (match &&
            match[1] &&
            !['reels', 'reel', 'p', 'stories'].includes(match[1])) {
            return match[1];
        }
        return null;
    };
    // 플랫폼별 채널명 처리
    let channelName = metadata.channelName || metadata.youtubeHandle || 'Unknown Channel';
    if (platform === 'INSTAGRAM' && !channelName) {
        const extractedUsername = extractInstagramUsername(originalUrl);
        channelName = extractedUsername || 'Instagram 사용자';
    }
    // 완전히 타입 안전한 비디오 데이터 구조
    const videoData = {
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
        shares: metadata.shares || 0, // TikTok 전용
        // URL 및 메타데이터
        thumbnailUrl: metadata.thumbnailUrl || '',
        channelUrl: metadata.channelUrl || '',
        confidence: metadata.confidence || '',
        analysisStatus: metadata.analysisStatus || 'completed',
        collectionTime: new Date().toISOString(),
        // YouTube 전용 필드
        youtubeHandle: metadata.youtubeHandle || '',
        comments: metadata.comments || '',
        duration: metadata.duration || '',
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
    return this.findOneAndUpdate({ url: originalUrl, platform }, { $set: videoData }, { upsert: true, new: true });
};
// 인스턴스 메서드들 (완전한 타입 안전성)
videoSchema.methods.updateStats = function (likes, views, commentsCount) {
    if (likes !== undefined)
        this.likes = likes;
    if (views !== undefined)
        this.views = views;
    if (commentsCount !== undefined)
        this.commentsCount = commentsCount;
    return this.save();
};
videoSchema.methods.getDisplayData = function () {
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
videoSchema.methods.getChannelInfo = function () {
    return {
        channelName: this.channelName || '',
        channelUrl: this.channelUrl,
        subscribers: this.subscribers,
        channelVideos: this.channelVideos,
    };
};
videoSchema.methods.getAnalysisResult = function () {
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
const VideoModel = mongoose_1.default.model('Video', videoSchema);
exports.default = VideoModel;
//# sourceMappingURL=VideoModel.js.map
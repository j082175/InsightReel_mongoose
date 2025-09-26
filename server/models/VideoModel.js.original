/**
 * 🚨 DEPRECATED: 이 JS 파일은 더 이상 사용하지 마세요!
 * 대신 VideoModel.ts를 사용하세요 (완전한 타입 안전성 제공)
 *
 * 하위 호환성을 위해서만 유지됨
 */

// TypeScript 컴파일된 파일 시도
try {
    module.exports = require('../../dist/server/models/VideoModel').default;
} catch (e) {
    // 컴파일된 파일이 없으면 기존 방식으로 fallback
    console.warn('⚠️ VideoModel.ts 컴파일된 파일을 찾을 수 없습니다. 레거시 모드로 실행됩니다.');

    const mongoose = require('mongoose');
    let videoSchemaModule;
    try {
        videoSchemaModule = require('../../dist/server/schemas/video-schema');
    } catch (e) {
        videoSchemaModule = require('../schemas/video-schema');
    }
    const { createVideoSchema } = videoSchemaModule;

    /**
     * 🚀 Video 모델 (레거시 버전)
     * 가능하면 VideoModel.ts 사용 권장
     */

// 실무 표준 패턴: createVideoSchema()가 이미 스키마 옵션까지 포함하여 반환
const videoSchema = createVideoSchema();

// toJSON transform 추가 (기존 호환성 유지)
videoSchema.set('toJSON', {
    transform: function (doc, ret) {
        // Transform _id to id as per project field naming conventions
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

// 복합 인덱스 생성 (개별 인덱스는 video-types.js에서 정의됨)
videoSchema.index({ platform: 1, uploadDate: -1 }); // 플랫폼별 최신순
videoSchema.index({ platform: 1, likes: -1 }); // 플랫폼별 인기순
videoSchema.index({ channelName: 1, uploadDate: -1 }); // 채널별 최신순
// mainCategory는 video-types.js에서 이미 인덱스 설정됨

// 정적 메서드
videoSchema.statics.findByPlatform = function (
    platform,
    sortBy = 'uploadDate',
    order = 'desc',
    limit = 15,
) {
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    return this.find({ platform: platform }).sort(sortObj).limit(limit);
};

videoSchema.statics.getRecentVideos = function (
    limit = 15,
    sortBy = 'uploadDate',
    order = 'desc',
) {
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    return this.find({}).sort(sortObj).limit(limit);
};

// 인스턴스 메서드
videoSchema.methods.updateStats = function (
    likes,
    views,
    commentsCount,
) {
    this.likes = likes || this.likes;
    this.views = views || this.views;
    this.commentsCount = commentsCount || this.commentsCount;

    return this.save();
};

videoSchema.methods.getDisplayData = function () {
    return {
        rowNumber: this.rowNumber,
        uploadDate: this.uploadDate,
        platform: this.platform,
        channelName: this.channelName,
        title: this.title,
        url: this.url,
        thumbnailUrl: this.thumbnailUrl,
        likes: this.likes,
        views: this.views,
        mainCategory: this.mainCategory,
    };
};

videoSchema.methods.getChannelInfo = function () {
    return {
        channelName: this.channelName,
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

// VideoUrl 데이터와 동기화하여 Video 레코드 생성/업데이트
videoSchema.statics.createOrUpdateFromVideoUrl = async function (
    videoUrlData,
    metadata = {},
) {
    const { originalUrl, platform, originalPublishDate, processedAt } =
        videoUrlData;

    // Instagram URL에서 사용자명 추출 함수
    const extractInstagramUsername = (url) => {
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
        metadata.channelName || metadata.youtubeHandle || metadata.account;

    if (platform === 'INSTAGRAM' && !channelName) {
        const extractedUsername = extractInstagramUsername(originalUrl);
        channelName = extractedUsername || 'Instagram 사용자';
    }

    // 비디오 데이터 구조
    const videoData = {
        platform: platform,
        channelName: channelName || '알 수 없는 채널',
        url: originalUrl,
        uploadDate: originalPublishDate || new Date(),

        // AI 분석 필드
        mainCategory: metadata.mainCategory || metadata.category || '미분류',
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
        analysisContent:
            metadata.analysisContent || metadata.ai_description || '',

        // 성과 지표
        likes: metadata.likes || 0,
        commentsCount:
            metadata.commentsCount ||
            metadata.comments_count ||
            metadata.comments ||
            0,
        views: metadata.views || 0,

        // URL 및 메타데이터
        thumbnailUrl: metadata.thumbnailUrl || metadata.thumbnailPath || '',
        channelUrl: metadata.channelUrl || '',
        confidence: metadata.confidence || '',
        analysisStatus: metadata.analysisStatus || 'completed',
        collectionTime: new Date(),

        // YouTube 전용 필드
        youtubeHandle: metadata.youtubeHandle || '',
        comments: metadata.commentText || '',
        duration: metadata.duration || '',
        subscribers: metadata.subscribers || 0,
        channelVideos: metadata.channelVideos || 0,
        monetized: metadata.monetized || '',
        youtubeCategory: metadata.youtubeCategory || '',
        license: metadata.license || '',
        quality: metadata.quality || '',
        language: metadata.language || '',
        categoryMatchRate: metadata.categoryMatchRate || '',
        matchType: metadata.matchType || '',
        matchReason: metadata.matchReason || '',

        // 레거시 호환성 필드
        title: metadata.title || originalUrl.split('/').pop() || '미분류',
        processedAt: processedAt || new Date(),
        topComments: metadata.topComments || '',
    };

    return this.findOneAndUpdate(
        { url: originalUrl, platform: platform },
        { $set: videoData },
        { upsert: true, new: true },
    );
};

    module.exports = mongoose.model('Video', videoSchema);
}

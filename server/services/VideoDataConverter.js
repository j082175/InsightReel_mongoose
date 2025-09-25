/**
 * 🚀 플랫폼별 데이터 변환 로직
 * Google Sheets buildRowData 로직을 MongoDB 최적화 스키마로 변환
 * video-types.js 인터페이스 표준 준수
 */

const path = require('path');
const { ServerLogger } = require('../utils/logger');

class VideoDataConverter {
    /**
     * 플랫폼별 데이터 변환 메인 메서드
     * @param {string} platform - 플랫폼 ('YOUTUBE', 'INSTAGRAM')
     * @param {Object} videoData - 원본 비디오 데이터
     * @param {number} rowNumber - 행 번호
     * @returns {Object} MongoDB 스키마에 맞게 변환된 데이터
     */
    static convertToSchema(platform, videoData, rowNumber = 1) {
        const normalizedPlatform = platform.toUpperCase();

        try {
            switch (normalizedPlatform) {
                case 'YOUTUBE':
                    return this.convertToYouTubeSchema(videoData, rowNumber);
                case 'INSTAGRAM':
                    return this.convertToInstagramSchema(videoData, rowNumber);
                case 'TIKTOK':
                    return this.convertToTikTokSchema(videoData, rowNumber);
                default:
                    throw new Error(`지원되지 않는 플랫폼: ${platform}`);
            }
        } catch (error) {
            ServerLogger.error(
                `데이터 변환 실패 (${platform})`,
                error.message,
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube 스키마로 변환 (34개 필드)
     * Google Sheets YouTube buildRowData 로직 기반
     */
    static convertToYouTubeSchema(videoData, rowNumber = 1) {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } =
            videoData;
        // ⭐ 표준화: postUrl → url 매핑
        const url = videoData.url || postUrl;

        // 업로드 날짜 결정 (기존 buildRowData 로직)
        let uploadDate;
        if (metadata.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
        } else {
            uploadDate = new Date(timestamp).toLocaleString('ko-KR');
        }

        // 🚨 디버깅: 입력 데이터 체크 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
            ServerLogger.debug(`🔍 DEBUG - YouTube 입력 데이터:`, {
                'metadata keys': Object.keys(metadata),
                'analysis keys': Object.keys(analysis),
                'metadata.channelName': metadata.channelName,
                'metadata.title': metadata.title,
                'analysis.mainCategory': analysis.mainCategory,
                'analysis.keywords': analysis.keywords
            }, 'DATA_CONVERTER');
        }

        // 동적 카테고리 처리 (기존 로직)
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        ServerLogger.info(
            `🔍 VideoDataConverter - Analysis 체크:`,
            {
                'analysis.fullCategoryPath': analysis.fullCategoryPath,
                'analysis.categoryDepth': analysis.categoryDepth,
                'analysis.fullPath': analysis.fullPath,
                'analysis.depth': analysis.depth,
            },
            'DATA_CONVERTER',
        );

        if (isDynamicMode && (analysis.fullCategoryPath || analysis.fullPath)) {
            fullCategoryPath = analysis.fullCategoryPath || analysis.fullPath;
            categoryDepth = analysis.categoryDepth || analysis.depth || 0;
        } else {
            // 동적 카테고리에서 표준 필드나 레거시 필드가 있으면 사용
            if (analysis.fullCategoryPath || analysis.fullPath) {
                fullCategoryPath =
                    analysis.fullCategoryPath || analysis.fullPath;
                categoryDepth = fullCategoryPath.split(' > ').length;
            } else {
                // 기존 방식: mainCategory, middleCategory 조합
                const mainCat = analysis.mainCategory || '미분류';
                const middleCat = analysis.middleCategory || '';
                if (middleCat && middleCat !== '미분류') {
                    fullCategoryPath = `${mainCat} > ${middleCat}`;
                    categoryDepth = 2;
                } else {
                    fullCategoryPath = mainCat;
                    categoryDepth = 1;
                }
            }
        }

        // YouTube 34개 필드 변환
        // video-types.js 인터페이스 표준 데이터 구조
        const result = {
            // 자동 생성 필드
            rowNumber: rowNumber,

            // YouTube 전용 33개 필드
            uploadDate: uploadDate,
            platform: (platform || 'YOUTUBE').toUpperCase(),
            channelName: metadata.channelName || 
                        metadata.channel || 
                        metadata.channelTitle || 
                        metadata.author || 
                        metadata.account || 
                        '',
            title: metadata.title || '',
            youtubeHandle: metadata.youtubeHandle || '',
            channelUrl: metadata.channelUrl || '',
            mainCategory: analysis.mainCategory || '미분류',
            middleCategory: analysis.middleCategory || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: Array.isArray(analysis.keywords)
                ? analysis.keywords
                : analysis.keywords
                ? [analysis.keywords]
                : [],
            hashtags: Array.isArray(analysis.hashtags)
                ? analysis.hashtags
                : analysis.hashtags
                ? [analysis.hashtags]
                : [],
            mentions: Array.isArray(analysis.mentions)
                ? analysis.mentions
                : analysis.mentions
                ? [analysis.mentions]
                : [],
            description: metadata.description || '',
            analysisContent:
                analysis.analysisContent ||
                analysis.summary ||
                analysis.description ||
                analysis.content ||
                '',
            comments: metadata.comments || '',
            likes: this.parseNumber(metadata.likes),
            commentsCount: this.parseNumber(metadata.commentsCount),
            views: this.parseNumber(metadata.views),
            duration: metadata.duration || '',
            contentType: metadata.contentType || 'longform',
            subscribers: this.parseNumber(metadata.subscribers),
            channelVideos: this.parseNumber(metadata.channelVideos),
            monetized: metadata.monetized || 'N',
            youtubeCategory: metadata.youtubeCategory || '',
            license: metadata.license || 'YOUTUBE',
            quality: metadata.quality || 'sd',
            language: metadata.language || null,
            url: url || '',
            videoUrl: (() => {
                const videoUrlValue = metadata.videoUrl || url || '';
                ServerLogger.info(
                    `🔍 VideoDataConverter - VIDEO_URL: "${videoUrlValue}"`,
                    {},
                    'DATA_CONVERTER',
                );
                return videoUrlValue;
            })(),
            topComments: (() => {
                const topCommentsValue = metadata.topComments || '';
                ServerLogger.info(
                    `🔍 VideoDataConverter - TOP_COMMENTS: "${topCommentsValue?.substring(
                        0,
                        100,
                    )}..."`,
                    {},
                    'DATA_CONVERTER',
                );
                return topCommentsValue;
            })(),
            thumbnailUrl: metadata.thumbnailUrl || '',
            confidence: this.formatConfidence(analysis.confidence),
            analysisStatus: analysis.aiModel || '수동',
            categoryMatchRate: analysis.categoryMatch
                ? `${analysis.categoryMatch.matchScore}%`
                : '',
            matchType: analysis.categoryMatch
                ? analysis.categoryMatch.matchType
                : '',
            matchReason: analysis.categoryMatch
                ? analysis.categoryMatch.matchReason
                : '',
            collectionTime: new Date(), // 수집시간
        };

        return result;
    }

    /**
     * Instagram 스키마로 변환 (20개 필드)
     * Google Sheets Instagram buildRowData 로직 기반
     */
    static convertToInstagramSchema(videoData, rowNumber = 1) {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } =
            videoData;
        // ⭐ 표준화: postUrl → url 매핑
        const url = videoData.url || postUrl;

        // 업로드 날짜 결정 (Instagram은 날짜만)
        let uploadDate;
        if (metadata && metadata.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleDateString(
                'ko-KR',
            );
        } else if (timestamp) {
            uploadDate = new Date(timestamp).toLocaleDateString('ko-KR');
        } else {
            uploadDate = ''; // 없으면 빈 값
        }

        // 동적 카테고리 처리 (기존 로직 동일)
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        ServerLogger.info(
            `🔍 VideoDataConverter - Analysis 체크:`,
            {
                'analysis.fullCategoryPath': analysis.fullCategoryPath,
                'analysis.categoryDepth': analysis.categoryDepth,
                'analysis.fullPath': analysis.fullPath,
                'analysis.depth': analysis.depth,
            },
            'DATA_CONVERTER',
        );

        if (isDynamicMode && (analysis.fullCategoryPath || analysis.fullPath)) {
            fullCategoryPath = analysis.fullCategoryPath || analysis.fullPath;
            categoryDepth = analysis.categoryDepth || analysis.depth || 0;
        } else {
            // 동적 카테고리에서 표준 필드나 레거시 필드가 있으면 사용
            if (analysis.fullCategoryPath || analysis.fullPath) {
                fullCategoryPath =
                    analysis.fullCategoryPath || analysis.fullPath;
                categoryDepth = fullCategoryPath.split(' > ').length;
            } else {
                // 기존 방식: mainCategory, middleCategory 조합
                const mainCat = analysis.mainCategory || '미분류';
                const middleCat = analysis.middleCategory || '';
                if (middleCat && middleCat !== '미분류') {
                    fullCategoryPath = `${mainCat} > ${middleCat}`;
                    categoryDepth = 2;
                } else {
                    fullCategoryPath = mainCat;
                    categoryDepth = 1;
                }
            }
        }

        // 🔍 DEBUG 로깅 - Instagram 데이터 변환 전 확인 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
            ServerLogger.debug(`🔍 DEBUG - Instagram 입력 데이터:`, {
                'metadata keys': Object.keys(metadata),
                'analysis keys': Object.keys(analysis),
                'metadata.channelName': metadata.channelName,
                'metadata.channel': metadata.channel,
                'metadata.channelTitle': metadata.channelTitle,
                'metadata.author': metadata.author,
                'metadata.account': metadata.account,
                'metadata.title': metadata.title,
                'analysis.mainCategory': analysis.mainCategory,
                'analysis.keywords': analysis.keywords
            }, 'INSTAGRAM_DATA_CONVERTER');
        }

        // Instagram 20개 필드 변환
        // video-types.js 인터페이스 표준 데이터 구조
        return {
            // 자동 생성 필드
            rowNumber: rowNumber,

            // Instagram 전용 19개 필드
            uploadDate: uploadDate,
            platform: (platform || 'INSTAGRAM').toUpperCase(),
            channelName: (metadata && metadata.channelName) ||
                        (metadata && metadata.channel) ||
                        (metadata && metadata.channelTitle) ||
                        (metadata && metadata.author) ||
                        (metadata && metadata.account) ||
                        '',
            channelUrl: (metadata && metadata.channelUrl) || '',
            mainCategory: (analysis && analysis.mainCategory) || '미분류',
            middleCategory: (analysis && analysis.middleCategory) || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: (analysis && Array.isArray(analysis.keywords))
                ? analysis.keywords
                : (analysis && analysis.keywords)
                ? [analysis.keywords]
                : [],
            hashtags: (analysis && Array.isArray(analysis.hashtags))
                ? analysis.hashtags
                : (analysis && analysis.hashtags)
                ? [analysis.hashtags]
                : [],
            mentions: (analysis && Array.isArray(analysis.mentions))
                ? analysis.mentions
                : (analysis && analysis.mentions)
                ? [analysis.mentions]
                : [],
            description: (metadata && metadata.description) || '',
            analysisContent: (analysis && analysis.summary) || '',
            likes: this.parseNumber((metadata && metadata.likes) || 0),
            commentsCount: this.parseNumber((metadata && metadata.commentsCount) || 0),
            url: url || '',
            thumbnailUrl: (metadata && metadata.thumbnailUrl) || '',
            confidence: this.formatConfidence((analysis && analysis.confidence) || 0),
            analysisStatus: (analysis && analysis.aiModel) || '수동',
            collectionTime: new Date(),
        };
    }

    /**
     * 숫자 파싱 헬퍼 함수
     * 문자열 숫자를 정수로 변환, 실패 시 0 반환
     */
    static parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * 신뢰도 포맷 헬퍼 함수
     * analysis.confidence를 백분율 문자열로 변환
     */
    static formatConfidence(confidence) {
        if (confidence === null || confidence === undefined) {
            return '0%';
        }

        if (typeof confidence === 'number') {
            return (confidence * 100).toFixed(1) + '%';
        }

        if (typeof confidence === 'string' && confidence.includes('%')) {
            return confidence;
        }

        return '0%';
    }

    /**
     * Google Sheets 행 데이터를 MongoDB 문서로 변환
     * @param {Array} rowData - Google Sheets 행 배열
     * @param {string} platform - 플랫폼
     * @returns {Object} MongoDB 문서 객체
     */
    static convertRowDataToDocument(rowData, platform) {
        const normalizedPlatform = platform.toUpperCase();

        try {
            if (normalizedPlatform === 'YOUTUBE') {
                return this.convertYouTubeRowToDocument(rowData);
            } else if (normalizedPlatform === 'INSTAGRAM') {
                return this.convertInstagramRowToDocument(rowData);
            } else if (normalizedPlatform === 'TIKTOK') {
                return this.convertTikTokRowToDocument(rowData);
            } else {
                throw new Error(`지원되지 않는 플랫폼: ${platform}`);
            }
        } catch (error) {
            ServerLogger.error(
                `행 데이터 변환 실패 (${platform})`,
                error.message,
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube Google Sheets 행을 MongoDB 문서로 변환
     * video-types.js 인터페이스 표준 데이터 구조
     */
    static convertYouTubeRowToDocument(rowData) {
        return {
            rowNumber: this.parseNumber(rowData[0]),
            uploadDate: rowData[1] || '',
            platform: rowData[2] || 'YOUTUBE',
            channelName: rowData[3] || '',
            youtubeHandle: rowData[4] || '',
            channelUrl: rowData[5] || '',
            mainCategory: rowData[6] || '',
            middleCategory: rowData[7] || '',
            fullCategoryPath: rowData[8] || '',
            categoryDepth: this.parseNumber(rowData[9]),
            keywords: rowData[10] || '',
            hashtags: rowData[11] || '',
            mentions: rowData[12] || '',
            description: rowData[13] || '',
            analysisContent: rowData[14] || '',
            comments: rowData[15] || '',
            likes: this.parseNumber(rowData[16]),
            commentsCount: this.parseNumber(rowData[17]),
            views: this.parseNumber(rowData[18]),
            duration: rowData[19] || '',
            subscribers: this.parseNumber(rowData[20]),
            channelVideos: this.parseNumber(rowData[21]),
            monetized: rowData[22] || 'N',
            youtubeCategory: rowData[23] || '',
            license: rowData[24] || 'YOUTUBE',
            quality: rowData[25] || 'sd',
            language: rowData[26] || '',
            url: rowData[27] || '',
            thumbnailUrl: rowData[28] || '',
            confidence: rowData[29] || '0%',
            analysisStatus: rowData[30] || '수동',
            categoryMatchRate: rowData[31] || '',
            matchType: rowData[32] || '',
            matchReason: rowData[33] || '',
            collectionTime: new Date(),
        };
    }

    /**
     * Instagram Google Sheets 행을 MongoDB 문서로 변환
     * video-types.js 인터페이스 표준 데이터 구조
     */
    static convertInstagramRowToDocument(rowData) {
        return {
            rowNumber: this.parseNumber(rowData[0]),
            uploadDate: rowData[1] || '',
            platform: rowData[2] || 'INSTAGRAM',
            channelName: rowData[3] || '',
            channelUrl: rowData[4] || '',
            mainCategory: rowData[5] || '',
            middleCategory: rowData[6] || '',
            fullCategoryPath: rowData[7] || '',
            categoryDepth: this.parseNumber(rowData[8]),
            keywords: rowData[9] || '',
            hashtags: rowData[10] || '',
            mentions: rowData[11] || '',
            description: rowData[12] || '',
            analysisContent: rowData[13] || '',
            likes: this.parseNumber(rowData[14]),
            commentsCount: this.parseNumber(rowData[15]),
            url: rowData[16] || '',
            thumbnailUrl: rowData[17] || '',
            confidence: rowData[18] || '0%',
            analysisStatus: rowData[19] || '수동',
            collectionTime: new Date(),
        };
    }

    /**
     * MongoDB 문서를 Google Sheets 행 데이터로 역변환
     * @param {Object} document - MongoDB 문서
     * @param {string} platform - 플랫폼
     * @returns {Array} Google Sheets 행 배열
     */
    static convertDocumentToRowData(document, platform) {
        const normalizedPlatform = platform.toUpperCase();

        try {
            if (normalizedPlatform === 'YOUTUBE') {
                return this.convertYouTubeDocumentToRow(document);
            } else if (normalizedPlatform === 'INSTAGRAM') {
                return this.convertInstagramDocumentToRow(document);
            } else {
                throw new Error(`지원되지 않는 플랫폼: ${platform}`);
            }
        } catch (error) {
            ServerLogger.error(
                `문서 역변환 실패 (${platform})`,
                error.message,
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube MongoDB 문서를 Google Sheets 행으로 역변환
     * video-types.js 인터페이스 표준 데이터 구조
     */
    static convertYouTubeDocumentToRow(document) {
        return [
            document.rowNumber || 0,
            document.uploadDate || '',
            document.platform || 'YOUTUBE',
            document.channelName || '',
            document.youtubeHandle || '',
            document.channelUrl || '',
            document.mainCategory || '',
            document.middleCategory || '',
            document.fullCategoryPath || '',
            document.categoryDepth || 0,
            document.keywords || '',
            document.hashtags || '',
            document.mentions || '',
            document.description || '',
            document.analysisContent || '',
            document.comments || '',
            document.likes || 0,
            document.commentsCount || 0,
            document.views || 0,
            document.duration || '',
            document.subscribers || 0,
            document.channelVideos || 0,
            document.monetized || 'N',
            document.youtubeCategory || '',
            document.license || 'YOUTUBE',
            document.quality || 'sd',
            document.language || '',
            document.url || '',
            document.thumbnailUrl || '',
            document.confidence || '0%',
            document.analysisStatus || '수동',
            document.categoryMatchRate || '',
            document.matchType || '',
            document.matchReason || '',
        ];
    }

    /**
     * Instagram MongoDB 문서를 Google Sheets 행으로 역변환
     * video-types.js 인터페이스 표준 데이터 구조
     */
    static convertInstagramDocumentToRow(document) {
        return [
            document.rowNumber || 0,
            document.uploadDate || '',
            document.platform || 'INSTAGRAM',
            document.channelName || '',
            document.channelUrl || '',
            document.mainCategory || '',
            document.middleCategory || '',
            document.fullCategoryPath || '',
            document.categoryDepth || 0,
            document.keywords || '',
            document.hashtags || '',
            document.mentions || '',
            document.description || '',
            document.analysisContent || '',
            document.likes || 0,
            document.commentsCount || 0,
            document.url || '',
            document.thumbnailUrl || '',
            document.confidence || '0%',
            document.analysisStatus || '수동',
        ];
    }

    /**
     * 플랫폼별 필드 개수 반환
     */
    static getFieldCount(platform) {
        const normalizedPlatform = platform.toUpperCase();

        switch (normalizedPlatform) {
            case 'YOUTUBE':
                return 34; // 33개 헤더 + rowNumber
            case 'INSTAGRAM':
                return 20; // 19개 헤더 + rowNumber
            case 'TIKTOK':
                return 25; // 24개 헤더 + rowNumber
            default:
                throw new Error(`지원되지 않는 플랫폼: ${platform}`);
        }
    }

    /**
     * TikTok 스키마로 변환 (24개 필드)
     * TikTok 전용 필드들을 포함한 스프레드시트 형태
     */
    static convertToTikTokSchema(videoData, rowNumber = 1) {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
        const url = videoData.url || postUrl;

        // 디버깅: TikTok 메타데이터 확인
        ServerLogger.info('🔍 STEP2 - VideoDataConverter 입력 메타데이터:', {
            thumbnailUrl: metadata.thumbnailUrl,
            language: metadata.language,
            description: metadata.description
        });

        // 업로드 날짜 결정
        let uploadDate;
        if (metadata.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
        } else {
            uploadDate = new Date(timestamp).toLocaleString('ko-KR');
        }

        // 동적 카테고리 처리
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        if (isDynamicMode && (analysis.fullCategoryPath || analysis.fullPath)) {
            fullCategoryPath = analysis.fullCategoryPath || analysis.fullPath;
            categoryDepth = analysis.categoryDepth || analysis.depth || 0;
        } else {
            const mainCat = analysis.mainCategory || '엔터테인먼트';
            const middleCat = analysis.middleCategory || '';
            if (middleCat && middleCat !== '미분류') {
                fullCategoryPath = `${mainCat} > ${middleCat}`;
                categoryDepth = 2;
            } else {
                fullCategoryPath = mainCat;
                categoryDepth = 1;
            }
        }

        return {
            rowNumber: rowNumber,
            platform: 'TIKTOK',
            channelName: metadata.channelName || '알 수 없음',
            url: url,
            title: metadata.title || '제목 없음',
            uploadDate: uploadDate,
            views: metadata.views || 0,
            likes: metadata.likes || 0,
            comments: metadata.commentsCount || metadata.comments || 0,
            shares: metadata.shares || 0,
            duration: metadata.durationFormatted || '0:30',
            contentType: metadata.contentType || 'shortform',
            category: metadata.category || '엔터테인먼트',
            mainCategory: analysis.mainCategory || '엔터테인먼트',
            middleCategory: analysis.middleCategory || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: (analysis.keywords || []).join(', '),
            hashtags: (metadata.hashtags || []).join(', '),
            mentions: (metadata.mentions || []).join(', '),
            musicTitle: metadata.musicTitle || '',
            musicAuthor: metadata.musicAuthor || '',
            originalSound: metadata.originalSound || false,
            channelVerified: metadata.channelVerified || false,
            isCommercial: metadata.isCommercial || false,
            effectsUsed: (metadata.effectsUsed || []).join(', '),
            thumbnailUrl: metadata.thumbnailUrl || '',
            language: metadata.language || '',
            description: metadata.description || ''
        };

        // 변환 후 language 값 확인
        const result = {
            rowNumber: rowNumber,
            platform: 'TIKTOK',
            channelName: metadata.channelName || '알 수 없음',
            url: url,
            title: metadata.title || '제목 없음',
            uploadDate: uploadDate,
            views: metadata.views || 0,
            likes: metadata.likes || 0,
            comments: metadata.commentsCount || metadata.comments || 0,
            shares: metadata.shares || 0,
            duration: metadata.durationFormatted || '0:30',
            contentType: metadata.contentType || 'shortform',
            category: metadata.category || '엔터테인먼트',
            mainCategory: analysis.mainCategory || '엔터테인먼트',
            middleCategory: analysis.middleCategory || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: (analysis.keywords || []).join(', '),
            hashtags: (metadata.hashtags || []).join(', '),
            mentions: (metadata.mentions || []).join(', '),
            musicTitle: metadata.musicTitle || '',
            musicAuthor: metadata.musicAuthor || '',
            originalSound: metadata.originalSound || false,
            channelVerified: metadata.channelVerified || false,
            isCommercial: metadata.isCommercial || false,
            effectsUsed: (metadata.effectsUsed || []).join(', '),
            thumbnailUrl: metadata.thumbnailUrl || '',
            language: metadata.language || '',
            description: metadata.description || ''
        };

        ServerLogger.info(`🔍 STEP2 - VideoDataConverter 출력 language: '${result.language}'`);
        return result;
    }

    /**
     * TikTok Google Sheets 행을 MongoDB 문서로 변환
     */
    static convertTikTokRowToDocument(rowData) {
        return {
            title: rowData[4] || '제목 없음',
            channelName: rowData[2] || '알 수 없음',
            url: rowData[3] || '',
            platform: 'TIKTOK',
            views: parseInt(rowData[6]) || 0,
            likes: parseInt(rowData[7]) || 0,
            comments: parseInt(rowData[8]) || 0,
            shares: parseInt(rowData[9]) || 0,
            uploadDate: rowData[5] || new Date().toISOString(),
            duration: rowData[10] || '0:30',
            contentType: rowData[11] || 'shortform',
            category: rowData[12] || '엔터테인먼트',
            mainCategory: rowData[13] || '엔터테인먼트',
            middleCategory: rowData[14] || '',
            fullCategoryPath: rowData[15] || '엔터테인먼트',
            categoryDepth: parseInt(rowData[16]) || 1,
            keywords: rowData[17] || '',
            hashtags: rowData[18] || '',
            mentions: rowData[19] || '',
            musicTitle: rowData[20] || '',
            musicAuthor: rowData[21] || '',
            originalSound: rowData[22] === 'true' || false,
            channelVerified: rowData[23] === 'true' || false,
            isCommercial: rowData[24] === 'true' || false,
            _id: null // MongoDB에서 자동 생성
        };
    }

    /**
     * 변환 로그 출력
     */
    static logConversion(platform, originalData, convertedData) {
        ServerLogger.info(
            `데이터 변환 완료: ${platform.toUpperCase()}`,
            {
                url: originalData.url || originalData.postUrl,
                channelName: originalData.metadata?.channelName,
                fields: Object.keys(convertedData).length,
                mainCategory: convertedData.mainCategory,
            },
            'DATA_CONVERTER',
        );
    }
}

module.exports = VideoDataConverter;

/**
 * 🚀 플랫폼별 데이터 변환 로직
 * Google Sheets buildRowData 로직을 MongoDB 최적화 스키마로 변환
 * video-types.ts 인터페이스 표준 준수
 */

import path from 'path';
import { ServerLogger } from '../utils/logger';
import type {
    FinalVideoData,
    Platform,
    ContentType,
    AnalysisStatus,
    ISODateString,
    StandardVideoMetadata,
    AIAnalysisResult
} from '../types/video-types';

// 로컬 VideoData 인터페이스 대신 표준 타입 사용
type VideoData = Partial<StandardVideoMetadata> & {
    platform: string;
    postUrl?: string;
    url?: string;
    videoPath?: string;
    metadata?: any;
    analysis?: Partial<AIAnalysisResult>;
    timestamp?: string;
};

// ConvertedVideoData는 FinalVideoData와 동일하게 사용
type ConvertedVideoData = FinalVideoData & {
    rowNumber: number;
    collectionTime: ISODateString;
};

export class VideoDataConverter {
    /**
     * 플랫폼별 데이터 변환 메인 메서드
     */
    static convertToSchema(platform: string, videoData: VideoData, rowNumber: number = 1): ConvertedVideoData {
        const normalizedPlatform = (platform || 'YOUTUBE').toUpperCase();

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
                error instanceof Error ? error.message : String(error),
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube 스키마로 변환 (34개 필드)
     * Google Sheets YouTube buildRowData 로직 기반
     */
    static convertToYouTubeSchema(videoData: VideoData, rowNumber: number = 1): ConvertedVideoData {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
        // ⭐ 표준화: postUrl → url 매핑
        const url = videoData.url || postUrl || '';

        // 업로드 날짜 결정 (기존 buildRowData 로직)
        let uploadDate: string;
        if (metadata?.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
        } else if (timestamp) {
            uploadDate = new Date(timestamp).toLocaleString('ko-KR');
        } else {
            uploadDate = new Date().toLocaleString('ko-KR');
        }

        // 🚨 디버깅: 입력 데이터 체크 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
            ServerLogger.debug(`🔍 DEBUG - YouTube 입력 데이터:`, {
                'metadata keys': metadata ? Object.keys(metadata) : [],
                'analysis keys': analysis ? Object.keys(analysis) : [],
                'metadata.channelName': metadata?.channelName,
                'metadata.title': metadata?.title,
                'analysis.mainCategory': analysis?.mainCategory,
                'analysis.keywords': analysis?.keywords
            }, 'DATA_CONVERTER');
        }

        // 동적 카테고리 처리 (기존 로직)
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        ServerLogger.info(
            `🔍 VideoDataConverter - Analysis 체크:`,
            {
                'analysis.fullCategoryPath': analysis?.fullCategoryPath,
                'analysis.categoryDepth': analysis?.categoryDepth,
                'analysis.fullPath': 'legacy_field_not_available',
                'analysis.depth': 'legacy_field_not_available',
            },
            'DATA_CONVERTER',
        );

        if (isDynamicMode && analysis?.fullCategoryPath) {
            fullCategoryPath = analysis.fullCategoryPath || '';
            categoryDepth = analysis.categoryDepth || 0;
        } else {
            // 동적 카테고리에서 표준 필드가 있으면 사용
            if (analysis?.fullCategoryPath) {
                fullCategoryPath = analysis.fullCategoryPath || '';
                categoryDepth = fullCategoryPath.split(' > ').length;
            } else {
                // 개선된 방식: mainCategory, middleCategory, subCategory 조합 (4+ 레벨 지원)
                const mainCat = analysis?.mainCategory || '미분류';
                const middleCat = analysis?.middleCategory || '';
                const subCat = analysis?.subCategory || '';

                // 카테고리 경로 구성: "애완동물/동물 > 강아지 > 미용/관리 > 목욕" 형태 지원
                const pathParts = [mainCat];

                if (middleCat && middleCat !== '미분류' && middleCat !== mainCat) {
                    pathParts.push(middleCat);
                }

                if (subCat && subCat !== '미분류' && subCat !== middleCat && subCat !== mainCat) {
                    pathParts.push(subCat);
                }

                // AI 응답에서 추가 세부 카테고리가 있다면 처리 (4레벨 이상)
                if (analysis?.detailCategory &&
                    analysis.detailCategory !== subCat &&
                    analysis.detailCategory !== middleCat &&
                    analysis.detailCategory !== mainCat) {
                    pathParts.push(analysis.detailCategory);
                }

                fullCategoryPath = pathParts.join(' > ');
                categoryDepth = pathParts.length;
            }
        }

        // YouTube 34개 필드 변환
        // video-types.ts 인터페이스 표준 데이터 구조
        const result: ConvertedVideoData = {
            // 자동 생성 필드
            rowNumber: rowNumber,

            // YouTube 전용 33개 필드
            uploadDate: uploadDate,
            platform: (platform || 'YOUTUBE').toUpperCase() as Platform,
            channelName: metadata?.channelName ||
                        metadata?.channel ||
                        metadata?.channelTitle ||
                        metadata?.author ||
                        metadata?.account ||
                        '',
            title: metadata?.title || '',
            youtubeHandle: metadata?.youtubeHandle || metadata?.channelCustomUrl || '',
            channelUrl: metadata?.channelUrl || '',
            mainCategory: (() => {
                ServerLogger.info('🔍 DEBUG mainCategory mapping:', {
                    'analysis?.mainCategory': analysis?.mainCategory,
                    'analysis object keys': analysis ? Object.keys(analysis) : 'analysis is null/undefined',
                    'analysis': analysis ? JSON.stringify(analysis).substring(0, 200) + '...' : 'null'
                });
                return analysis?.mainCategory || '미분류';
            })(),
            middleCategory: analysis?.middleCategory || '',
            subCategory: analysis?.subCategory || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: Array.isArray(analysis?.keywords)
                ? analysis.keywords
                : analysis?.keywords
                ? [analysis.keywords]
                : [],
            hashtags: (() => {
                // 해시태그 추출 우선순위: 1) metadata.hashtags (VideoProcessor에서 추출) 2) analysis.hashtags 3) description에서 추출
                if (Array.isArray(metadata?.hashtags) && metadata.hashtags.length > 0) {
                    return metadata.hashtags;
                }
                if (Array.isArray(analysis?.hashtags) && analysis.hashtags.length > 0) {
                    return analysis.hashtags;
                }
                if (analysis?.hashtags && typeof analysis.hashtags === 'string') {
                    return [analysis.hashtags];
                }
                // 마지막 폴백: description에서 직접 추출
                if (metadata?.description) {
                    const VideoUtils = require('./video/utils/VideoUtils').default;
                    return VideoUtils.extractHashtags(metadata.description);
                }
                return [];
            })(),
            mentions: Array.isArray(analysis?.mentions)
                ? analysis.mentions
                : analysis?.mentions
                ? [analysis.mentions]
                : [],
            description: metadata?.description || '',
            analysisContent:
                analysis?.analysisContent ||
                '',
            comments: metadata?.comments || '',
            likes: this.parseNumber(metadata?.likes),
            commentsCount: this.parseNumber(metadata?.commentsCount),
            views: this.parseNumber(metadata?.views),
            duration: metadata?.duration || '',
            contentType: (metadata?.contentType as ContentType) || 'longform',
            subscribers: this.parseNumber(metadata?.subscribers),
            channelVideos: this.parseNumber(metadata?.channelVideos),
            monetized: metadata?.monetized || '',
            youtubeCategory: metadata?.youtubeCategory || '',
            license: metadata?.license || '',
            quality: metadata?.quality || '',
            language: metadata?.language || '',
            channelId: metadata?.channelId || '',
            categoryId: metadata?.categoryId || '',
            url: url,
            shares: this.parseNumber(metadata?.shares || 0),
            topComments: (() => {
                const topCommentsValue = metadata?.topComments || '';
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
            thumbnailUrl: metadata?.thumbnailUrl || '',
            confidence: this.formatConfidence(analysis?.confidence),
            analysisStatus: analysis?.analysisStatus || 'completed',
            categoryMatchRate: (() => {
                // 직접 필드 확인 (categoryMatch 객체는 타입에 없음)
                if (analysis?.categoryMatchRate) {
                    return analysis.categoryMatchRate;
                }
                // 기본 신뢰도 기반 계산
                if (analysis?.confidence && typeof analysis.confidence === 'string') {
                    const numericConfidence = parseFloat(analysis.confidence);
                    if (!isNaN(numericConfidence)) {
                        return `${Math.round(numericConfidence * 100)}%`;
                    }
                }
                return '85%'; // 기본값
            })(),
            matchType: (() => {
                if (analysis?.matchType) {
                    return analysis.matchType;
                }
                return 'ai-analysis'; // 기본값
            })(),
            matchReason: (() => {
                if (analysis?.matchReason) {
                    return analysis.matchReason;
                }
                return 'AI 분석 결과'; // 기본값
            })(),
            collectionTime: new Date().toISOString() as ISODateString, // 수집시간
        };

        return result;
    }

    /**
     * Instagram 스키마로 변환 (20개 필드)
     * Google Sheets Instagram buildRowData 로직 기반
     */
    static convertToInstagramSchema(videoData: VideoData, rowNumber: number = 1): ConvertedVideoData {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
        // ⭐ 표준화: postUrl → url 매핑
        const url = videoData.url || postUrl || '';

        // 업로드 날짜 결정 (Instagram은 날짜만)
        let uploadDate: string;
        if (metadata && metadata.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
        } else if (videoData.uploadDate) {
            uploadDate = new Date(videoData.uploadDate).toLocaleDateString('ko-KR');
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
                'analysis.fullCategoryPath': analysis?.fullCategoryPath,
                'analysis.categoryDepth': analysis?.categoryDepth,
                'analysis.fullPath': 'legacy_field_not_available',
                'analysis.depth': 'legacy_field_not_available',
            },
            'DATA_CONVERTER',
        );

        if (isDynamicMode && analysis?.fullCategoryPath) {
            fullCategoryPath = analysis.fullCategoryPath || '';
            categoryDepth = analysis.categoryDepth || 0;
        } else {
            // 동적 카테고리에서 표준 필드가 있으면 사용
            if (analysis?.fullCategoryPath) {
                fullCategoryPath = analysis.fullCategoryPath || '';
                categoryDepth = fullCategoryPath.split(' > ').length;
            } else {
                // 개선된 방식: mainCategory, middleCategory, subCategory 조합 (4+ 레벨 지원)
                const mainCat = analysis?.mainCategory || '미분류';
                const middleCat = analysis?.middleCategory || '';
                const subCat = analysis?.subCategory || '';

                // 카테고리 경로 구성: "애완동물/동물 > 강아지 > 미용/관리 > 목욕" 형태 지원
                const pathParts = [mainCat];

                if (middleCat && middleCat !== '미분류' && middleCat !== mainCat) {
                    pathParts.push(middleCat);
                }

                if (subCat && subCat !== '미분류' && subCat !== middleCat && subCat !== mainCat) {
                    pathParts.push(subCat);
                }

                // AI 응답에서 추가 세부 카테고리가 있다면 처리 (4레벨 이상)
                if (analysis?.detailCategory &&
                    analysis.detailCategory !== subCat &&
                    analysis.detailCategory !== middleCat &&
                    analysis.detailCategory !== mainCat) {
                    pathParts.push(analysis.detailCategory);
                }

                fullCategoryPath = pathParts.join(' > ');
                categoryDepth = pathParts.length;
            }
        }

        // 🔍 DEBUG 로깅 - Instagram 데이터 변환 전 확인 (개발 환경에서만)
        ServerLogger.error(`🔍 DEBUG - Instagram 입력 데이터:`, {
            'metadata keys': metadata ? Object.keys(metadata) : [],
            'analysis keys': analysis ? Object.keys(analysis) : [],
            'metadata.channelName': metadata?.channelName,
            'metadata.channel': metadata?.channel,
            'metadata.channelTitle': metadata?.channelTitle,
            'metadata.author': metadata?.author,
            'metadata.account': metadata?.account,
            'metadata.title': metadata?.title,
            'metadata.likes': metadata?.likes,
            'metadata.views': metadata?.views,
            'metadata.comments': metadata?.comments,
            'metadata.commentsCount': metadata?.commentsCount,
            'videoData.likes': videoData.likes,
            'videoData.views': videoData.views,
            'videoData.title': videoData.title,
            'videoData.channelName': videoData.channelName,
            'analysis.mainCategory': analysis?.mainCategory,
            'analysis.keywords': analysis?.keywords
        }, 'INSTAGRAM_DATA_CONVERTER');

        // Instagram 20개 필드 변환
        // video-types.ts 인터페이스 표준 데이터 구조
        const result: ConvertedVideoData = {
            // 자동 생성 필드
            rowNumber: rowNumber,

            // Instagram 전용 19개 필드
            uploadDate: uploadDate,
            platform: (platform || 'INSTAGRAM').toUpperCase() as Platform,
            channelName: videoData.channelName ||
                        (metadata && metadata.channelName) ||
                        (metadata && metadata.channel) ||
                        (metadata && metadata.channelTitle) ||
                        (metadata && metadata.author) ||
                        (metadata && metadata.account) ||
                        '',
            title: videoData.title || (metadata && metadata.title) || '',
            channelUrl: (() => {
                // 기존 channelUrl이 있으면 사용
                let result = videoData.channelUrl || (metadata && metadata.channelUrl) || (videoData.metadata && videoData.metadata.channelUrl) || '';

                // channelUrl이 없으면 channelName으로 생성
                if (!result) {
                    const channelName = videoData.channelName ||
                                      (metadata && metadata.channelName) ||
                                      (metadata && metadata.channel) ||
                                      (metadata && metadata.channelTitle) ||
                                      (metadata && metadata.author) ||
                                      (metadata && metadata.account) ||
                                      '';
                    if (channelName) {
                        // Instagram URL 생성: https://www.instagram.com/{username}/
                        const username = channelName.startsWith('@') ? channelName.slice(1) : channelName;
                        result = `https://www.instagram.com/${username}/`;
                    }
                }

                console.log(`🔍 [Instagram VideoDataConverter] channelUrl 디버그:`, {
                    'videoData.channelUrl': videoData.channelUrl,
                    'metadata?.channelUrl': metadata?.channelUrl,
                    'channelName': videoData.channelName || metadata?.channelName,
                    'final result': result
                });
                return result;
            })(),
            mainCategory: (analysis && analysis.mainCategory) || '미분류',
            middleCategory: (analysis && analysis.middleCategory) || '',
            subCategory: (analysis && analysis.subCategory) || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: analysis?.keywords || [],
            hashtags: analysis?.hashtags || [],
            mentions: analysis?.mentions || [],
            description: videoData.description || (metadata && metadata.description) || '',
            analysisContent: analysis?.analysisContent || '',
            likes: this.parseNumber(videoData.likes || (metadata && metadata.likes) || 0),
            views: this.parseNumber(videoData.views || (metadata && metadata.views) || 0),
            commentsCount: this.parseNumber(videoData.comments || videoData.commentsCount || (metadata && metadata.commentsCount) || 0),
            shares: this.parseNumber((metadata && metadata.shares) || 0),
            subscribers: this.parseNumber((metadata && metadata.subscribers) || 0),
            channelVideos: this.parseNumber((metadata && metadata.channelVideos) || 0),
            contentType: (metadata && metadata.contentType) || 'shortform',
            quality: (metadata && metadata.quality) || '',
            language: (metadata && metadata.language) || '',
            topComments: (metadata && metadata.topComments) || '',
            comments: (metadata && metadata.comments) || '',
            youtubeHandle: '', // Instagram에서는 빈값
            monetized: '', // Instagram에서는 빈값
            youtubeCategory: '', // Instagram에서는 빈값
            categoryId: '', // Instagram에서는 빈값
            license: '', // Instagram에서는 빈값
            duration: (metadata && metadata.duration) || '0:30', // Instagram 기본 길이
            channelId: (metadata && metadata.channelId) || '',
            url: url,
            thumbnailUrl: (metadata && metadata.thumbnailUrl) || videoData.thumbnailUrl || '',
            confidence: this.formatConfidence((analysis && analysis.confidence) || 0),
            analysisStatus: analysis?.analysisStatus || 'completed',
            collectionTime: new Date().toISOString() as ISODateString,
        };

        return result;
    }

    /**
     * TikTok 스키마로 변환 (24개 필드)
     * TikTok 전용 필드들을 포함한 스프레드시트 형태
     */
    static convertToTikTokSchema(videoData: VideoData, rowNumber: number = 1): ConvertedVideoData {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;
        const url = videoData.url || postUrl || '';

        // 디버깅: TikTok 메타데이터 확인
        ServerLogger.info('🔍 STEP2 - VideoDataConverter 입력 메타데이터:', {
            thumbnailUrl: metadata?.thumbnailUrl,
            language: metadata?.language,
            description: metadata?.description
        });

        // 업로드 날짜 결정
        let uploadDate: string;
        if (metadata?.uploadDate) {
            uploadDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
        } else if (timestamp) {
            uploadDate = new Date(timestamp).toLocaleString('ko-KR');
        } else {
            uploadDate = new Date().toLocaleDateString('ko-KR');
        }

        // 동적 카테고리 처리
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        if (isDynamicMode && analysis?.fullCategoryPath) {
            fullCategoryPath = analysis.fullCategoryPath || '';
            categoryDepth = analysis.categoryDepth || 0;
        } else {
            // 개선된 방식: mainCategory, middleCategory, subCategory 조합 (4+ 레벨 지원)
            const mainCat = analysis?.mainCategory || '엔터테인먼트';
            const middleCat = analysis?.middleCategory || '';
            const subCat = analysis?.subCategory || '';

            // 카테고리 경로 구성: "애완동물/동물 > 강아지 > 미용/관리 > 목욕" 형태 지원
            const pathParts = [mainCat];

            if (middleCat && middleCat !== '미분류' && middleCat !== mainCat) {
                pathParts.push(middleCat);
            }

            if (subCat && subCat !== '미분류' && subCat !== middleCat && subCat !== mainCat) {
                pathParts.push(subCat);
            }

            // AI 응답에서 추가 세부 카테고리가 있다면 처리 (4레벨 이상)
            if (analysis?.detailCategory &&
                analysis.detailCategory !== subCat &&
                analysis.detailCategory !== middleCat &&
                analysis.detailCategory !== mainCat) {
                pathParts.push(analysis.detailCategory);
            }

            fullCategoryPath = pathParts.join(' > ');
            categoryDepth = pathParts.length;
        }

        const result: ConvertedVideoData = {
            rowNumber: rowNumber,
            platform: 'TIKTOK' as Platform,
            channelName: metadata?.channelName || '알 수 없음',
            channelUrl: (() => {
                // 기존 channelUrl이 있으면 사용
                let result = videoData.channelUrl || (metadata && metadata.channelUrl) || (videoData.metadata && videoData.metadata.channelUrl) || '';

                // channelUrl이 없으면 channelName으로 생성
                if (!result) {
                    const channelName = metadata?.channelName ||
                                      metadata?.channel ||
                                      metadata?.channelTitle ||
                                      metadata?.author ||
                                      metadata?.account ||
                                      '';
                    if (channelName) {
                        // TikTok URL 생성: https://www.tiktok.com/@{username}
                        const username = channelName.startsWith('@') ? channelName : `@${channelName}`;
                        result = `https://www.tiktok.com/${username}`;
                    }
                }

                console.log(`🔍 [TikTok VideoDataConverter] channelUrl 디버그:`, {
                    'videoData.channelUrl': videoData.channelUrl,
                    'metadata?.channelUrl': metadata?.channelUrl,
                    'channelName': metadata?.channelName,
                    'final result': result
                });
                return result;
            })(),
            url: url,
            title: metadata?.title || '제목 없음',
            uploadDate: uploadDate,
            views: metadata?.views || 0,
            likes: metadata?.likes || 0,
            commentsCount: metadata?.commentsCount || metadata?.comments || 0,
            shares: metadata?.shares || 0,
            subscribers: this.parseNumber(metadata?.subscribers || 0),
            channelVideos: this.parseNumber(metadata?.channelVideos || 0),
            duration: metadata?.durationFormatted || '0:30',
            contentType: (metadata?.contentType as ContentType) || 'shortform',
            quality: metadata?.quality || '',
            topComments: metadata?.topComments || '',
            comments: metadata?.comments || '',
            youtubeHandle: '', // TikTok에서는 빈값
            monetized: '', // TikTok에서는 빈값
            youtubeCategory: '', // TikTok에서는 빈값
            categoryId: '', // TikTok에서는 빈값
            license: '', // TikTok에서는 빈값
            mainCategory: analysis?.mainCategory || '엔터테인먼트',
            middleCategory: analysis?.middleCategory || '',
            subCategory: analysis?.subCategory || '',
            fullCategoryPath: fullCategoryPath,
            categoryDepth: categoryDepth,
            keywords: Array.isArray(analysis?.keywords)
                ? analysis.keywords
                : analysis?.keywords
                ? [analysis.keywords as string]
                : [],
            hashtags: Array.isArray(metadata?.hashtags)
                ? metadata.hashtags
                : metadata?.hashtags
                ? [metadata.hashtags as string]
                : [],
            mentions: Array.isArray(metadata?.mentions)
                ? metadata.mentions
                : metadata?.mentions
                ? [metadata.mentions as string]
                : [],
            thumbnailUrl: metadata?.thumbnailUrl || '',
            language: metadata?.language || '',
            description: metadata?.description || '',
            analysisContent: analysis?.analysisContent || '',
            channelId: metadata?.channelId || '',
            collectionTime: new Date().toISOString() as ISODateString
        };

        ServerLogger.info(`🔍 STEP2 - VideoDataConverter 출력 language: '${result.language}'`);
        return result;
    }

    /**
     * 숫자 파싱 헬퍼 함수
     * 문자열 숫자를 정수로 변환, 실패 시 0 반환
     */
    static parseNumber(value: any): number {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        const parsed = parseInt(String(value));
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * 신뢰도 포맷 헬퍼 함수
     * analysis.confidence를 백분율 문자열로 변환
     */
    static formatConfidence(confidence: any): string {
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
     */
    static convertRowDataToDocument(rowData: any[], platform: string): any {
        const normalizedPlatform = (platform || 'YOUTUBE').toUpperCase();

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
                error instanceof Error ? error.message : String(error),
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube Google Sheets 행을 MongoDB 문서로 변환
     * video-types.ts 인터페이스 표준 데이터 구조
     */
    static convertYouTubeRowToDocument(rowData: any[]): any {
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
            analysisStatus: rowData[30] || 'completed',
            categoryMatchRate: rowData[31] || '',
            matchType: rowData[32] || '',
            matchReason: rowData[33] || '',
            collectionTime: new Date(),
        };
    }

    /**
     * Instagram Google Sheets 행을 MongoDB 문서로 변환
     * video-types.ts 인터페이스 표준 데이터 구조
     */
    static convertInstagramRowToDocument(rowData: any[]): any {
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
            analysisStatus: rowData[19] || 'completed',
            collectionTime: new Date(),
        };
    }

    /**
     * TikTok Google Sheets 행을 MongoDB 문서로 변환
     */
    static convertTikTokRowToDocument(rowData: any[]): any {
        return {
            title: rowData[4] || '제목 없음',
            channelName: rowData[2] || '알 수 없음',
            url: rowData[3] || '',
            platform: 'TIKTOK',
            views: parseInt(String(rowData[6])) || 0,
            likes: parseInt(String(rowData[7])) || 0,
            commentsCount: parseInt(String(rowData[8])) || 0,
            shares: parseInt(String(rowData[9])) || 0,
            uploadDate: rowData[5] || new Date().toISOString(),
            duration: rowData[10] || '0:30',
            contentType: rowData[11] || 'shortform',
            category: rowData[12] || '엔터테인먼트',
            mainCategory: rowData[13] || '엔터테인먼트',
            middleCategory: rowData[14] || '',
            fullCategoryPath: rowData[15] || '엔터테인먼트',
            categoryDepth: parseInt(String(rowData[16])) || 1,
            keywords: rowData[17] || '',
            hashtags: rowData[18] || '',
            mentions: rowData[19] || '',
            musicTitle: rowData[20] || '',
            musicAuthor: rowData[21] || '',
            originalSound: rowData[22] === 'true' || false,
            channelVerified: rowData[23] === 'true' || false,
            isCommercial: rowData[24] === 'true' || false,
            thumbnailUrl: '',
            collectionTime: new Date()
        };
    }

    /**
     * MongoDB 문서를 Google Sheets 행 데이터로 역변환
     */
    static convertDocumentToRowData(document: any, platform: string): any[] {
        const normalizedPlatform = (platform || 'YOUTUBE').toUpperCase();

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
                error instanceof Error ? error.message : String(error),
                'DATA_CONVERTER',
            );
            throw error;
        }
    }

    /**
     * YouTube MongoDB 문서를 Google Sheets 행으로 역변환
     * video-types.ts 인터페이스 표준 데이터 구조
     */
    static convertYouTubeDocumentToRow(document: any): any[] {
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
            document.analysisStatus || 'completed',
            document.categoryMatchRate || '',
            document.matchType || '',
            document.matchReason || '',
        ];
    }

    /**
     * Instagram MongoDB 문서를 Google Sheets 행으로 역변환
     * video-types.ts 인터페이스 표준 데이터 구조
     */
    static convertInstagramDocumentToRow(document: any): any[] {
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
            document.analysisStatus || 'completed',
        ];
    }

    /**
     * 플랫폼별 필드 개수 반환
     */
    static getFieldCount(platform: string): number {
        const normalizedPlatform = (platform || 'YOUTUBE').toUpperCase();

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
     * 변환 로그 출력
     */
    static logConversion(platform: string, originalData: any, convertedData: any): void {
        ServerLogger.info(
            `데이터 변환 완료: ${(platform || 'YOUTUBE').toUpperCase()}`,
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
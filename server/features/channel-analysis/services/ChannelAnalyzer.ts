/**
 * 🤖 Channel AI Analysis Service
 * 채널 AI 분석 및 YouTube API 처리 전담 서비스
 */

import {
    ChannelData,
    YouTubeChannelData,
    ChannelAnalysisResult,
} from '../../../types/channel.types';
import { ServerLogger } from '../../../utils/logger';

const YouTubeChannelService = require('../../../services/YouTubeChannelDataCollector');
const YouTubeChannelAnalyzer = require('../../../services/youtube/YouTubeChannelAnalyzer');

export class ChannelAnalyzer {
    private youtubeService: any;
    private youtubeAnalyzer: any;

    constructor() {
        this.youtubeService = new YouTubeChannelService();
        this.youtubeAnalyzer = new YouTubeChannelAnalyzer();
    }

    /**
     * 📊 YouTube API에서 채널 상세 분석 후 데이터 생성
     */
    async analyzeChannelWithAI(
        channelIdentifier: string,
        userKeywords: string[] = [],
        _includeAnalysis: boolean = true,  // _ prefix로 의도적으로 사용 안 함 표시
        skipAIAnalysis: boolean = false,
        _queueNormalizedChannelId: string | null = null,  // _ prefix로 의도적으로 사용 안 함 표시
    ): Promise<ChannelData> {
        try {
            ServerLogger.info(`🚀 AI 채널 분석 시작`);

            // URL 디코딩 처리
            const decodedChannelIdentifier =
                decodeURIComponent(channelIdentifier);

            ServerLogger.info(
                `🔍 YouTube 채널 상세 분석: ${decodedChannelIdentifier}`,
            );

            // 1. 기본 채널 정보 가져오기
            let youtubeData: YouTubeChannelData | null = null;

            // 영상 URL인지 채널 식별자인지 판별
            if (
                decodedChannelIdentifier.includes('/watch') ||
                decodedChannelIdentifier.includes('/shorts/')
            ) {
                // 영상 URL에서 채널 정보 추출
                youtubeData = await this.extractChannelFromVideo(
                    decodedChannelIdentifier,
                );
            } else {
                // 채널 식별자로 직접 검색
                youtubeData = await this.youtubeService.getChannelInfo(
                    decodedChannelIdentifier,
                );
            }

            if (!youtubeData) {
                throw new Error(
                    `YouTube에서 채널을 찾을 수 없음: ${decodedChannelIdentifier}`,
                );
            }

            let analysisData: ChannelAnalysisResult | null = null;

            // 2. 상세 분석 수행 (선택적)
            const enableContentAnalysis = !skipAIAnalysis;

            ServerLogger.info(`🔍 AI 분석 설정 확인:`, {
                skipAIAnalysis,
                enableContentAnalysis,
                willRunAIAnalysis: !skipAIAnalysis,
            });

            // AI 분석 수행
            if (enableContentAnalysis) {
                analysisData = await this.performDetailedAnalysis(
                    youtubeData,
                    userKeywords,
                    skipAIAnalysis,
                );
            }

            // 3. 채널 데이터 구성
            const channelData = this.buildChannelData(
                youtubeData,
                analysisData,
                userKeywords,
                skipAIAnalysis,
            );

            // 4. AI 재해석 수행 (사용자 카테고리가 있는 경우)
            if (
                userKeywords &&
                userKeywords.length > 0 &&
                analysisData &&
                !skipAIAnalysis
            ) {
                await this.performAIReinterpretation(
                    channelData,
                    userKeywords,
                    analysisData,
                );
            }

            return channelData;
        } catch (error) {
            ServerLogger.error(
                `❌ AI 채널 분석 실패: ${channelIdentifier}`,
                error,
            );
            throw error;
        }
    }

    /**
     * 🎥 영상 URL에서 채널 정보 추출
     */
    private async extractChannelFromVideo(
        videoUrl: string,
    ): Promise<YouTubeChannelData | null> {
        try {
            ServerLogger.info(`🎥 영상 URL에서 채널 정보 추출: ${videoUrl}`);
            const VideoProcessor = require('../../../../dist/server/services/video/VideoProcessor');
            const videoProcessor = new VideoProcessor();

            const videoInfo = await videoProcessor.getYouTubeVideoInfo(
                videoUrl,
            );
            if (videoInfo && videoInfo.channelId && videoInfo.channelName) {
                return {
                    id: videoInfo.channelId,
                    channelName: videoInfo.channelName,
                    channelUrl: `https://www.youtube.com/channel/${videoInfo.channelId}`,
                    subscriberCount: videoInfo.subscriberCount || 0,
                };
            }
            return null;
        } catch (error) {
            ServerLogger.warn(`⚠️ 영상에서 채널 정보 추출 실패: ${error}`);
            return null;
        }
    }

    /**
     * 🔬 상세 AI 분석 수행
     */
    private async performDetailedAnalysis(
        youtubeData: YouTubeChannelData,
        _userKeywords: string[],  // _ prefix로 의도적으로 사용 안 함 표시
        skipAIAnalysis: boolean,
    ): Promise<ChannelAnalysisResult | null> {
        try {
            ServerLogger.info(
                `🔍 AI 분석 수행: enableContentAnalysis=${!skipAIAnalysis}`,
            );

            // 향상된 분석 수행
            const maxVideos = skipAIAnalysis ? 50 : 100;
            const analysisResult =
                await this.youtubeAnalyzer.analyzeChannelEnhanced(
                    youtubeData.id,
                    maxVideos,
                    true, // 항상 콘텐츠 분석 활성화 (channelIdentity를 위해)
                    youtubeData, // YouTube API 채널 통계 전달
                );

            ServerLogger.info(`🔍 분석 결과 구조:`, {
                hasAnalysis: !!analysisResult.analysis,
                hasEnhancedAnalysis: !!analysisResult.enhancedAnalysis,
                skipAIAnalysis,
                analysisResultKeys: Object.keys(analysisResult),
            });

            // 🔍 channelIdentity 데이터 확인 로깅 (숏폼/롱폼 구조 모두 지원)
            const identity = analysisResult.enhancedAnalysis?.channelIdentity ||
                           analysisResult.analysis?.enhancedAnalysis?.channelIdentity;

            if (identity) {
                ServerLogger.info(`🔍 AI 분석에서 추출된 channelIdentity:`, {
                    targetAudience: identity.targetAudience,
                    contentStyle: identity.contentStyle?.substring(0, 50) + '...',
                    uniqueFeatures: identity.uniqueFeatures,
                    channelPersonality: identity.channelPersonality,
                });
            } else {
                ServerLogger.warn(`⚠️ channelIdentity를 찾을 수 없음 (숏폼/롱폼 구조 모두 확인함)`);
            }

            // 전체 분석 결과 반환 (analysis와 enhancedAnalysis 모두 포함)
            return analysisResult;
        } catch (error) {
            ServerLogger.warn(`⚠️ AI 분석 실패, 기본 정보만 사용: ${error}`);
            return null;
        }
    }

    /**
     * 📋 채널 데이터 구성
     */
    private buildChannelData(
        youtubeData: YouTubeChannelData,
        analysisData: ChannelAnalysisResult | null,
        userKeywords: string[],
        skipAIAnalysis: boolean,
    ): ChannelData {
        const channelData: ChannelData = {
            channelId: youtubeData.id,
            name: youtubeData.channelName,
            url: youtubeData.channelUrl,
            platform: 'YOUTUBE',

            // YouTube API 기본 정보
            subscribers: youtubeData.subscribers || youtubeData.subscriberCount || 0,
            description: youtubeData.description || '',
            thumbnailUrl: youtubeData.thumbnailUrl || '',
            customUrl: youtubeData.customUrl || '',
            publishedAt: youtubeData.publishedAt || '',

            // 언어 및 지역 정보
            defaultLanguage: youtubeData.defaultLanguage || '',
            country: youtubeData.country || '',

            // 상세 분석 정보 추가
            ...(analysisData?.analysis && {
                dailyUploadRate: analysisData.analysis.dailyUploadRate,
                last7DaysViews: analysisData.analysis.last7DaysViews,
                avgDurationSeconds: analysisData.analysis.avgDurationSeconds,
                avgDurationFormatted:
                    analysisData.analysis.avgDurationFormatted,
                shortFormRatio: analysisData.analysis.shortFormRatio,
                viewsByPeriod: analysisData.analysis.viewsByPeriod,
                totalVideos: analysisData.analysis.totalVideos,
                totalViews: analysisData.analysis.totalViews,
                averageViewsPerVideo:
                    analysisData.analysis.averageViewsPerVideo,
                uploadFrequency: analysisData.analysis.uploadFrequency,
                mostViewedVideo: analysisData.analysis.mostViewedVideo,
                lastAnalyzedAt: new Date().toISOString(),
                analysisVersion: '1.0.0',
            }),

            // 사용자 입력 정보
            keywords:
                userKeywords && userKeywords.length > 0 ? userKeywords : [],

            // AI 태그 (두 구조 모두 지원)
            aiTags: skipAIAnalysis
                ? []
                : (analysisData?.enhancedAnalysis?.channelIdentity?.channelTags ||
                   analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.channelTags || []),
            deepInsightTags: [], // 재해석으로 채움
            allTags: skipAIAnalysis
                ? [...(userKeywords || [])]
                : [
                      ...(userKeywords || []),
                      ...(analysisData?.enhancedAnalysis?.channelIdentity?.channelTags ||
                         analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.channelTags || []),
                  ].filter((tag, index, arr) => arr.indexOf(tag) === index),

            // channelIdentity 필드들 (AI 분석 결과에서 추출 - 두 구조 모두 지원)
            targetAudience: skipAIAnalysis
                ? ''
                : (analysisData?.enhancedAnalysis?.channelIdentity?.targetAudience ||
                   analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.targetAudience || ''),
            contentStyle: skipAIAnalysis
                ? ''
                : (analysisData?.enhancedAnalysis?.channelIdentity?.contentStyle ||
                   analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.contentStyle || ''),
            uniqueFeatures: skipAIAnalysis
                ? []
                : (analysisData?.enhancedAnalysis?.channelIdentity?.uniqueFeatures ||
                   analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.uniqueFeatures || []),
            channelPersonality: skipAIAnalysis
                ? ''
                : (analysisData?.enhancedAnalysis?.channelIdentity?.channelPersonality ||
                   analysisData?.analysis?.enhancedAnalysis?.channelIdentity?.channelPersonality || ''),

            // 클러스터 정보
            clusterIds: [],
            suggestedClusters: [],

            // 콘텐츠 타입
            contentType:
                (analysisData?.analysis?.shortFormRatio ?? 0) > 70
                    ? 'shortform'
                    : (analysisData?.analysis?.shortFormRatio ?? 0) < 30
                    ? 'longform'
                    : 'mixed',

            // 메타데이터
            collectedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
        };

        // 🔍 channelIdentity 필드 할당 후 디버그 로깅
        ServerLogger.info(
            `🔍 DB 저장 targetAudience: "${channelData.targetAudience}"`,
        );
        ServerLogger.info(
            `🔍 DB 저장 contentStyle: "${channelData.contentStyle.substring(
                0,
                50,
            )}..."`,
        );
        ServerLogger.info(
            `🔍 DB 저장 uniqueFeatures: ${JSON.stringify(
                channelData.uniqueFeatures,
            )}`,
        );
        ServerLogger.info(
            `🔍 DB 저장 channelPersonality: "${channelData.channelPersonality}"`,
        );

        return channelData;
    }

    /**
     * 🔄 AI 재해석 수행
     */
    private async performAIReinterpretation(
        channelData: ChannelData,
        userKeywords: string[],
        analysisData: ChannelAnalysisResult | null,
    ): Promise<void> {
        try {
            ServerLogger.info(
                `🔄 사용자 카테고리 기반 AI 재해석 시작: ${userKeywords.join(
                    ', ',
                )}`,
            );

            // analysisResult에서 개별 영상 분석 데이터 가져오기
            const videoAnalyses = analysisData?.analysis?.videoAnalyses || [];

            const deepInsightTags =
                await this.youtubeAnalyzer.reinterpretWithUserCategory(
                    userKeywords,
                    channelData.aiTags,
                    videoAnalyses,
                    {
                        id: channelData.channelId,
                        channelName: channelData.name,
                    },
                );

            if (deepInsightTags && deepInsightTags.length > 0) {
                channelData.deepInsightTags = deepInsightTags;

                // allTags 업데이트
                channelData.allTags = [
                    ...(userKeywords || []),
                    ...deepInsightTags,
                    ...channelData.aiTags,
                ].filter((tag, index, arr) => arr.indexOf(tag) === index);

                ServerLogger.success(
                    `✅ AI 재해석 완료: ${deepInsightTags.length}개 태그 생성`,
                );
            }
        } catch (reinterpretError) {
            ServerLogger.warn(`⚠️ AI 재해석 실패: ${reinterpretError}`);
            // 실패해도 기본 분석은 계속 진행
        }
    }

    /**
     * 🔍 YouTube API에서 채널 기본 정보만 가져오기
     */
    async getBasicChannelInfo(
        channelIdentifier: string,
        userKeywords: string[] = [],
    ): Promise<ChannelData> {
        try {
            const decodedChannelIdentifier =
                decodeURIComponent(channelIdentifier);

            ServerLogger.info(
                `🔍 YouTube에서 채널 기본 정보 수집: ${decodedChannelIdentifier}`,
            );

            // YouTube API에서 채널 정보 가져오기
            const youtubeData = await this.youtubeService.getChannelInfo(
                decodedChannelIdentifier,
            );

            if (!youtubeData) {
                throw new Error(
                    `YouTube에서 채널을 찾을 수 없음: ${decodedChannelIdentifier}`,
                );
            }

            // 기본 채널 데이터 구성 (AI 분석 없음)
            const channelData: ChannelData = {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
                url: youtubeData.channelUrl,
                platform: 'YOUTUBE',

                // YouTube API에서 가져온 정보
                subscribers: youtubeData.subscribers || youtubeData.subscriberCount || 0,
                description: youtubeData.description || '',
                thumbnailUrl: youtubeData.thumbnailUrl || '',
                customUrl: youtubeData.customUrl || '',
                publishedAt: youtubeData.publishedAt || '',

                // 언어 및 지역 정보
                defaultLanguage: youtubeData.defaultLanguage || '',
                country: youtubeData.country || '',

                // 사용자 입력 키워드
                keywords: Array.isArray(userKeywords) ? userKeywords : [],

                // 기본값들
                aiTags: [],
                deepInsightTags: [],  // 필수 필드 추가
                allTags: userKeywords || [],
                clusterIds: [],
                suggestedClusters: [],
                contentType: 'mixed',

                // channelIdentity 기본값 (AI 분석 없는 경우)
                targetAudience: '',
                contentStyle: '',
                uniqueFeatures: [],
                channelPersonality: '',

                // 메타데이터 (누락된 필드들)
                collectedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
            } as ChannelData;

            return channelData;
        } catch (error) {
            ServerLogger.error(
                `❌ YouTube 채널 기본 정보 수집 실패: ${channelIdentifier}`,
                error,
            );
            throw error;
        }
    }
}

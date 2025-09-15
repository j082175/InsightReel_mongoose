const fs = require('fs').promises;
const path = require('path');
const { ServerLogger } = require('../../utils/logger');
const YouTubeChannelService = require('../../services/YouTubeChannelService');
const YouTubeChannelAnalyzer = require('../../services/YouTubeChannelAnalyzer');
const Channel = require('../../models/ChannelModel');
const DuplicateCheckManager = require('../../models/DuplicateCheckManager');

/**
 * 📊 채널 분석 서비스
 * YouTube 채널 분석, 클러스터링, 데이터 관리를 담당
 */
class ChannelAnalysisService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data');
        this.channelsFile = path.join(this.dataPath, 'channels.json');
        this.youtubeService = new YouTubeChannelService();
        this.youtubeAnalyzer = new YouTubeChannelAnalyzer();

        this.initialize();
    }

    /**
     * 🚀 초기화
     */
    async initialize() {
        try {
            // 데이터 폴더 생성
            await fs.mkdir(this.dataPath, { recursive: true });

            // 기존 데이터 로드
            await this.loadChannels();

            const channelCount = await Channel.countDocuments().catch(() => 0);
            ServerLogger.success('✅ ChannelAnalysisService 초기화 완료', {
                channelCount: channelCount,
            });
        } catch (error) {
            ServerLogger.error('❌ ChannelAnalysisService 초기화 실패', error);
            throw error;
        }
    }

    /**
     * 📚 채널 데이터 초기화 (백업 파일 확인만)
     */
    async loadChannels() {
        try {
            // 백업 파일 존재 확인 (파일이 없으면 생성)
            try {
                await fs.access(this.channelsFile);
                ServerLogger.info('✅ 백업 파일 확인 완료: channels.json');
            } catch (fileError) {
                if (fileError.code === 'ENOENT') {
                    // 백업 파일이 없으면 빈 배열로 생성
                    await fs.writeFile(this.channelsFile, '[]', 'utf8');
                    ServerLogger.info(
                        '📝 새로운 백업 파일 생성: channels.json',
                    );
                } else {
                    throw fileError;
                }
            }

            // MongoDB 연결 상태 확인
            try {
                const count = await Channel.countDocuments();
                ServerLogger.info('🍃 MongoDB 연결 확인 완료', {
                    channelCount: count,
                });
            } catch (mongoError) {
                ServerLogger.warn(
                    '⚠️ MongoDB 연결 실패, 백업 파일만 사용 가능',
                    mongoError,
                );
            }

            ServerLogger.success(
                '✅ ChannelAnalysisService 초기화 완료 (MongoDB 전용 모드)',
            );
        } catch (error) {
            ServerLogger.error('❌ 채널 데이터 초기화 실패', error);
            throw error;
        }
    }

    /**
     * 🔄 백업 파일 동기화 (MongoDB → JSON)
     * 주기적으로 호출하거나 중요한 변경 후 호출
     */
    async syncBackupFile() {
        try {
            // MongoDB에서 모든 채널 가져오기
            const mongoChannels = await Channel.find({}).lean();

            // 백업 파일에 저장
            await fs.writeFile(
                this.channelsFile,
                JSON.stringify(mongoChannels, null, 2),
                'utf8',
            );

            ServerLogger.info('🔄 백업 파일 동기화 완료', {
                channelCount: mongoChannels.length,
            });

            return mongoChannels.length;
        } catch (error) {
            ServerLogger.warn('⚠️ 백업 파일 동기화 실패', error);
            throw error;
        }
    }

    /**
     * 💾 채널 데이터 백업 파일 저장 (MongoDB 데이터 기준)
     */
    async saveChannels() {
        try {
            // MongoDB에서 모든 채널 가져와서 백업
            const allChannels = await Channel.find({}).lean();

            await fs.writeFile(
                this.channelsFile,
                JSON.stringify(allChannels, null, 2),
                'utf8',
            );

            ServerLogger.debug('💾 백업 파일 저장 완료', {
                count: allChannels.length,
            });
        } catch (error) {
            ServerLogger.error('❌ 백업 파일 저장 실패', error);
            throw error;
        }
    }

    /**
     * 🍃 MongoDB에 채널 데이터 저장
     */
    async saveToMongoDB(channelData) {
        try {
            // MongoDB upsert (존재하면 업데이트, 없으면 생성)
            // Channel 스키마에서는 'id' 필드를 사용하므로 '_id' 대신 'id'로 조회
            const result = await Channel.findOneAndUpdate(
                { channelId: channelData.channelId },
                channelData,
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                },
            );

            // 안전한 날짜 비교 (Date 객체 변환)
            const createdAt = result.createdAt instanceof Date ? result.createdAt : new Date(result.createdAt);
            const updatedAt = result.updatedAt instanceof Date ? result.updatedAt : new Date(result.updatedAt);
            
            ServerLogger.debug('🍃 MongoDB 채널 저장 완료', {
                channelId: channelData.channelId,
                name: channelData.name,
                isNew:
                    !result.updatedAt ||
                    createdAt.getTime() === updatedAt.getTime(),
            });

            return result;
        } catch (error) {
            ServerLogger.error('❌ MongoDB 채널 저장 실패', error);
            // MongoDB 저장 실패는 전체 프로세스를 중단하지 않음 (graceful degradation)
            throw error;
        }
    }

    /**
     * 📊 YouTube API에서 채널 상세 분석 후 생성/업데이트
     */
    async createOrUpdateWithAnalysis(
        channelIdentifier,
        userKeywords = [],
        includeAnalysis = true,
        skipAIAnalysis = false,
    ) {
        try {
            // URL 디코딩 처리
            const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
            
            ServerLogger.info(
                `🔍 YouTube 채널 상세 분석: ${decodedChannelIdentifier}`,
            );

            // 1. 기본 채널 정보 가져오기 (채널 ID 확인용)
            const youtubeData = await this.youtubeService.getChannelInfo(
                decodedChannelIdentifier,
            );

            if (!youtubeData) {
                throw new Error(
                    `YouTube에서 채널을 찾을 수 없음: ${decodedChannelIdentifier}`,
                );
            }

            // 🚨 중복검사 - 리소스 사용 전에 즉시 확인
            const existing = await Channel.findOne({
                channelId: youtubeData.id,
            });
            if (existing) {
                ServerLogger.warn(
                    `⚠️ 중복 분석 차단: 채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
                throw new Error(
                    `채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
            }

            ServerLogger.info('🆕 새 채널 - 분석 진행', {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
            });

            let analysisData = null;

            // 2. 상세 분석 수행 (선택적)
            // DEBUG 로그는 개발 환경에서만
            if (process.env.NODE_ENV === 'development') {
                ServerLogger.debug(
                    `🔍 ChannelAnalysisService DEBUG: includeAnalysis = ${includeAnalysis}, skipAIAnalysis = ${skipAIAnalysis}, channelId = ${youtubeData.id}`,
                );
            }
            if (includeAnalysis) {
                try {
                    // skipAIAnalysis가 true면 AI 콘텐츠 분석만 건너뛰고 기본 통계는 수집
                    const enableContentAnalysis = !skipAIAnalysis;

                    // 향상된 분석 수행
                    const analysisResult =
                        await this.youtubeAnalyzer.analyzeChannelEnhanced(
                            youtubeData.id,
                            200,
                            enableContentAnalysis, // AI 분석 여부
                        );
                    analysisData = analysisResult.analysis;

                    // 향상된 분석 데이터가 있으면 추가
                    if (analysisResult.enhancedAnalysis) {
                        analysisData.enhancedAnalysis =
                            analysisResult.enhancedAnalysis;
                        if (skipAIAnalysis) {
                            ServerLogger.success(
                                `📊 기본 통계 분석 완료: ${analysisResult.videosCount}개 영상 (AI 분석 건너뜀)`,
                            );
                        } else {
                            ServerLogger.success(
                                `🎬 향상된 채널 분석 완료: ${analysisResult.videosCount}개 영상 + AI 콘텐츠 분석`,
                            );
                        }
                    } else {
                        if (skipAIAnalysis) {
                            ServerLogger.success(
                                `📊 기본 통계 분석 완료: ${analysisResult.videosCount}개 영상`,
                            );
                        } else {
                            ServerLogger.success(
                                `📊 채널 분석 완료: ${analysisResult.videosCount}개 영상 분석`,
                            );
                        }
                    }
                } catch (analysisError) {
                    ServerLogger.warn(
                        `⚠️ 채널 분석 실패, 기본 정보만 저장: ${analysisError.message}`,
                    );
                }
            } else {
                ServerLogger.warn(
                    `⚠️ 상세 분석 건너뜀: includeAnalysis = ${includeAnalysis}`,
                );
            }

            // 3. 채널 데이터 구성
            const channelData = {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
                url: youtubeData.channelUrl,
                platform: 'YOUTUBE',

                // YouTube API 기본 정보
                subscribers: youtubeData.subscribers,
                description: youtubeData.description,
                thumbnailUrl: youtubeData.thumbnailUrl,
                customUrl: youtubeData.customUrl,
                publishedAt: youtubeData.publishedAt, // 채널 생성일

                // 상세 분석 정보 (요청한 6가지 + α)
                ...(analysisData && {
                    // 1. 채널 설명 (이미 description에 포함)

                    // 2. 일평균 업로드
                    dailyUploadRate: analysisData.dailyUploadRate,

                    // 3. 최근 7일 조회수
                    last7DaysViews: analysisData.last7DaysViews,

                    // 4. 영상 평균시간
                    avgDurationSeconds: analysisData.avgDurationSeconds,
                    avgDurationFormatted: analysisData.avgDurationFormatted,

                    // 5. 숏폼 비율
                    shortFormRatio: analysisData.shortFormRatio,

                    // 6. 채널 일별 조회수 (기간별)
                    viewsByPeriod: analysisData.viewsByPeriod,

                    // 추가 통계
                    totalVideos: analysisData.totalVideos,
                    totalViews: analysisData.totalViews,
                    averageViewsPerVideo: analysisData.averageViewsPerVideo,
                    uploadFrequency: analysisData.uploadFrequency,
                    mostViewedVideo: analysisData.mostViewedVideo,

                    // 분석 메타데이터
                    lastAnalyzedAt: new Date(),
                    analysisVersion: '1.0',
                }),

                // 사용자 입력 정보
                keywords: Array.isArray(userKeywords) ? userKeywords : [],

                // AI 태그 (향상된 분석에서 추출 또는 빈 배열)
                aiTags: skipAIAnalysis
                    ? []
                    : analysisData?.enhancedAnalysis?.channelIdentity?.channelTags || [],
                deepInsightTags: [], // 일단 빈 배열로 초기화, 나중에 재해석으로 채움
                allTags: skipAIAnalysis
                    ? [...(userKeywords || [])]
                    : [
                          ...(userKeywords || []),
                          ...(analysisData?.enhancedAnalysis?.channelIdentity
                              ?.channelTags || []),
                      ].filter((tag, index, arr) => arr.indexOf(tag) === index), // 중복 제거
                clusterIds: [],
                suggestedClusters: [],
                contentType:
                    analysisData?.shortFormRatio > 70
                        ? 'shortform'
                        : analysisData?.shortFormRatio < 30
                        ? 'longform'
                        : analysisData?.shortFormRatio !== undefined
                        ? 'mixed'
                        : 'unknown',
            };

            // 🔄 AI 재해석 수행 (사용자 카테고리가 있고 AI 분석을 건너뛰지 않은 경우에만)
            // DEBUG 로그는 개발 환경에서만
            if (process.env.NODE_ENV === 'development') {
                ServerLogger.debug(`🔍 DEBUG: 재해석 조건 체크`, {
                hasUserKeywords: !!(userKeywords && userKeywords.length > 0),
                userKeywords: userKeywords,
                hasAnalysisData: !!analysisData,
                skipAIAnalysis: skipAIAnalysis,
                videoAnalysesCount: analysisData?.videoAnalyses?.length || 0,
                });
            }

            if (
                userKeywords &&
                userKeywords.length > 0 &&
                analysisData &&
                !skipAIAnalysis
            ) {
                try {
                    ServerLogger.info(
                        `🔄 사용자 카테고리 기반 AI 재해석 시작: ${userKeywords.join(
                            ', ',
                        )}`,
                    );

                    // analysisResult에서 개별 영상 분석 데이터 가져오기
                    const videoAnalyses = analysisData.videoAnalyses || [];

                    const deepInsightTags =
                        await this.youtubeAnalyzer.reinterpretWithUserCategory(
                            userKeywords,
                            channelData.aiTags,
                            videoAnalyses,
                            youtubeData,
                        );

                    if (deepInsightTags && deepInsightTags.length > 0) {
                        channelData.deepInsightTags = deepInsightTags;

                        // allTags 업데이트 (사용자 키워드 + 재해석 태그 + 기존 AI 태그)
                        channelData.allTags = [
                            ...(userKeywords || []),
                            ...deepInsightTags,
                            ...channelData.aiTags,
                        ].filter(
                            (tag, index, arr) => arr.indexOf(tag) === index,
                        ); // 중복 제거

                        ServerLogger.success(
                            `✅ AI 재해석 완료: ${deepInsightTags.length}개 깊이 분석 태그 생성`,
                        );
                    }
                } catch (reinterpretError) {
                    ServerLogger.warn(
                        `⚠️ AI 재해석 실패: ${reinterpretError.message}`,
                    );
                    // 실패해도 기본 분석은 계속 진행
                }
            }

            // 기존 createOrUpdate 메서드 호출
            return await this.createOrUpdate(channelData);
        } catch (error) {
            const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
            ServerLogger.error(
                `❌ YouTube 채널 상세 분석 실패: ${decodedChannelIdentifier}`,
                error,
            );
            throw error;
        }
    }

    /**
     * 🔍 YouTube API에서 채널 정보 가져와서 생성/업데이트 (기본 정보만)
     */
    async createOrUpdateFromYouTube(channelIdentifier, userKeywords = []) {
        try {
            // URL 디코딩 처리
            const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
            
            ServerLogger.info(
                `🔍 YouTube에서 채널 정보 수집: ${decodedChannelIdentifier}`,
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

            // 🚨 중복검사 - 리소스 사용 전에 즉시 확인
            const existing = await Channel.findOne({
                channelId: youtubeData.id,
            });
            if (existing) {
                ServerLogger.warn(
                    `⚠️ 중복 분석 차단: 채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
                throw new Error(
                    `채널 ${youtubeData.channelName}은 이미 분석되었습니다.`,
                );
            }

            ServerLogger.info('🆕 새 채널 - 분석 진행', {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
            });

            // 채널 데이터 구성
            const channelData = {
                channelId: youtubeData.id,
                name: youtubeData.channelName,
                url: youtubeData.channelUrl,
                platform: 'YOUTUBE',

                // YouTube API에서 가져온 정보
                subscribers: youtubeData.subscribers,
                description: youtubeData.description,
                thumbnailUrl: youtubeData.thumbnailUrl,
                customUrl: youtubeData.customUrl,

                // 사용자 입력 키워드
                keywords: Array.isArray(userKeywords) ? userKeywords : [],

                // 기본값들
                aiTags: [],
                allTags: userKeywords || [],
                clusterIds: [],
                suggestedClusters: [],
                contentType: 'mixed',
            };

            // 기존 createOrUpdate 메서드 호출
            return await this.createOrUpdate(channelData);
        } catch (error) {
            const decodedChannelIdentifier = decodeURIComponent(channelIdentifier);
            ServerLogger.error(
                `❌ YouTube 채널 정보 수집 실패: ${decodedChannelIdentifier}`,
                error,
            );
            throw error;
        }
    }

    /**
     * 🆕 채널 생성 또는 업데이트
     */
    async createOrUpdate(channelData) {
        try {
            const channel = {
                channelId: channelData.channelId,
                name: channelData.name,
                url: channelData.url,
                platform: channelData.platform || 'YOUTUBE',

                // 기본 정보
                subscribers: channelData.subscribers || 0,
                description: channelData.description || '',
                thumbnailUrl: channelData.thumbnailUrl || '',
                customUrl: channelData.customUrl || '',

                // 콘텐츠 타입 정보
                contentType: channelData.contentType || 'mixed', // longform, shortform, mixed

                // 태그 정보
                keywords: channelData.keywords || [], // 사용자 입력 키워드
                aiTags: channelData.aiTags || [], // AI 추출 태그
                deepInsightTags: channelData.deepInsightTags || [], // AI 재해석 태그 (사용자 카테고리 기반)
                allTags: channelData.allTags || [], // 통합 태그

                // 클러스터 정보
                clusterIds: channelData.clusterIds || [],
                suggestedClusters: channelData.suggestedClusters || [],

                // 상세 분석 정보 (있는 경우에만 포함)
                ...(channelData.dailyUploadRate !== undefined && {
                    // 2. 일평균 업로드
                    dailyUploadRate: channelData.dailyUploadRate,

                    // 3. 최근 7일 조회수
                    last7DaysViews: channelData.last7DaysViews,

                    // 4. 영상 평균시간
                    avgDurationSeconds: channelData.avgDurationSeconds,
                    avgDurationFormatted: channelData.avgDurationFormatted,

                    // 5. 숏폼 비율
                    shortFormRatio: channelData.shortFormRatio,

                    // 6. 채널 일별 조회수 (기간별)
                    viewsByPeriod: channelData.viewsByPeriod,

                    // 추가 통계
                    totalVideos: channelData.totalVideos,
                    totalViews: channelData.totalViews,
                    averageViewsPerVideo: channelData.averageViewsPerVideo,
                    uploadFrequency: channelData.uploadFrequency,
                    mostViewedVideo: channelData.mostViewedVideo,

                    // 분석 메타데이터
                    lastAnalyzedAt: channelData.lastAnalyzedAt,
                    analysisVersion: channelData.analysisVersion,
                }),

                // 향상된 분석 정보 (AI 콘텐츠 분석 결과)
                ...(channelData.enhancedAnalysis && {
                    enhancedAnalysis: channelData.enhancedAnalysis,
                }),

                // 메타데이터
                collectedAt: channelData.collectedAt || new Date(),
                updatedAt: new Date(),
                version: 1,
            };

            // 중복검사는 이미 위에서 완료됨

            // 🚀 MongoDB 저장 (메인) + 백업 파일 업데이트
            const savedChannel = await this.saveToMongoDB(channel);

            // ✅ 채널 저장 성공 후에만 중복검사 DB에 등록 (원래 설계 의도)
            try {
                const normalizedChannelId = savedChannel.customUrl?.startsWith('@')
                    ? savedChannel.customUrl
                    : `@${savedChannel.customUrl || savedChannel.name}`;

                await DuplicateCheckManager.updateChannelStatus(
                    normalizedChannelId,
                    'completed',
                    {
                        name: savedChannel.name,
                        url: savedChannel.url,
                        subscribers: savedChannel.subscribers,
                        channelId: savedChannel.channelId
                    }
                );

                ServerLogger.success(`📝 중복검사 DB 등록 완료: ${normalizedChannelId}`);
            } catch (duplicateError) {
                ServerLogger.warn(`⚠️ 중복검사 DB 등록 실패 (무시): ${duplicateError.message}`);
            }

            // 백업 파일은 비동기로 업데이트 (성능 최적화)
            this.saveChannels().catch((error) => {
                ServerLogger.warn('⚠️ 백업 파일 업데이트 실패 (무시)', error);
            });

            return savedChannel;
        } catch (error) {
            ServerLogger.error('❌ 채널 저장 실패', error);
            throw error;
        }
    }

    /**
     * 🔍 채널 조회 (MongoDB 직접 조회)
     */
    async findById(channelId) {
        try {
            // MongoDB에서 직접 조회 - Channel 스키마의 'id' 필드 사용
            const channel = await Channel.findOne({
                channelId: channelId,
            }).lean();
            return channel || null;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 조회 실패', error);
            return null;
        }
    }

    /**
     * 🔍 채널 검색 (이름으로)
     */
    async findByName(name) {
        try {
            // MongoDB에서 직접 검색 (대소문자 구분 없이)
            const results = await Channel.find({
                name: { $regex: name, $options: 'i' },
            }).lean();

            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 검색 실패', error);
            return [];
        }
    }

    /**
     * 🏷️ 태그로 검색
     */
    async findByTag(tag) {
        try {
            // MongoDB에서 직접 검색
            const results = await Channel.find({
                allTags: { $regex: tag, $options: 'i' },
            }).lean();

            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 태그 검색 실패', error);
            return [];
        }
    }

    /**
     * 📊 전체 채널 조회
     */
    async getAll() {
        try {
            const channels = await Channel.find({}).lean();
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 전체 조회 실패', error);
            return [];
        }
    }

    /**
     * 📈 최근 채널 조회
     */
    async getRecent(limit = 20) {
        try {
            const channels = await Channel.find({})
                .sort({ collectedAt: -1 })
                .limit(limit)
                .lean();
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 최근 채널 조회 실패', error);
            return [];
        }
    }

    /**
     * 🔍 클러스터되지 않은 채널 조회
     */
    async getUnclustered() {
        try {
            const channels = await Channel.find({
                $or: [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ],
            }).lean();
            return channels;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 미클러스터 채널 조회 실패', error);
            return [];
        }
    }

    /**
     * 📊 전체 채널 수
     */
    async getTotalCount() {
        try {
            const count = await Channel.countDocuments();
            return count;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 카운트 조회 실패', error);
            return 0;
        }
    }

    /**
     * 📊 클러스터되지 않은 채널 수
     */
    async getUnclusteredCount() {
        try {
            const count = await Channel.countDocuments({
                $or: [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ],
            });
            return count;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 미클러스터 카운트 조회 실패', error);
            return 0;
        }
    }

    /**
     * 🏷️ 키워드 통계
     */
    async getKeywordStatistics() {
        try {
            // MongoDB aggregation 사용
            const stats = await Channel.aggregate([
                { $unwind: '$keywords' },
                {
                    $group: {
                        _id: '$keywords',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 20 },
            ]);

            return stats.map((item) => ({
                keyword: item._id,
                count: item.count,
            }));
        } catch (error) {
            ServerLogger.warn('⚠️ 키워드 통계 조회 실패', error);
            return [];
        }
    }

    /**
     * 🗑️ 채널 삭제
     */
    async delete(channelId) {
        try {
            // MongoDB에서 삭제
            const result = await Channel.findOneAndDelete({
                channelId: channelId,
            });

            if (result) {
                // 백업 파일 업데이트 (비동기)
                this.saveChannels().catch((error) => {
                    ServerLogger.warn('⚠️ 백업 파일 업데이트 실패', error);
                });

                ServerLogger.info('🗑️ 채널 삭제 완료', {
                    channelId: channelId,
                    name: result.name,
                });

                return true;
            }

            return false;
        } catch (error) {
            ServerLogger.error('❌ 채널 삭제 실패', error);
            return false;
        }
    }

    /**
     * 🔄 채널에 클러스터 할당
     */
    async assignToCluster(channelId, clusterId) {
        try {
            // MongoDB에서 직접 업데이트
            const channel = await Channel.findOneAndUpdate(
                { channelId: channelId },
                {
                    $addToSet: { clusterIds: clusterId },
                    $set: { updatedAt: new Date() },
                },
                { new: true },
            );

            if (!channel) {
                throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
            }

            // 백업 파일 업데이트 (비동기)
            this.saveChannels().catch((error) => {
                ServerLogger.warn('⚠️ 백업 파일 업데이트 실패', error);
            });

            ServerLogger.info('🔗 채널-클러스터 연결', {
                channelId,
                clusterId,
            });

            return channel.toJSON();
        } catch (error) {
            ServerLogger.error('❌ 클러스터 할당 실패', error);
            throw error;
        }
    }

    /**
     * ✂️ 클러스터에서 제거
     */
    async removeFromCluster(channelId, clusterId) {
        try {
            // MongoDB에서 직접 업데이트
            const channel = await Channel.findOneAndUpdate(
                { channelId: channelId },
                {
                    $pull: { clusterIds: clusterId },
                    $set: { updatedAt: new Date() },
                },
                { new: true },
            );

            if (!channel) {
                throw new Error(`채널을 찾을 수 없습니다: ${channelId}`);
            }

            // 백업 파일 업데이트 (비동기)
            this.saveChannels().catch((error) => {
                ServerLogger.warn('⚠️ 백업 파일 업데이트 실패', error);
            });

            ServerLogger.info('✂️ 채널-클러스터 연결 해제', {
                channelId,
                clusterId,
            });

            return channel.toJSON();
        } catch (error) {
            ServerLogger.error('❌ 클러스터 해제 실패', error);
            throw error;
        }
    }

    /**
     * 📊 플랫폼별 통계
     */
    async getPlatformStatistics() {
        try {
            // MongoDB aggregation 사용
            const stats = await Channel.aggregate([
                {
                    $group: {
                        _id: '$platform',
                        count: { $sum: 1 },
                        totalSubscribers: {
                            $sum: '$subscribers',
                        },
                        avgSubscribers: {
                            $avg: '$subscribers',
                        },
                    },
                },
            ]);

            const result = {};
            stats.forEach((item) => {
                result[item._id] = {
                    count: item.count,
                    totalSubscribers: item.totalSubscribers,
                    avgSubscribers: Math.round(item.avgSubscribers),
                };
            });

            return result;
        } catch (error) {
            ServerLogger.warn('⚠️ 플랫폼 통계 조회 실패', error);
            return {};
        }
    }

    /**
     * 🔍 고급 검색
     */
    async search(filters = {}) {
        try {
            const query = {};

            // 플랫폼 필터
            if (filters.platform) {
                query.platform = filters.platform;
            }

            // 구독자 수 범위 필터
            if (filters.minSubscribers || filters.maxSubscribers) {
                query.subscribers = {};
                if (filters.minSubscribers) {
                    query.subscribers.$gte = filters.minSubscribers;
                }
                if (filters.maxSubscribers) {
                    query.subscribers.$lte = filters.maxSubscribers;
                }
            }

            // 태그 필터
            if (filters.tags && filters.tags.length > 0) {
                queryallTags = {
                    $in: filters.tags.map((tag) => new RegExp(tag, 'i')),
                };
            }

            // 클러스터 상태 필터
            if (filters.clustered === true) {
                queryclusterIds = {
                    $exists: true,
                    $ne: [],
                };
            } else if (filters.clustered === false) {
                query.$or = [
                    { clusterIds: { $exists: false } },
                    { clusterIds: { $size: 0 } },
                ];
            }

            // MongoDB 쿼리 실행
            let queryBuilder = Channel.find(query);

            // 정렬
            if (filters.sortBy) {
                const sortOptions = {};
                switch (filters.sortBy) {
                    case 'subscribers':
                        sortOptions.subscribers = -1;
                        break;
                    case 'name':
                        sortOptions.name = 1;
                        break;
                    case 'collectedAt':
                        sortOptions.collectedAt = -1;
                        break;
                }
                queryBuilder = queryBuilder.sort(sortOptions);
            }

            // 제한
            if (filters.limit) {
                queryBuilder = queryBuilder.limit(filters.limit);
            }

            const results = await queryBuilder.lean();
            return results;
        } catch (error) {
            ServerLogger.warn('⚠️ MongoDB 고급 검색 실패', error);
            return [];
        }
    }

    /**
     * 🔧 빈 정보가 있는 채널들을 YouTube API에서 채우기
     */
    async fillMissingChannelInfo() {
        try {
            ServerLogger.info('🔧 빈 채널 정보 채우기 시작...');

            // MongoDB에서 빈 정보가 있는 채널들 찾기
            const channelsToUpdate = await Channel.find(
                {
                    platform: 'YOUTUBE',
                    $or: [
                        {
                            description: {
                                $exists: false,
                            },
                        },
                        { description: '' },
                        {
                            thumbnailUrl: {
                                $exists: false,
                            },
                        },
                        { thumbnailUrl: '' },
                        {
                            subscribers: {
                                $exists: false,
                            },
                        },
                        { subscribers: 0 },
                    ],
                },
                {
                    channelId: 1,
                    name: 1,
                    keywords: 1,
                },
            ).lean();

            if (channelsToUpdate.length === 0) {
                ServerLogger.info('✅ 모든 채널 정보가 완전합니다.');
                return { updated: 0, failed: 0 };
            }

            ServerLogger.info(
                `🔧 업데이트할 채널: ${channelsToUpdate.length}개`,
            );

            let updated = 0;
            let failed = 0;

            // 각 채널을 개별적으로 업데이트
            for (const channelInfo of channelsToUpdate) {
                try {
                    ServerLogger.info(
                        `🔄 채널 업데이트 중: ${channelInfo.name}`,
                    );

                    // YouTube API에서 정보 가져와서 업데이트
                    await this.createOrUpdateFromYouTube(
                        channelInfo.name,
                        channelInfokeywords,
                    );
                    updated++;

                    // API 호출 간격 (Rate Limit 방지)
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (error) {
                    ServerLogger.error(
                        `❌ 채널 업데이트 실패: ${channelInfo.name}`,
                        error,
                    );
                    failed++;
                }
            }

            ServerLogger.success(
                `✅ 빈 채널 정보 채우기 완료: 성공 ${updated}개, 실패 ${failed}개`,
            );

            return { updated, failed };
        } catch (error) {
            ServerLogger.error('❌ 빈 채널 정보 채우기 실패', error);
            throw error;
        }
    }

    /**
     * 📊 채널 정보 완성도 확인
     */
    async getChannelCompletionStats() {
        try {
            const total = await Channel.countDocuments();

            const missingFields = await Promise.all([
                Channel.countDocuments({
                    $or: [
                        {
                            description: {
                                $exists: false,
                            },
                        },
                        { description: '' },
                    ],
                }),
                Channel.countDocuments({
                    $or: [
                        {
                            thumbnailUrl: {
                                $exists: false,
                            },
                        },
                        { thumbnailUrl: '' },
                    ],
                }),
                Channel.countDocuments({
                    $or: [
                        {
                            subscribers: {
                                $exists: false,
                            },
                        },
                        { subscribers: 0 },
                    ],
                }),
                Channel.countDocuments({
                    $or: [{ customUrl: { $exists: false } }, { customUrl: '' }],
                }),
            ]);

            const complete = await Channel.countDocuments({
                description: { $exists: true, $ne: '' },
                thumbnailUrl: { $exists: true, $ne: '' },
                subscribers: { $exists: true, $ne: 0 },
                customUrl: { $exists: true, $ne: '' },
            });

            return {
                total: total,
                complete: complete,
                incomplete: total - complete,
                missingFields: {
                    description: missingFields[0],
                    thumbnailUrl: missingFields[1],
                    subscribers: missingFields[2],
                    customUrl: missingFields[3],
                },
            };
        } catch (error) {
            ServerLogger.warn('⚠️ 채널 완성도 통계 조회 실패', error);
            return {
                total: 0,
                complete: 0,
                incomplete: 0,
                missingFields: {
                    description: 0,
                    thumbnailUrl: 0,
                    subscribers: 0,
                    customUrl: 0,
                },
            };
        }
    }
}

// 싱글톤 패턴
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new ChannelAnalysisService();
        }
        return instance;
    },

    // 정적 메서드들 (편의성)
    createOrUpdate: async (data) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdate(data);
    },

    findById: async (id) => {
        const model = module.exports.getInstance();
        return await model.findById(id);
    },

    getAll: async () => {
        const model = module.exports.getInstance();
        return await model.getAll();
    },

    getRecent: async (limit) => {
        const model = module.exports.getInstance();
        return await model.getRecent(limit);
    },

    getUnclustered: async () => {
        const model = module.exports.getInstance();
        return await model.getUnclustered();
    },

    getTotalCount: async () => {
        const model = module.exports.getInstance();
        return await model.getTotalCount();
    },

    getUnclusteredCount: async () => {
        const model = module.exports.getInstance();
        return await model.getUnclusteredCount();
    },

    search: async (filters) => {
        const model = module.exports.getInstance();
        return await model.search(filters);
    },

    // 새로운 메서드들
    createOrUpdateFromYouTube: async (channelIdentifier, userKeywords) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdateFromYouTube(
            channelIdentifier,
            userKeywords,
        );
    },

    // 큐를 통한 분석 (비동기)
    queueAnalysis: async (channelIdentifier, userKeywords, options = {}) => {
        const ChannelAnalysisQueueManager = require('../../services/ChannelAnalysisQueue');
        const queue = ChannelAnalysisQueueManager.getInstance();
        return await queue.addJob(channelIdentifier, userKeywords, options);
    },

    fillMissingChannelInfo: async () => {
        const model = module.exports.getInstance();
        return await model.fillMissingChannelInfo();
    },

    getChannelCompletionStats: async () => {
        const model = module.exports.getInstance();
        return await model.getChannelCompletionStats();
    },

    // 새로운 상세 분석 메서드들
    createOrUpdateWithAnalysis: async (
        channelIdentifier,
        userKeywords,
        includeAnalysis,
    ) => {
        const model = module.exports.getInstance();
        return await model.createOrUpdateWithAnalysis(
            channelIdentifier,
            userKeywords,
            includeAnalysis,
        );
    },
};

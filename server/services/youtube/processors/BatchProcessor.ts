import axios from 'axios';
import { ServerLogger } from '../../../utils/logger';
import { UrlProcessor } from '../utils/UrlProcessor';
import { MetadataProcessor } from '../utils/MetadataProcessor';
import {
    BatchItem,
    ProcessedVideoData,
    BatchResult,
    CategoryMapping,
    BatchProcessorConfig,
    ChunkResult
} from '../types/batch-types';

const MultiKeyManager = require('../../../utils/multi-key-manager');

export class BatchProcessor {
    private multiKeyManager: any;
    private config: BatchProcessorConfig;
    private readonly YOUTUBE_CATEGORIES: CategoryMapping = {
        '1': '영화/애니메이션',
        '2': '자동차/교통',
        '10': '음악',
        '15': '애완동물/동물',
        '17': '스포츠',
        '19': '여행/이벤트',
        '20': '게임',
        '22': '인물/블로그',
        '23': '코미디',
        '24': '엔터테인먼트',
        '25': '뉴스/정치',
        '26': '노하우/스타일',
        '27': '교육',
        '28': '과학기술',
        '29': '비영리/사회운동',
    };

    constructor(config: BatchProcessorConfig) {
        this.config = config;
        this.multiKeyManager = null;
    }

    /**
     * 초기화
     */
    async initialize(): Promise<void> {
        if (!this.multiKeyManager) {
            this.multiKeyManager = await MultiKeyManager.getInstance();
            ServerLogger.info('🔑 배치 처리기 초기화 완료:', {
                keyCount: this.multiKeyManager.keys.length
            });
        }
    }

    /**
     * 배치 처리 실행
     */
    async processBatch(batchItems: BatchItem[]): Promise<BatchResult> {
        const startTime = Date.now();

        try {
            await this.initialize();

            ServerLogger.info('🔄 배치 처리 시작:', {
                itemCount: batchItems.length,
                expectedQuotaSaving: `${batchItems.length * 8 - Math.ceil(batchItems.length / this.config.maxBatchSize) * 12} 유닛 절약`
            });

            // 최대 50개씩 청크로 나누기
            const chunks = this.createChunks(batchItems);
            const allResults: ProcessedVideoData[] = [];

            // 각 청크 처리
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                ServerLogger.debug(`청크 ${i + 1}/${chunks.length} 처리 시작:`, {
                    chunkSize: chunk.length
                });

                try {
                    const chunkResults = await this.processChunk(chunk);
                    allResults.push(...chunkResults);

                    ServerLogger.debug(`청크 ${i + 1}/${chunks.length} 처리 완료:`, {
                        resultCount: chunkResults.length
                    });

                } catch (error) {
                    ServerLogger.error(`청크 ${i + 1}/${chunks.length} 처리 실패:`, error);
                    // 개별 청크 실패는 전체를 중단하지 않음
                }
            }

            // 시트 저장
            await this.saveToSheets(allResults);

            const processingTime = Date.now() - startTime;
            const quotaSaved = batchItems.length * 8 - chunks.length * 12;

            ServerLogger.success('✅ 배치 처리 완료:', {
                processed: allResults.length,
                total: batchItems.length,
                processingTime: `${processingTime}ms`,
                quotaSaved: `${quotaSaved} 유닛`,
                efficiency: `${Math.round((quotaSaved / (batchItems.length * 8)) * 100)}% 절약`,
                successRate: `${allResults.length}/${batchItems.length}`
            });

            return {
                success: true,
                processed: allResults.length,
                total: batchItems.length,
                processingTime,
                quotaSaved,
                results: allResults,
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            ServerLogger.error('❌ 배치 처리 실패:', {
                error: errorMessage,
                processingTime: `${processingTime}ms`,
                itemCount: batchItems.length
            });

            return {
                success: false,
                processed: 0,
                total: batchItems.length,
                processingTime,
                quotaSaved: 0,
                results: [],
            };
        }
    }

    /**
     * 배치 아이템들을 청크로 나누기
     */
    private createChunks(items: BatchItem[]): BatchItem[][] {
        const chunks: BatchItem[][] = [];

        for (let i = 0; i < items.length; i += this.config.maxBatchSize) {
            chunks.push(items.slice(i, i + this.config.maxBatchSize));
        }

        return chunks;
    }

    /**
     * 청크 단위 처리 (최대 50개)
     */
    private async processChunk(chunk: BatchItem[]): Promise<ProcessedVideoData[]> {
        try {
            const videoIds = chunk.map(item => item.videoId).join(',');

            // 1. Videos API 배치 호출
            const videoData = await this.fetchVideosData(videoIds);

            // 2. 채널 ID들 수집 및 중복 제거
            const channelIds = [...new Set(
                videoData.map(video => video.snippet?.channelId).filter(Boolean)
            )];

            // 3. Channels API 배치 호출
            const channelMap = await this.fetchChannelsData(channelIds);

            // 4. 비디오 정보와 채널 정보 결합
            const results = this.combineVideoAndChannelData(videoData, channelMap);

            ServerLogger.debug('청크 처리 완료:', {
                videoCount: videoData.length,
                channelCount: Object.keys(channelMap).length,
                resultCount: results.length
            });

            return results;

        } catch (error) {
            ServerLogger.error('청크 처리 실패:', error);
            throw error;
        }
    }

    /**
     * Videos API 데이터 가져오기
     */
    private async fetchVideosData(videoIds: string): Promise<any[]> {
        const availableKey = this.multiKeyManager.getAvailableKey();
        if (!availableKey) {
            throw new Error('사용 가능한 YouTube API 키가 없습니다');
        }

        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    id: videoIds,
                    key: availableKey.key,
                },
                timeout: this.config.apiTimeout,
            });

            // API 사용량 추적
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', true);

            if (!response.data.items || !Array.isArray(response.data.items)) {
                throw new Error('YouTube Videos API 응답이 유효하지 않습니다');
            }

            return response.data.items;

        } catch (error) {
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-videos', false);
            throw error;
        }
    }

    /**
     * Channels API 데이터 가져오기
     */
    private async fetchChannelsData(channelIds: string[]): Promise<Record<string, any>> {
        if (channelIds.length === 0) {
            return {};
        }

        const availableKey = this.multiKeyManager.getAvailableKey();
        if (!availableKey) {
            throw new Error('사용 가능한 YouTube API 키가 없습니다');
        }

        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    part: 'statistics,snippet',
                    id: channelIds.join(','),
                    key: availableKey.key,
                },
                timeout: this.config.apiTimeout,
            });

            // API 사용량 추적
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', true);

            // 채널 정보를 맵으로 변환
            const channelMap: Record<string, any> = {};
            if (response.data.items && Array.isArray(response.data.items)) {
                response.data.items.forEach((channel: any) => {
                    if (channel.id) {
                        channelMap[channel.id] = channel;
                    }
                });
            }

            return channelMap;

        } catch (error) {
            this.multiKeyManager.trackAPI(availableKey.key, 'youtube-channels', false);
            ServerLogger.warn('채널 데이터 가져오기 실패:', error);
            return {};
        }
    }

    /**
     * 비디오 정보와 채널 정보 결합
     */
    private combineVideoAndChannelData(
        videoData: any[],
        channelMap: Record<string, any>
    ): ProcessedVideoData[] {
        return videoData.map(video => {
            const snippet = video.snippet || {};
            const statistics = video.statistics || {};
            const contentDetails = video.contentDetails || {};
            const channelInfo = channelMap[snippet.channelId] || {};

            // 카테고리 변환
            const categoryName = this.YOUTUBE_CATEGORIES[snippet.categoryId] || '미분류';

            // 비디오 길이를 초 단위로 변환
            const duration = MetadataProcessor.parseDuration(contentDetails.duration || '');

            // 해시태그와 멘션 추출
            const hashtags = MetadataProcessor.extractHashtags(snippet.description || '');
            const mentions = MetadataProcessor.extractMentions(snippet.description || '');

            return {
                videoId: video.id || '',
                title: MetadataProcessor.safeString(snippet.title),
                description: MetadataProcessor.safeString(snippet.description),
                channelName: MetadataProcessor.safeString(snippet.channelTitle),
                channelId: MetadataProcessor.safeString(snippet.channelId),
                uploadDate: MetadataProcessor.normalizeDate(snippet.publishedAt || ''),
                thumbnailUrl: this.getBestThumbnailUrl(snippet.thumbnails),
                youtubeCategory: categoryName,
                categoryId: MetadataProcessor.safeString(snippet.categoryId),
                duration: duration,
                isShortForm: duration <= 60,
                tags: MetadataProcessor.safeArray<string>(snippet.tags),
                views: MetadataProcessor.safeString(statistics.viewCount, '0'),
                likes: MetadataProcessor.safeString(statistics.likeCount, '0'),
                commentsCount: MetadataProcessor.safeString(statistics.commentCount, '0'),
                subscribers: MetadataProcessor.safeString(channelInfo.statistics?.subscriberCount, '0'),
                channelVideos: MetadataProcessor.safeString(channelInfo.statistics?.videoCount, '0'),
                channelViews: MetadataProcessor.safeString(channelInfo.statistics?.viewCount, '0'),
                channelCountry: MetadataProcessor.safeString(channelInfo.snippet?.country),
                channelDescription: MetadataProcessor.safeString(channelInfo.snippet?.description),
                youtubeHandle: this.extractYouTubeHandle(channelInfo.snippet?.customUrl),
                channelUrl: this.buildChannelUrl(channelInfo.snippet?.customUrl, snippet.channelId),
                quality: MetadataProcessor.safeString(contentDetails.definition, 'sd'),
                language: MetadataProcessor.safeString(
                    snippet.defaultLanguage || snippet.defaultAudioLanguage
                ),
                liveBroadcast: MetadataProcessor.safeString(snippet.liveBroadcastContent, 'none'),
                hashtags: hashtags,
                mentions: mentions,
                topComments: '', // 배치에서는 댓글 수집 제외 (API 할당량 절약)
            };
        });
    }

    /**
     * 최적 썸네일 URL 선택
     */
    private getBestThumbnailUrl(thumbnails: any): string {
        if (!thumbnails || typeof thumbnails !== 'object') {
            return '';
        }

        // 우선순위: medium > high > default > standard > maxres
        const priorities = ['medium', 'high', 'default', 'standard', 'maxres'];

        for (const priority of priorities) {
            if (thumbnails[priority]?.url) {
                return thumbnails[priority].url;
            }
        }

        return '';
    }

    /**
     * YouTube 핸들명 추출
     */
    private extractYouTubeHandle(customUrl: string): string {
        if (!customUrl || typeof customUrl !== 'string') {
            return '';
        }

        try {
            if (customUrl.startsWith('@')) {
                return customUrl.substring(1);
            }

            if (customUrl.startsWith('/c/')) {
                return customUrl.substring(3);
            }

            if (customUrl.startsWith('/user/')) {
                return customUrl.substring(6);
            }

            return customUrl.replace(/^\/+/, '');
        } catch (error) {
            ServerLogger.warn('YouTube 핸들명 추출 실패:', error);
            return '';
        }
    }

    /**
     * YouTube 채널 URL 생성
     */
    private buildChannelUrl(customUrl: string, channelId: string): string {
        try {
            if (customUrl) {
                if (customUrl.startsWith('@')) {
                    return `https://www.youtube.com/${customUrl}`;
                } else if (customUrl.startsWith('/')) {
                    return `https://www.youtube.com${customUrl}`;
                } else {
                    return `https://www.youtube.com/@${customUrl}`;
                }
            }

            if (channelId) {
                return `https://www.youtube.com/channel/${channelId}`;
            }

            return '';
        } catch (error) {
            ServerLogger.warn('YouTube 채널 URL 생성 실패:', error);
            return channelId ? `https://www.youtube.com/channel/${channelId}` : '';
        }
    }

    /**
     * Google Sheets에 저장
     */
    private async saveToSheets(results: ProcessedVideoData[]): Promise<void> {
        if (results.length === 0) {
            ServerLogger.debug('저장할 결과가 없어 시트 저장 생략');
            return;
        }

        try {
            ServerLogger.info('📊 배치 시트 저장 시작:', { resultCount: results.length });

            const sheetsStartTime = Date.now();
            const SheetsManager = require('../../sheets/SheetsManager');
            const sheetsManager = new SheetsManager();

            const sheetResult = await sheetsManager.saveVideoBatch(results, 'YOUTUBE');

            const sheetsProcessingTime = Date.now() - sheetsStartTime;

            ServerLogger.success('✅ 배치 시트 저장 완료:', {
                resultCount: results.length,
                processingTime: `${sheetsProcessingTime}ms`,
                spreadsheetUrl: sheetResult.spreadsheetUrl,
            });

        } catch (error) {
            ServerLogger.error('❌ 배치 시트 저장 실패:', error);
            // 시트 저장 실패해도 YouTube API 결과는 유지
        }
    }
}

export default BatchProcessor;
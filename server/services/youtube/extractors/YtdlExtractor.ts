import * as ytdl from '@distube/ytdl-core';
import { ServerLogger } from '../../../utils/logger';
import { YtdlVideoData, VideoExtractionConfig } from '../types/extraction-types';
import { MetadataProcessor } from '../utils/MetadataProcessor';

export class YtdlExtractor {
    private timeout: number;

    constructor(config: VideoExtractionConfig) {
        this.timeout = config.ytdlTimeout;
    }

    /**
     * ytdl-core를 이용한 비디오 데이터 추출
     */
    async extractVideoData(url: string): Promise<YtdlVideoData> {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`ytdl-core 타임아웃 (${this.timeout}ms)`));
            }, this.timeout);

            try {
                ServerLogger.info('📹 ytdl-core 데이터 추출 시작:', { url: url.substring(0, 50) });

                const info = await ytdl.getInfo(url);
                clearTimeout(timeoutId);

                const details = info.videoDetails;

                // 안전한 데이터 추출
                const extractedData: YtdlVideoData = {
                    // 기본 정보
                    title: MetadataProcessor.safeString(details.title),
                    description: MetadataProcessor.safeString(details.description),
                    duration: MetadataProcessor.safeParseInt(details.lengthSeconds),
                    uploadDate: MetadataProcessor.safeString(details.uploadDate),

                    // 채널 정보
                    channelName: MetadataProcessor.safeString(details.author?.name),
                    channelId: MetadataProcessor.safeString(details.author?.id),
                    channelUrl: MetadataProcessor.safeString(details.author?.channel_url),

                    // 메타데이터
                    category: MetadataProcessor.safeString(details.category),
                    keywords: MetadataProcessor.safeArray<string>(details.keywords),
                    tags: MetadataProcessor.safeArray<string>(details.keywords),

                    // 썸네일
                    thumbnails: MetadataProcessor.safeArray(details.thumbnails),
                    thumbnail: MetadataProcessor.getBestThumbnail(details.thumbnails || []),

                    // 통계
                    viewCount: MetadataProcessor.safeParseInt(details.viewCount),

                    // 라이브 스트림 정보
                    isLiveContent: MetadataProcessor.safeBoolean(details.isLiveContent),
                    isLive: MetadataProcessor.safeBoolean(details.isLive),

                    // 소스 표시
                    source: 'ytdl-core'
                };

                // 데이터 품질 로깅
                this.logExtractionQuality(extractedData);

                ServerLogger.success('✅ ytdl-core 데이터 추출 완료:', {
                    title: extractedData.title?.substring(0, 50),
                    duration: extractedData.duration,
                    viewCount: extractedData.viewCount,
                    channelName: extractedData.channelName,
                    thumbnailCount: extractedData.thumbnails?.length || 0,
                    keywordsCount: extractedData.keywords?.length || 0
                });

                resolve(extractedData);

            } catch (error) {
                clearTimeout(timeoutId);

                const errorMessage = error instanceof Error ? error.message : String(error);
                ServerLogger.error('❌ ytdl-core 데이터 추출 실패:', {
                    error: errorMessage,
                    url: url.substring(0, 50)
                });

                reject(new Error(`ytdl-core 추출 실패: ${errorMessage}`));
            }
        });
    }

    /**
     * 추출된 데이터의 품질 검증 및 로깅
     */
    private logExtractionQuality(data: YtdlVideoData): void {
        const quality = {
            hasTitle: !!data.title,
            hasDescription: !!data.description,
            hasChannelInfo: !!(data.channelName && data.channelId),
            hasThumbnails: (data.thumbnails?.length || 0) > 0,
            hasKeywords: (data.keywords?.length || 0) > 0,
            hasValidDuration: data.duration > 0,
            hasViewCount: data.viewCount > 0
        };

        const qualityScore = Object.values(quality).filter(Boolean).length;
        const totalChecks = Object.keys(quality).length;
        const qualityPercentage = Math.round((qualityScore / totalChecks) * 100);

        ServerLogger.debug('📊 ytdl-core 데이터 품질 분석:', {
            quality,
            score: `${qualityScore}/${totalChecks} (${qualityPercentage}%)`,
            descriptionLength: data.description?.length || 0,
            keywordsCount: data.keywords?.length || 0,
            thumbnailsCount: data.thumbnails?.length || 0
        });

        // 품질 경고
        if (qualityPercentage < 70) {
            ServerLogger.warn('⚠️ ytdl-core 데이터 품질이 낮습니다:', {
                qualityPercentage,
                missingFields: Object.entries(quality)
                    .filter(([_, value]) => !value)
                    .map(([key, _]) => key)
            });
        }
    }

    /**
     * ytdl-core 가용성 확인
     */
    static async checkAvailability(): Promise<boolean> {
        try {
            // 간단한 YouTube 영상으로 테스트 (YouTube의 공식 테스트 영상)
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            const info = await ytdl.getInfo(testUrl);

            ServerLogger.success('✅ ytdl-core 사용 가능');
            return !!info.videoDetails;
        } catch (error) {
            ServerLogger.warn('⚠️ ytdl-core 사용 불가:', error);
            return false;
        }
    }

    /**
     * 타임아웃 설정 변경
     */
    setTimeout(timeout: number): void {
        this.timeout = timeout;
        ServerLogger.info('⏱️ ytdl-core 타임아웃 변경:', { timeout });
    }

    /**
     * 현재 설정 반환
     */
    getConfig(): { timeout: number } {
        return {
            timeout: this.timeout
        };
    }
}

export default YtdlExtractor;
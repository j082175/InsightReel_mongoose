import * as ytdl from '@distube/ytdl-core';
import { ServerLogger } from '../../../utils/logger';
import { Platform, YouTubeRawData } from '../../../types/video-types';

// YouTubeRawData를 평면화한 처리 전용 인터페이스
interface YouTubeVideoInfo {
    id: string;
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    views: number;
    likes: number;
    commentCount: number;  // 표준 필드명 사용
    duration: string;
    uploadDate: string;
    thumbnailUrl: string;
    categoryId: string;
    tags: string[];
    channelCustomUrl: string;
    youtubeHandle?: string;  // 채널 핸들 필드 추가
    quality: string;
    hasCaption: boolean;
    embeddable: boolean;
    madeForKids: boolean;
}

interface YouTubeProcessingOptions {
    useYtdlFirst?: boolean;
    maxRetries?: number;
}

export class YouTubeProcessor {
    private hybridExtractor: any;
    private youtubeApiKey: string | null = null;

    constructor() {
        this.initializeExtractor();
    }

    private async initializeExtractor() {
        try {
            const HybridYouTubeExtractor = require('../../youtube/HybridYouTubeExtractor');
            this.hybridExtractor = new HybridYouTubeExtractor();
            await this.hybridExtractor.initialize();
        } catch (error) {
            ServerLogger.error('하이브리드 YouTube 추출기 초기화 실패:', error);
        }
    }

    async downloadVideo(videoUrl: string, filePath: string, startTime?: Date): Promise<boolean> {
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            if (!videoId) {
                throw new Error('유효하지 않은 YouTube URL');
            }

            ServerLogger.info(`YouTube 비디오 다운로드 시작: ${videoId}`);

            // yt-dlp를 사용한 다운로드
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // 비디오 다운로드 명령어 (YouTube Shorts 호환)
            const command = `yt-dlp -f "best[ext=mp4]" -o "${filePath}" "${videoUrl}"`;

            ServerLogger.info(`실행 명령어: ${command}`);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000 // 2분 타임아웃
            });

            if (stderr) {
                ServerLogger.warn('yt-dlp 경고:', stderr);
            }

            // 파일이 성공적으로 생성되었는지 확인
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 1024) { // 1KB 이상
                    ServerLogger.success(`YouTube 비디오 다운로드 완료: ${filePath} (${stats.size} bytes)`);
                    return true;
                }
            }

            throw new Error('다운로드된 파일이 없거나 크기가 너무 작습니다');

        } catch (error) {
            ServerLogger.error('YouTube 비디오 다운로드 실패:', error);
            return false;
        }
    }

    async getVideoInfo(videoUrl: string, options: YouTubeProcessingOptions = {}): Promise<YouTubeVideoInfo | null> {
        try {
            ServerLogger.info('🔍 YouTubeProcessor.getVideoInfo 시작:', {
                videoUrl,
                useYtdlFirst: options.useYtdlFirst,
                hasHybridExtractor: !!this.hybridExtractor
            });

            if (options.useYtdlFirst === false && this.hybridExtractor) {
                // 하이브리드 추출기 우선 사용
                ServerLogger.info('🔄 하이브리드 추출기 사용 중...');
                const result = await this.hybridExtractor.extractVideoData(videoUrl);
                ServerLogger.info('🔍 하이브리드 추출기 결과:', { success: result.success, dataKeys: result.data ? Object.keys(result.data).slice(0, 10) : null });

                if (result.success) {
                    const normalized = this.normalizeVideoInfo(result.data);
                    ServerLogger.info('🔍 정규화된 결과:', {
                        channelTitle: normalized.channelTitle,
                        commentCount: normalized.commentCount,  // 표준 필드명 사용
                        views: normalized.views,
                        likes: normalized.likes
                    });
                    return normalized;
                }
            }

            // 기본 YouTube API 사용
            ServerLogger.info('🔄 레거시 YouTube API 사용 중...');
            const legacyResult = await this.getVideoInfoLegacy(videoUrl);
            ServerLogger.info('🔍 레거시 API 결과:', {
                channelTitle: legacyResult?.channelTitle,
                commentCount: legacyResult?.commentCount,  // 표준 필드명 사용
                views: legacyResult?.views,
                likes: legacyResult?.likes
            });
            return legacyResult;

        } catch (error) {
            ServerLogger.error('YouTube 비디오 정보 조회 실패:', error);
            return null;
        }
    }

    private async getVideoInfoLegacy(videoUrl: string): Promise<YouTubeVideoInfo | null> {
        try {
            const videoId = this.extractYouTubeId(videoUrl);
            if (!videoId) return null;

            const apiKey = await this.getApiKey();
            if (!apiKey) {
                throw new Error('YouTube API 키가 없습니다');
            }

            const axios = require('axios');
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,statistics,contentDetails,status',  // status 추가
                    id: videoId,
                    key: apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('비디오를 찾을 수 없습니다');
            }

            const item = response.data.items[0];
            const videoData = this.parseVideoData(item);

            // 채널 핸들 가져오기를 위한 추가 API 호출
            if (videoData.channelId) {
                try {
                    ServerLogger.info('🔍 채널 핸들 조회 시작:', { channelId: videoData.channelId });
                    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                        params: {
                            part: 'snippet',
                            id: videoData.channelId,
                            key: apiKey
                        }
                    });

                    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
                        const channelData = channelResponse.data.items[0].snippet;
                        ServerLogger.info('🔍 채널 API 응답:', {
                            handle: channelData.handle,
                            customUrl: channelData.customUrl
                        });

                        // handle 필드가 있으면 사용
                        if (channelData.handle) {
                            videoData.youtubeHandle = channelData.handle;
                            ServerLogger.success('✅ 채널 핸들 설정 완료:', channelData.handle);
                        } else if (channelData.customUrl) {
                            // handle이 없으면 customUrl 사용 (이미 @ 포함된 경우 체크)
                            const customUrl = channelData.customUrl.startsWith('@')
                                ? channelData.customUrl
                                : `@${channelData.customUrl}`;
                            videoData.youtubeHandle = customUrl;
                            ServerLogger.success('✅ 채널 핸들 설정 완료 (customUrl):', customUrl);
                        } else {
                            // 둘 다 없으면 channelCustomUrl을 fallback으로 사용
                            if (videoData.channelCustomUrl) {
                                const fallbackUrl = videoData.channelCustomUrl.startsWith('@')
                                    ? videoData.channelCustomUrl
                                    : `@${videoData.channelCustomUrl}`;
                                videoData.youtubeHandle = fallbackUrl;
                                ServerLogger.success('✅ 채널 핸들 설정 완료 (fallback):', fallbackUrl);
                            } else {
                                ServerLogger.warn('⚠️ 채널 핸들, customUrl, channelCustomUrl 모두 없음');
                            }
                        }
                    } else {
                        ServerLogger.warn('⚠️ 채널 API 응답에 items 없음');
                    }
                } catch (channelError) {
                    ServerLogger.warn('채널 핸들 조회 실패 (계속 진행):', channelError);
                }
            }

            return videoData;

        } catch (error) {
            ServerLogger.error('YouTube Legacy API 조회 실패:', error);
            return null;
        }
    }

    private parseVideoData(item: any): YouTubeVideoInfo {
        const snippet = item.snippet || {};
        const statistics = item.statistics || {};
        const contentDetails = item.contentDetails || {};
        const status = item.status || {};

        return {
            id: item.id,
            title: snippet.title || '',
            description: snippet.description || '',
            channelId: snippet.channelId || '',
            channelTitle: snippet.channelTitle || '',
            views: parseInt(statistics.viewCount || '0'),
            likes: parseInt(statistics.likeCount || '0'),
            commentCount: parseInt(statistics.commentCount || '0'),  // 표준 필드명 사용
            duration: contentDetails.duration || '',
            uploadDate: snippet.publishedAt || '',
            thumbnailUrl: snippet.thumbnails?.high?.url || '',
            categoryId: snippet.categoryId || '',
            // 새로운 필드들 추가
            tags: snippet.tags || [],
            channelCustomUrl: snippet.channelCustomUrl || '',
            youtubeHandle: undefined,  // 초기값, 이후 채널 API 호출로 설정됨
            quality: contentDetails.definition || 'sd',  // 'hd' | 'sd'
            hasCaption: contentDetails.caption === 'true',
            embeddable: status.embeddable !== false,
            madeForKids: status.madeForKids === true
        };
    }

    private normalizeVideoInfo(data: any): YouTubeVideoInfo {
        // 디버깅: 실제 받은 데이터 구조 로깅
        ServerLogger.info('🔍 YouTube 원본 데이터 구조:', {
            channelFields: {
                channelName: data.channelName,
                channelTitle: data.channelTitle,
                channel: data.channel,
                uploader: data.uploader,
                uploaderName: data.uploaderName
            },
            commentFields: {
                commentCount: data.commentCount,  // 표준 필드명을 첫 번째로
                commentsCount: data.commentsCount,
                comments: data.comments,
                comment_count: data.comment_count
            },
            allKeys: Object.keys(data).slice(0, 20) // 처음 20개 키만
        });

        return {
            id: data.id || data.videoId || '',
            title: data.title || '',
            description: data.description || '',
            channelId: data.channelId || '',
            channelTitle: data.channelTitle || data.channelName || data.uploader || data.uploaderName || '',
            views: parseInt(data.views || data.viewCount || data.view_count || '0'),
            likes: parseInt(data.likes || data.likeCount || data.like_count || '0'),
            commentCount: parseInt(data.commentCount || data.commentsCount || data.comments || data.comment_count || '0'),  // 표준 필드명 사용
            duration: data.duration || '',
            uploadDate: data.uploadDate || data.publishedAt || '',
            thumbnailUrl: data.thumbnailUrl || '',
            categoryId: data.categoryId || '',
            // 누락된 필드들 추가
            tags: data.tags || [],
            channelCustomUrl: data.channelCustomUrl || '',
            youtubeHandle: data.youtubeHandle || undefined,
            quality: data.quality || data.definition || 'sd',
            hasCaption: data.hasCaption || data.caption === 'true',
            embeddable: data.embeddable !== false,
            madeForKids: data.madeForKids === true
        };
    }

    extractYouTubeId(url: string): string | null {
        if (!url || typeof url !== 'string') return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/  // YouTube Shorts 지원 추가
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    isYouTubeUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        // 레거시 호환성: youtube.com 또는 youtu.be가 포함되면 허용
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    private async getApiKey(): Promise<string | null> {
        if (!this.youtubeApiKey) {
            try {
                const apiKeyManager = require('../../ApiKeyManager');
                await apiKeyManager.initialize();
                const activeKeys = await apiKeyManager.getActiveApiKeys();

                ServerLogger.info(`🔍 YouTube API 키 디버그 - 로드된 키 개수: ${activeKeys.length}`);
                if (activeKeys.length > 0) {
                    ServerLogger.info(`🔍 첫 번째 API 키 미리보기: ${activeKeys[0].substring(0, 10)}...`);
                }

                if (activeKeys.length === 0) {
                    ServerLogger.warn('사용 가능한 YouTube API 키가 없습니다');
                    return null;
                }

                this.youtubeApiKey = activeKeys[0];
            } catch (error) {
                ServerLogger.error('API 키 로드 실패:', error);
                return null;
            }
        }
        return this.youtubeApiKey;
    }

    async fetchComments(videoId: string, maxResults: number = 100): Promise<string[]> {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) return [];

            const axios = require('axios');
            const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: Math.min(maxResults, 100),
                    order: 'relevance',
                    key: apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return [];
            }

            return response.data.items.map((item: any) => {
                const comment = item.snippet?.topLevelComment?.snippet;
                return comment?.textDisplay || '';
            }).filter((text: string) => text.length > 0);

        } catch (error) {
            ServerLogger.error('YouTube 댓글 조회 실패:', error);
            return [];
        }
    }

    parseYouTubeDuration(duration: string): number {
        if (!duration || typeof duration !== 'string') return 0;

        // ISO 8601 duration format (PT#M#S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    clearApiKeyCache(): void {
        this.youtubeApiKey = null;
    }
}

export default YouTubeProcessor;
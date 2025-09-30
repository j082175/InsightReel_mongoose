import { ServerLogger } from '../../../utils/logger';
import { Platform } from '../../../types/video-types';
import { TikTokVideoInfo } from '../../tiktok/types/tiktok-types';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

export class TikTokProcessor {
    private tikTokAPI: any;

    constructor() {
        this.initializeAPI().catch(error => {
            ServerLogger.error('TikTok API 비동기 초기화 실패:', error);
        });
    }

    private async initializeAPI() {
        try {
            // 여러 TikTok API 패키지 시도
            try {
                const TikTokScraper = await import('@tobyg74/tiktok-api-dl');
                this.tikTokAPI = TikTokScraper.default || TikTokScraper;
                ServerLogger.info('📱 TikTok API 초기화 성공: @tobyg74/tiktok-api-dl');
            } catch (err) {
                ServerLogger.warn('TikTok API 패키지 없음, yt-dlp 대체 방법 사용');
                this.tikTokAPI = null;
            }
        } catch (error) {
            ServerLogger.error('TikTok API 초기화 실패:', error);
            this.tikTokAPI = null;
        }
    }

    async downloadVideo(videoUrl: string, filePath: string, startTime?: Date): Promise<boolean> {
        try {
            // Try API method first (more reliable than yt-dlp for TikTok)
            ServerLogger.info(`📥 TikTok 비디오 API 다운로드 시작: ${videoUrl}`);
            const apiResult = await this.downloadWithAPI(videoUrl, filePath);
            if (apiResult) {
                return true;
            }

            // Fallback to yt-dlp if API fails
            ServerLogger.info(`📥 API 실패, yt-dlp 대체 방법 시도: ${videoUrl}`);
            return await this.downloadWithYtDlp(videoUrl, filePath);
        } catch (error) {
            ServerLogger.error('TikTok 비디오 다운로드 실패:', error);
            return false;
        }
    }

    private async downloadWithAPI(videoUrl: string, filePath: string): Promise<boolean> {
        try {
            if (!this.tikTokAPI) {
                ServerLogger.info('TikTok API 없음, yt-dlp 방법으로 이동');
                return false;
            }

            ServerLogger.info('📱 TikTok API v1으로 비디오 URL 추출 중...');
            const result = await this.tikTokAPI.Downloader(videoUrl, { version: "v1" });

            if (result.status !== "success" || !result.result?.video?.playAddr) {
                ServerLogger.warn('TikTok API에서 비디오 URL 추출 실패');
                return false;
            }

            const videoUrls = result.result.video.playAddr;
            if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
                ServerLogger.warn('TikTok API에서 유효한 비디오 URL 없음');
                return false;
            }

            // Try downloading from the first video URL
            const downloadUrl = videoUrls[0];
            ServerLogger.info(`📥 TikTok API URL에서 다운로드 중: ${downloadUrl.substring(0, 60)}...`);

            const axiosModule = await import('axios');
            const axios = axiosModule.default;
            const fs = await import('fs');
            const path = await import('path');

            // Create output directory if it doesn't exist
            const outputDir = path.dirname(filePath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/'
                },
                timeout: 60000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    const stats = fs.statSync(filePath);
                    if (stats.size > 1024) {
                        ServerLogger.success(`✅ TikTok API 다운로드 성공: ${filePath} (${stats.size} bytes)`);
                        resolve(true);
                    } else {
                        ServerLogger.warn(`❌ 다운로드된 파일이 너무 작습니다: ${stats.size} bytes`);
                        resolve(false);
                    }
                });

                writer.on('error', (error: Error) => {
                    ServerLogger.error('TikTok API 다운로드 스트림 오류:', error);
                    reject(false);
                });
            });

        } catch (error: any) {
            ServerLogger.error('TikTok API 다운로드 실패:', error.message);
            return false;
        }
    }

    private async downloadWithYtDlp(videoUrl: string, filePath: string): Promise<boolean> {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            const path = await import('path');
            const fs = await import('fs');

            // 출력 디렉토리 확인
            const outputDir = path.dirname(filePath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Use yt-dlp-nightly.exe from project root
            const ytdlpNightlyPath = path.join(__dirname, '../../../../yt-dlp-nightly.exe');
            const command = `"${ytdlpNightlyPath}" -o "${filePath}" "${videoUrl}"`;
            ServerLogger.info(`🔧 yt-dlp-nightly 다운로드 명령어: ${command}`);

            const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

            if (stderr) {
                ServerLogger.warn(`yt-dlp 경고: ${stderr}`);
            }

            // 파일 존재 및 크기 확인
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 1024) {
                    ServerLogger.info(`✅ TikTok 비디오 yt-dlp-nightly 다운로드 완료: ${filePath} (${stats.size} bytes)`);
                    return true;
                } else {
                    ServerLogger.warn(`❌ 다운로드된 파일이 너무 작습니다: ${stats.size} bytes`);
                    return false;
                }
            } else {
                ServerLogger.error('❌ yt-dlp-nightly 다운로드 완료했지만 파일이 존재하지 않음');
                return false;
            }

        } catch (error: any) {
            ServerLogger.error('yt-dlp-nightly TikTok 다운로드 실패:', error.message);
            return false;
        }
    }

    private async downloadFromDirectUrl(directUrl: string, filePath: string): Promise<boolean> {
        try {
            const axiosModule = await import('axios');
            const axios = axiosModule.default;
            const fs = await import('fs');

            const response = await axios({
                method: 'GET',
                url: directUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    ServerLogger.success(`TikTok 비디오 다운로드 완료: ${filePath}`);
                    resolve(true);
                });

                writer.on('error', (error: Error) => {
                    ServerLogger.error('TikTok 다운로드 스트림 오류:', error);
                    reject(error);
                });
            });

        } catch (error) {
            ServerLogger.error('TikTok 직접 다운로드 실패:', error);
            return false;
        }
    }

    async getVideoInfo(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            // 1. v1 API 시도
            let result = await this.getVideoInfoV1(videoUrl);
            if (result) return result;

            // 2. yt-dlp 대체 방법 시도 (v1 실패 시 바로)
            ServerLogger.info('📱 TikTok API v1 실패, yt-dlp 우선 시도...');
            result = await this.getVideoInfoFallback(videoUrl);
            if (result) return result;

            // 3. yt-dlp도 실패하면 v2 시도
            ServerLogger.info('🔄 yt-dlp도 실패, TikTok API v2 시도...');
            result = await this.getVideoInfoV2(videoUrl);
            if (result) return result;

            // 4. 마지막으로 v3 시도
            ServerLogger.info('🔄 TikTok API v2도 실패, v3 최종 시도...');
            result = await this.getVideoInfoV3(videoUrl);
            if (result) return result;

            ServerLogger.error('❌ 모든 TikTok 추출 방법 실패');
            return null;

        } catch (error) {
            ServerLogger.error('TikTok 비디오 정보 조회 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV1(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) {
                ServerLogger.info('TikTok API 없음, yt-dlp 대체 방법으로 직접 이동');
                return null;
            }

            // 레거시 코드에서 사용했던 정확한 API 메서드 시도
            let apiResult;
            if (typeof this.tikTokAPI.Downloader === 'function') {
                ServerLogger.info('📱 TikTok API Downloader 메서드 사용 (레거시 호환)');
                apiResult = await this.tikTokAPI.Downloader(videoUrl, { version: "v1" });
            } else if (typeof this.tikTokAPI.downloader === 'function') {
                ServerLogger.info('📱 TikTok API downloader 메서드 사용');
                apiResult = await this.tikTokAPI.downloader(videoUrl, { version: "v1" });
            } else if (typeof this.tikTokAPI.TiktokDL === 'function') {
                ServerLogger.info('📱 TikTok API TiktokDL 메서드 사용');
                apiResult = await this.tikTokAPI.TiktokDL(videoUrl);
            } else if (typeof this.tikTokAPI === 'function') {
                ServerLogger.info('📱 TikTok API 직접 함수 호출');
                apiResult = await this.tikTokAPI(videoUrl);
            } else {
                ServerLogger.info('TikTok API 메서드 없음, yt-dlp 대체 방법으로 이동');
                return null;
            }

            if (apiResult && (apiResult.status === "success" || apiResult.result)) {
                ServerLogger.info('🔍 TikTok API v1 원본 데이터:', JSON.stringify(apiResult, null, 2));
                return this.parseV1TikTokData(apiResult.result || apiResult, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v1 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV2(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) return null;

            let apiResult;
            if (typeof this.tikTokAPI.Downloader === 'function') {
                ServerLogger.info('📱 TikTok API v2 Downloader 시도 (레거시 호환)');
                apiResult = await this.tikTokAPI.Downloader(videoUrl, { version: "v2" });
            } else {
                ServerLogger.info('TikTok API v2 메서드 없음, v3로 이동');
                return null;
            }

            if (apiResult && (apiResult.status === "success" || apiResult.result)) {
                return this.parseV2TikTokData(apiResult.result || apiResult, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v2 실패:', error);
            return null;
        }
    }

    private async getVideoInfoV3(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            if (!this.tikTokAPI) return null;

            let apiResult;
            if (typeof this.tikTokAPI.Downloader === 'function') {
                ServerLogger.info('📱 TikTok API v3 Downloader 시도 (레거시 호환)');
                apiResult = await this.tikTokAPI.Downloader(videoUrl, { version: "v3" });
            } else {
                ServerLogger.info('TikTok API v3 메서드 없음, yt-dlp로 이동');
                return null;
            }

            if (apiResult && (apiResult.status === "success" || apiResult.result)) {
                return this.parseV3TikTokData(apiResult.result || apiResult, videoUrl);
            }

            return null;

        } catch (error) {
            ServerLogger.warn('TikTok API v3 실패:', error);
            return null;
        }
    }

    private async getVideoInfoFallback(videoUrl: string): Promise<TikTokVideoInfo | null> {
        try {
            ServerLogger.info('🔄 yt-dlp-nightly 대체 방법으로 TikTok 메타데이터 추출 시도...');
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const path = await import('path');
            const execAsync = promisify(exec);

            // Use yt-dlp-nightly.exe from project root
            const ytdlpNightlyPath = path.join(__dirname, '../../../../yt-dlp-nightly.exe');
            const command = `"${ytdlpNightlyPath}" --dump-json --write-info-json "${videoUrl}"`;
            ServerLogger.info(`🔧 yt-dlp-nightly 명령어: ${command}`);

            const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

            if (stderr) {
                ServerLogger.warn(`yt-dlp 경고: ${stderr}`);
            }

            const data = JSON.parse(stdout);
            ServerLogger.info('🔍 yt-dlp TikTok 원본 데이터:', JSON.stringify(data, null, 2));

            const result = this.parseYtDlpTikTokData(data);

            ServerLogger.info('✅ yt-dlp-nightly로 TikTok 메타데이터 추출 성공');
            ServerLogger.info(`📊 추출된 데이터: 조회수=${result.views}, 좋아요=${result.likes}, 댓글=${result.comments}, 지속시간=${result.duration}`);

            return result;

        } catch (error) {
            ServerLogger.error('TikTok yt-dlp-nightly 대체 방법 실패:', error);
            return null;
        }
    }

    private parseV1TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        const description = videoData.desc || '';
        const hashtags = this.extractHashtags(description);
        const mentions = this.extractMentions(description);

        // Statistics 구조 디버깅 (올바른 필드명 사용)
        ServerLogger.info('🔍 TikTok API v1 statistics 구조:', JSON.stringify(videoData.statistics, null, 2));

        const views = parseInt(videoData.statistics?.viewCount || videoData.statistics?.playCount || videoData.playCount || videoData.viewCount || '0');
        const likes = parseInt(videoData.statistics?.likeCount || videoData.statistics?.diggCount || videoData.likeCount || videoData.diggCount || '0');
        const comments = parseInt(videoData.statistics?.commentCount || videoData.commentCount || '0');
        const shares = parseInt(videoData.statistics?.shareCount || videoData.shareCount || '0');

        // Duration 변환: 밀리초를 초로 변환
        let duration = videoData.video?.duration || videoData.duration || 0;
        if (duration > 1000) {
            // 1000보다 크면 밀리초로 가정하여 초로 변환
            duration = Math.round(duration / 1000);
        }

        // Language 추출: region 필드에서
        const language = videoData.region || videoData.author?.region || '';

        // 🔍 Debug: Language 추출 디버깅
        ServerLogger.info('🔍 Language 추출 디버깅:', {
            'videoData.region': videoData.region,
            'videoData.author?.region': videoData.author?.region,
            'final language': language,
            'videoData keys': Object.keys(videoData),
            'author keys': videoData.author ? Object.keys(videoData.author) : 'no author'
        });

        // Channel name: username 우선, 없으면 nickname
        const channelName = videoData.author?.username || videoData.author?.uniqueId || videoData.author?.nickname || '';

        ServerLogger.info(`🔍 TikTok API v1 파싱 결과: 조회수=${views}, 좋아요=${likes}, 댓글=${comments}, 지속시간=${duration}초, 언어=${language}, 채널=${channelName}, 해시태그=${hashtags.length}개`);

        return {
            videoId: this.extractTikTokId(videoUrl),
            title: description || 'TikTok Video',
            description: description,
            channelName: channelName,
            views: views,
            likes: likes,
            comments: comments,
            shares: shares,
            uploadDate: videoData.createTime ? new Date(videoData.createTime * 1000).toISOString() : new Date().toISOString(),
            thumbnailUrl: videoData.video?.cover || '',
            videoUrl: videoData.video?.playAddr || videoData.video?.downloadAddr,
            duration: duration,
            hashtags: hashtags,
            mentions: mentions,
            language: language,
            platform: 'TIKTOK' as const
        };
    }

    private parseV2TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        return {
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.title || videoData.desc || 'TikTok Video',
            description: videoData.desc || videoData.title || '',
            channelName: videoData.author?.nickname || videoData.music?.authorName || '',
            views: parseInt(videoData.play_count || videoData.viewCount || '0'),
            likes: parseInt(videoData.digg_count || videoData.likeCount || '0'),
            comments: parseInt(videoData.comment_count || videoData.commentCount || '0'),
            shares: parseInt(videoData.share_count || videoData.shareCount || '0'),
            uploadDate: videoData.created_at || new Date().toISOString(),
            thumbnailUrl: videoData.origin_cover || videoData.cover || '',
            videoUrl: videoData.play || videoData.wmplay || videoData.hdplay,
            duration: videoData.duration,
            platform: 'TIKTOK' as const
        };
    }

    private parseV3TikTokData(videoData: any, videoUrl: string): TikTokVideoInfo {
        return {
            videoId: this.extractTikTokId(videoUrl),
            title: videoData.title || 'TikTok Video',
            description: videoData.title || '',
            channelName: videoData.author_name || videoData.author || '',
            views: parseInt(videoData.view_count || '0'),
            likes: parseInt(videoData.like_count || '0'),
            comments: parseInt(videoData.comment_count || '0'),
            shares: parseInt(videoData.share_count || '0'),
            uploadDate: videoData.create_time || new Date().toISOString(),
            thumbnailUrl: videoData.cover || '',
            videoUrl: videoData.video_url || videoData.download_url,
            duration: videoData.duration,
            platform: 'TIKTOK' as const
        };
    }

    private parseYtDlpTikTokData(data: any): TikTokVideoInfo {
        const description = data.description || data.title || '';

        // 통계 데이터 추출 개선
        const views = parseInt(data.view_count || data.views || data.play_count || '0');
        const likes = parseInt(data.like_count || data.likes || data.favourite_count || '0');
        const comments = parseInt(data.comment_count || data.comments || '0');
        const shares = parseInt(data.repost_count || data.shares || data.share_count || '0');

        // 지속시간 처리 개선
        let duration = data.duration;
        if (typeof duration === 'string') {
            duration = parseFloat(duration);
        }
        duration = duration || 0;

        // 해시태그 및 멘션 추출
        const hashtags = this.extractHashtags(description);
        const mentions = this.extractMentions(description);

        // 🔍 Debug: yt-dlp language 추출 디버깅
        const language = data.language || data.subtitles ? Object.keys(data.subtitles)[0] : '';
        ServerLogger.info('🔍 yt-dlp Language 추출 디버깅:', {
            'data.language': data.language,
            'data.subtitles': data.subtitles ? Object.keys(data.subtitles) : 'no subtitles',
            'final language': language,
            'data keys': Object.keys(data)
        });

        ServerLogger.info(`🔍 TikTok 파싱 결과: 조회수=${views}, 좋아요=${likes}, 댓글=${comments}, 지속시간=${duration}초, 언어=${language}, 해시태그=${hashtags.length}개`);

        return {
            videoId: data.id || this.extractTikTokId(data.webpage_url || ''),
            title: data.title || data.description || 'TikTok Video',
            description: description,
            channelName: data.uploader || data.channel || data.uploader_id || '',
            views: views,
            likes: likes,
            comments: comments,
            shares: shares,
            uploadDate: this.parseUploadDate(data.upload_date || data.timestamp) || new Date().toISOString(),
            thumbnailUrl: data.thumbnail || data.thumbnails?.[0]?.url || '',
            videoUrl: data.url || data.video_url,
            duration: duration,
            hashtags: hashtags,
            mentions: mentions,
            language: language,
            platform: 'TIKTOK' as const
        };
    }

    private parseUploadDate(uploadDate: string | number): string {
        if (!uploadDate) return new Date().toISOString();

        if (typeof uploadDate === 'number') {
            return new Date(uploadDate * 1000).toISOString();
        }

        // YYYYMMDD 형식을 ISO string으로 변환
        if (typeof uploadDate === 'string' && uploadDate.match(/^\d{8}$/)) {
            const year = uploadDate.substring(0, 4);
            const month = uploadDate.substring(4, 6);
            const day = uploadDate.substring(6, 8);
            return new Date(`${year}-${month}-${day}`).toISOString();
        }

        return new Date(uploadDate).toISOString();
    }

    extractTikTokId(url: string): string {
        if (!url || typeof url !== 'string') return '';

        const patterns = [
            /tiktok\.com\/@[^\/]+\/video\/(\d+)/,
            /tiktok\.com\/v\/(\d+)/,
            /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
            /vt\.tiktok\.com\/([A-Za-z0-9]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // URL에서 숫자만 추출
        const numbers = url.match(/\d{10,}/);
        if (numbers) {
            return numbers[0];
        }

        return '';
    }

    isTikTokUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/.test(url);
    }

    extractHashtags(description: string): string[] {
        if (!description) return [];

        const hashtags = description.match(/#[\w가-힣]+/g);
        return hashtags ? hashtags : []; // # 기호 유지 (기존 .substring(1) 제거)
    }

    extractMentions(description: string): string[] {
        if (!description) return [];

        const mentions = description.match(/@[\w.가-힣]+/g);
        return mentions ? mentions.map(mention => mention.substring(1)) : [];
    }

    // TikTok 특화 분석
    analyzeTrends(description: string, hashtags: string[]): {
        trendingHashtags: string[];
        viralPotential: number;
        contentType: string;
    } {
        const trendingKeywords = ['fyp', 'viral', 'trending', 'challenge', 'dance', 'comedy', 'trend'];
        const trendingHashtags = hashtags.filter(tag =>
            trendingKeywords.some(keyword => tag.toLowerCase().includes(keyword))
        );

        const viralPotential = this.calculateViralPotential(description, hashtags);
        const contentType = this.detectContentType(description, hashtags);

        return {
            trendingHashtags,
            viralPotential,
            contentType
        };
    }

    private calculateViralPotential(description: string, hashtags: string[]): number {
        let score = 0;

        // 바이럴 키워드 체크
        const viralKeywords = ['fyp', 'viral', 'trending', 'challenge', 'funny'];
        viralKeywords.forEach(keyword => {
            if (description.toLowerCase().includes(keyword) ||
                hashtags.some(tag => tag.toLowerCase().includes(keyword))) {
                score += 20;
            }
        });

        // 해시태그 개수 (적당한 개수가 좋음)
        if (hashtags.length >= 3 && hashtags.length <= 8) {
            score += 15;
        }

        return Math.min(score, 100);
    }

    private detectContentType(description: string, hashtags: string[]): string {
        const contentTypes = {
            'dance': ['dance', 'dancing', 'choreography', 'moves'],
            'comedy': ['funny', 'comedy', 'humor', 'laugh', 'joke'],
            'education': ['learn', 'education', 'tutorial', 'howto', 'tips'],
            'lifestyle': ['lifestyle', 'daily', 'vlog', 'routine'],
            'food': ['food', 'cooking', 'recipe', 'eat', 'delicious'],
            'beauty': ['makeup', 'beauty', 'skincare', 'fashion'],
            'pet': ['pet', 'dog', 'cat', 'animal', 'cute']
        };

        const text = (description + ' ' + hashtags.join(' ')).toLowerCase();

        for (const [type, keywords] of Object.entries(contentTypes)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return type;
            }
        }

        return 'entertainment';
    }
}

export default TikTokProcessor;
import { ServerLogger } from '../../../utils/logger';
import { Platform } from '../../../types/video-types';
import { InstagramReelInfo } from '../../instagram/types/instagram-types';

export class InstagramProcessor {
    private instagramExtractor: any;

    constructor() {
        this.initializeExtractor();
    }

    private initializeExtractor() {
        try {
            const { InstagramManager } = require('../../instagram/InstagramManager');
            this.instagramExtractor = new InstagramManager();
        } catch (error) {
            ServerLogger.error('Instagram Manager 초기화 실패:', error);
        }
    }

    async downloadVideo(videoUrl: string, filePath: string, startTime?: Date): Promise<boolean> {
        try {
            ServerLogger.info(`📥 Instagram 비디오 yt-dlp-nightly 다운로드 시작: ${videoUrl}`);
            return await this.downloadWithYtDlp(videoUrl, filePath);
        } catch (error) {
            ServerLogger.error('Instagram 비디오 다운로드 실패:', error);
            return false;
        }
    }

    private async downloadWithYtDlp(videoUrl: string, filePath: string): Promise<boolean> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            const path = require('path');
            const fs = require('fs');

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
                ServerLogger.warn(`yt-dlp-nightly 경고: ${stderr}`);
            }

            // 파일 존재 및 크기 확인
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.size > 1024) {
                    ServerLogger.info(`✅ Instagram 비디오 yt-dlp-nightly 다운로드 완료: ${filePath} (${stats.size} bytes)`);
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
            ServerLogger.error('yt-dlp-nightly Instagram 다운로드 실패:', error.message);
            return false;
        }
    }

    private async downloadFromDirectUrl(directUrl: string, filePath: string): Promise<boolean> {
        try {
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');

            const response = await axios({
                method: 'GET',
                url: directUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': 'https://www.instagram.com/'
                }
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    // 파일 크기 확인
                    const stats = fs.statSync(filePath);
                    if (stats.size < 1024) {
                        ServerLogger.warn(`Instagram 다운로드된 파일이 너무 작습니다: ${stats.size} bytes`);
                        resolve(false);
                    } else {
                        ServerLogger.success(`Instagram 비디오 다운로드 완료: ${filePath}`);
                        resolve(true);
                    }
                });

                writer.on('error', (error: Error) => {
                    ServerLogger.error('Instagram 다운로드 스트림 오류:', error);
                    reject(error);
                });
            });

        } catch (error) {
            ServerLogger.error('Instagram 직접 다운로드 실패:', error);
            return false;
        }
    }

    async getVideoInfo(instagramUrl: string): Promise<InstagramReelInfo | null> {
        try {
            if (this.instagramExtractor) {
                ServerLogger.info('📱 Instagram Manager로 비디오 정보 추출 시도...');
                const instagramData = await this.instagramExtractor.extractReel(instagramUrl);

                if (!instagramData.success) {
                    ServerLogger.warn('Instagram 추출기에서 데이터를 가져올 수 없음');
                    return await this.getVideoInfoFallback(instagramUrl);
                }

                return this.normalizeInstagramData(instagramData.data);
            }

            ServerLogger.warn('Instagram 추출기가 초기화되지 않음, yt-dlp-nightly 대체 방법 사용');
            return await this.getVideoInfoFallback(instagramUrl);

        } catch (error) {
            ServerLogger.error('Instagram 비디오 정보 조회 실패:', error);
            ServerLogger.warn('yt-dlp-nightly 대체 방법으로 시도...');
            return await this.getVideoInfoFallback(instagramUrl);
        }
    }

    private async getVideoInfoFallback(instagramUrl: string): Promise<InstagramReelInfo | null> {
        try {
            ServerLogger.info('🔄 yt-dlp-nightly 대체 방법으로 Instagram 메타데이터 추출 시도...');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // yt-dlp-nightly에서 더 많은 메타데이터 추출
            const path = require('path');
            const ytdlpNightlyPath = path.join(__dirname, '../../../../yt-dlp-nightly.exe');
            const command = `"${ytdlpNightlyPath}" --dump-json --write-info-json "${instagramUrl}"`;
            ServerLogger.info(`🔧 yt-dlp-nightly 명령어: ${command}`);

            const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

            if (stderr) {
                ServerLogger.warn(`yt-dlp-nightly 경고: ${stderr}`);
            }

            const data = JSON.parse(stdout);
            const result = this.parseYtDlpData(data);

            ServerLogger.info('✅ yt-dlp-nightly로 Instagram 메타데이터 추출 성공');
            ServerLogger.info(`📊 추출된 데이터: 조회수=${result.viewCount}, 좋아요=${result.likeCount}, 댓글=${result.commentCount}`);

            return result;

        } catch (error) {
            ServerLogger.error('Instagram yt-dlp-nightly 대체 방법 실패:', error);
            return null;
        }
    }

    private normalizeInstagramData(data: any): InstagramReelInfo {
        const caption = data.caption || data.title || '';

        return {
            shortcode: data.shortcode || data.id || this.extractInstagramId(data.url || ''),
            url: data.url || '',
            caption: caption,
            timestamp: data.timestamp || Date.now(),
            uploadDate: data.uploadDate || data.date || data.created_at || new Date().toISOString(),
            // ReelsExtractor 데이터 형식에 맞춰 수정
            viewCount: data.viewCount || parseInt(data.video_view_count || data.views || '0'),
            likeCount: data.likeCount || parseInt(data.likes || data.like_count || '0'),
            commentCount: data.commentCount || parseInt(data.comments || data.comment_count || '0'),
            isVideo: data.isVideo !== undefined ? data.isVideo : true,
            videoDuration: data.videoDuration || data.duration || undefined,
            videoUrl: data.videoUrl || data.video_url || data.url,
            thumbnailUrl: data.thumbnailUrl || data.display_url || data.thumbnail_url || '',
            hashtags: data.hashtags || this.extractHashtags(caption),
            mentions: data.mentions || this.extractMentions(caption),
            language: data.language || undefined,
            owner: data.owner || {
                username: data.username || data.owner_username || '',
                fullName: data.full_name || data.owner_username || '',
                isVerified: data.is_verified || false,
                profilePicUrl: data.profile_pic_url || ''
            },
            platform: 'INSTAGRAM' as const
        };
    }

    private parseYtDlpData(data: any): InstagramReelInfo {
        const description = data.description || data.title || '';

        // yt-dlp-nightly에서 제공하는 더 풍부한 메타데이터 활용
        return {
            shortcode: data.id || this.extractInstagramId(data.webpage_url || ''),
            url: data.webpage_url || data.url || '',
            caption: description,
            timestamp: Date.now(),
            uploadDate: this.parseUploadDate(data.upload_date || data.timestamp),
            viewCount: parseInt(data.view_count || data.views || '0'),
            likeCount: parseInt(data.like_count || data.likes || '0'),
            commentCount: parseInt(data.comment_count || data.comments || '0'),
            isVideo: data.vcodec !== 'none' && data.vcodec !== null,
            videoDuration: data.duration || undefined,
            videoUrl: data.url || data.video_url,
            thumbnailUrl: data.thumbnail || data.thumbnails?.[0]?.url || '',
            hashtags: this.extractHashtags(description),
            mentions: this.extractMentions(description),
            language: data.language || data.automatic_captions ? Object.keys(data.automatic_captions)[0] : undefined,
            location: data.location ? {
                name: data.location.name || '',
                id: data.location.id || ''
            } : undefined,
            owner: {
                username: data.uploader || data.channel || data.uploader_id || '',
                fullName: data.uploader || data.channel || '',
                isVerified: data.uploader_verified || false,
                profilePicUrl: data.uploader_avatar || data.channel_avatar || ''
            },
            platform: 'INSTAGRAM' as const
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

    private extractInstagramTitle(caption: string): string {
        if (!caption) return 'Instagram Video';

        // 첫 번째 줄이나 첫 번째 문장을 제목으로 사용
        const lines = caption.split('\n');
        const firstLine = lines[0].trim();

        if (firstLine.length > 3) {
            // 60자 이내로 제한
            return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
        }

        return 'Instagram Video';
    }

    extractInstagramId(url: string): string {
        // Reel과 일반 Post 모두 지원
        const patterns = [
            /\/reel\/([A-Za-z0-9_-]+)/,  // Reel URL
            /\/p\/([A-Za-z0-9_-]+)/,     // 일반 Post URL
            /\/tv\/([A-Za-z0-9_-]+)/     // IGTV URL
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return '';
    }

    async extractVideoUrl(instagramUrl: string): Promise<string | null> {
        try {
            ServerLogger.info(`🔍 Instagram 비디오 URL 추출 시도: ${instagramUrl}`);

            // 1. yt-dlp를 우선적으로 사용
            const ytDlpUrl = await this.extractVideoUrlWithYtDlp(instagramUrl);
            if (ytDlpUrl) {
                ServerLogger.info(`✅ yt-dlp-nightly로 비디오 URL 추출 성공: ${ytDlpUrl}`);
                return ytDlpUrl;
            }

            ServerLogger.warn('⚠️ yt-dlp-nightly 실패, 직접 HTML 파싱 시도');

            // 2. HTML 파싱 방법 (대체)
            const axios = require('axios');
            const response = await axios.get(instagramUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none'
                }
            });

            const html = response.data;

            // JSON 데이터에서 비디오 URL 추출 (개선된 패턴)
            const patterns = [
                /"video_url":"([^"]+)"/,
                /"src":"([^"]+\.mp4[^"]*)"/,
                /property="og:video" content="([^"]+)"/,
                /property="og:video:secure_url" content="([^"]+)"/,
                /"playback_video_dash_manifest":"([^"]+)"/,
                /"video_dash_manifest":"([^"]+)"/
            ];

            for (const pattern of patterns) {
                const matches = html.match(pattern);
                if (matches && matches.length > 0) {
                    let videoUrl = matches[1];

                    // URL 디코딩
                    if (videoUrl.includes('\\u')) {
                        videoUrl = videoUrl.replace(/\\u(\w{4})/g, (match: string, code: string) => {
                            return String.fromCharCode(parseInt(code, 16));
                        });
                    }

                    if (videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('video'))) {
                        ServerLogger.info(`✅ HTML 파싱으로 비디오 URL 추출 성공: ${videoUrl}`);
                        return videoUrl;
                    }
                }
            }

            // meta tag에서 추출
            const metaMatch = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
            if (metaMatch && metaMatch[1]) {
                ServerLogger.info(`✅ Meta 태그에서 비디오 URL 추출 성공: ${metaMatch[1]}`);
                return metaMatch[1];
            }

            ServerLogger.warn('❌ 모든 Instagram URL 추출 방법 실패');
            return null;

        } catch (error) {
            ServerLogger.error('Instagram 비디오 URL 추출 실패:', error);
            return null;
        }
    }

    private async extractVideoUrlWithYtDlp(instagramUrl: string): Promise<string | null> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            // yt-dlp-nightly로 직접 비디오 URL 추출
            const path = require('path');
            const ytdlpNightlyPath = path.join(__dirname, '../../../../yt-dlp-nightly.exe');
            const command = `"${ytdlpNightlyPath}" --get-url "${instagramUrl}"`;
            ServerLogger.info(`🔧 yt-dlp-nightly 명령어 실행: ${command}`);

            const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

            if (stderr) {
                ServerLogger.warn(`yt-dlp-nightly 경고: ${stderr}`);
            }

            const videoUrl = stdout.trim();
            if (videoUrl && videoUrl.startsWith('http')) {
                return videoUrl;
            }

            return null;

        } catch (error: any) {
            ServerLogger.error('yt-dlp-nightly 비디오 URL 추출 실패:', error.message);
            return null;
        }
    }

    isInstagramUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        // Reel, Post, IGTV 모든 URL 형태 지원
        return /^https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\//.test(url);
    }

    // Instagram 특화 메타데이터 추출
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
}

export default InstagramProcessor;
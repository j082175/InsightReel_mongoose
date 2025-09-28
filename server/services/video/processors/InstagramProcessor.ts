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
            const directVideoUrl = await this.extractVideoUrl(videoUrl);
            if (!directVideoUrl) {
                throw new Error('Instagram 비디오 URL을 추출할 수 없습니다');
            }

            return await this.downloadFromDirectUrl(directVideoUrl, filePath);

        } catch (error) {
            ServerLogger.error('Instagram 비디오 다운로드 실패:', error);
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
                const instagramData = await this.instagramExtractor.extractData(instagramUrl);

                if (!instagramData.success) {
                    ServerLogger.warn('Instagram 추출기에서 데이터를 가져올 수 없음');
                    return await this.getVideoInfoFallback(instagramUrl);
                }

                return this.normalizeInstagramData(instagramData.data);
            }

            return await this.getVideoInfoFallback(instagramUrl);

        } catch (error) {
            ServerLogger.error('Instagram 비디오 정보 조회 실패:', error);
            return null;
        }
    }

    private async getVideoInfoFallback(instagramUrl: string): Promise<InstagramReelInfo | null> {
        try {
            // yt-dlp를 사용한 대체 방법
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const command = `yt-dlp --dump-json "${instagramUrl}"`;
            const { stdout } = await execAsync(command);

            const data = JSON.parse(stdout);
            return this.parseYtDlpData(data);

        } catch (error) {
            ServerLogger.error('Instagram 대체 방법 실패:', error);
            return null;
        }
    }

    private normalizeInstagramData(data: any): InstagramReelInfo {
        const caption = data.caption || data.title || '';

        return {
            shortcode: data.id || this.extractInstagramId(data.url || ''),
            url: data.url || '',
            caption: caption,
            timestamp: data.timestamp || Date.now(),
            uploadDate: data.date || data.created_at || new Date().toISOString(),
            viewCount: parseInt(data.video_view_count || data.views || '0'),
            likeCount: parseInt(data.likes || data.like_count || '0'),
            commentCount: parseInt(data.comments || data.comment_count || '0'),
            isVideo: true,
            videoDuration: data.duration || undefined,
            videoUrl: data.video_url || data.url,
            thumbnailUrl: data.display_url || data.thumbnail_url || '',
            hashtags: this.extractHashtags(caption),
            mentions: this.extractMentions(caption),
            owner: {
                username: data.username || data.owner_username || '',
                fullName: data.full_name || data.owner_username || '',
                isVerified: data.is_verified || false,
                profilePicUrl: data.profile_pic_url || ''
            },
            platform: 'INSTAGRAM' as const
        };
    }

    private parseYtDlpData(data: any): InstagramReelInfo {
        const description = data.description || '';

        return {
            shortcode: data.id || '',
            url: data.webpage_url || data.url || '',
            caption: description,
            timestamp: Date.now(),
            uploadDate: data.upload_date || new Date().toISOString(),
            viewCount: parseInt(data.view_count || '0'),
            likeCount: parseInt(data.like_count || '0'),
            commentCount: parseInt(data.comment_count || '0'),
            isVideo: true,
            videoDuration: data.duration || undefined,
            videoUrl: data.url,
            thumbnailUrl: data.thumbnail || '',
            hashtags: this.extractHashtags(description),
            mentions: this.extractMentions(description),
            owner: {
                username: data.uploader || data.channel || '',
                fullName: data.uploader || data.channel || '',
                isVerified: false,
                profilePicUrl: ''
            },
            platform: 'INSTAGRAM' as const
        };
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
        const match = url.match(/\/p\/([A-Za-z0-9_-]+)/);
        return match ? match[1] : '';
    }

    async extractVideoUrl(instagramUrl: string): Promise<string | null> {
        try {
            // Instagram 페이지에서 직접 비디오 URL 추출
            const axios = require('axios');
            const response = await axios.get(instagramUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const html = response.data;

            // JSON 데이터에서 비디오 URL 추출
            const patterns = [
                /"video_url":"([^"]+)"/,
                /"src":"([^"]+\.mp4[^"]*)"/,
                /property="og:video" content="([^"]+)"/,
                /property="og:video:secure_url" content="([^"]+)"/
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

                    if (videoUrl && videoUrl.includes('.mp4')) {
                        return videoUrl;
                    }
                }
            }

            // meta tag에서 추출
            const metaMatch = html.match(/<meta[^>]*property="og:video"[^>]*content="([^"]+)"/);
            if (metaMatch && metaMatch[1]) {
                return metaMatch[1];
            }

            return null;

        } catch (error) {
            ServerLogger.error('Instagram 비디오 URL 추출 실패:', error);
            return null;
        }
    }

    isInstagramUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\/(www\.)?instagram\.com/.test(url);
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
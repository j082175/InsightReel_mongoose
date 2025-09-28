import * as fs from 'fs';
import * as path from 'path';
import { ServerLogger } from '../../../utils/logger';
import { Platform } from '../../../types/video-types';

export interface VideoFileMetadata {
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    fps: number;
    format: string;
    size: number;
}

export class VideoUtils {
    private static ffprobePath: string;

    static {
        try {
            VideoUtils.ffprobePath = require('ffprobe-static').path;
        } catch (error) {
            VideoUtils.ffprobePath = require('ffmpeg-static');
        }
    }

    /**
     * 플랫폼 감지
     */
    static detectPlatform(url: string): Platform | null {
        if (!url || typeof url !== 'string') return null;

        if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
            return 'YOUTUBE';
        }

        if (/^https?:\/\/(www\.)?instagram\.com/.test(url)) {
            return 'INSTAGRAM';
        }

        if (/^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/.test(url)) {
            return 'TIKTOK';
        }

        return null;
    }

    /**
     * URL 유효성 검사
     */
    static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 비디오 메타데이터 추출
     */
    static async getVideoMetadata(videoPath: string): Promise<VideoFileMetadata | null> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');

            const ffprobe = spawn(VideoUtils.ffprobePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                videoPath
            ]);

            let stdout = '';
            let stderr = '';

            ffprobe.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            ffprobe.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            ffprobe.on('close', (code: number) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(stdout);
                        const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
                        const format = data.format;

                        if (videoStream && format) {
                            resolve({
                                duration: parseFloat(format.duration || '0'),
                                width: parseInt(videoStream.width || '0'),
                                height: parseInt(videoStream.height || '0'),
                                bitrate: parseInt(format.bit_rate || '0'),
                                fps: VideoUtils.parseFrameRate(videoStream.r_frame_rate),
                                format: format.format_name || '',
                                size: parseInt(format.size || '0')
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        ServerLogger.error('메타데이터 파싱 오류:', error);
                        resolve(null);
                    }
                } else {
                    ServerLogger.error(`ffprobe 실행 실패 (코드: ${code}):`, stderr);
                    resolve(null);
                }
            });

            ffprobe.on('error', (error: Error) => {
                ServerLogger.error('ffprobe 실행 오류:', error);
                resolve(null);
            });
        });
    }

    /**
     * 프레임레이트 파싱
     */
    private static parseFrameRate(frameRate: string): number {
        if (!frameRate) return 0;

        const parts = frameRate.split('/');
        if (parts.length === 2) {
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            return denominator !== 0 ? numerator / denominator : 0;
        }

        return parseFloat(frameRate) || 0;
    }

    /**
     * 파일 크기 조회
     */
    static getFileSize(filePath: string): number {
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.size;
            }
            return 0;
        } catch (error) {
            ServerLogger.error('파일 크기 조회 실패:', error);
            return 0;
        }
    }

    /**
     * 채널 URL 생성
     */
    static buildChannelUrl(platform: Platform, channelId: string, customUrl?: string): string {
        switch (platform) {
            case 'YOUTUBE':
                if (customUrl) {
                    if (customUrl.startsWith('@')) {
                        return `https://www.youtube.com/${customUrl}`;
                    } else if (customUrl.startsWith('UC') || customUrl.startsWith('UC')) {
                        return `https://www.youtube.com/channel/${customUrl}`;
                    } else {
                        return `https://www.youtube.com/c/${customUrl}`;
                    }
                }
                if (channelId) {
                    return `https://www.youtube.com/channel/${channelId}`;
                }
                return '';

            case 'INSTAGRAM':
                return channelId ? `https://www.instagram.com/${channelId}/` : '';

            case 'TIKTOK':
                return channelId ? `https://www.tiktok.com/@${channelId}` : '';

            default:
                return '';
        }
    }

    /**
     * YouTube 핸들 추출
     */
    static extractYouTubeHandle(customUrl: string): string {
        if (!customUrl) return '';

        // @handle 형식 처리
        if (customUrl.startsWith('@')) {
            return customUrl;
        }

        // URL에서 핸들 추출
        const handleMatch = customUrl.match(/@([a-zA-Z0-9_.-]+)/);
        if (handleMatch) {
            return `@${handleMatch[1]}`;
        }

        // c/ 또는 user/ 형식에서 추출
        const pathMatch = customUrl.match(/(?:\/c\/|\/user\/)([^\/\?]+)/);
        if (pathMatch) {
            return `@${pathMatch[1]}`;
        }

        return '';
    }

    /**
     * 해시태그 추출
     */
    static extractHashtags(text: string): string[] {
        if (!text) return [];

        const hashtags = text.match(/#[\w가-힣]+/g);
        return hashtags ? hashtags : []; // # 기호 유지 (기존 .substring(1) 제거)
    }

    /**
     * 멘션 추출
     */
    static extractMentions(text: string): string[] {
        if (!text) return [];

        const mentions = text.match(/@[\w.가-힣]+/g);
        return mentions ? mentions.map(mention => mention.substring(1)) : [];
    }

    /**
     * 시간 문자열 변환
     */
    static secondsToTimeString(seconds: number): string {
        if (seconds < 0) return '00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * 지속시간 포맷팅
     */
    static formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}시간 ${mins}분`;
        } else {
            return `${mins}분`;
        }
    }

    /**
     * 조회수 포맷팅
     */
    static formatViews(views: number): string {
        if (views >= 1000000000) {
            return Math.floor(views / 100000000) / 10 + '억';
        } else if (views >= 100000000) {
            return Math.floor(views / 100000000) + '억';
        } else if (views >= 10000) {
            return Math.floor(views / 1000) / 10 + '만';
        } else if (views >= 1000) {
            return Math.floor(views / 100) / 10 + '천';
        } else {
            return views.toString();
        }
    }

    /**
     * 컨텐츠 타입 분류
     */
    static classifyContentType(duration: number): 'SHORT' | 'MID' | 'LONG' {
        if (duration <= 60) return 'SHORT';      // 1분 이하
        if (duration <= 600) return 'MID';       // 10분 이하
        return 'LONG';                           // 10분 초과
    }

    /**
     * 파일 타입 감지
     */
    static async detectFileType(filePath: string): Promise<'video' | 'image' | 'audio' | 'unknown'> {
        try {
            if (!fs.existsSync(filePath)) {
                return 'unknown';
            }

            const ext = path.extname(filePath).toLowerCase();

            // 확장자로 우선 판단
            const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
            const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'];

            if (videoExtensions.includes(ext)) return 'video';
            if (imageExtensions.includes(ext)) return 'image';
            if (audioExtensions.includes(ext)) return 'audio';

            // 파일 시그니처로 판단
            const fileDesc = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(16);
            fs.readSync(fileDesc, buffer, 0, 16, 0);
            fs.closeSync(fileDesc);

            // 비디오 시그니처
            if (buffer.includes(Buffer.from('ftyp'))) return 'video'; // MP4
            if (buffer.includes(Buffer.from('AVI '))) return 'video'; // AVI
            if (buffer.includes(Buffer.from('RIFF'))) {
                const subType = buffer.slice(8, 12);
                if (subType.includes(Buffer.from('WEBM'))) return 'video';
                if (subType.includes(Buffer.from('AVI '))) return 'video';
                if (subType.includes(Buffer.from('WAVE'))) return 'audio';
            }

            // 이미지 시그니처
            if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image'; // JPEG
            if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image'; // PNG
            if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image'; // GIF
            if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'image'; // BMP

            // 오디오 시그니처
            if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return 'audio'; // MP3
            if (buffer.slice(0, 4).equals(Buffer.from('fLaC'))) return 'audio'; // FLAC

            return 'unknown';

        } catch (error) {
            ServerLogger.error('파일 타입 감지 실패:', error);
            return 'unknown';
        }
    }

    /**
     * 안전한 파일명 생성
     */
    static sanitizeFileName(fileName: string, maxLength: number = 255): string {
        // null/undefined 체크
        if (!fileName || typeof fileName !== 'string') {
            return 'unknown_file';
        }

        // 위험한 문자 제거
        let sanitized = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

        // 연속된 언더스코어 제거
        sanitized = sanitized.replace(/_+/g, '_');

        // 앞뒤 공백 및 점 제거
        sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

        // 길이 제한
        if (sanitized.length > maxLength) {
            const ext = path.extname(sanitized);
            const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length);
            sanitized = nameWithoutExt.substring(0, maxLength - ext.length) + ext;
        }

        return sanitized || 'unnamed_file';
    }

    /**
     * 임시 파일 정리
     */
    static cleanTempFiles(directory: string, maxAge: number = 24 * 60 * 60 * 1000): number {
        let deletedCount = 0;

        try {
            if (!fs.existsSync(directory)) return 0;

            const files = fs.readdirSync(directory);
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    } catch (error) {
                        ServerLogger.warn(`파일 삭제 실패: ${filePath}`, error);
                    }
                }
            });

            if (deletedCount > 0) {
                ServerLogger.info(`${directory}에서 ${deletedCount}개의 임시 파일을 정리했습니다`);
            }

        } catch (error) {
            ServerLogger.error(`임시 파일 정리 실패 (${directory}):`, error);
        }

        return deletedCount;
    }

    /**
     * 디스크 공간 확인
     */
    static async checkDiskSpace(directory: string): Promise<{ free: number; total: number } | null> {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            let command: string;
            if (process.platform === 'win32') {
                command = `fsutil volume diskfree "${directory}"`;
            } else {
                command = `df -B1 "${directory}"`;
            }

            const { stdout } = await execAsync(command);

            if (process.platform === 'win32') {
                // Windows: fsutil 출력 파싱
                const lines = stdout.split('\n');
                const freeLine = lines.find((line: string) => line.includes('사용 가능한 바이트') || line.includes('Total free bytes'));
                const totalLine = lines.find((line: string) => line.includes('총 바이트') || line.includes('Total # of bytes'));

                if (freeLine && totalLine) {
                    const freeBytes = parseInt(freeLine.match(/\d+/)?.[0] || '0');
                    const totalBytes = parseInt(totalLine.match(/\d+/)?.[0] || '0');
                    return { free: freeBytes, total: totalBytes };
                }
            } else {
                // Linux/Mac: df 출력 파싱
                const lines = stdout.trim().split('\n');
                if (lines.length >= 2) {
                    const fields = lines[1].split(/\s+/);
                    if (fields.length >= 4) {
                        return {
                            free: parseInt(fields[3]),
                            total: parseInt(fields[1])
                        };
                    }
                }
            }

            return null;

        } catch (error) {
            ServerLogger.error('디스크 공간 확인 실패:', error);
            return null;
        }
    }
}

export default VideoUtils;
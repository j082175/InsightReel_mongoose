import * as fs from 'fs';
import * as path from 'path';
import { ServerLogger } from '../../../utils/logger';

interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
    frameCount?: number;
    analysisType?: 'single' | 'multi-frame' | 'full';
}

interface ThumbnailResult {
    success: boolean;
    thumbnailPath?: string;
    framePaths?: string[];
    error?: string;
}

export class ThumbnailExtractor {
    private thumbnailDir: string;
    private framesDir: string;
    private ffmpegPath: string;
    private ffprobePath: string;

    constructor() {
        this.thumbnailDir = path.join(__dirname, '../../../../media/thumbnails');
        this.framesDir = path.join(__dirname, '../../../../downloads/frames');

        this.ffmpegPath = require('ffmpeg-static');

        try {
            this.ffprobePath = require('ffprobe-static').path;
        } catch (error) {
            ServerLogger.warn('ffprobe-static 패키지가 없습니다. ffmpeg으로 대체합니다.');
            this.ffprobePath = this.ffmpegPath;
        }

        this.ensureDirectories();
    }

    private ensureDirectories(): void {
        [this.thumbnailDir, this.framesDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Convert absolute path to relative path for database storage
     */
    private toRelativePath(absolutePath: string): string {
        // Convert absolute path to relative path from project root
        const projectRoot = path.join(__dirname, '../../../../');
        const relativePath = path.relative(projectRoot, absolutePath);
        return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
    }

    async generateThumbnail(
        videoPath: string,
        analysisType: 'single' | 'multi-frame' | 'full' | 'video_only' = 'multi-frame'
    ): Promise<ThumbnailResult> {
        try {
            ServerLogger.info(`🔍 ThumbnailExtractor.generateThumbnail called with: videoPath="${videoPath}", analysisType="${analysisType}"`);

            const fileType = await this.detectFileType(videoPath);
            ServerLogger.info(`🔍 Detected file type: ${fileType}`);

            if (fileType === 'image') {
                // 이미지 파일인 경우 복사만
                ServerLogger.info(`📸 Processing as image file`);
                const thumbnailPath = await this.copyImageAsThumbnail(videoPath);
                return {
                    success: true,
                    thumbnailPath,
                    framePaths: [thumbnailPath]
                };
            }

            // 비디오 파일 처리
            ServerLogger.info(`🎬 Processing as video file with analysisType: ${analysisType}`);
            if (analysisType === 'single') {
                ServerLogger.info(`➡️ Generating single thumbnail`);
                return await this.generateSingleThumbnail(videoPath);
            } else if (analysisType === 'multi-frame' || analysisType === 'full' || analysisType === 'video_only') {
                ServerLogger.info(`➡️ Generating multiple frames`);
                return await this.generateMultipleFrames(videoPath);
            }

            ServerLogger.error(`❌ Unsupported analysis type: ${analysisType}`);
            return { success: false, error: '지원하지 않는 분석 타입입니다' };

        } catch (error) {
            ServerLogger.error('썸네일 생성 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    private async copyImageAsThumbnail(imagePath: string): Promise<string> {
        const baseName = path.basename(imagePath, path.extname(imagePath));
        const thumbnailPath = path.join(this.thumbnailDir, `${baseName}_thumb.jpg`);

        // Sharp를 사용하여 이미지 리사이즈 및 변환
        try {
            const sharp = require('sharp');
            await sharp(imagePath)
                .resize(640, 360, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            const relativePath = this.toRelativePath(thumbnailPath);
            ServerLogger.info(`이미지 썸네일 생성 완료: ${relativePath}`);
            return relativePath;
        } catch (error) {
            // Sharp가 없는 경우 단순 복사
            fs.copyFileSync(imagePath, thumbnailPath);
            const relativePath = this.toRelativePath(thumbnailPath);
            return relativePath;
        }
    }

    async generateSingleThumbnail(videoPath: string): Promise<ThumbnailResult> {
        try {
            const duration = await this.getVideoDuration(videoPath);
            if (duration <= 0) {
                throw new Error('비디오 길이를 가져올 수 없습니다');
            }

            // 중간 지점에서 썸네일 생성
            const timeInSeconds = Math.floor(duration * 0.3); // 30% 지점
            const baseName = path.basename(videoPath, path.extname(videoPath));
            const thumbnailPath = path.join(this.thumbnailDir, `${baseName}_thumb.jpg`);

            const success = await this.extractFrameAtTime(videoPath, timeInSeconds, thumbnailPath);

            if (success) {
                const relativePath = this.toRelativePath(thumbnailPath);
                return {
                    success: true,
                    thumbnailPath: relativePath,
                    framePaths: [relativePath]
                };
            } else {
                throw new Error('썸네일 추출 실패');
            }

        } catch (error) {
            ServerLogger.error('단일 썸네일 생성 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    async generateMultipleFrames(videoPath: string): Promise<ThumbnailResult> {
        try {
            const duration = await this.getVideoDuration(videoPath);
            if (duration <= 0) {
                throw new Error('비디오 길이를 가져올 수 없습니다');
            }

            const frameCount = this.calculateOptimalFrameCount(duration);
            const intervals = this.calculateFrameIntervals(duration, frameCount);

            const baseName = path.basename(videoPath, path.extname(videoPath));
            const framePaths: string[] = [];
            let mainThumbnailPath = '';

            for (let i = 0; i < intervals.length; i++) {
                const timeInSeconds = intervals[i];
                const framePath = path.join(this.framesDir, `${baseName}_frame_${i + 1}.jpg`);

                const success = await this.extractFrameAtTime(videoPath, timeInSeconds, framePath);
                if (success) {
                    framePaths.push(framePath);
                    if (i === 0) {
                        mainThumbnailPath = framePath;
                    }
                }
            }

            if (framePaths.length === 0) {
                throw new Error('프레임을 추출할 수 없습니다');
            }

            // 메인 썸네일 복사
            if (mainThumbnailPath) {
                const thumbnailPath = path.join(this.thumbnailDir, `${baseName}_thumb.jpg`);
                fs.copyFileSync(mainThumbnailPath, thumbnailPath);
                mainThumbnailPath = thumbnailPath;
            }

            return {
                success: true,
                thumbnailPath: this.toRelativePath(mainThumbnailPath),
                framePaths: framePaths.map(path => this.toRelativePath(path))
            };

        } catch (error) {
            ServerLogger.error('다중 프레임 생성 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    private calculateOptimalFrameCount(duration: number): number {
        // Legacy 시스템과 동일한 적극적인 프레임 추출 (더 나은 AI 분석을 위해)
        if (duration <= 10) return 6;      // 10초 이하: 6개
        if (duration <= 30) return 10;     // 30초 이하: 10개
        if (duration <= 60) return 14;     // 60초 이하: 14개
        return Math.min(20, Math.ceil(duration / 5)); // 5초당 1프레임, 최대 20개
    }

    private calculateFrameIntervals(duration: number, frameCount: number): number[] {
        const intervals: number[] = [];
        const step = duration / (frameCount + 1);

        for (let i = 1; i <= frameCount; i++) {
            intervals.push(Math.floor(step * i));
        }

        return intervals;
    }

    async extractFrameAtTime(videoPath: string, timeInSeconds: number, outputPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');

            const ffmpeg = spawn(this.ffmpegPath, [
                '-i', videoPath,
                '-ss', timeInSeconds.toString(),
                '-vframes', '1',
                '-f', 'image2',
                '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
                '-q:v', '2',
                '-y',
                outputPath
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stderr = '';

            ffmpeg.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            ffmpeg.on('close', (code: number) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    if (stats.size > 1024) { // 1KB 이상
                        resolve(true);
                    } else {
                        ServerLogger.warn(`생성된 프레임이 너무 작습니다: ${stats.size} bytes`);
                        resolve(false);
                    }
                } else {
                    ServerLogger.error(`FFmpeg 프레임 추출 실패 (코드: ${code}):`, stderr);
                    resolve(false);
                }
            });

            ffmpeg.on('error', (error: Error) => {
                ServerLogger.error('FFmpeg 실행 오류:', error);
                resolve(false);
            });
        });
    }

    async getVideoDuration(videoPath: string): Promise<number> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');

            const ffprobe = spawn(this.ffprobePath, [
                '-v', 'quiet',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
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
                    const duration = parseFloat(stdout.trim());
                    if (isNaN(duration)) {
                        ServerLogger.warn(`유효하지 않은 duration 값: ${stdout}`);
                        resolve(0);
                    } else {
                        resolve(duration);
                    }
                } else {
                    ServerLogger.error(`ffprobe 실행 실패 (코드: ${code}):`, stderr);
                    resolve(0);
                }
            });

            ffprobe.on('error', (error: Error) => {
                ServerLogger.error('ffprobe 실행 오류:', error);
                resolve(0);
            });
        });
    }

    private async detectFileType(filePath: string): Promise<'video' | 'image' | 'unknown'> {
        try {
            const ext = path.extname(filePath).toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
            const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];

            if (imageExtensions.includes(ext)) {
                return 'image';
            } else if (videoExtensions.includes(ext)) {
                return 'video';
            }

            // 파일 내용으로 판단
            const buffer = fs.readFileSync(filePath);
            const header = buffer.slice(0, 16);

            // 이미지 매직 넘버 체크
            if (header[0] === 0xFF && header[1] === 0xD8) return 'image'; // JPEG
            if (header[0] === 0x89 && header[1] === 0x50) return 'image'; // PNG
            if (header[0] === 0x47 && header[1] === 0x49) return 'image'; // GIF

            // 비디오 매직 넘버 체크
            if (header.includes(Buffer.from('ftyp'))) return 'video'; // MP4
            if (header.includes(Buffer.from('AVI '))) return 'video'; // AVI

            return 'unknown';

        } catch (error) {
            ServerLogger.error('파일 타입 감지 실패:', error);
            return 'unknown';
        }
    }

    async downloadThumbnail(thumbnailUrl: string, videoId: string, platform: string = 'unknown'): Promise<string | null> {
        try {
            if (!thumbnailUrl || !videoId) {
                ServerLogger.warn('썸네일 URL 또는 비디오 ID가 없습니다');
                return null;
            }

            // Type check and convert to string if necessary
            const urlString = typeof thumbnailUrl === 'string' ? thumbnailUrl : String(thumbnailUrl);
            ServerLogger.info(`🔍 Thumbnail URL type: ${typeof thumbnailUrl}, value: ${urlString}`);

            // 상대 경로인 경우 처리
            if (urlString.startsWith('media/') || urlString.startsWith('./media/') || !urlString.includes('://')) {
                ServerLogger.info(`📁 상대 경로 썸네일 감지: ${urlString}`);

                // 상대 경로를 절대 경로로 변환
                const absolutePath = path.resolve(process.cwd(), urlString);

                if (fs.existsSync(absolutePath)) {
                    ServerLogger.info(`✅ 로컬 썸네일 파일 발견: ${absolutePath}`);
                    return absolutePath;
                } else {
                    ServerLogger.warn(`❌ 로컬 썸네일 파일 없음: ${absolutePath}`);
                    return null;
                }
            }

            const axios = require('axios');
            const url = new URL(urlString);
            const pathParts = url.pathname.split('/');
            let originalFileName = pathParts[pathParts.length - 1];

            if (!originalFileName || originalFileName.length < 3) {
                originalFileName = `${videoId}_thumbnail.jpg`;
            }

            const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const finalFileName = `${platform}_${videoId}_${sanitizedFileName}`;
            const localPath = path.join(this.thumbnailDir, finalFileName);

            // 이미 존재하는지 확인
            if (fs.existsSync(localPath)) {
                const stats = fs.statSync(localPath);
                if (stats.size === 0) {
                    fs.unlinkSync(localPath);
                } else {
                    const relativePath = this.toRelativePath(localPath);
                    ServerLogger.info(`썸네일이 이미 존재합니다: ${relativePath}`);
                    return relativePath;
                }
            }

            const referer = this.getRefererForPlatform(platform, thumbnailUrl);
            const response = await axios({
                method: 'GET',
                url: thumbnailUrl,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': referer
                },
                timeout: 10000
            });

            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    const stats = fs.statSync(localPath);
                    if (stats.size > 1024) { // 1KB 이상
                        const relativePath = this.toRelativePath(localPath);
                        ServerLogger.success(`썸네일 다운로드 완료: ${relativePath}`);
                        resolve(relativePath);
                    } else {
                        ServerLogger.warn(`다운로드된 썸네일이 너무 작습니다: ${stats.size} bytes`);
                        fs.unlinkSync(localPath);
                        resolve(null);
                    }
                });

                writer.on('error', (error: Error) => {
                    ServerLogger.error('썸네일 다운로드 오류:', error);
                    if (fs.existsSync(localPath)) {
                        fs.unlinkSync(localPath);
                    }
                    reject(error);
                });
            });

        } catch (error) {
            ServerLogger.error('썸네일 다운로드 실패:', error);
            return null;
        }
    }

    private getRefererForPlatform(platform: string, thumbnailUrl: string): string {
        switch (platform.toUpperCase()) {
            case 'YOUTUBE':
                return 'https://www.youtube.com/';
            case 'INSTAGRAM':
                return 'https://www.instagram.com/';
            case 'TIKTOK':
                return 'https://www.tiktok.com/';
            default:
                try {
                    const url = new URL(thumbnailUrl);
                    return `${url.protocol}//${url.hostname}/`;
                } catch {
                    return 'https://www.google.com/';
                }
        }
    }

    extractSingleThumbnailUrl(thumbnailData: any): string | null {
        if (typeof thumbnailData === 'string') {
            return thumbnailData;
        }

        if (thumbnailData && typeof thumbnailData === 'object') {
            return thumbnailData.high?.url || thumbnailData.medium?.url || thumbnailData.default?.url || null;
        }

        return null;
    }

    // 정리 작업
    cleanOldThumbnails(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
        const now = Date.now();
        this.cleanDirectory(this.thumbnailDir, maxAge, now);
        this.cleanDirectory(this.framesDir, maxAge, now);
    }

    private cleanDirectory(dir: string, maxAge: number, now: number): void {
        try {
            if (!fs.existsSync(dir)) return;

            const files = fs.readdirSync(dir);
            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                ServerLogger.info(`${dir}에서 ${deletedCount}개의 오래된 파일을 삭제했습니다`);
            }

        } catch (error) {
            ServerLogger.error(`디렉토리 정리 실패 (${dir}):`, error);
        }
    }
}

export default ThumbnailExtractor;
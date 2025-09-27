import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ServerLogger } from '../../../utils/logger';
import {
    InstagramReelInfo,
    InstagramReelExtracted,
    PythonScriptResult
} from '../types/instagram-types';

export class ReelsExtractor {
    private pythonExecutable: string = 'python';
    private scriptsDir: string;

    constructor() {
        this.scriptsDir = path.join(__dirname, '../../../scripts/python');
    }

    /**
     * Extract shortcode from Instagram URL
     */
    extractShortcode(url: string): string {
        try {
            if (!url || typeof url !== 'string') {
                throw new Error('유효하지 않은 URL입니다.');
            }

            const patterns = [
                /instagram\.com\/reels?\/([a-zA-Z0-9_-]+)/,
                /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
                /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    ServerLogger.info(`📝 Shortcode 추출 성공: ${match[1]}`);
                    return match[1];
                }
            }

            throw new Error(`Instagram URL에서 shortcode를 찾을 수 없습니다: ${url}`);
        } catch (error) {
            ServerLogger.error('Shortcode 추출 실패:', error);
            throw error;
        }
    }

    /**
     * Extract reel information using Python Instaloader
     */
    async extractReelInfo(url: string): Promise<InstagramReelExtracted> {
        try {
            const shortcode = this.extractShortcode(url);
            ServerLogger.info(`🎬 Instagram Reel 정보 추출 시작: ${shortcode}`);

            const startTime = Date.now();
            const result = await this.runPythonScript(shortcode);

            if (!result.success) {
                throw new Error(result.error || '추출 실패');
            }

            const extractedData = this.parseReelData(result.data, url);
            const extractTime = Date.now() - startTime;

            ServerLogger.success(`✅ Reel 정보 추출 완료 (${extractTime}ms)`, {
                shortcode,
                viewCount: extractedData.data?.viewCount,
                likeCount: extractedData.data?.likeCount
            });

            return extractedData;

        } catch (error) {
            ServerLogger.error('Instagram Reel 정보 추출 실패:', error);
            return {
                success: false,
                error: error.message || 'Unknown error',
                extractedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Run Python script to extract reel data
     */
    private async runPythonScript(shortcode: string): Promise<PythonScriptResult> {
        return new Promise((resolve) => {
            const scriptPath = path.join(this.scriptsDir, 'instagram_extractor.py');

            if (!fs.existsSync(scriptPath)) {
                ServerLogger.warn('Python 스크립트 파일이 없습니다. 인라인 실행 모드 사용');
                return this.runInlinePythonScript(shortcode).then(resolve);
            }

            const pythonProcess = spawn(this.pythonExecutable, [scriptPath, shortcode]);
            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(stdout);
                        resolve({ success: true, data });
                    } catch (error) {
                        resolve({
                            success: false,
                            error: 'JSON 파싱 실패',
                            stderr: stdout
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: `Process exited with code ${code}`,
                        stderr,
                        exitCode: code
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    stderr: ''
                });
            });
        });
    }

    /**
     * Run inline Python script (fallback mode)
     */
    private async runInlinePythonScript(shortcode: string): Promise<PythonScriptResult> {
        return new Promise((resolve) => {
            const pythonCode = `
import instaloader
import json
import sys

def get_reel_info(shortcode):
    try:
        L = instaloader.Instaloader(
            quiet=True,
            download_comments=False,
            download_geotags=False,
            download_video_thumbnails=False,
            compress_json=False
        )

        post = instaloader.Post.from_shortcode(L.context, shortcode)

        result = {
            "shortcode": post.shortcode,
            "caption": post.caption or "",
            "timestamp": int(post.date_utc.timestamp()),
            "upload_date": post.date_utc.isoformat(),
            "view_count": post.video_view_count or 0,
            "like_count": post.likes,
            "comment_count": post.comments,
            "is_video": post.is_video,
            "video_duration": post.video_duration if post.is_video else None,
            "video_url": post.video_url if post.is_video else None,
            "thumbnail_url": post.url,
            "hashtags": list(post.caption_hashtags) if post.caption else [],
            "mentions": list(post.caption_mentions) if post.caption else [],
            "location": {
                "name": post.location.name,
                "id": str(post.location.id)
            } if post.location else None,
            "owner": {
                "username": post.owner_username,
                "full_name": post.owner_profile.full_name,
                "is_verified": post.owner_profile.is_verified,
                "profile_pic_url": post.owner_profile.profile_pic_url
            }
        }

        print(json.dumps(result))

    except Exception as e:
        error_result = {"error": str(e), "success": False}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_reel_info(sys.argv[1])
    else:
        get_reel_info("${shortcode}")
`;

            const pythonProcess = spawn(this.pythonExecutable, ['-c', pythonCode]);
            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0 && stdout) {
                    try {
                        const data = JSON.parse(stdout);
                        resolve({ success: true, data });
                    } catch (error) {
                        resolve({
                            success: false,
                            error: 'JSON 파싱 실패',
                            stderr: stdout
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        error: stderr || 'Python 실행 실패',
                        stderr,
                        exitCode: code
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    stderr: ''
                });
            });
        });
    }

    /**
     * Parse extracted reel data
     */
    private parseReelData(data: any, originalUrl: string): InstagramReelExtracted {
        try {
            if (!data || data.error) {
                return {
                    success: false,
                    error: data?.error || 'No data received',
                    extractedAt: new Date().toISOString()
                };
            }

            const reelInfo: InstagramReelInfo = {
                shortcode: data.shortcode,
                url: originalUrl,
                caption: data.caption || '',
                timestamp: data.timestamp,
                uploadDate: data.upload_date,
                viewCount: data.view_count || 0,
                likeCount: data.like_count || 0,
                commentCount: data.comment_count || 0,
                isVideo: data.is_video,
                videoDuration: data.video_duration,
                videoUrl: data.video_url,
                thumbnailUrl: data.thumbnail_url,
                hashtags: data.hashtags || [],
                mentions: data.mentions || [],
                location: data.location,
                owner: data.owner,
                platform: 'INSTAGRAM'
            };

            return {
                success: true,
                data: reelInfo,
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            ServerLogger.error('Reel 데이터 파싱 실패:', error);
            return {
                success: false,
                error: error.message,
                extractedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Batch extract multiple reels
     */
    async extractMultipleReels(urls: string[]): Promise<InstagramReelExtracted[]> {
        ServerLogger.info(`🎬 복수 Reel 추출 시작: ${urls.length}개`);

        const results: InstagramReelExtracted[] = [];

        for (const url of urls) {
            const result = await this.extractReelInfo(url);
            results.push(result);

            // Rate limiting
            if (urls.indexOf(url) < urls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const successCount = results.filter(r => r.success).length;
        ServerLogger.info(`✅ 복수 Reel 추출 완료: ${successCount}/${urls.length} 성공`);

        return results;
    }
}

export default ReelsExtractor;
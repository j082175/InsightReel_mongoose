const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ServerLogger } = require('../utils/logger');

/**
 * Instagram Reels Instaloader 기반 데이터 추출 서비스
 * 개별 릴스 URL로 완전한 Instagram 데이터 추출 (릴스 전용 최적화)
 */
class InstagramReelsExtractor {
    constructor() {
        this.pythonExecutable = 'python'; // 시스템 Python 실행파일
        this.scriptsDir = path.join(__dirname, '../scripts/python');
    }

    /**
     * Instagram URL에서 shortcode 추출
     */
    extractShortcode(url) {
        try {
            if (!url || typeof url !== 'string') {
                throw new Error('유효하지 않은 URL입니다.');
            }

            // Instagram Reels URL 패턴 매칭 (릴스 전용)
            const patterns = [
                /instagram\.com\/reels?\/([a-zA-Z0-9_-]+)/,  // 릴스 우선
                /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,       // 일반 포스트도 지원
                /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/       // IGTV 지원
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    ServerLogger.info(`📝 Shortcode 추출 성공: ${match[1]}`);
                    return match[1];
                }
            }

            throw new Error(`Instagram Reels URL에서 shortcode를 찾을 수 없습니다: ${url}`);
        } catch (error) {
            ServerLogger.error('Reels Shortcode 추출 실패:', error.message);
            throw error;
        }
    }

    /**
     * Python Instaloader 스크립트 실행 (파일 기반)
     */
    async runPythonScript(shortcode) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../../scripts/instagram/single_reel_extractor.py');

            const pythonProcess = spawn(this.pythonExecutable, [scriptPath, shortcode], {
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            });

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
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        ServerLogger.error('Python 출력 파싱 실패:', parseError.message);
                        reject(new Error(`Python 출력 파싱 실패: ${parseError.message}`));
                    }
                } else {
                    ServerLogger.error('Python 스크립트 실행 실패:', stderr);
                    reject(new Error(`Python 스크립트 실행 실패 (코드: ${code}): ${stderr}`));
                }
            });

            // 타임아웃 설정 (30초)
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Instagram 데이터 추출 타임아웃 (30초)'));
            }, 30000);
        });
    }

    /**
     * yt-dlp 백업 추출기 (Instaloader 실패 시 사용)
     */
    async runYtDlpFallback(instagramUrl) {
        return new Promise((resolve, reject) => {
            const cookiesPath = path.join(__dirname, '../../data/instagram_cookies.txt');

            // 쿠키 파일 존재 확인 및 인자 배열 구성
            const ytDlpArgs = ['--dump-json', '--no-warnings'];

            if (fs.existsSync(cookiesPath)) {
                ytDlpArgs.push('--cookies', cookiesPath);
                ServerLogger.info('🍪 Instagram 쿠키 파일 사용');
            } else {
                ServerLogger.warn('⚠️ Instagram 쿠키 파일 없음 - 제한된 콘텐츠 접근 불가능');
            }

            ytDlpArgs.push(instagramUrl);

            ServerLogger.info(`🔄 yt-dlp 백업 추출 시작: ${instagramUrl}`);
            const ytDlpProcess = spawn('yt-dlp', ytDlpArgs);

            let stdout = '';
            let stderr = '';

            ytDlpProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlpProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ytDlpProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const ytDlpData = JSON.parse(stdout);

                        // yt-dlp 데이터를 우리 형식으로 변환
                        const standardizedData = {
                            success: true,
                            platform: 'INSTAGRAM',
                            extractor: 'yt-dlp',
                            post: {
                                title: ytDlpData.title || 'Instagram Reel',
                                description: ytDlpData.description || '',
                                views: ytDlpData.view_count || null,
                                likes: ytDlpData.like_count || null,
                                comments: ytDlpData.comment_count || null,
                                duration: Math.round(ytDlpData.duration) || null,
                                uploadDate: ytDlpData.upload_date ?
                                    `${ytDlpData.upload_date.substring(0,4)}-${ytDlpData.upload_date.substring(4,6)}-${ytDlpData.upload_date.substring(6,8)}`
                                    : null,
                                thumbnailUrl: ytDlpData.thumbnail || null
                            },
                            profile: {
                                username: ytDlpData.channel || ytDlpData.uploader || 'unknown',
                                displayName: ytDlpData.uploader || ytDlpData.channel || 'Unknown',
                                subscribers: null, // yt-dlp는 팔로워 수 제공 안 함
                                channelVideos: null,
                                isVerified: false
                            }
                        };

                        ServerLogger.info('✅ yt-dlp 백업 추출 성공');
                        resolve(standardizedData);
                    } catch (parseError) {
                        ServerLogger.error('yt-dlp 출력 파싱 실패:', parseError.message);
                        reject(new Error(`yt-dlp 출력 파싱 실패: ${parseError.message}`));
                    }
                } else {
                    ServerLogger.error('yt-dlp 실행 실패:', stderr);
                    reject(new Error(`yt-dlp 실행 실패 (코드: ${code}): ${stderr}`));
                }
            });

            // 타임아웃 설정 (45초 - yt-dlp는 조금 더 오래 걸릴 수 있음)
            setTimeout(() => {
                ytDlpProcess.kill();
                reject(new Error('yt-dlp 백업 추출 타임아웃 (45초)'));
            }, 45000);
        });
    }

    /**
     * Instagram Reels 데이터 통합 추출 (메인 함수)
     */
    async extractReelsData(reelsUrl) {
        try {
            ServerLogger.info(`🎬 Instagram Reels 데이터 추출 시작: ${reelsUrl}`);

            // 1차 시도: Python Instaloader 스크립트 실행
            try {
                // URL에서 shortcode 추출
                const shortcode = this.extractShortcode(reelsUrl);

                ServerLogger.info(`🐍 1차 시도: Python Instaloader 스크립트 실행 중...`);
                const result = await this.runPythonScript(shortcode);

                if (result.success) {
                    ServerLogger.info('✅ Instaloader로 Instagram 데이터 추출 성공');
                    ServerLogger.info(`📊 릴스 조회수: ${result.post.views}, 좋아요: ${result.post.likes}, 댓글: ${result.post.comments}`);
                    ServerLogger.info(`👤 프로필 팔로워: ${result.profile.subscribers}, 포스트 수: ${result.profile.channelVideos}`);

                    return {
                        success: true,
                        platform: 'INSTAGRAM',
                        url: reelsUrl,
                        post: result.post,
                        profile: result.profile,
                        extractedAt: new Date().toISOString(),
                        extractor: 'instaloader'
                    };
                } else {
                    throw new Error(result.error || 'Instaloader 추출 실패');
                }

            } catch (instaloaderError) {
                ServerLogger.warn(`⚠️ Instaloader 실패: ${instaloaderError.message}`);
                ServerLogger.info(`🔄 2차 시도: yt-dlp 백업 시스템 실행 중...`);

                // 2차 시도: yt-dlp 백업 시스템
                try {
                    const fallbackResult = await this.runYtDlpFallback(reelsUrl);

                    if (fallbackResult.success) {
                        ServerLogger.info('✅ yt-dlp 백업으로 Instagram 데이터 추출 성공');
                        ServerLogger.info(`📊 릴스 조회수: ${fallbackResult.post.views}, 좋아요: ${fallbackResult.post.likes}, 댓글: ${fallbackResult.post.comments}`);

                        return {
                            success: true,
                            platform: 'INSTAGRAM',
                            url: reelsUrl,
                            post: fallbackResult.post,
                            profile: fallbackResult.profile,
                            extractedAt: new Date().toISOString(),
                            extractor: 'yt-dlp-fallback'
                        };
                    } else {
                        throw new Error('yt-dlp 백업도 실패');
                    }

                } catch (ytDlpError) {
                    ServerLogger.error(`❌ yt-dlp 백업도 실패: ${ytDlpError.message}`);
                    throw new Error(`모든 추출 방법 실패 - Instaloader: ${instaloaderError.message}, yt-dlp: ${ytDlpError.message}`);
                }
            }

        } catch (error) {
            ServerLogger.error(`❌ Instagram Reels 데이터 추출 완전 실패: ${error.message}`);
            throw new Error(`Instagram Reels 데이터 추출 실패: ${error.message}`);
        }
    }

    // 기존 함수도 유지 (호환성)
    async extractInstagramData(instagramUrl) {
        return this.extractReelsData(instagramUrl);
    }

    /**
     * Instagram 프로필 데이터만 추출 (옵션)
     */
    async extractProfileOnly(username) {
        const pythonScript = `
import instaloader
import json
import sys

try:
    L = instaloader.Instaloader()
    profile = instaloader.Profile.from_username(L.context, "${username}")

    result = {
        'success': True,
        'username': profile.username,
        'followers': profile.followers,
        'followees': profile.followees,
        'mediacount': profile.mediacount,
        'biography': profile.biography,
        'is_verified': profile.is_verified
    }
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False))
`;

        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonExecutable, ['-c', pythonScript]);
            let stdout = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`프로필 추출 실패: 코드 ${code}`));
                }
            });
        });
    }

    /**
     * Instagram Reels URL 검증 (릴스 우선)
     */
    validateReelsUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        return url.includes('instagram.com') && (
            url.includes('/reel') ||  // 릴스 우선 확인
            url.includes('/p/') ||    // 일반 포스트도 허용
            url.includes('/tv/')      // IGTV도 허용
        );
    }

    // 기존 함수도 유지 (호환성)
    validateInstagramUrl(url) {
        return this.validateReelsUrl(url);
    }
}

module.exports = InstagramReelsExtractor;
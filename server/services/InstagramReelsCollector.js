const { ServerLogger } = require('../utils/logger');
const InstagramReelsExtractor = require('./InstagramReelsExtractor');
const { spawn } = require('child_process');

/**
 * Instagram Reels 대량 수집 서비스 (단순 버전)
 * 프로필별 릴스 대량 수집 - HighViewCollector 패턴 적용
 */
class InstagramReelsCollector {
    constructor() {
        this.reelsExtractor = new InstagramReelsExtractor();
        this.pythonExecutable = 'python';
    }

    /**
     * 프로필에서 릴스 대량 수집 (메인 함수)
     * @param {string} username - Instagram 사용자명
     * @param {Object} options - 수집 옵션
     * @param {number} options.daysBack - 최근 며칠까지
     * @param {number} options.minViews - 최소 조회수
     * @param {number} options.maxCount - 최대 수집 개수
     */
    async collectProfileReels(username, options = {}) {
        try {
            const config = {
                daysBack: options.daysBack || 7,
                minViews: options.minViews || 10000,
                maxCount: options.maxCount || 50,
                ...options
            };

            ServerLogger.info(`🎬 프로필 릴스 수집 시작: @${username}`);
            ServerLogger.info(`⚙️ 설정: 최근 ${config.daysBack}일, 최소 ${config.minViews.toLocaleString()}회 조회`);

            const startTime = Date.now();
            const result = await this.runBulkCollectionScript(username, config);

            if (!result.success) {
                throw new Error(result.error);
            }

            const totalTime = Date.now() - startTime;
            ServerLogger.info(`🏁 릴스 수집 완료: ${result.collected_count}개 수집 (${(totalTime/1000).toFixed(1)}초)`);

            return {
                success: true,
                username: username,
                totalReels: result.total_count,
                collectedReels: result.collected_count,
                reels: result.reels,
                config: config,
                processingTime: totalTime
            };

        } catch (error) {
            ServerLogger.error(`❌ 프로필 릴스 수집 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * Python 대량 수집 스크립트 실행
     */
    async runBulkCollectionScript(username, config) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import instaloader
import json
import sys
from datetime import datetime, timedelta

def collect_profile_reels(username, days_back, min_views, max_count):
    try:
        L = instaloader.Instaloader()

        # 로그인 (세션 재사용 시도)
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print(json.dumps({'status': 'login_success'}, ensure_ascii=False), file=sys.stderr)
        except Exception as login_error:
            print(json.dumps({'status': 'login_failed', 'error': str(login_error)}, ensure_ascii=False), file=sys.stderr)

        # 프로필 객체 생성
        profile = instaloader.Profile.from_username(L.context, username)

        # 날짜 필터링용
        cutoff_date = datetime.now() - timedelta(days=days_back)

        collected_reels = []
        total_count = 0
        collected_count = 0

        print(json.dumps({'status': 'collecting', 'profile': username}, ensure_ascii=False), file=sys.stderr)

        # 프로필의 모든 포스트 순회
        for post in profile.get_posts():
            total_count += 1

            # 날짜 필터링
            if post.date < cutoff_date:
                break  # 오래된 포스트는 스킵

            # 비디오인지 확인 (릴스/IGTV)
            if not post.is_video:
                continue

            # 조회수 필터링
            views = post.video_view_count or 0
            if views < min_views:
                continue

            # 릴스 데이터 수집
            reel_data = {
                'shortcode': post.shortcode,
                'title': post.caption[:100] if post.caption else f'Instagram Reel by @{username}',
                'views': views,
                'likes': post.likes,
                'comments': post.comments,
                'date': post.date.isoformat(),
                'url': post.url,
                'typename': post.typename,
                'duration': getattr(post, 'video_duration', None),
                'thumbnailUrl': post.url
            }

            collected_reels.append(reel_data)
            collected_count += 1

            # 최대 개수 제한
            if collected_count >= max_count:
                break

        # 결과 반환
        result = {
            'success': True,
            'username': username,
            'total_count': total_count,
            'collected_count': collected_count,
            'reels': collected_reels,
            'days_back': days_back,
            'min_views': min_views
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'username': username
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(json.dumps({
            'success': False,
            'error': 'Usage: script username days_back min_views max_count'
        }))
        sys.exit(1)

    username = sys.argv[1]
    days_back = int(sys.argv[2])
    min_views = int(sys.argv[3])
    max_count = int(sys.argv[4])

    collect_profile_reels(username, days_back, min_views, max_count)
`;

            const args = [
                '-c', pythonScript,
                username,
                config.daysBack.toString(),
                config.minViews.toString(),
                config.maxCount.toString()
            ];

            const pythonProcess = spawn(this.pythonExecutable, args);
            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                // 진행 상황 로깅
                if (stderr.includes('collecting')) {
                    ServerLogger.info('📊 릴스 수집 진행 중...');
                }
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Python 출력 파싱 실패: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python 스크립트 실행 실패 (코드: ${code}): ${stderr}`));
                }
            });

            // 타임아웃 설정 (5분)
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('릴스 수집 타임아웃 (5분)'));
            }, 300000);
        });
    }

    /**
     * 여러 프로필 동시 수집
     */
    async collectMultipleProfiles(usernames, options = {}) {
        try {
            ServerLogger.info(`👥 다중 프로필 릴스 수집: ${usernames.length}개 프로필`);

            const results = [];
            for (const username of usernames) {
                try {
                    const result = await this.collectProfileReels(username, options);
                    results.push(result);

                    // 요청 간 딜레이 (Rate Limiting 방지)
                    await this.delay(2000);
                } catch (error) {
                    ServerLogger.warn(`⚠️ ${username} 수집 실패: ${error.message}`);
                    results.push({
                        success: false,
                        username: username,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            ServerLogger.info(`🏁 다중 수집 완료: ${successCount}/${usernames.length}개 성공`);

            return {
                success: true,
                totalProfiles: usernames.length,
                successCount: successCount,
                results: results
            };

        } catch (error) {
            ServerLogger.error(`❌ 다중 프로필 수집 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 지연 함수 (Rate Limiting용)
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = InstagramReelsCollector;
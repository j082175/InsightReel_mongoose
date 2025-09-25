const { ServerLogger } = require('../utils/logger');
const { spawn } = require('child_process');

/**
 * Instagram 프로필 정보 수집 서비스 (단순 버전)
 * YouTubeChannelService 패턴을 참고한 단순 구현
 */
class InstagramProfileService {
    constructor() {
        this.pythonExecutable = 'python';
        ServerLogger.success('🔧 Instagram 프로필 서비스 초기화 완료');
    }

    /**
     * 프로필 정보 가져오기 (메인 함수)
     * @param {string} username - Instagram 사용자명
     */
    async getProfileInfo(username) {
        try {
            ServerLogger.info(`🔍 Instagram 프로필 정보 검색: @${username}`);

            const profileData = await this.getProfileByUsername(username);

            if (profileData.success) {
                ServerLogger.success(`✅ 프로필 정보 수집 성공: @${profileData.username}`);
                ServerLogger.info(`📊 팔로워: ${profileData.followers.toLocaleString()}, 포스트: ${profileData.mediacount}`);
                return profileData;
            } else {
                ServerLogger.warn(`⚠️ 프로필을 찾을 수 없음: @${username}`);
                return null;
            }

        } catch (error) {
            ServerLogger.error(`❌ 프로필 정보 수집 실패: @${username}`, error);
            throw error;
        }
    }

    /**
     * 사용자명으로 프로필 정보 가져오기
     */
    async getProfileByUsername(username) {
        return new Promise((resolve, reject) => {
            const pythonScript = `
import instaloader
import json
import sys

def get_profile_info(username):
    try:
        L = instaloader.Instaloader()

        # 로그인 (더 많은 정보 접근용)
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print(json.dumps({'status': 'login_success'}, ensure_ascii=False), file=sys.stderr)
        except Exception as login_error:
            print(json.dumps({'status': 'login_failed', 'error': str(login_error)}, ensure_ascii=False), file=sys.stderr)
            # 로그인 실패해도 계속 진행 (공개 프로필은 가능)

        # 프로필 객체 생성
        profile = instaloader.Profile.from_username(L.context, username)

        # 프로필 데이터 추출 (표준 필드명 사용)
        profile_data = {
            'success': True,
            'username': profile.username,
            'channelName': profile.username,  # 표준 필드명
            'full_name': profile.full_name,
            'biography': profile.biography,
            'followers': profile.followers,
            'subscribers': profile.followers,  # 표준 필드명 (팔로워=구독자)
            'followees': profile.followees,
            'mediacount': profile.mediacount,
            'channelVideos': profile.mediacount,  # 표준 필드명
            'is_private': profile.is_private,
            'is_verified': profile.is_verified,
            'profile_pic_url': profile.profile_pic_url,
            'external_url': profile.external_url,
            'business_category_name': getattr(profile, 'business_category_name', None),
            'is_business_account': getattr(profile, 'is_business_account', False)
        }

        print(json.dumps(profile_data, ensure_ascii=False))
        return profile_data

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'username': username
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Username argument required'
        }))
        sys.exit(1)

    username = sys.argv[1]
    get_profile_info(username)
`;

            const pythonProcess = spawn(this.pythonExecutable, ['-c', pythonScript, username]);
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
                        reject(new Error(`Python 출력 파싱 실패: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python 스크립트 실행 실패 (코드: ${code}): ${stderr}`));
                }
            });

            // 타임아웃 설정 (30초)
            setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('프로필 정보 수집 타임아웃 (30초)'));
            }, 30000);
        });
    }

    /**
     * 여러 프로필 정보 일괄 수집
     */
    async getBulkProfileInfo(usernames) {
        try {
            ServerLogger.info(`👥 다중 프로필 정보 수집: ${usernames.length}개 프로필`);

            const results = [];
            for (const username of usernames) {
                try {
                    const profileData = await this.getProfileByUsername(username);
                    results.push(profileData);

                    // 요청 간 딜레이 (Rate Limiting 방지)
                    await this.delay(1000);
                } catch (error) {
                    ServerLogger.warn(`⚠️ @${username} 프로필 수집 실패: ${error.message}`);
                    results.push({
                        success: false,
                        username: username,
                        error: error.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            ServerLogger.info(`🏁 다중 프로필 수집 완료: ${successCount}/${usernames.length}개 성공`);

            return {
                success: true,
                totalProfiles: usernames.length,
                successCount: successCount,
                profiles: results
            };

        } catch (error) {
            ServerLogger.error(`❌ 다중 프로필 수집 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 프로필의 기본 통계 정보 (요약)
     */
    async getProfileStats(username) {
        try {
            const profileData = await this.getProfileByUsername(username);

            if (!profileData.success) {
                return null;
            }

            return {
                username: profileData.username,
                followers: profileData.followers,
                mediacount: profileData.mediacount,
                is_verified: profileData.is_verified,
                is_private: profileData.is_private,
                engagement_potential: this.calculateEngagementPotential(profileData)
            };

        } catch (error) {
            ServerLogger.error(`❌ 프로필 통계 수집 실패: @${username}`, error);
            return null;
        }
    }

    /**
     * 인게이지먼트 잠재력 계산 (간단한 지표)
     */
    calculateEngagementPotential(profileData) {
        const followers = profileData.followers || 0;
        const mediacount = profileData.mediacount || 1;

        // 간단한 점수 계산 (팔로워 대비 포스트 수)
        const postsPerFollower = mediacount / Math.max(followers, 1) * 1000;

        if (postsPerFollower > 10) return 'high';
        if (postsPerFollower > 5) return 'medium';
        return 'low';
    }

    /**
     * 지연 함수 (Rate Limiting용)
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = InstagramProfileService;
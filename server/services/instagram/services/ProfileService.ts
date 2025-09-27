import { spawn } from 'child_process';
import { ServerLogger } from '../../../utils/logger';
import {
    InstagramProfile,
    InstagramProfileResult,
    PythonScriptResult
} from '../types/instagram-types';

export class ProfileService {
    private pythonExecutable: string = 'python';

    constructor() {
        ServerLogger.success('🔧 Instagram 프로필 서비스 초기화 완료');
    }

    /**
     * Get Instagram profile information
     */
    async getProfileInfo(username: string): Promise<InstagramProfileResult> {
        try {
            ServerLogger.info(`🔍 Instagram 프로필 정보 검색: @${username}`);

            const profileData = await this.getProfileByUsername(username);

            if (profileData.success && profileData.data) {
                const profile = profileData.data as InstagramProfile;
                ServerLogger.success(`✅ 프로필 정보 수집 성공: @${profile.username}`);
                ServerLogger.info(`📊 팔로워: ${profile.followers.toLocaleString()}, 포스트: ${profile.mediacount}`);

                return {
                    success: true,
                    profile,
                    extractedAt: new Date().toISOString()
                };
            } else {
                ServerLogger.warn(`⚠️ 프로필을 찾을 수 없음: @${username}`);
                return {
                    success: false,
                    error: profileData.error || '프로필을 찾을 수 없습니다',
                    extractedAt: new Date().toISOString()
                };
            }

        } catch (error) {
            ServerLogger.error(`❌ 프로필 정보 수집 실패: @${username}`, error);
            return {
                success: false,
                error: error.message || 'Unknown error',
                extractedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Get profile by username using Python Instaloader
     */
    private async getProfileByUsername(username: string): Promise<PythonScriptResult> {
        return new Promise((resolve) => {
            const pythonScript = `
import instaloader
import json
import sys

def get_profile_info(username):
    try:
        L = instaloader.Instaloader(
            quiet=True,
            download_comments=False,
            download_geotags=False,
            save_metadata=False
        )

        profile = instaloader.Profile.from_username(L.context, username)

        result = {
            "username": profile.username,
            "full_name": profile.full_name,
            "biography": profile.biography,
            "followers": profile.followers,
            "following": profile.followees,
            "mediacount": profile.mediacount,
            "is_private": profile.is_private,
            "is_verified": profile.is_verified,
            "profile_pic_url": profile.profile_pic_url,
            "external_url": profile.external_url,
            "success": True
        }

        print(json.dumps(result, ensure_ascii=False))

    except instaloader.exceptions.ProfileNotExistsException:
        error_result = {
            "success": False,
            "error": f"Profile '{username}' does not exist"
        }
        print(json.dumps(error_result))
        sys.exit(1)
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_profile_info(sys.argv[1])
    else:
        get_profile_info("${username}")
`;

            const pythonProcess = spawn(this.pythonExecutable, ['-c', pythonScript.replace('${username}', username)]);
            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                ServerLogger.debug('Python stderr:', data.toString());
            });

            pythonProcess.on('close', (code) => {
                try {
                    if (stdout.includes('{')) {
                        const jsonStr = stdout.substring(stdout.indexOf('{'));
                        const result = JSON.parse(jsonStr);

                        if (result.success) {
                            resolve({
                                success: true,
                                data: this.formatProfileData(result)
                            });
                        } else {
                            resolve({
                                success: false,
                                error: result.error || 'Unknown error'
                            });
                        }
                    } else {
                        resolve({
                            success: false,
                            error: stderr || 'No output from Python script',
                            exitCode: code
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: `Failed to parse output: ${error.message}`,
                        stderr
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                ServerLogger.error('Python process error:', error);
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * Format profile data to match interface
     */
    private formatProfileData(data: any): InstagramProfile {
        return {
            username: data.username,
            fullName: data.full_name || '',
            biography: data.biography || '',
            followers: data.followers || 0,
            following: data.following || 0,
            mediacount: data.mediacount || 0,
            isPrivate: data.is_private || false,
            isVerified: data.is_verified || false,
            profilePicUrl: data.profile_pic_url || '',
            externalUrl: data.external_url
        };
    }

    /**
     * Get multiple profiles
     */
    async getMultipleProfiles(usernames: string[]): Promise<InstagramProfileResult[]> {
        ServerLogger.info(`📊 여러 프로필 정보 수집 시작: ${usernames.length}개`);

        const results: InstagramProfileResult[] = [];

        for (const username of usernames) {
            const result = await this.getProfileInfo(username);
            results.push(result);

            // Rate limiting
            if (usernames.indexOf(username) < usernames.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        const successCount = results.filter(r => r.success).length;
        ServerLogger.success(`✅ 여러 프로필 정보 수집 완료: ${successCount}/${usernames.length} 성공`);

        return results;
    }

    /**
     * Check if profile exists
     */
    async checkProfileExists(username: string): Promise<boolean> {
        const result = await this.getProfileInfo(username);
        return result.success;
    }

    /**
     * Get basic profile stats
     */
    async getProfileStats(username: string): Promise<{
        followers: number;
        following: number;
        posts: number;
    } | null> {
        const result = await this.getProfileInfo(username);

        if (result.success && result.profile) {
            return {
                followers: result.profile.followers,
                following: result.profile.following,
                posts: result.profile.mediacount
            };
        }

        return null;
    }
}

export default ProfileService;
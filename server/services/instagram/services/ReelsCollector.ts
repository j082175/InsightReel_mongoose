import { spawn } from 'child_process';
import { ServerLogger } from '../../../utils/logger';
import { ReelsExtractor } from '../extractors/ReelsExtractor';
import {
    InstagramReelInfo,
    InstagramCollectionConfig,
    InstagramCollectionResult,
    PythonScriptResult
} from '../types/instagram-types';

export class ReelsCollector {
    private reelsExtractor: ReelsExtractor;
    private pythonExecutable: string = 'python';

    constructor() {
        this.reelsExtractor = new ReelsExtractor();
    }

    /**
     * Collect reels from Instagram profile
     */
    async collectProfileReels(
        username: string,
        options: Partial<InstagramCollectionConfig> = {}
    ): Promise<InstagramCollectionResult> {
        try {
            const config: InstagramCollectionConfig = {
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
                throw new Error(result.error || '수집 실패');
            }

            const reels = this.parseCollectionResult(result.data);
            const collectionTime = Date.now() - startTime;

            ServerLogger.info(`🏁 릴스 수집 완료: ${reels.length}개 수집 (${(collectionTime / 1000).toFixed(1)}초)`);

            return {
                success: true,
                username,
                totalReels: reels.length,
                collectedReels: reels.length,
                reels,
                collectionTime,
                config
            };

        } catch (error: any) {
            ServerLogger.error(`❌ 프로필 릴스 수집 실패: @${username}`, error);
            return {
                success: false,
                username,
                totalReels: 0,
                collectedReels: 0,
                reels: [],
                collectionTime: 0,
                config: options as InstagramCollectionConfig,
                error: error.message
            };
        }
    }

    /**
     * Run bulk collection Python script
     */
    private async runBulkCollectionScript(
        username: string,
        config: InstagramCollectionConfig
    ): Promise<PythonScriptResult> {
        return new Promise((resolve) => {
            const pythonScript = `
import instaloader
import json
import sys
from datetime import datetime, timedelta

def collect_profile_reels(username, days_back=${config.daysBack}, min_views=${config.minViews}, max_count=${config.maxCount}):
    try:
        L = instaloader.Instaloader(
            quiet=True,
            download_comments=False,
            download_geotags=False,
            save_metadata=False,
            download_video_thumbnails=False
        )

        profile = instaloader.Profile.from_username(L.context, username)

        cutoff_date = datetime.now() - timedelta(days=days_back)
        collected_reels = []

        for post in profile.get_posts():
            # 날짜 체크
            if post.date_utc < cutoff_date:
                break

            # 비디오(릴스)만 수집
            if not post.is_video:
                continue

            # 조회수 체크
            view_count = post.video_view_count or 0
            if view_count < min_views:
                continue

            reel_data = {
                "shortcode": post.shortcode,
                "url": f"https://instagram.com/p/{post.shortcode}/",
                "caption": post.caption or "",
                "timestamp": int(post.date_utc.timestamp()),
                "upload_date": post.date_utc.isoformat(),
                "view_count": view_count,
                "like_count": post.likes,
                "comment_count": post.comments,
                "is_video": True,
                "video_duration": post.video_duration,
                "video_url": post.video_url,
                "thumbnail_url": post.url,
                "hashtags": list(post.caption_hashtags) if post.caption else [],
                "mentions": list(post.caption_mentions) if post.caption else [],
                "location": {
                    "name": post.location.name,
                    "id": str(post.location.id)
                } if post.location else None,
                "owner": {
                    "username": post.owner_username,
                    "full_name": profile.full_name,
                    "is_verified": profile.is_verified,
                    "profile_pic_url": profile.profile_pic_url
                }
            }

            collected_reels.append(reel_data)

            if len(collected_reels) >= max_count:
                break

        result = {
            "success": True,
            "username": username,
            "total_count": len(collected_reels),
            "collected_count": len(collected_reels),
            "reels": collected_reels,
            "config": {
                "days_back": days_back,
                "min_views": min_views,
                "max_count": max_count
            }
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    collect_profile_reels("${username}")
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
                        resolve({
                            success: result.success || false,
                            data: result,
                            error: result.error
                        });
                    } else {
                        resolve({
                            success: false,
                            error: stderr || 'No output from Python script',
                            exitCode: code || undefined
                        });
                    }
                } catch (error: any) {
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

            // Timeout after 5 minutes
            setTimeout(() => {
                pythonProcess.kill();
                resolve({
                    success: false,
                    error: 'Collection timeout (5 minutes)'
                });
            }, 300000);
        });
    }

    /**
     * Parse collection result
     */
    private parseCollectionResult(data: any): InstagramReelInfo[] {
        if (!data || !data.reels) {
            return [];
        }

        return data.reels.map((reel: any) => ({
            shortcode: reel.shortcode,
            url: reel.url,
            caption: reel.caption,
            timestamp: reel.timestamp,
            uploadDate: reel.upload_date,
            viewCount: reel.view_count,
            likeCount: reel.like_count,
            commentCount: reel.comment_count,
            isVideo: reel.is_video,
            videoDuration: reel.video_duration,
            videoUrl: reel.video_url,
            thumbnailUrl: reel.thumbnail_url,
            hashtags: reel.hashtags || [],
            mentions: reel.mentions || [],
            location: reel.location,
            owner: reel.owner,
            platform: 'INSTAGRAM' as const
        }));
    }

    /**
     * Collect trending reels
     */
    async collectTrendingReels(
        usernames: string[],
        config: Partial<InstagramCollectionConfig> = {}
    ): Promise<InstagramCollectionResult[]> {
        ServerLogger.info(`🔥 트렌딩 릴스 수집 시작: ${usernames.length}개 프로필`);

        const results: InstagramCollectionResult[] = [];

        for (const username of usernames) {
            const result = await this.collectProfileReels(username, config);
            results.push(result);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const totalReels = results.reduce((sum, r) => sum + r.collectedReels, 0);
        ServerLogger.success(`✅ 트렌딩 릴스 수집 완료: 총 ${totalReels}개 릴스`);

        return results;
    }

    /**
     * Filter reels by engagement
     */
    filterHighEngagementReels(
        reels: InstagramReelInfo[],
        minEngagementRate: number = 0.05
    ): InstagramReelInfo[] {
        return reels.filter(reel => {
            const engagementRate = (reel.likeCount + reel.commentCount) / reel.viewCount;
            return engagementRate >= minEngagementRate;
        });
    }

    /**
     * Sort reels by various metrics
     */
    sortReels(
        reels: InstagramReelInfo[],
        sortBy: 'views' | 'likes' | 'comments' | 'date' = 'views'
    ): InstagramReelInfo[] {
        return [...reels].sort((a, b) => {
            switch (sortBy) {
                case 'views':
                    return b.viewCount - a.viewCount;
                case 'likes':
                    return b.likeCount - a.likeCount;
                case 'comments':
                    return b.commentCount - a.commentCount;
                case 'date':
                    return b.timestamp - a.timestamp;
                default:
                    return 0;
            }
        });
    }
}

export default ReelsCollector;
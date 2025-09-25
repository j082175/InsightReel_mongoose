const TiktokDL = require("@tobyg74/tiktok-api-dl");

/**
 * TikTok API vs Playwright 브라우저 자동화 비교 테스트
 */

async function testTikTokAPI() {
    console.log('🚀 TikTok API 테스트 시작\n');

    const testUrls = [
        'https://www.tiktok.com/@charlidamelio',
        'https://www.tiktok.com/@charlidamelio/video/7290512640063663374'
    ];

    for (const url of testUrls) {
        console.log(`🔍 TikTok API로 테스트: ${url}`);

        try {
            const result = await TiktokDL.Downloader(url, {
                version: "v3"
            });

            console.log('✅ TikTok API 성공!');
            console.log('📊 전체 응답 구조:', JSON.stringify(result, null, 2).substring(0, 500) + '...');

            console.log('📊 추출된 데이터 구조:');

            if (result.result) {
                const data = result.result;

                // 프로필 데이터인 경우
                if (data.stats) {
                    console.log('👤 프로필 데이터:');
                    console.log({
                        username: data.uniqueId || data.nickname,
                        nickname: data.nickname,
                        followers: data.stats?.followerCount,
                        following: data.stats?.followingCount,
                        likes: data.stats?.heartCount,
                        videos: data.stats?.videoCount,
                        verified: data.verified,
                        profilePicture: data.avatarLarger || data.avatarMedium
                    });
                }

                // 비디오 데이터인 경우
                if (data.desc || data.title) {
                    console.log('🎬 비디오 데이터:');
                    console.log({
                        title: data.desc || data.title,
                        author: data.author?.uniqueId || data.author?.nickname,
                        views: data.stats?.playCount,
                        likes: data.stats?.diggCount,
                        comments: data.stats?.commentCount,
                        shares: data.stats?.shareCount,
                        downloadUrl: data.download?.nowm,
                        music: data.music?.title,
                        hashtags: data.hashtags?.map(tag => tag.name)
                    });
                }
            }

        } catch (error) {
            console.error('❌ TikTok API 실패:', error.message);
        }

        console.log('\n' + '='.repeat(60) + '\n');
    }
}

// 메인 실행
if (require.main === module) {
    testTikTokAPI().catch(console.error);
}

module.exports = { testTikTokAPI };
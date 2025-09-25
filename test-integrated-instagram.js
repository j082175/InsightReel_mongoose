const InstagramExtractor = require('./server/services/InstagramExtractor');

/**
 * 통합된 Instagram Extractor 테스트
 * 프로젝트 통합 후 실제 작동 확인
 */

async function testIntegratedInstagram() {
    console.log('🚀 통합된 Instagram Extractor 테스트 시작\n');

    const extractor = new InstagramExtractor();

    // 테스트할 Instagram URL들
    const testUrls = [
        'https://www.instagram.com/p/CXkbh11p7ZH/', // 개별 포스트
        'https://www.instagram.com/p/DCvqpNFykEz/'  // 다른 포스트
    ];

    for (const url of testUrls) {
        try {
            console.log(`📸 테스트 중: ${url}`);

            const startTime = Date.now();
            const result = await extractor.extractInstagramData(url);
            const duration = Date.now() - startTime;

            console.log('✅ 추출 성공!');
            console.log(`⏱️ 소요시간: ${duration}ms`);
            console.log('📊 추출된 데이터:');
            console.log({
                platform: result.platform,
                post: {
                    shortcode: result.post.shortcode,
                    likes: result.post.likes,
                    comments: result.post.comments,
                    views: result.post.video_view_count,
                    is_video: result.post.is_video,
                    caption: result.post.caption?.substring(0, 50) + '...'
                },
                profile: {
                    username: result.profile.username,
                    followers: result.profile.followers,
                    followees: result.profile.followees,
                    mediacount: result.profile.mediacount,
                    verified: result.profile.is_verified
                }
            });

        } catch (error) {
            console.error(`❌ 실패: ${url}`);
            console.error(`에러: ${error.message}`);
        }

        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// 메인 실행
if (require.main === module) {
    testIntegratedInstagram().catch(console.error);
}
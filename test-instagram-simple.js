const InstagramReelsExtractor = require('./server/services/InstagramReelsExtractor');

async function testInstagramReels() {
    try {
        console.log('🎬 Instagram Reels 추출 테스트 시작');

        const extractor = new InstagramReelsExtractor();

        // 테스트할 릴스 URL
        const testUrl = 'https://www.instagram.com/reels/DOf5jTKjC4t/';
        console.log(`📱 테스트 URL: ${testUrl}`);

        // 릴스 데이터 추출
        const result = await extractor.extractReelsData(testUrl);

        if (result.success) {
            console.log('✅ 릴스 데이터 추출 성공!');
            console.log('\n📊 포스트 정보:');
            console.log(`- 제목: ${result.post.title}`);
            console.log(`- 조회수: ${result.post.views?.toLocaleString() || 'N/A'}`);
            console.log(`- 좋아요: ${result.post.likes?.toLocaleString() || 'N/A'}`);
            console.log(`- 댓글: ${result.post.comments?.toLocaleString() || 'N/A'}`);

            console.log('\n👤 프로필 정보:');
            console.log(`- 사용자명: ${result.profile.channelName}`);
            console.log(`- 팔로워: ${result.profile.subscribers?.toLocaleString() || 'N/A'}`);
            console.log(`- 포스트 수: ${result.profile.channelVideos || 'N/A'}`);

            return result;
        } else {
            console.log('❌ 릴스 데이터 추출 실패');
            console.error(result);
            return null;
        }

    } catch (error) {
        console.error('❌ 테스트 실행 중 오류:', error.message);
        return null;
    }
}

if (require.main === module) {
    testInstagramReels()
        .then(() => {
            console.log('\n🏁 테스트 완료');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 테스트 실패:', error);
            process.exit(1);
        });
}

module.exports = { testInstagramReels };
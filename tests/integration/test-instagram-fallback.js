const InstagramReelsExtractor = require('./server/services/InstagramReelsExtractor');

/**
 * Instagram 백업 시스템 직접 테스트
 */
async function testInstagramFallback() {
    console.log('🧪 Instagram 백업 시스템 직접 테스트 시작...\n');

    const extractor = new InstagramReelsExtractor();

    // 제한된 콘텐츠 URL (Instaloader 실패 예상)
    const restrictedUrl = 'https://www.instagram.com/reel/DIjitFxCjaF/';

    console.log(`📸 테스트 URL: ${restrictedUrl}`);
    console.log('예상 시나리오: Instaloader 실패 → yt-dlp 백업 성공\n');

    try {
        console.log('🚀 Instagram 데이터 추출 시작...');

        const result = await extractor.extractReelsData(restrictedUrl);

        if (result.success) {
            console.log('✅ 최종 결과: 성공!\n');
            console.log('📊 추출된 데이터:');
            console.log(`   추출기: ${result.extractor}`);
            console.log(`   제목: ${result.post.title}`);
            console.log(`   설명: ${result.post.description || '없음'}`);
            console.log(`   조회수: ${result.post.views?.toLocaleString() || '없음'} 회`);
            console.log(`   좋아요: ${result.post.likes?.toLocaleString() || '비공개'}`);
            console.log(`   댓글: ${result.post.comments?.toLocaleString() || '없음'} 개`);
            console.log(`   길이: ${result.post.duration || '없음'}초`);
            console.log(`   채널: ${result.profile.username}`);
            console.log(`   팔로워: ${result.profile.subscribers?.toLocaleString() || '없음'}`);
            console.log(`   업로드: ${result.post.uploadDate || '없음'}`);

            console.log('\n🎉 백업 시스템 테스트 완전 성공!');
        } else {
            console.log('❌ 실패: success = false');
        }

    } catch (error) {
        console.log(`💥 오류 발생: ${error.message}`);
        console.log('\n❌ 백업 시스템 테스트 실패');
    }
}

// 스크립트 실행
if (require.main === module) {
    testInstagramFallback()
        .then(() => {
            console.log('\n🏁 테스트 완료!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 테스트 실행 오류:', error);
            process.exit(1);
        });
}

module.exports = { testInstagramFallback };
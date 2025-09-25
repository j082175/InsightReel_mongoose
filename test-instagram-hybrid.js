const InstagramReelsExtractor = require('./server/services/InstagramReelsExtractor');

/**
 * Instagram 하이브리드 추출 시스템 테스트
 * Instaloader + yt-dlp 병렬 실행 및 데이터 병합
 */
async function testInstagramHybrid() {
    console.log('🧪 Instagram 하이브리드 추출 시스템 테스트 시작...\n');
    console.log('=' .repeat(60));

    const extractor = new InstagramReelsExtractor();

    // 테스트 URL 세트
    const testUrls = [
        {
            url: 'https://www.instagram.com/reel/DOf5jTKjC4t/',
            description: '일반 공개 릴스 (모든 데이터 접근 가능)'
        },
        {
            url: 'https://www.instagram.com/reel/DIjitFxCjaF/',
            description: '제한된 콘텐츠 (yt-dlp 쿠키 필요)'
        }
    ];

    for (let i = 0; i < testUrls.length; i++) {
        const { url, description } = testUrls[i];

        console.log(`\n${i + 1}️⃣ 테스트 URL: ${url}`);
        console.log(`   설명: ${description}`);
        console.log('-'.repeat(60));

        try {
            console.log('\n🚀 하이브리드 추출 시작 (Instaloader + yt-dlp 병렬 실행)...');

            const startTime = Date.now();
            const result = await extractor.extractReelsData(url);
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

            if (result.success) {
                console.log(`\n✅ 하이브리드 추출 성공! (${elapsedTime}초 소요)`);
                console.log(`   추출기: ${result.extractor}`);

                if (result.extractorDetails) {
                    console.log('\n📊 추출기 상세:');
                    console.log(`   - Instaloader: ${result.extractorDetails.instaloader ? '✅ 성공' : '❌ 실패'}`);
                    console.log(`   - yt-dlp: ${result.extractorDetails.ytDlp ? '✅ 성공' : '❌ 실패'}`);

                    if (result.extractorDetails.sourceMap) {
                        console.log('\n🔄 데이터 소스 매핑:');
                        const sourceMap = result.extractorDetails.sourceMap;
                        console.log(`   - 제목: ${sourceMap.title}`);
                        console.log(`   - 조회수: ${sourceMap.views}`);
                        console.log(`   - 좋아요: ${sourceMap.likes}`);
                        console.log(`   - 팔로워: ${sourceMap.subscribers}`);
                    }
                }

                console.log('\n📹 비디오 데이터:');
                console.log(`   제목: ${result.post.title}`);
                console.log(`   설명: ${result.post.description?.substring(0, 50) || '없음'}...`);
                console.log(`   조회수: ${result.post.views?.toLocaleString() || '없음'} 회`);
                console.log(`   좋아요: ${result.post.likes === -1 ? '비공개' : result.post.likes?.toLocaleString() || '없음'}`);
                console.log(`   댓글: ${result.post.comments?.toLocaleString() || '없음'} 개`);
                console.log(`   길이: ${result.post.duration || '없음'}초`);
                console.log(`   업로드: ${result.post.uploadDate || '없음'}`);

                console.log('\n👤 채널 데이터:');
                console.log(`   사용자명: ${result.profile.username}`);
                console.log(`   표시명: ${result.profile.displayName}`);
                console.log(`   팔로워: ${result.profile.subscribers?.toLocaleString() || '없음'}`);
                console.log(`   게시물: ${result.profile.channelVideos?.toLocaleString() || '없음'} 개`);
                console.log(`   인증: ${result.profile.isVerified ? '✓ 인증됨' : '미인증'}`);

            } else {
                console.log('❌ 추출 실패: success = false');
            }

        } catch (error) {
            console.log(`\n💥 오류 발생: ${error.message}`);
        }

        // 다음 테스트 전 구분선
        if (i < testUrls.length - 1) {
            console.log('\n⏳ 다음 테스트까지 3초 대기...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 하이브리드 시스템 특징:');
    console.log('   1. Instaloader와 yt-dlp를 병렬 실행하여 속도 향상');
    console.log('   2. 각 추출기의 장점을 활용한 데이터 병합');
    console.log('   3. 비공개 좋아요는 yt-dlp 우선 사용');
    console.log('   4. 팔로워 수는 Instaloader 우선 사용');
    console.log('   5. 하나라도 성공하면 데이터 제공 가능');

    console.log('\n🏁 Instagram 하이브리드 추출 테스트 완료!');
}

// 스크립트 실행
if (require.main === module) {
    testInstagramHybrid()
        .then(() => {
            console.log('\n🎉 모든 테스트 완료!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 테스트 실행 오류:', error);
            process.exit(1);
        });
}

module.exports = { testInstagramHybrid };
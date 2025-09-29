const axios = require('axios');

/**
 * 실시간 Instagram API 테스트
 * 서버가 실행 중일 때 실제 API 엔드포인트 테스트
 */

async function testInstagramAPILive() {
    console.log('🧪 실시간 Instagram API 테스트 시작...');
    console.log('=' * 50);

    const baseURL = 'http://localhost:3000';
    const testUrls = [
        'https://www.instagram.com/reel/DOf5jTKjC4t/',  // 기존 테스트 URL
        'https://www.instagram.com/reel/DIjitFxCjaF/'   // 제한된 콘텐츠 URL
    ];

    for (let i = 0; i < testUrls.length; i++) {
        const testUrl = testUrls[i];
        console.log(`\n${i + 1}️⃣ 테스트 URL: ${testUrl}`);

        try {
            // Instagram 개별 릴스 추출 테스트
            console.log('📸 Instagram 릴스 데이터 추출 중...');

            const response = await axios.post(`${baseURL}/api/instagram/extract-reel`, {
                url: testUrl
            }, {
                timeout: 30000  // 30초 타임아웃
            });

            if (response.data.success) {
                console.log('✅ API 응답 성공!');
                const postData = response.data.data.post;
                const profileData = response.data.data.profile;

                console.log('\n📊 추출된 데이터:');
                console.log(`   제목: ${postData.title}`);
                console.log(`   조회수: ${postData.views?.toLocaleString()} 회`);
                console.log(`   좋아요: ${postData.likes === -1 ? '비공개' : postData.likes?.toLocaleString()}`);
                console.log(`   댓글: ${postData.comments?.toLocaleString()} 개`);
                console.log(`   채널: ${profileData.username} (${profileData.followers?.toLocaleString()} 팔로워)`);
                console.log(`   플랫폼: ${response.data.data.platform}`);
                console.log(`   추출기: ${response.data.data.extractor}`);

                console.log('\n🎯 테스트 결과: 성공 ✅');

            } else {
                console.log('❌ API 응답 실패');
                console.log('사유:', response.data.message || response.data.error);
                console.log('\n🎯 테스트 결과: 실패 ❌');
            }

        } catch (error) {
            console.log('💥 API 호출 오류');

            if (error.code === 'ECONNREFUSED') {
                console.log('❌ 서버가 실행되지 않았습니다. npm start를 확인하세요.');
            } else if (error.response) {
                console.log(`❌ HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
            } else if (error.code === 'ECONNABORTED') {
                console.log('⏰ 요청 타임아웃 (30초 초과)');
            } else {
                console.log(`❌ 네트워크 오류: ${error.message}`);
            }

            console.log('\n🎯 테스트 결과: 오류 💥');
        }

        // 요청 간 잠깐 대기
        if (i < testUrls.length - 1) {
            console.log('\n⏳ 다음 테스트까지 3초 대기...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n' + '=' * 50);
    console.log('🏁 Instagram API 실시간 테스트 완료');

    // 추가: 프로필 정보 조회 테스트
    console.log('\n🔍 보너스: 프로필 정보 조회 테스트');
    try {
        const profileResponse = await axios.get(`${baseURL}/api/instagram/profile/welleci`);

        if (profileResponse.data.success) {
            console.log('✅ 프로필 조회 성공!');
            const profile = profileResponse.data.data.profile;
            console.log(`👤 ${profile.username}: ${profile.followers?.toLocaleString()} 팔로워`);
        } else {
            console.log('❌ 프로필 조회 실패');
        }
    } catch (error) {
        console.log('💥 프로필 조회 오류:', error.message);
    }
}

// 스크립트 실행
if (require.main === module) {
    testInstagramAPILive()
        .then(() => {
            console.log('\n🎉 모든 테스트 완료!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 테스트 실행 오류:', error);
            process.exit(1);
        });
}

module.exports = { testInstagramAPILive };
// 기존에 성공했던 Instagram URL로 재테스트
const axios = require('axios');

async function testExistingUrl() {
    try {
        console.log('🧪 기존에 성공했던 Instagram URL로 재테스트...');

        // 과거에 메타데이터 추출 성공했던 URL
        const testUrl = 'https://www.instagram.com/reel/DIhN3e9OdFj/?igsh=MTFlMTFwcGtkeGpzcA==';

        console.log(`📸 테스트 URL: ${testUrl}`);
        console.log('⏳ 처리 중... (과거에는 좋아요: 6234797, 댓글: 39747, 채널: ayorook 추출했음)');

        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: testUrl,
            force: true,
            skipDuplicateCheck: true
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        console.log('\n=== 📋 처리 결과 ===');
        console.log('성공 여부:', response.data.success);
        console.log('메시지:', response.data.message);

        if (response.data.success && response.data.data) {
            const videoData = response.data.data;
            console.log('\n=== 📊 최종 저장된 데이터 ===');
            console.log(`🆔 ID: ${videoData._id}`);
            console.log(`🎬 제목: "${videoData.title || '없음'}"`);
            console.log(`👤 채널명: "${videoData.channelName || '없음'}"`);
            console.log(`👀 조회수: ${videoData.views || 0}`);
            console.log(`❤️ 좋아요: ${videoData.likes || 0}`);
            console.log(`💬 댓글수: ${videoData.commentsCount || 0}`);

            console.log('\n=== 🔍 분석 ===');
            const hasMetadata = videoData.title && videoData.title !== '' &&
                              videoData.views > 0 && videoData.likes > 0;

            if (hasMetadata) {
                console.log('✅ 이번에는 메타데이터가 제대로 저장됨!');
                console.log('💡 결론: 쿠키 문제가 해결되고 데이터 흐름도 정상');
            } else {
                console.log('❌ 여전히 메타데이터 누락');
                console.log('💡 결론: 쿠키 문제 또는 데이터 흐름 문제');
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);

        if (error.response) {
            console.error('📝 서버 응답:', error.response.status, error.response.data);
        }

        console.log('\n💡 이것은 과거에 성공했던 URL이므로:');
        console.log('1. Instagram 쿠키가 완전히 만료/차단됨');
        console.log('2. 해당 Instagram 게시물이 삭제/비공개됨');
        console.log('3. Instagram이 해당 계정/IP를 차단함');
    }
}

testExistingUrl();
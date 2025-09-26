// 작동하는 Instagram URL로 메타데이터 테스트
const axios = require('axios');

async function testWorkingInstagram() {
    try {
        console.log('🧪 작동하는 Instagram URL로 메타데이터 테스트...');

        // 공개되어 있고 쿠키 없이도 접근 가능한 Instagram URL 사용
        const testUrl = 'https://www.instagram.com/p/C-8qJGRxVtJ/';  // 간단한 포스트 형태

        console.log(`📸 테스트 URL: ${testUrl}`);
        console.log('⏳ 처리 중... (상세한 서버 로그 확인 필요)');

        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: testUrl,
            force: true,
            skipDuplicateCheck: true
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2분 타임아웃
        });

        console.log('\n=== 📋 처리 결과 ===');
        console.log('성공 여부:', response.data.success);
        console.log('메시지:', response.data.message);

        if (response.data.success && response.data.data) {
            const videoData = response.data.data;
            console.log('\n=== 📊 최종 저장된 메타데이터 ===');
            console.log(`🆔 ID: ${videoData._id}`);
            console.log(`🎬 제목: "${videoData.title || '없음'}"`);
            console.log(`👤 채널명: "${videoData.channelName || '없음'}"`);
            console.log(`👀 조회수: ${videoData.views || 0}`);
            console.log(`❤️ 좋아요: ${videoData.likes || 0}`);
            console.log(`💬 댓글수: ${videoData.commentsCount || 0}`);

            // 성공 여부 판단
            const hasMetadata = videoData.title && videoData.title !== '' &&
                              videoData.likes > 0 && videoData.views > 0;

            console.log('\n=== 🔍 결과 분석 ===');
            if (hasMetadata) {
                console.log('✅ Instagram 메타데이터가 성공적으로 추출되고 저장됨!');
                console.log('💡 결론: 데이터 흐름 시스템이 정상 작동함');
                console.log('💡 기존 실패는 쿠키/인증 문제 또는 특정 URL 접근 제한');
            } else {
                console.log('❌ 메타데이터가 여전히 누락됨');
                console.log('💡 결론: 데이터 흐름에 근본적인 문제가 있음');

                console.log('\n서버 로그에서 다음을 확인하세요:');
                console.log('1. "🔍 DEBUG - instagramInfo:" - 추출된 원시 데이터');
                console.log('2. "🔍 DEBUG - enrichedMetadata after merge:" - 병합된 메타데이터');
                console.log('3. "🔍 DEBUG - UnifiedVideoSaver 변환 직전 데이터:" - 전달된 메타데이터');
                console.log('4. "MongoDB 저장 직전 데이터:" - 변환된 최종 데이터');
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);

        if (error.response) {
            console.error('📝 서버 응답:', error.response.status, error.response.data);
        }

        console.log('\n💡 이 URL도 실패한다면:');
        console.log('1. Instagram 쿠키가 완전히 만료됨');
        console.log('2. Instagram이 봇 활동을 감지하여 IP 차단');
        console.log('3. 시스템 전체적인 문제');
    }
}

testWorkingInstagram();
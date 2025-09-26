// Instagram 메타데이터 전체 흐름 디버깅 테스트
const axios = require('axios');

async function testInstagramDebug() {
    try {
        console.log('🧪 Instagram 메타데이터 전체 흐름 디버깅 중...');

        // 새로운 Instagram Reel URL로 테스트
        const testUrl = 'https://www.instagram.com/reel/DAqRfD3Nqvz/';

        console.log(`📸 테스트 URL: ${testUrl}`);
        console.log('⏳ 처리 중... 서버 로그를 주의깊게 확인하세요');

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
            console.log('\n=== 📊 최종 데이터베이스 저장된 데이터 ===');
            console.log(`🆔 ID: ${videoData._id}`);
            console.log(`🎬 제목: "${videoData.title || '없음'}"`);
            console.log(`👤 채널명: "${videoData.channelName || '없음'}"`);
            console.log(`👀 조회수: ${videoData.views || 0}`);
            console.log(`❤️ 좋아요: ${videoData.likes || 0}`);
            console.log(`💬 댓글수: ${videoData.commentsCount || 0}`);
            console.log(`📅 업로드 날짜: ${videoData.uploadDate || '없음'}`);
            console.log(`🖼️ 썸네일: ${videoData.thumbnailUrl ? '있음' : '없음'}`);
            console.log(`📂 카테고리: ${videoData.mainCategory || '없음'}`);

            // 디버깅 결론
            console.log('\n=== 🔍 디버깅 결론 ===');
            if (videoData.title && videoData.views && videoData.likes && videoData.channelName) {
                console.log('✅ Instagram 메타데이터가 완벽하게 데이터베이스에 저장됨!');
                console.log('✅ 전체 흐름이 정상 작동함: 추출 → 변환 → 저장');
            } else {
                console.log('❌ 메타데이터가 여전히 누락됨');
                console.log('💡 서버 로그에서 다음 디버깅 포인트를 확인하세요:');
                console.log('   1. "🔍 DEBUG - instagramInfo:" - 추출 성공 여부');
                console.log('   2. "🔍 DEBUG - enrichedMetadata after merge:" - 병합 성공 여부');
                console.log('   3. "🔍 DEBUG - UnifiedVideoSaver 변환 직전 데이터:" - 전달 성공 여부');
                console.log('   4. "MongoDB 저장 직전 데이터:" - 변환 성공 여부');
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);

        if (error.response) {
            console.error('📝 서버 응답:', error.response.status, error.response.data);
        }

        console.log('\n💡 실패 시 확인사항:');
        console.log('1. 서버가 실행 중인지 확인 (http://localhost:3000)');
        console.log('2. Instagram URL이 유효한지 확인');
        console.log('3. Instagram 쿠키 파일 존재 여부 확인');
    }
}

// 테스트 실행
testInstagramDebug();
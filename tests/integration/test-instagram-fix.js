// Instagram 메타데이터 수정 사항 테스트
const axios = require('axios');

async function testInstagramFix() {
    try {
        console.log('🧪 Instagram 메타데이터 수정 사항 테스트 중...');

        // 새로운 Instagram Reel URL로 테스트
        const testUrl = 'https://www.instagram.com/reel/DAhWsYsT3Gv/';

        console.log(`📸 테스트 URL: ${testUrl}`);
        console.log('⏳ 처리 중... (60초 대기)');

        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: testUrl,
            force: true
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
            console.log('\n=== 📊 추출된 메타데이터 (수정 후) ===');
            console.log(`🆔 ID: ${videoData._id}`);
            console.log(`🎬 제목: "${videoData.title || '없음'}"`);
            console.log(`👤 채널명: "${videoData.channelName || '없음'}"`);
            console.log(`👀 조회수: ${videoData.views || 0}`);
            console.log(`❤️ 좋아요: ${videoData.likes || 0}`);
            console.log(`💬 댓글수: ${videoData.commentsCount || 0}`);
            console.log(`📅 업로드 날짜: ${videoData.uploadDate || '없음'}`);
            console.log(`🖼️ 썸네일: ${videoData.thumbnailUrl ? '있음' : '없음'}`);
            console.log(`📂 카테고리: ${videoData.mainCategory || '없음'}`);

            // 수정 사항 검증
            const fixes = [];
            if (videoData.title && videoData.title !== '' && videoData.title !== 'undefined') {
                fixes.push('✅ 제목 정상');
            } else {
                fixes.push('❌ 제목 여전히 누락');
            }

            if (videoData.views && videoData.views > 0) {
                fixes.push('✅ 조회수 정상');
            } else {
                fixes.push('❌ 조회수 여전히 누락');
            }

            if (videoData.likes && videoData.likes > 0) {
                fixes.push('✅ 좋아요 정상');
            } else {
                fixes.push('❌ 좋아요 여전히 누락');
            }

            if (videoData.channelName && videoData.channelName !== '알 수 없는 채널') {
                fixes.push('✅ 채널명 정상');
            } else {
                fixes.push('❌ 채널명 여전히 누락');
            }

            console.log('\n=== 🔧 수정 사항 검증 ===');
            fixes.forEach(fix => console.log(`   ${fix}`));

            const successCount = fixes.filter(f => f.includes('✅')).length;
            console.log(`\n📊 수정 성공률: ${successCount}/4 (${Math.round(successCount/4*100)}%)`);

            if (successCount === 4) {
                console.log('🎉 Instagram 메타데이터 수정이 성공적으로 적용되었습니다!');
            } else {
                console.log('⚠️ 일부 필드가 여전히 누락되어 있습니다.');
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);

        if (error.response) {
            console.error('📝 서버 응답:', error.response.status, error.response.data);
        }
    }
}

// 테스트 실행
testInstagramFix();
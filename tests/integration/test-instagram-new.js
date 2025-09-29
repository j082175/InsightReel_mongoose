// 새로운 Instagram URL로 메타데이터 추출 테스트
const axios = require('axios');

async function testNewInstagramUrl() {
    try {
        console.log('🧪 새로운 Instagram URL로 메타데이터 추출 테스트 중...');

        // 새로운 테스트 URL
        const testUrl = 'https://www.instagram.com/reel/DCvyOh3tPnL/';

        console.log(`📸 테스트 URL: ${testUrl}`);

        const response = await axios.post('http://localhost:3000/api/process-video', {
            url: testUrl,
            force: true,
            skipDuplicateCheck: true,
            skipVideoDownload: false  // 실제 저장 테스트를 위해 비디오 다운로드 포함
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60초 타임아웃
        });

        console.log('\n=== 📋 처리 결과 ===');
        console.log('성공 여부:', response.data.success);
        console.log('메시지:', response.data.message);

        if (response.data.success && response.data.data) {
            const videoData = response.data.data;
            console.log('\n=== 📊 추출된 메타데이터 ===');
            console.log(`🆔 ID: ${videoData._id}`);
            console.log(`🎬 제목: "${videoData.title || '없음'}"`);
            console.log(`👤 채널명: "${videoData.channelName || '없음'}"`);
            console.log(`👀 조회수: ${videoData.views || 0}`);
            console.log(`❤️ 좋아요: ${videoData.likes || 0}`);
            console.log(`💬 댓글수: ${videoData.commentsCount || 0}`);
            console.log(`📅 업로드 날짜: ${videoData.uploadDate || '없음'}`);
            console.log(`🖼️ 썸네일: ${videoData.thumbnailUrl ? '있음' : '없음'}`);
            console.log(`📂 카테고리: ${videoData.mainCategory || '없음'}`);

            // 문제 진단
            const issues = [];
            if (!videoData.title) issues.push('제목 누락');
            if (!videoData.views || videoData.views === 0) issues.push('조회수 누락');
            if (!videoData.likes || videoData.likes === 0) issues.push('좋아요 누락');
            if (!videoData.channelName || videoData.channelName === '알 수 없는 채널') issues.push('채널명 누락');

            console.log('\n=== ❌ 문제 진단 ===');
            if (issues.length > 0) {
                console.log(`🚨 ${issues.length}개 문제 발견:`);
                issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
                console.log('\n💡 결론: VideoDataConverter 수정이 적용되지 않음 또는 Instagram 추출 자체가 실패');
            } else {
                console.log('✅ 메타데이터가 정상적으로 추출됨!');
                console.log('💡 결론: VideoDataConverter 수정이 성공적으로 적용됨');
            }
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error.message);

        if (error.response) {
            console.error('📝 서버 응답:', error.response.status, error.response.data);
        }

        console.log('\n💡 실패 원인 분석:');
        console.log('1. Instagram 쿠키 파일이 없거나 만료됨');
        console.log('2. Instaloader와 yt-dlp 모두 해당 URL 처리 실패');
        console.log('3. 네트워크 연결 문제');
        console.log('4. Instagram에서 해당 릴스가 삭제되거나 비공개 처리됨');
    }
}

// 테스트 실행
testNewInstagramUrl();
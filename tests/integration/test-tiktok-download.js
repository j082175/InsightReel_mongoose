const axios = require('axios');

async function testTikTokDownloadPipeline() {
    console.log('🎯 새로운 TikTok 다운로드 파이프라인 테스트 시작...');

    // 다른 TikTok URL 사용 (중복 방지)
    const testUrl = 'https://www.tiktok.com/@mukbang_donguk/video/7550615689954938130';

    try {
        const response = await axios.post('http://localhost:3000/api/process-video', {
            videoUrl: testUrl,
            useAI: true,
            analysisType: 'quick'
        }, {
            timeout: 180000, // 3분 타임아웃 (다운로드 시간 고려)
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ 응답 성공!');
        console.log('📊 Status:', response.status);

        if (response.data?.metadata) {
            const meta = response.data.metadata;
            console.log('\n🎬 통일된 파이프라인으로 추출된 데이터:');
            console.log('📊 제목:', meta.title);
            console.log('📊 설명:', meta.description);
            console.log('👤 채널:', meta.channelName);
            console.log('👍 좋아요:', meta.likes?.toLocaleString() || 'N/A');
            console.log('👀 조회수:', meta.views?.toLocaleString() || 'N/A');
            console.log('💬 댓글:', meta.commentsCount?.toLocaleString() || 'N/A');
            console.log('🔄 공유:', meta.shares?.toLocaleString() || 'N/A');
            console.log('🎵 음악:', meta.musicTitle);
            console.log('🎤 음악가:', meta.musicAuthor);
            console.log('🖼️ 썸네일:', meta.thumbnailUrl ? '✅' : '❌');
            console.log('📱 API 버전:', response.data.analysis?.source || 'N/A');
            console.log('📁 다운로드 파일:', response.data.downloadedFile ? '✅ ytdl-core 다운로드 성공' : '❌');
        }

        console.log('\n💾 전체 응답 구조:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('❌ 에러 발생:', error.response?.status);
        console.log('📝 에러 메시지:', error.response?.data || error.message);
    }
}

testTikTokDownloadPipeline();
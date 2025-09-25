const { Downloader } = require('@tobyg74/tiktok-api-dl');

async function testTikTokDownloader() {
    console.log('🔍 TikTok Downloader API 직접 테스트 시작...');

    const testUrl = 'https://www.tiktok.com/@caimewgivay._/video/7550181977052286215';

    console.log('\n📡 Downloader API 테스트...');
    try {
        const result = await Downloader(testUrl);

        if (result && result.status === "success") {
            console.log('✅ Downloader API 성공!');
            console.log('📊 응답 구조:', {
                status: result.status,
                message: result.message,
                keys: Object.keys(result.result || {})
            });

            if (result.result) {
                const data = result.result;
                console.log('\n🎬 비디오 정보:');
                console.log('📊 제목:', data.title || 'N/A');
                console.log('📊 설명:', data.desc || 'N/A');
                console.log('👤 작성자:', data.author?.nickname || data.author?.unique_id || 'N/A');
                console.log('👍 좋아요:', data.statistics?.digg_count || 'N/A');
                console.log('👀 조회수:', data.statistics?.play_count || 'N/A');
                console.log('💬 댓글수:', data.statistics?.comment_count || 'N/A');
                console.log('🔄 공유수:', data.statistics?.share_count || 'N/A');
                console.log('🎵 음악:', data.music_info?.title || 'N/A');
                console.log('🎤 음악가:', data.music_info?.author || 'N/A');
                console.log('🏷️ 해시태그:', data.hashtag || 'N/A');

                console.log('\n📱 미디어 URL:');
                if (data.video) {
                    console.log('🎥 비디오 URL들:', Object.keys(data.video).join(', '));
                }
                if (data.images) {
                    console.log('🖼️ 이미지 URL들:', Object.keys(data.images).join(', '));
                }

                console.log('\n📁 전체 필드 구조:');
                console.log(JSON.stringify(result, null, 2));
            }
        } else {
            console.log('❌ Downloader API 실패');
            console.log('📄 전체 응답:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Downloader API 에러:', error.message);
        console.log('📄 에러 스택:', error.stack);
    }
}

testTikTokDownloader();
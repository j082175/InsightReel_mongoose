// 최근 성공한 Instagram 비디오 확인
const axios = require('axios');

async function checkLatestInstagram() {
    try {
        console.log('🔍 최근 성공한 Instagram 비디오 확인 중...');

        const response = await axios.get('http://localhost:3000/api/videos?limit=10&platform=INSTAGRAM&sortBy=timestamp');

        if (!response.data.success) {
            console.error('❌ API 응답 실패:', response.data.message);
            return;
        }

        const videos = response.data.data.videos;
        console.log(`📊 총 Instagram 비디오: ${videos.length}개`);

        if (videos.length === 0) {
            console.log('❌ Instagram 비디오가 없습니다.');
            return;
        }

        console.log('\n=== 📋 최근 Instagram 비디오 목록 ===');
        videos.forEach((video, index) => {
            console.log(`\n${index + 1}. 비디오 분석:`);
            console.log(`   🆔 ID: ${video._id}`);
            console.log(`   🎬 제목: "${video.title || '없음'}"`);
            console.log(`   👤 채널명: "${video.channelName || '없음'}"`);
            console.log(`   👀 조회수: ${video.views || 0}`);
            console.log(`   ❤️ 좋아요: ${video.likes || 0}`);
            console.log(`   💬 댓글수: ${video.commentsCount || 0}`);
            console.log(`   📅 업로드 날짜: ${video.uploadDate || '없음'}`);
            console.log(`   🖼️ 썸네일: ${video.thumbnailUrl ? '있음' : '없음'}`);
            console.log(`   📂 카테고리: ${video.mainCategory || '없음'}`);
            console.log(`   🔗 URL: ${video.url}`);

            // 메타데이터 완성도 체크
            const hasTitle = video.title && video.title !== '' && video.title !== 'undefined';
            const hasViews = video.views && video.views > 0;
            const hasLikes = video.likes && video.likes > 0;
            const hasChannel = video.channelName && video.channelName !== '알 수 없는 채널';

            const completionRate = [hasTitle, hasViews, hasLikes, hasChannel].filter(Boolean).length;
            console.log(`   📊 메타데이터 완성도: ${completionRate}/4`);

            if (completionRate === 4) {
                console.log('   ✅ 완벽한 메타데이터!');
            } else {
                console.log('   ❌ 메타데이터 누락');
            }
        });

        // 성공한 비디오가 있는지 확인
        const successfulVideos = videos.filter(v =>
            v.title && v.title !== '' && v.title !== 'undefined' &&
            v.views && v.views > 0 &&
            v.likes && v.likes > 0 &&
            v.channelName && v.channelName !== '알 수 없는 채널'
        );

        console.log('\n=== 📈 분석 결과 ===');
        console.log(`✅ 완전한 메타데이터를 가진 비디오: ${successfulVideos.length}/${videos.length}`);

        if (successfulVideos.length > 0) {
            console.log('🎉 Instagram 메타데이터 추출 시스템이 작동 중입니다!');
            console.log('💡 실패한 비디오들은 Instagram 쿠키 만료 또는 특정 URL 접근 제한 때문일 수 있습니다.');
        } else {
            console.log('❌ 모든 Instagram 비디오에서 메타데이터가 누락되어 있습니다.');
            console.log('💡 Instagram 쿠키를 업데이트하거나 추출 시스템을 점검해야 합니다.');
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    }
}

checkLatestInstagram();
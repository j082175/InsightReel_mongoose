// 실행 중인 서버의 API를 사용해서 비디오 정보 조회
const axios = require('axios');

async function debugVideo(videoId) {
    try {
        console.log(`🔍 서버 API를 통해 비디오 ${videoId} 조회 중...`);

        // 1. 전체 비디오 목록에서 해당 ID 찾기
        const response = await axios.get('http://localhost:3000/api/videos?limit=100&platform=INSTAGRAM');

        if (!response.data.success) {
            console.error('❌ API 응답 실패:', response.data.message);
            return;
        }

        const videos = response.data.data.videos;
        console.log(`📊 전체 Instagram 비디오: ${videos.length}개`);

        // 해당 ID 찾기 (ObjectId는 문자열로 비교)
        const targetVideo = videos.find(v => v._id === videoId || v.id === videoId);

        if (!targetVideo) {
            console.log(`❌ ID ${videoId}를 가진 비디오를 찾을 수 없습니다.`);
            console.log('💡 최근 Instagram 비디오 목록:');
            videos.slice(0, 5).forEach((v, i) => {
                console.log(`   ${i + 1}. ID: ${v._id || v.id} - ${v.title || '제목없음'}`);
            });
            return;
        }

        console.log('\n=== 📋 비디오 상세 정보 ===');
        console.log(`🆔 ID: ${targetVideo._id || targetVideo.id}`);
        console.log(`🎬 제목: "${targetVideo.title || '없음'}"`);
        console.log(`📱 플랫폼: ${targetVideo.platform}`);
        console.log(`👤 채널명: "${targetVideo.channelName || '없음'}"`);
        console.log(`🔗 URL: ${targetVideo.url || '없음'}`);
        console.log(`📅 업로드 날짜: ${targetVideo.uploadDate || '없음'}`);
        console.log(`👀 조회수: ${targetVideo.views || 0}`);
        console.log(`❤️ 좋아요: ${targetVideo.likes || 0}`);
        console.log(`💬 댓글수: ${targetVideo.commentsCount || 0}`);
        console.log(`🖼️ 썸네일: ${targetVideo.thumbnailUrl ? '있음' : '없음'}`);
        console.log(`📂 카테고리: ${targetVideo.mainCategory || '없음'}`);

        // 문제점 분석
        console.log('\n=== ❌ 문제점 분석 ===');
        const issues = [];

        if (!targetVideo.title || targetVideo.title === '' || targetVideo.title === 'undefined') {
            issues.push('제목 누락 또는 undefined');
        }
        if (!targetVideo.channelName || targetVideo.channelName === '') {
            issues.push('채널명 누락');
        }
        if (!targetVideo.views || targetVideo.views === 0) {
            issues.push('조회수 누락 (0)');
        }
        if (!targetVideo.likes || targetVideo.likes === 0) {
            issues.push('좋아요 누락 (0)');
        }
        if (!targetVideo.thumbnailUrl || targetVideo.thumbnailUrl === '') {
            issues.push('썸네일 누락');
        }
        if (!targetVideo.description || targetVideo.description === '') {
            issues.push('설명 누락');
        }

        // 업로드 날짜 문제 체크
        if (targetVideo.uploadDate) {
            const uploadDate = new Date(targetVideo.uploadDate);
            const today = new Date();
            const diffDays = Math.floor((today - uploadDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                issues.push('업로드 날짜가 오늘로 잘못 설정됨 (실제 Instagram 게시일과 다름)');
            }
        }

        if (issues.length > 0) {
            console.log(`🚨 발견된 문제: ${issues.length}개`);
            issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        } else {
            console.log('✅ 메타데이터가 정상적으로 저장되어 있습니다.');
        }

        // 전체 객체 출력
        console.log('\n=== 🗄️ 전체 비디오 데이터 ===');
        console.log(JSON.stringify(targetVideo, null, 2));

        // 결론 및 해결 방안
        console.log('\n=== 💡 해결 방안 ===');
        if (issues.length > 0) {
            console.log('1. Instagram 메타데이터 추출기(Instaloader/yt-dlp) 실패');
            console.log('2. VideoDataConverter 변환 과정에서 데이터 누락');
            console.log('3. 해당 Instagram URL을 다시 처리하여 메타데이터 복구 필요');

            if (targetVideo.url) {
                console.log(`\n🔧 복구 명령어:`);
                console.log(`curl -X POST "http://localhost:3000/api/process-video" -H "Content-Type: application/json" -d '{"url":"${targetVideo.url}","force":true}'`);
            }
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        if (error.response) {
            console.error('서버 응답:', error.response.status, error.response.data);
        }
    }
}

// 비디오 ID로 디버그 - 수정 후 생성된 비디오
debugVideo('68d5f182efea815096187ef3');
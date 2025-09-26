const mongoose = require('mongoose');
const Video = require('./server/models/VideoModel');

// MongoDB 연결
const mongoUri = 'mongodb+srv://jjunsss:wnstjs0821@cluster0.0lz3s.mongodb.net/InsightReel?retryWrites=true&w=majority&appName=Cluster0';

async function checkVideoById(videoId) {
    try {
        console.log(`🔍 비디오 ID ${videoId} 상세 조회 중...`);

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB 연결 성공');

        // ObjectId로 조회
        const video = await Video.findById(videoId);

        if (!video) {
            console.log('❌ 해당 ID의 비디오를 찾을 수 없습니다.');
            return;
        }

        console.log('\n=== 📋 비디오 상세 정보 ===');
        console.log(`🆔 ID: ${video._id}`);
        console.log(`🎬 제목: "${video.title || '없음'}"`);
        console.log(`📱 플랫폼: ${video.platform}`);
        console.log(`👤 채널명: "${video.channelName || '없음'}"`);
        console.log(`🔗 URL: ${video.url || '없음'}`);
        console.log(`📅 업로드 날짜: ${video.uploadDate || '없음'}`);
        console.log(`👀 조회수: ${video.views || 0}`);
        console.log(`❤️ 좋아요: ${video.likes || 0}`);
        console.log(`💬 댓글수: ${video.commentsCount || 0}`);
        console.log(`🖼️ 썸네일: ${video.thumbnailUrl ? '있음' : '없음'}`);
        console.log(`📂 카테고리: ${video.mainCategory || '없음'}`);
        console.log(`🏷️ 키워드: [${(video.keywords || []).join(', ')}]`);
        console.log(`#️⃣ 해시태그: [${(video.hashtags || []).join(', ')}]`);
        console.log(`📝 설명: "${video.description ? video.description.substring(0, 100) + '...' : '없음'}"`);

        console.log('\n=== 🔧 시스템 필드 ===');
        console.log(`📊 행 번호: ${video.rowNumber || 0}`);
        console.log(`🕐 수집 시간: ${video.collectionTime || '없음'}`);
        console.log(`⚙️ 처리 시간: ${video.processedAt || '없음'}`);
        console.log(`🤖 분석 상태: ${video.analysisStatus || '없음'}`);
        console.log(`📈 신뢰도: ${video.confidence || '없음'}`);

        // 문제점 분석
        console.log('\n=== ❌ 문제점 분석 ===');
        const issues = [];

        if (!video.title || video.title === '') issues.push('제목 누락');
        if (!video.channelName || video.channelName === '') issues.push('채널명 누락');
        if (!video.views || video.views === 0) issues.push('조회수 누락');
        if (!video.likes || video.likes === 0) issues.push('좋아요 누락');
        if (!video.thumbnailUrl || video.thumbnailUrl === '') issues.push('썸네일 누락');
        if (!video.description || video.description === '') issues.push('설명 누락');
        if (video.uploadDate && new Date(video.uploadDate).toDateString() === new Date().toDateString()) {
            issues.push('업로드 날짜가 오늘 날짜로 잘못 설정됨');
        }
        if (!video.keywords || video.keywords.length === 0) issues.push('키워드 누락');

        if (issues.length > 0) {
            console.log(`🚨 발견된 문제: ${issues.length}개`);
            issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        } else {
            console.log('✅ 메타데이터가 정상적으로 저장되어 있습니다.');
        }

        // 원본 문서 전체 출력 (디버깅용)
        console.log('\n=== 🗄️ 전체 DB 문서 (JSON) ===');
        console.log(JSON.stringify(video.toObject(), null, 2));

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('스택:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 MongoDB 연결 종료');
        process.exit();
    }
}

// 비디오 ID 확인
const videoId = '68d5e88b30bd4c1b39861cf6';
checkVideoById(videoId);
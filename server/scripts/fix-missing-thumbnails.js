require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');
const { ServerLogger } = require('../utils/logger');

async function fixMissingThumbnails() {
  try {
    console.log('🚀 썸네일 누락 데이터 수정 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 1. 현재 상태 분석
    const totalVideos = await Video.countDocuments();
    const videosWithoutThumbnail = await Video.countDocuments({
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    });
    const videosWithBadTitles = await Video.countDocuments({
      title: { $regex: /(watch\?v=|shorts\/|reels?\/|미분류)/ }
    });
    
    console.log('\n📊 현재 데이터 상태:');
    console.log(`   전체 Video 레코드: ${totalVideos}개`);
    console.log(`   썸네일 없음: ${videosWithoutThumbnail}개 (${(videosWithoutThumbnail/totalVideos*100).toFixed(1)}%)`);
    console.log(`   제목 문제: ${videosWithBadTitles}개 (${(videosWithBadTitles/totalVideos*100).toFixed(1)}%)`);
    
    // 2. YouTube 영상들을 위한 썸네일 URL 생성
    const youtubeVideos = await Video.find({
      platform: 'youtube',
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    }).lean();
    
    console.log(`\n🎬 YouTube 영상 썸네일 수정: ${youtubeVideos.length}개`);
    
    let youtubeFixed = 0;
    
    for (const video of youtubeVideos) {
      try {
        // YouTube URL에서 video ID 추출
        let videoId = null;
        const url = video.originalUrl;
        
        if (url) {
          // watch?v= 형태
          const watchMatch = url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
          if (watchMatch) {
            videoId = watchMatch[1];
          }
          
          // shorts/ 형태  
          const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
          if (shortsMatch) {
            videoId = shortsMatch[1];
          }
          
          // youtu.be/ 형태
          const youtubeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          if (youtubeMatch) {
            videoId = youtubeMatch[1];
          }
        }
        
        if (videoId) {
          // YouTube 썸네일 URL 생성
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          const betterTitle = video.title === '미분류' || video.title.includes('watch?v=') || video.title.includes('shorts/') 
            ? `YouTube 영상 ${videoId}` 
            : video.title;
          
          await Video.updateOne(
            { _id: video._id },
            { 
              $set: { 
                thumbnailUrl: thumbnailUrl,
                title: betterTitle
              } 
            }
          );
          
          youtubeFixed++;
          if (youtubeFixed % 10 === 0) {
            console.log(`   📹 YouTube 진행률: ${youtubeFixed}/${youtubeVideos.length}`);
          }
        } else {
          console.log(`⚠️ 비디오 ID 추출 실패: ${url}`);
        }
      } catch (error) {
        console.error(`❌ YouTube 영상 처리 실패: ${video.account}`, error.message);
      }
    }
    
    // 3. Instagram 영상들을 위한 기본 썸네일
    const instagramVideos = await Video.find({
      platform: 'instagram',
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    }).lean();
    
    console.log(`\n📸 Instagram 영상 기본 썸네일 설정: ${instagramVideos.length}개`);
    
    let instagramFixed = 0;
    
    for (const video of instagramVideos) {
      try {
        // Instagram은 실제 썸네일을 가져올 수 없으므로 플레이스홀더 사용
        const thumbnailUrl = 'https://via.placeholder.com/300x300/E1306C/white?text=Instagram';
        const betterTitle = video.title === '미분류' || video.title.includes('reels/') || video.title.includes('reel/')
          ? 'Instagram 영상'
          : video.title;
        
        await Video.updateOne(
          { _id: video._id },
          { 
            $set: { 
              thumbnailUrl: thumbnailUrl,
              title: betterTitle
            } 
          }
        );
        
        instagramFixed++;
      } catch (error) {
        console.error(`❌ Instagram 영상 처리 실패: ${video.account}`, error.message);
      }
    }
    
    // 4. TikTok 영상들을 위한 기본 썸네일
    const tiktokVideos = await Video.find({
      platform: 'tiktok',
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    }).lean();
    
    console.log(`\n🎵 TikTok 영상 기본 썸네일 설정: ${tiktokVideos.length}개`);
    
    let tiktokFixed = 0;
    
    for (const video of tiktokVideos) {
      try {
        const thumbnailUrl = 'https://via.placeholder.com/300x300/FF0050/white?text=TikTok';
        const betterTitle = video.title === '미분류' ? 'TikTok 영상' : video.title;
        
        await Video.updateOne(
          { _id: video._id },
          { 
            $set: { 
              thumbnailUrl: thumbnailUrl,
              title: betterTitle
            } 
          }
        );
        
        tiktokFixed++;
      } catch (error) {
        console.error(`❌ TikTok 영상 처리 실패: ${video.account}`, error.message);
      }
    }
    
    // 5. 최종 결과 확인
    const finalVideosWithoutThumbnail = await Video.countDocuments({
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    });
    
    console.log('\n📊 수정 완료 통계:');
    console.log(`   YouTube 수정: ${youtubeFixed}개`);
    console.log(`   Instagram 수정: ${instagramFixed}개`);  
    console.log(`   TikTok 수정: ${tiktokFixed}개`);
    console.log(`   총 수정: ${youtubeFixed + instagramFixed + tiktokFixed}개`);
    console.log(`   남은 썸네일 누락: ${finalVideosWithoutThumbnail}개`);
    console.log(`   완료율: ${(((totalVideos - finalVideosWithoutThumbnail) / totalVideos) * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    console.log('✅ 썸네일 수정 작업 완료!');
    
  } catch (error) {
    console.error('❌ 썸네일 수정 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

// 스크립트 실행
fixMissingThumbnails();
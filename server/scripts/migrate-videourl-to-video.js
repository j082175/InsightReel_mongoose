require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const Video = require('../models/Video');
const { ServerLogger } = require('../utils/logger');

async function migrateVideoUrlToVideo() {
  try {
    console.log('🚀 VideoUrl → Video 모델 마이그레이션 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 원본 게시일이 있는 VideoUrl 레코드 조회
    const videoUrls = await VideoUrl.find({
      originalPublishDate: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📊 마이그레이션 대상: ${videoUrls.length}개 VideoUrl 레코드\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (const videoUrl of videoUrls) {
      try {
        // 이미 Video 레코드가 있는지 확인 (originalUrl 필드로 검사)
        const existingVideo = await Video.findOne({
          originalUrl: videoUrl.originalUrl,
          platform: videoUrl.platform
        });
        
        if (existingVideo && existingVideo.originalPublishDate) {
          console.log(`⏭️ 이미 존재: ${videoUrl.platform} - ${videoUrl.originalUrl.substring(0, 50)}...`);
          skipCount++;
          continue;
        }
        
        // Video 레코드 생성 또는 업데이트
        const videoData = {
          platform: videoUrl.platform,
          account: '알 수 없는 채널',
          title: videoUrl.originalUrl.split('/').pop() || '미분류',
          originalUrl: videoUrl.originalUrl,
          comments_count: 0,
          timestamp: videoUrl.originalPublishDate, // 원본 게시일을 timestamp로
          originalPublishDate: videoUrl.originalPublishDate,
          processedAt: videoUrl.processedAt || videoUrl.createdAt,
          category: '미분류',
          keywords: [],
          hashtags: [],
          likes: 0,
          views: 0,
          shares: 0,
          comments_count: 0
        };
        
        const result = await Video.findOneAndUpdate(
          { account: videoUrl.originalUrl, platform: videoUrl.platform },
          { $set: videoData },
          { upsert: true, new: true }
        );
        
        console.log(`✅ 마이그레이션 성공: ${videoUrl.platform} - ${videoUrl.originalUrl.substring(0, 50)}...`);
        console.log(`   원본 게시일: ${videoUrl.originalPublishDate.toLocaleString()}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 마이그레이션 실패: ${videoUrl.originalUrl}`);
        console.error(`   오류: ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n📊 마이그레이션 완료 통계:');
    console.log(`   총 대상: ${videoUrls.length}개`);
    console.log(`   성공: ${successCount}개`);
    console.log(`   스킵: ${skipCount}개 (이미 존재)`);
    console.log(`   실패: ${failCount}개`);
    console.log(`   완료율: ${((successCount + skipCount) / videoUrls.length * 100).toFixed(1)}%`);
    
    // Video 모델 최종 확인
    const totalVideos = await Video.countDocuments();
    const videosWithOriginalDate = await Video.countDocuments({
      originalPublishDate: { $exists: true, $ne: null }
    });
    
    console.log('\n📊 Video 모델 현황:');
    console.log(`   전체 Video 레코드: ${totalVideos}개`);
    console.log(`   원본 게시일 있음: ${videosWithOriginalDate}개`);
    console.log(`   완료율: ${(videosWithOriginalDate / totalVideos * 100).toFixed(1)}%`);
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

// 스크립트 실행
migrateVideoUrlToVideo();
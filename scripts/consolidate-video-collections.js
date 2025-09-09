const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Video = require('../server/models/Video');

/**
 * 🧹 비디오 컬렉션 통합 스크립트
 * videos_youtube + videos_instagram → videos 로 통합
 */
async function consolidateVideoCollections() {
  try {
    console.log('🚀 비디오 컬렉션 통합 시작...');
    
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    const db = mongoose.connection.db;
    
    // 1. 기존 컬렉션들 확인
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📋 현재 컬렉션:', collectionNames);
    
    let totalMigrated = 0;
    
    // 2. videos_youtube 마이그레이션
    if (collectionNames.includes('videos_youtube')) {
      console.log('\n📹 videos_youtube 마이그레이션 중...');
      const youtubeVideos = await db.collection('videos_youtube').find({}).toArray();
      
      if (youtubeVideos.length > 0) {
        // 플랫폼 필드 추가 및 데이터 변환
        const convertedData = youtubeVideos.map(video => ({
          ...video,
          platform: video.platform || 'youtube',
          // Video 모델 필드명으로 매핑
          uploadDate: video.uploadDate,
          channelName: video.channelName,
          url: video.url,
          mainCategory: video.mainCategory,
          middleCategory: video.middleCategory,
          keywords: video.keywords,
          hashtags: video.hashtags,
          description: video.description,
          likes: video.likes || 0,
          views: video.views || 0,
          commentsCount: video.commentsCount || 0,
          thumbnailUrl: video.thumbnailUrl,
          // MongoDB _id 제거 (새로 생성)
          _id: undefined,
          __v: undefined
        }));
        
        // videos 컬렉션에 삽입 (중복 방지)
        let insertedCount = 0;
        for (const videoData of convertedData) {
          try {
            // URL 중복 검사
            const existing = await Video.findOne({ url: videoData.url });
            if (!existing) {
              await Video.create(videoData);
              insertedCount++;
            } else {
              console.log(`⚠️ 중복 URL 스킵: ${videoData.url}`);
            }
          } catch (error) {
            console.error(`❌ 개별 삽입 실패: ${error.message}`);
          }
        }
        
        console.log(`✅ videos_youtube → videos: ${insertedCount}/${youtubeVideos.length}개 마이그레이션`);
        totalMigrated += insertedCount;
      }
    }
    
    // 3. videos_instagram 마이그레이션
    if (collectionNames.includes('videos_instagram')) {
      console.log('\n📱 videos_instagram 마이그레이션 중...');
      const instagramVideos = await db.collection('videos_instagram').find({}).toArray();
      
      if (instagramVideos.length > 0) {
        // 플랫폼 필드 추가 및 데이터 변환
        const convertedData = instagramVideos.map(video => ({
          ...video,
          platform: video.platform || 'instagram',
          // Video 모델 필드명으로 매핑
          uploadDate: video.uploadDate,
          channelName: video.channelName,
          url: video.url,
          mainCategory: video.mainCategory,
          middleCategory: video.middleCategory,
          keywords: video.keywords,
          hashtags: video.hashtags,
          description: video.description,
          likes: video.likes || 0,
          views: video.views || 0,
          commentsCount: video.commentsCount || 0,
          thumbnailUrl: video.thumbnailUrl,
          // MongoDB _id 제거 (새로 생성)
          _id: undefined,
          __v: undefined
        }));
        
        // videos 컬렉션에 삽입 (중복 방지)
        let insertedCount = 0;
        for (const videoData of convertedData) {
          try {
            // URL 중복 검사
            const existing = await Video.findOne({ url: videoData.url });
            if (!existing) {
              await Video.create(videoData);
              insertedCount++;
            } else {
              console.log(`⚠️ 중복 URL 스킵: ${videoData.url}`);
            }
          } catch (error) {
            console.error(`❌ 개별 삽입 실패: ${error.message}`);
          }
        }
        
        console.log(`✅ videos_instagram → videos: ${insertedCount}/${instagramVideos.length}개 마이그레이션`);
        totalMigrated += insertedCount;
      }
    }
    
    // 4. 결과 요약
    console.log(`\n🎉 마이그레이션 완료!`);
    console.log(`📊 총 ${totalMigrated}개 레코드가 videos 컬렉션으로 통합되었습니다.`);
    
    // 5. 통합 후 통계
    const finalCount = await Video.countDocuments();
    const youtubeCount = await Video.countDocuments({ platform: 'youtube' });
    const instagramCount = await Video.countDocuments({ platform: 'instagram' });
    
    console.log(`\n📈 videos 컬렉션 현황:`);
    console.log(`- 전체: ${finalCount}개`);
    console.log(`- YouTube: ${youtubeCount}개`);
    console.log(`- Instagram: ${instagramCount}개`);
    console.log(`- 기타: ${finalCount - youtubeCount - instagramCount}개`);
    
    console.log(`\n🗑️ 기존 컬렉션 정리 안내:`);
    console.log(`   마이그레이션이 성공했다면 다음 명령어로 기존 컬렉션을 삭제할 수 있습니다:`);
    console.log(`   db.videos_youtube.drop()`);
    console.log(`   db.videos_instagram.drop()`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  consolidateVideoCollections();
}

module.exports = { consolidateVideoCollections };
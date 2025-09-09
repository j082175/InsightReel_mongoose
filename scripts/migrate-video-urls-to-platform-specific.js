const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 기존 모델들
const VideoUrl = require('../server/models/VideoUrl');        // instagram_duplicate_check로 변경됨
const YouTubeUrl = require('../server/models/YouTubeUrl');    // youtube_duplicate_check
const ChannelUrl = require('../server/models/ChannelUrl');    // channel_duplicate_check

/**
 * 🔄 기존 video_urls 컬렉션을 플랫폼별로 마이그레이션
 * video_urls → instagram_duplicate_check, youtube_duplicate_check 분리
 */
async function migrateVideoUrlsToPlatformSpecific() {
  try {
    console.log('🚀 플랫폼별 중복 검사 컬렉션 마이그레이션 시작...');
    
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/InsightReel');
    console.log('✅ MongoDB 연결 완료');
    
    // 1. 기존 video_urls 컬렉션에서 모든 데이터 조회
    console.log('\n📊 기존 video_urls 데이터 조회 중...');
    const db = mongoose.connection.db;
    const oldVideoUrls = await db.collection('video_urls').find({}).toArray();
    
    console.log(`📝 발견된 기존 레코드: ${oldVideoUrls.length}개`);
    
    if (oldVideoUrls.length === 0) {
      console.log('⚠️ 마이그레이션할 데이터가 없습니다.');
      return;
    }
    
    // 2. 플랫폼별로 분류
    const instagramData = [];
    const youtubeData = [];
    const unknownData = [];
    
    for (const record of oldVideoUrls) {
      const platform = record.platform || 'unknown';
      
      if (platform === 'youtube') {
        // YouTube 데이터 변환
        const youtubeRecord = {
          normalizedUrl: record.normalizedUrl,
          originalUrl: record.originalUrl,
          platform: 'youtube',
          status: record.status || 'completed',
          sheetLocation: record.sheetLocation || null,
          videoId: extractYouTubeVideoId(record.originalUrl),
          channelId: null, // 추후 추출 가능하면 업데이트
          originalPublishDate: record.originalPublishDate || null,
          processedAt: record.processedAt || null,
          createdAt: record.createdAt || new Date()
        };
        youtubeData.push(youtubeRecord);
        
      } else if (platform === 'instagram' || platform === 'tiktok') {
        // Instagram/TikTok 데이터는 그대로 유지
        instagramData.push(record);
        
      } else {
        unknownData.push(record);
      }
    }
    
    console.log(`\n📊 플랫폼별 분류 결과:`);
    console.log(`- Instagram/TikTok: ${instagramData.length}개`);
    console.log(`- YouTube: ${youtubeData.length}개`);
    console.log(`- Unknown: ${unknownData.length}개`);
    
    // 3. 새로운 컬렉션에 삽입
    let instagramInserted = 0;
    let youtubeInserted = 0;
    
    // Instagram/TikTok 데이터 삽입 (이미 instagram_duplicate_check로 설정됨)
    if (instagramData.length > 0) {
      console.log(`\n📤 Instagram/TikTok 데이터 삽입 중... (${instagramData.length}개)`);
      try {
        // 기존 VideoUrl 모델 사용 (이미 instagram_duplicate_check 컬렉션으로 설정됨)
        const result = await db.collection('instagram_duplicate_check').insertMany(instagramData, { ordered: false });
        instagramInserted = result.insertedCount;
        console.log(`✅ Instagram/TikTok 데이터 삽입 완료: ${instagramInserted}개`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️ Instagram/TikTok 중복 키 에러 (일부는 이미 존재): ${error.writeErrors?.length || 0}개 스킵`);
          instagramInserted = instagramData.length - (error.writeErrors?.length || 0);
        } else {
          throw error;
        }
      }
    }
    
    // YouTube 데이터 삽입
    if (youtubeData.length > 0) {
      console.log(`\n📤 YouTube 데이터 삽입 중... (${youtubeData.length}개)`);
      try {
        const result = await db.collection('youtube_duplicate_check').insertMany(youtubeData, { ordered: false });
        youtubeInserted = result.insertedCount;
        console.log(`✅ YouTube 데이터 삽입 완료: ${youtubeInserted}개`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️ YouTube 중복 키 에러 (일부는 이미 존재): ${error.writeErrors?.length || 0}개 스킵`);
          youtubeInserted = youtubeData.length - (error.writeErrors?.length || 0);
        } else {
          throw error;
        }
      }
    }
    
    // 4. 마이그레이션 결과 요약
    console.log(`\n✅ 마이그레이션 완료!`);
    console.log(`📊 마이그레이션 결과:`);
    console.log(`- instagram_duplicate_check: ${instagramInserted}개 삽입`);
    console.log(`- youtube_duplicate_check: ${youtubeInserted}개 삽입`);
    console.log(`- 처리하지 못한 데이터: ${unknownData.length}개`);
    
    if (unknownData.length > 0) {
      console.log(`\n⚠️ 처리하지 못한 데이터:`);
      unknownData.forEach(record => {
        console.log(`  - ${record.originalUrl} (platform: ${record.platform || 'undefined'})`);
      });
    }
    
    // 5. 기존 video_urls 컬렉션 삭제 확인
    console.log(`\n🗑️ 기존 video_urls 컬렉션을 삭제하시겠습니까?`);
    console.log(`   삭제하려면 직접 다음 명령어를 실행하세요:`);
    console.log(`   db.video_urls.drop()`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

/**
 * YouTube URL에서 videoId 추출
 * @param {string} url - YouTube URL
 * @returns {string|null} 비디오 ID
 */
function extractYouTubeVideoId(url) {
  if (!url || !url.includes('youtube')) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// 스크립트 실행
if (require.main === module) {
  migrateVideoUrlsToPlatformSpecific();
}

module.exports = { migrateVideoUrlsToPlatformSpecific };
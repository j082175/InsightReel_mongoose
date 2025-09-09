require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');

async function simpleDataCompare() {
  try {
    console.log('🔍 DB와 시트 데이터 간단 비교...\n');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // DB에서 원본 게시일이 있는 레코드들
    const dbVideos = await VideoUrl.find({ 
      originalPublishDate: { $exists: true, $ne: null } 
    }).lean();
    
    console.log(`📊 DB 레코드: ${dbVideos.length}개\n`);
    
    // 플랫폼별 분석
    const platformGroups = {};
    dbVideos.forEach(video => {
      if (!platformGroups[video.platform]) {
        platformGroups[video.platform] = [];
      }
      platformGroups[video.platform].push(video);
    });
    
    console.log('📊 플랫폼별 분석:');
    Object.keys(platformGroups).forEach(platform => {
      const videos = platformGroups[platform];
      console.log(`\n${platform.toUpperCase()}: ${videos.length}개`);
      
      // 샘플 데이터 5개씩 보여주기
      console.log('   샘플 데이터:');
      videos.slice(0, 5).forEach((video, index) => {
        console.log(`   ${index + 1}. URL: ${video.originalUrl.substring(0, 50)}...`);
        console.log(`      원본 게시일: ${video.originalPublishDate.toLocaleString()}`);
        console.log(`      생성일: ${video.createdAt.toLocaleString()}`);
      });
      
      if (videos.length > 5) {
        console.log(`   ... 외 ${videos.length - 5}개 더`);
      }
    });
    
    // 날짜 패턴 분석
    console.log('\n🔍 날짜 패턴 분석:');
    const datePatterns = {};
    
    dbVideos.forEach(video => {
      const dateStr = video.originalPublishDate.toDateString();
      if (!datePatterns[dateStr]) {
        datePatterns[dateStr] = 0;
      }
      datePatterns[dateStr]++;
    });
    
    const sortedDates = Object.entries(datePatterns)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));
    
    console.log('   날짜별 분포 (최근 10개):');
    sortedDates.slice(-10).forEach(([date, count]) => {
      console.log(`   ${date}: ${count}개`);
    });
    
    // 시트와 비교할 수 있는 정보 출력
    console.log('\n📝 시트 비교를 위한 정보:');
    console.log('1. YouTube 레코드들:');
    const youtubeVideos = dbVideos.filter(v => v.platform === 'youtube');
    youtubeVideos.forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.originalUrl}`);
      console.log(`      DB 원본 게시일: ${video.originalPublishDate.toLocaleString()}`);
    });
    
    console.log('\n2. Instagram 레코드들 (처음 5개만):');
    const instagramVideos = dbVideos.filter(v => v.platform === 'instagram');
    instagramVideos.slice(0, 5).forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.originalUrl}`);
      console.log(`      DB 원본 게시일: ${video.originalPublishDate.toLocaleString()}`);
    });
    
    if (instagramVideos.length > 5) {
      console.log(`   ... Instagram 총 ${instagramVideos.length}개`);
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
  }
}

simpleDataCompare();
require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');

async function checkRemainingIssues() {
  try {
    console.log('🔍 남은 문제 레코드 분석 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // 썸네일이 여전히 없는 레코드들 찾기
    const problemVideos = await Video.find({
      $or: [
        { thumbnailUrl: null },
        { thumbnailUrl: { $exists: false } }
      ]
    }).lean();
    
    console.log(`\n📊 남은 문제 레코드: ${problemVideos.length}개\n`);
    
    if (problemVideos.length > 0) {
      // 플랫폼별로 분류
      const byPlatform = problemVideos.reduce((acc, video) => {
        const platform = video.platform || 'unknown';
        if (!acc[platform]) acc[platform] = [];
        acc[platform].push(video);
        return acc;
      }, {});
      
      console.log('📋 플랫폼별 문제 레코드:');
      for (const [platform, videos] of Object.entries(byPlatform)) {
        console.log(`\n${platform.toUpperCase()}: ${videos.length}개`);
        
        videos.slice(0, 5).forEach((video, index) => {
          console.log(`  ${index + 1}. URL: ${video.originalUrl || 'N/A'}`);
          console.log(`     계정: ${video.account || 'N/A'}`);
          console.log(`     제목: ${video.title || 'N/A'}`);
          console.log(`     생성일: ${video.created_at ? video.created_at.toISOString().split('T')[0] : 'N/A'}`);
          console.log(`     _id: ${video._id}`);
          console.log('');
        });
        
        if (videos.length > 5) {
          console.log(`     ... 그리고 ${videos.length - 5}개 더\n`);
        }
      }
      
      // 문제 패턴 분석
      console.log('🔍 문제 패턴 분석:');
      const noAccount = problemVideos.filter(v => !v.account && !v.originalUrl);
      const invalidUrls = problemVideos.filter(v => {
        const url = v.originalUrl;
        return url && !url.startsWith('http');
      });
      const emptyTitles = problemVideos.filter(v => !v.title || v.title === '');
      
      console.log(`   URL 없음: ${noAccount.length}개`);
      console.log(`   잘못된 URL 형식: ${invalidUrls.length}개`);  
      console.log(`   제목 없음: ${emptyTitles.length}개`);
      
      if (noAccount.length > 0) {
        console.log('\n⚠️ URL이 없는 레코드들:');
        noAccount.slice(0, 3).forEach((video, index) => {
          console.log(`   ${index + 1}. _id: ${video._id}, title: ${video.title}, platform: ${video.platform}`);
        });
      }
      
      if (invalidUrls.length > 0) {
        console.log('\n⚠️ 잘못된 URL 형식 레코드들:');
        invalidUrls.slice(0, 3).forEach((video, index) => {
          console.log(`   ${index + 1}. URL: ${video.originalUrl}, platform: ${video.platform}`);
          console.log(`     계정: ${video.account || 'N/A'}`);
        });
      }
      
    } else {
      console.log('🎉 모든 레코드가 정상적으로 수정되었습니다!');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    
  } catch (error) {
    console.error('❌ 분석 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

// 스크립트 실행
checkRemainingIssues();
require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Video = require('../models/Video');

async function fixPlaceholderUrls() {
  try {
    console.log('🔧 Placeholder URL 수정 시작...\n');
    
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@video-analyzer.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=video-analyzer';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    
    // Base64 인코딩된 이미지들
    const instagramPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRTkxRTYzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnN0YWdyYW08L3RleHQ+PC9zdmc+';
    const tiktokPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkYwMDUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UaWtUb2s8L3RleHQ+PC9zdmc+';
    const youtubePlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkYwMDAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Zb3VUdWJlPC90ZXh0Pjwvc3ZnPg==';
    
    // Instagram placeholder URL 수정
    const instagramResult = await Video.updateMany(
      { thumbnailUrl: 'https://via.placeholder.com/300x300/E1306C/white?text=Instagram' },
      { $set: { thumbnailUrl: instagramPlaceholder } }
    );
    console.log(`📸 Instagram placeholder 수정: ${instagramResult.modifiedCount}개`);
    
    // TikTok placeholder URL 수정
    const tiktokResult = await Video.updateMany(
      { thumbnailUrl: 'https://via.placeholder.com/300x300/FF0050/white?text=TikTok' },
      { $set: { thumbnailUrl: tiktokPlaceholder } }
    );
    console.log(`🎵 TikTok placeholder 수정: ${tiktokResult.modifiedCount}개`);
    
    // YouTube placeholder URL 수정 (만약 있다면)
    const youtubeResult = await Video.updateMany(
      { thumbnailUrl: 'https://via.placeholder.com/300x300/FF0000/white?text=YouTube' },
      { $set: { thumbnailUrl: youtubePlaceholder } }
    );
    console.log(`🎬 YouTube placeholder 수정: ${youtubeResult.modifiedCount}개`);
    
    // 최종 확인
    const totalPlaceholders = await Video.countDocuments({
      thumbnailUrl: { $regex: /via\.placeholder\.com/ }
    });
    
    console.log(`\n📊 수정 결과:`);
    console.log(`   Instagram: ${instagramResult.modifiedCount}개`);
    console.log(`   TikTok: ${tiktokResult.modifiedCount}개`);
    console.log(`   YouTube: ${youtubeResult.modifiedCount}개`);
    console.log(`   총 수정: ${instagramResult.modifiedCount + tiktokResult.modifiedCount + youtubeResult.modifiedCount}개`);
    console.log(`   남은 placeholder URL: ${totalPlaceholders}개`);
    
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
    console.log('✅ Placeholder URL 수정 완료!');
    
  } catch (error) {
    console.error('❌ 수정 실패:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

// 스크립트 실행
fixPlaceholderUrls();
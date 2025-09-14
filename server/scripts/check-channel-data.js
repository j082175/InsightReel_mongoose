/**
 * 채널 데이터 확인 스크립트
 * DB에 저장된 채널 데이터의 publishedAt, createdAt 필드 확인
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const { ServerLogger } = require('../utils/logger');

async function checkChannelData() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    ServerLogger.info('✅ MongoDB 연결 성공');

    // 모든 채널 데이터 조회
    const channels = await Channel.find({}).lean();

    ServerLogger.info(`📋 전체 채널 수: ${channels.length}개`);

    channels.forEach((channel, index) => {
      console.log(`\n--- 채널 ${index + 1}: ${channel.name} ---`);
      console.log('ID:', channel._id);
      console.log('channelId:', channel.channelId);
      console.log('platform:', channel.platform);
      console.log('createdAt:', channel.createdAt);
      console.log('publishedAt:', channel.publishedAt);
      console.log('updatedAt:', channel.updatedAt);

      // publishedAt 상태 체크
      if (channel.publishedAt) {
        const date = new Date(channel.publishedAt);
        console.log('publishedAt 한국 날짜:', date.toLocaleDateString('ko-KR'));
      } else {
        console.log('⚠️ publishedAt 없음!');
      }
    });

    // 요약 통계
    const withPublishedAt = channels.filter(c => c.publishedAt).length;
    const withoutPublishedAt = channels.length - withPublishedAt;

    console.log('\n📊 요약:');
    console.log(`✅ publishedAt 있음: ${withPublishedAt}개`);
    console.log(`⚠️ publishedAt 없음: ${withoutPublishedAt}개`);

  } catch (error) {
    ServerLogger.error('❌ 채널 데이터 확인 실패:', error);
  } finally {
    await mongoose.disconnect();
    ServerLogger.info('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
checkChannelData();
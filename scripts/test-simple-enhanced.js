/**
 * 간단한 향상된 분석 테스트 - Flash 모델만 사용
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const YouTubeChannelAnalyzer = require('../server/services/YouTubeChannelAnalyzer');
const { ServerLogger } = require('../server/utils/logger');

/**
 * 간단한 테스트
 */
async function simpleTest() {
  try {
    console.log('🔍 간단한 향상된 분석 테스트...');

    const analyzer = new YouTubeChannelAnalyzer();
    
    // 테스트용 영상 데이터
    const mockVideo = {
      title: "당구 기초 레슨 - 모아치기 연습",
      description: "당구 초보자를 위한 모아치기 기본 레슨입니다",
      tags: ["당구", "레슨", "기초"],
      durationSeconds: 180,
      viewCount: 5000
    };

    const mockComments = [
      { text: "정말 도움이 되는 레슨이네요!" },
      { text: "당구 초보자에게 딱 맞는 설명" }
    ];

    console.log('📊 개별 영상 분석 테스트...');
    const analysis = await analyzer.analyzeVideoContent(mockVideo, mockComments);
    
    console.log('✅ 분석 완료:', JSON.stringify(analysis, null, 2));

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

if (require.main === module) {
  simpleTest();
}

module.exports = { simpleTest };
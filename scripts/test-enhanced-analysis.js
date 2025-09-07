/**
 * 향상된 채널 분석 테스트 스크립트
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ChannelModel = require('../server/features/cluster/ChannelModel');
const { ServerLogger } = require('../server/utils/logger');

/**
 * 향상된 분석 테스트
 */
async function testEnhancedAnalysis(channelName) {
  try {
    console.log(`🔍 "${channelName}" 향상된 채널 분석 테스트...`);

    // ChannelModel 초기화 대기
    const model = ChannelModel.getInstance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 기존 채널 찾기
    const channels = await model.getAll();
    const channel = channels.find(ch => 
      ch.name.toLowerCase().includes(channelName.toLowerCase())
    );

    if (!channel) {
      console.log(`❌ 채널 "${channelName}"을 찾을 수 없습니다.`);
      return;
    }

    console.log(`찾은 채널: ${channel.name} (${channel.id})`);
    console.log(`숏폼 비율: ${channel.shortFormRatio}%`);
    
    if (channel.shortFormRatio < 50) {
      console.log('📊 롱폼 채널 - 향상된 분석 건너뜀');
      return;
    }

    console.log('🎬 숏폼 채널 - 향상된 분석 시작...');

    // 향상된 분석 실행
    const updatedChannel = await model.createOrUpdateWithAnalysis(
      channel.name, 
      channel.keywords || [], 
      true // 상세 분석 포함
    );

    console.log('✅ 향상된 분석 완료!');
    
    if (updatedChannel.enhancedAnalysis) {
      console.log('\n🤖 AI 분석 결과:');
      const identity = updatedChannel.enhancedAnalysis.channelIdentity;
      console.log(`주요 카테고리: ${identity.primaryCategory}`);
      console.log(`AI 태그: ${identity.channelTags.join(', ')}`);
      console.log(`채널 성격: ${identity.channelPersonality}`);
    } else {
      console.log('⚠️ 향상된 분석 데이터 없음');
    }

    return updatedChannel;

  } catch (error) {
    console.error('❌ 향상된 분석 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

// 스크립트 실행
if (require.main === module) {
  const channelName = process.argv[2] || '아이빌리';
  testEnhancedAnalysis(channelName);
}

module.exports = { testEnhancedAnalysis };
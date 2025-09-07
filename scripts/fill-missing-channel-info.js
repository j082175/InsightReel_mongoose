/**
 * 빈 채널 정보 채우기 스크립트
 * 기존 채널들의 빈 정보를 YouTube API에서 가져와서 채웁니다.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ChannelModel = require('../server/features/cluster/ChannelModel');
const { ServerLogger } = require('../server/utils/logger');

async function fillMissingChannelInfo() {
  try {
    console.log('🔧 빈 채널 정보 채우기 시작...\n');

    // ChannelModel 초기화 대기
    const model = ChannelModel.getInstance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. 현재 채널 상태 확인
    console.log('📊 현재 채널 상태 확인:');
    const stats = model.getChannelCompletionStats();
    
    console.log(`전체 채널: ${stats.total}개`);
    console.log(`완전한 정보: ${stats.complete}개`);
    console.log(`부족한 정보: ${stats.incomplete}개`);
    console.log('\n빈 필드 현황:');
    console.log(`- 설명 없음: ${stats.missingFields.description}개`);
    console.log(`- 썸네일 없음: ${stats.missingFields.thumbnailUrl}개`);
    console.log(`- 구독자 수 없음: ${stats.missingFields.subscribers}개`);
    console.log(`- 커스텀 URL 없음: ${stats.missingFields.customUrl}개`);

    if (stats.incomplete === 0) {
      console.log('\n✅ 모든 채널 정보가 완전합니다!');
      return;
    }

    console.log('\n' + '='.repeat(50));

    // 2. 빈 정보 채우기 실행
    console.log('🚀 빈 정보 채우기 시작...');
    const result = await ChannelModel.fillMissingChannelInfo();
    
    console.log('\n📊 결과:');
    console.log(`✅ 성공: ${result.updated}개`);
    console.log(`❌ 실패: ${result.failed}개`);

    // 3. 업데이트 후 상태 확인
    console.log('\n' + '='.repeat(50));
    console.log('📊 업데이트 후 채널 상태:');
    const newStats = model.getChannelCompletionStats();
    
    console.log(`전체 채널: ${newStats.total}개`);
    console.log(`완전한 정보: ${newStats.complete}개 (+${newStats.complete - stats.complete})`);
    console.log(`부족한 정보: ${newStats.incomplete}개 (-${stats.incomplete - newStats.incomplete})`);
    
    console.log('\n✅ 빈 채널 정보 채우기 완료!');

  } catch (error) {
    console.error('❌ 빈 채널 정보 채우기 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

// 현재 채널 상태만 확인하는 함수
async function checkChannelCompletionStatus() {
  try {
    console.log('📊 채널 완성도 확인...\n');

    // ChannelModel 인스턴스 생성 및 초기화 대기
    const model = ChannelModel.getInstance();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 충분한 초기화 시간
    
    const stats = model.getChannelCompletionStats(); // await 제거 (동기 메서드)
    
    console.log(`📊 채널 완성도 상태:`);
    console.log(`전체 채널: ${stats.total}개`);
    console.log(`완전한 정보: ${stats.complete}개 (${Math.round((stats.complete/stats.total)*100)}%)`);
    console.log(`부족한 정보: ${stats.incomplete}개 (${Math.round((stats.incomplete/stats.total)*100)}%)`);
    
    if (stats.incomplete > 0) {
      console.log('\n🔍 빈 필드 상세:');
      console.log(`- 설명 없음: ${stats.missingFields.description}개`);
      console.log(`- 썸네일 없음: ${stats.missingFields.thumbnailUrl}개`);
      console.log(`- 구독자 수 없음: ${stats.missingFields.subscribers}개`);
      console.log(`- 커스텀 URL 없음: ${stats.missingFields.customUrl}개`);
      
      console.log('\n💡 빈 정보를 채우려면:');
      console.log('node scripts/fill-missing-channel-info.js --fill');
    } else {
      console.log('\n✅ 모든 채널 정보가 완전합니다!');
    }

  } catch (error) {
    console.error('❌ 상태 확인 실패:', error.message);
  }
}

// 특정 채널 정보 확인
async function checkSpecificChannel(channelName) {
  try {
    console.log(`🔍 채널 "${channelName}" 정보 확인...\n`);

    const channels = await ChannelModel.getAll();
    const channel = channels.find(ch => 
      ch.name.toLowerCase().includes(channelName.toLowerCase())
    );

    if (!channel) {
      console.log(`❌ 채널 "${channelName}"을 찾을 수 없습니다.`);
      return;
    }

    console.log(`📺 채널: ${channel.name}`);
    console.log(`🆔 ID: ${channel.id}`);
    console.log(`🔗 URL: ${channel.url || 'N/A'}`);
    console.log(`👥 구독자: ${channel.subscribers || 'N/A'}명`);
    console.log(`📝 설명: ${channel.description ? '✅' : '❌'}`);
    console.log(`🖼️ 썸네일: ${channel.thumbnailUrl ? '✅' : '❌'}`);
    console.log(`🔗 커스텀 URL: ${channel.customUrl || 'N/A'}`);
    console.log(`🏷️ 키워드: ${channel.keywords?.join(', ') || 'N/A'}`);
    console.log(`🤖 AI 태그: ${channel.aiTags?.join(', ') || 'N/A'}`);

  } catch (error) {
    console.error('❌ 채널 정보 확인 실패:', error.message);
  }
}

// 스크립트 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--fill')) {
    await fillMissingChannelInfo();
  } else if (args.includes('--channel')) {
    const channelIndex = args.indexOf('--channel');
    const channelName = args[channelIndex + 1];
    if (channelName) {
      await checkSpecificChannel(channelName);
    } else {
      console.log('❌ 채널명을 지정해주세요: --channel "채널명"');
    }
  } else {
    await checkChannelCompletionStatus();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fillMissingChannelInfo,
  checkChannelCompletionStatus,
  checkSpecificChannel
};
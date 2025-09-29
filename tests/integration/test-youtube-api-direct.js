/**
 * YouTube API 직접 호출 테스트
 * MultiKeyManager의 키 전환 로직을 직접 테스트
 */

const MultiKeyManager = require('./server/utils/multi-key-manager');
const { ServerLogger } = require('./server/utils/logger');

// 색상 코드
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = '') {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${COLORS.reset}`);
}

/**
 * YouTube API 직접 호출 (channels.list)
 */
async function callYouTubeAPI(keyManager, callNumber) {
  try {
    log(`📞 YouTube API 호출 ${callNumber} 시작...`, COLORS.cyan);

    // getAvailableKey 호출하여 키 전환 확인
    const keyInfo = keyManager.getAvailableKey();
    log(`🔑 사용할 키: ${keyInfo.name}`, COLORS.blue);

    // YouTube Data API channels.list 호출 (가벼운 호출, 1 할당량)
    const axios = require('axios');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', // MrBeast 채널 ID
        key: keyInfo.key
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      log(`✅ API 호출 ${callNumber} 성공 - 채널: ${channel.snippet.title}`, COLORS.green);

      // 사용량 추적
      keyManager.trackAPI(keyInfo.key, 'youtube-channels', true);

      return true;
    } else {
      log(`⚠️ API 호출 ${callNumber} - 데이터 없음`, COLORS.yellow);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 403) {
      log(`🚨 API 호출 ${callNumber} - 할당량 초과!`, COLORS.red);
      log(`Error: ${error.response.data.error.message}`, COLORS.red);
    } else {
      log(`❌ API 호출 ${callNumber} 에러: ${error.message}`, COLORS.red);
    }
    return false;
  }
}

/**
 * 키 전환 테스트
 */
async function testKeySwitch() {
  console.log('');
  log('='.repeat(60), COLORS.bright);
  log('🔄 YouTube API 키 전환 직접 테스트', COLORS.bright + COLORS.magenta);
  log('설정: SAFETY_MARGIN=5, MultiKeyManager 직접 호출', COLORS.bright);
  log('='.repeat(60), COLORS.bright);
  console.log('');

  try {
    // MultiKeyManager 초기화
    log('🔧 MultiKeyManager 초기화 중...', COLORS.blue);
    const keyManager = await MultiKeyManager.getInstance();

    // 초기 상태 확인
    log('📊 초기 키 사용량 상태:', COLORS.cyan);
    keyManager.logUsageStatus();
    console.log('');

    // 15회 연속 호출하여 키 전환 테스트
    for (let i = 1; i <= 15; i++) {
      log(`----- 호출 ${i} -----`, COLORS.bright);

      await callYouTubeAPI(keyManager, i);

      // 각 호출 후 사용량 확인
      if (i % 5 === 0) {
        console.log('');
        log(`📊 ${i}회 호출 후 키 사용량 상태:`, COLORS.cyan);
        keyManager.logUsageStatus();
        console.log('');
      }

      // 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('');
    log('='.repeat(60), COLORS.bright);
    log('🎯 테스트 완료!', COLORS.bright + COLORS.green);
    log('📊 최종 키 사용량 상태:', COLORS.cyan);
    keyManager.logUsageStatus();
    log('='.repeat(60), COLORS.bright);

  } catch (error) {
    log(`❌ 테스트 중 에러 발생: ${error.message}`, COLORS.red);
    console.error(error);
  }
}

// 테스트 실행
testKeySwitch().catch(error => {
  log(`테스트 실행 중 오류: ${error}`, COLORS.red);
  process.exit(1);
});
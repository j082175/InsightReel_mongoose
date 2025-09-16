/**
 * YouTube API 키 3개 순차 전환 테스트
 * 할당량을 5로 설정하고, 키가 3개 있을 때 순차적으로 전환되는지 확인
 */

const axios = require('axios');
const { ServerLogger } = require('./server/utils/logger');

const SERVER_URL = 'http://localhost:3000';
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';

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
 * 서버 상태 확인
 */
async function checkServer() {
  try {
    const response = await axios.get(`${SERVER_URL}/health`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * API 호출 수행 (채널 정보 가져오기 - 가벼운 API 호출)
 */
async function makeApiCall(callNumber) {
  try {
    log(`📞 API 호출 ${callNumber} 실행 중...`, COLORS.cyan);

    const response = await axios.post(`${SERVER_URL}/api/channels/add-url`, {
      url: `https://www.youtube.com/@mrbeast?call=${callNumber}` // 쿼리 파라미터로 구분
    });

    if (response.data.success) {
      log(`✅ API 호출 ${callNumber} 성공`, COLORS.green);
      return true;
    } else {
      log(`⚠️ API 호출 ${callNumber} 실패: ${response.data.message}`, COLORS.yellow);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 403) {
      log(`🚨 API 호출 ${callNumber} - 할당량 초과 에러!`, COLORS.red);
    } else {
      log(`❌ API 호출 ${callNumber} 에러: ${error.message}`, COLORS.red);
    }
    return false;
  }
}

/**
 * 메인 테스트 함수
 */
async function runTripleKeySwitchTest() {
  console.log('');
  log('='.repeat(60), COLORS.bright);
  log('🔄 YouTube API 3개 키 순차 전환 테스트', COLORS.bright + COLORS.magenta);
  log('설정: SAFETY_MARGIN=5, 키 3개 사용', COLORS.bright);
  log('='.repeat(60), COLORS.bright);
  console.log('');

  // 서버 확인
  log('🔍 서버 상태 확인 중...', COLORS.blue);
  const serverReady = await checkServer();
  if (!serverReady) {
    log('❌ 서버가 실행되지 않음! 먼저 서버를 시작하세요.', COLORS.red);
    process.exit(1);
  }
  log('✅ 서버 준비 완료', COLORS.green);
  console.log('');

  // 키 전환 테스트 시나리오
  log('📋 테스트 시나리오:', COLORS.bright);
  log('  1. 첫 번째 키로 6회 API 호출 (할당량 5 초과)', COLORS.cyan);
  log('  2. 두 번째 키로 자동 전환 확인', COLORS.cyan);
  log('  3. 두 번째 키로 6회 더 호출 (할당량 5 초과)', COLORS.cyan);
  log('  4. 세 번째 키로 자동 전환 확인', COLORS.cyan);
  log('  5. 세 번째 키로 추가 호출', COLORS.cyan);
  console.log('');

  log('-'.repeat(60), COLORS.bright);
  log('🔑 Phase 1: 첫 번째 키 테스트 (API Key 1)', COLORS.bright + COLORS.yellow);
  log('-'.repeat(60), COLORS.bright);

  // 첫 번째 키로 6회 호출
  for (let i = 1; i <= 6; i++) {
    await makeApiCall(i);
    if (i === 5) {
      log('⚠️ 키 1 할당량 도달 (5/5) - 다음 호출에서 키 전환 예상', COLORS.yellow);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  log('-'.repeat(60), COLORS.bright);
  log('🔑 Phase 2: 두 번째 키 테스트 (API Key 2)', COLORS.bright + COLORS.yellow);
  log('-'.repeat(60), COLORS.bright);

  // 두 번째 키로 6회 호출
  for (let i = 7; i <= 12; i++) {
    await makeApiCall(i);
    if (i === 11) {
      log('⚠️ 키 2 할당량 도달 (5/5) - 다음 호출에서 키 전환 예상', COLORS.yellow);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  log('-'.repeat(60), COLORS.bright);
  log('🔑 Phase 3: 세 번째 키 테스트 (API Key 3)', COLORS.bright + COLORS.yellow);
  log('-'.repeat(60), COLORS.bright);

  // 세 번째 키로 3회 호출
  for (let i = 13; i <= 15; i++) {
    await makeApiCall(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  log('='.repeat(60), COLORS.bright);
  log('🎯 테스트 완료!', COLORS.bright + COLORS.green);
  log('결과: 3개 키가 순차적으로 전환되는지 서버 로그를 확인하세요', COLORS.bright);
  log('='.repeat(60), COLORS.bright);
  console.log('');

  log('💡 서버 로그에서 다음을 확인하세요:', COLORS.cyan);
  log('  1. "키 X 안전 마진 초과" 메시지', COLORS.cyan);
  log('  2. "사용 가능한 키 발견: API Key Y" 메시지', COLORS.cyan);
  log('  3. 키 전환 순서: Key 1 → Key 2 → Key 3', COLORS.cyan);
}

// 테스트 실행
runTripleKeySwitchTest().catch(error => {
  log(`테스트 실행 중 오류: ${error}`, COLORS.red);
  process.exit(1);
});
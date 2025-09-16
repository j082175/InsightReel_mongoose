/**
 * 비디오 처리를 통한 YouTube API 키 전환 테스트
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

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

// 테스트용 YouTube 비디오 URL들 (다양한 채널의 비디오)
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=QH2-TGUlwu4',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=tgbNymZ7vqY',
  'https://www.youtube.com/watch?v=MtN1YnoL46Q',
  'https://www.youtube.com/watch?v=FTQbiNvZqaY',
  'https://www.youtube.com/watch?v=YQHsXMglC9A',
  'https://www.youtube.com/watch?v=A7ry4cx6HfY',
  'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
  'https://www.youtube.com/watch?v=0E00Zuayv9Q',
  'https://www.youtube.com/watch?v=hqbS7O9qIXE'
];

/**
 * 비디오 처리 API 호출
 */
async function processVideo(url, callNumber) {
  try {
    log(`📞 비디오 처리 ${callNumber} 실행 중: ${url}`, COLORS.cyan);

    const response = await axios.post(`${SERVER_URL}/api/process-video`, {
      url: url
    }, {
      timeout: 30000
    });

    if (response.data.success) {
      log(`✅ 비디오 처리 ${callNumber} 성공`, COLORS.green);
      return true;
    } else {
      log(`⚠️ 비디오 처리 ${callNumber} 실패: ${response.data.message}`, COLORS.yellow);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 429) {
      log(`🚨 비디오 처리 ${callNumber} - 할당량 초과!`, COLORS.red);
    } else if (error.code === 'ECONNABORTED') {
      log(`⏱️ 비디오 처리 ${callNumber} - 타임아웃`, COLORS.yellow);
    } else {
      log(`❌ 비디오 처리 ${callNumber} 에러: ${error.message}`, COLORS.red);
    }
    return false;
  }
}

/**
 * 메인 테스트 함수
 */
async function runVideoProcessingTest() {
  console.log('');
  log('='.repeat(60), COLORS.bright);
  log('🎬 비디오 처리를 통한 키 전환 테스트', COLORS.bright + COLORS.magenta);
  log('설정: SAFETY_MARGIN=5, 키 3개 사용', COLORS.bright);
  log('='.repeat(60), COLORS.bright);
  console.log('');

  // 15개 비디오 순차 처리
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const callNumber = i + 1;
    const videoUrl = TEST_VIDEOS[i];

    await processVideo(videoUrl, callNumber);

    // 키 전환 예상 지점에서 안내 메시지
    if (callNumber === 5) {
      log('⚠️ 키 1 할당량 도달 예상 - 다음 호출에서 키 전환 예상', COLORS.yellow);
    } else if (callNumber === 10) {
      log('⚠️ 키 2 할당량 도달 예상 - 다음 호출에서 키 전환 예상', COLORS.yellow);
    }

    // 각 호출 사이에 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  log('='.repeat(60), COLORS.bright);
  log('🎯 비디오 처리 테스트 완료!', COLORS.bright + COLORS.green);
  log('서버 로그에서 키 전환 메시지를 확인하세요', COLORS.bright);
  log('='.repeat(60), COLORS.bright);
}

// 테스트 실행
runVideoProcessingTest().catch(error => {
  log(`테스트 실행 중 오류: ${error}`, COLORS.red);
  process.exit(1);
});
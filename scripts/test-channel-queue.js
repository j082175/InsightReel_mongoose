/**
 * 채널 분석 큐 시스템 테스트 스크립트
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/channel-queue';

/**
 * 채널 분석 작업 추가 테스트
 */
async function testAddJob() {
  try {
    console.log('📋 채널 분석 작업 추가 테스트...');

    const response = await axios.post(`${API_BASE}/add`, {
      channelIdentifier: "테스트게임채널",
      keywords: ["게임", "실황"],
      options: {
        includeAnalysis: true,
        priority: "normal"
      }
    });

    console.log('✅ 작업 추가 성공:', response.data);
    return response.data.jobId;

  } catch (error) {
    console.error('❌ 작업 추가 실패:', error.response?.data || error.message);
  }
}

/**
 * 작업 상태 조회 테스트
 */
async function testJobStatus(jobId) {
  try {
    console.log(`🔍 작업 상태 조회: ${jobId}`);

    const response = await axios.get(`${API_BASE}/job/${jobId}`);
    console.log('✅ 작업 상태:', response.data.job);

  } catch (error) {
    console.error('❌ 작업 상태 조회 실패:', error.response?.data || error.message);
  }
}

/**
 * 큐 상태 조회 테스트
 */
async function testQueueStatus() {
  try {
    console.log('📊 큐 상태 조회...');

    const response = await axios.get(`${API_BASE}/status`);
    console.log('✅ 큐 상태:', response.data.queue);

  } catch (error) {
    console.error('❌ 큐 상태 조회 실패:', error.response?.data || error.message);
  }
}

/**
 * 모든 작업 목록 조회 테스트
 */
async function testAllJobs() {
  try {
    console.log('📝 모든 작업 목록 조회...');

    const response = await axios.get(`${API_BASE}/jobs`);
    console.log('✅ 작업 목록 (최근 5개):');
    
    response.data.jobs.slice(0, 5).forEach((job, index) => {
      console.log(`  ${index + 1}. [${job.status}] ${job.channelIdentifier} (${job.id})`);
      console.log(`     생성: ${new Date(job.createdAt).toLocaleString()}`);
      if (job.progress) {
        console.log(`     진행: ${job.progress.current}% - ${job.progress.message}`);
      }
    });

  } catch (error) {
    console.error('❌ 작업 목록 조회 실패:', error.response?.data || error.message);
  }
}

/**
 * 여러 채널 동시 등록 테스트
 */
async function testMultipleChannels() {
  try {
    console.log('🔄 여러 채널 동시 등록 테스트...');

    const channels = [
      { name: "당구개론", keywords: ["당구", "3쿠션"] },
      { name: "아이빌리", keywords: ["당구", "레슨"] },
      { name: "테스트채널", keywords: ["테스트"] }
    ];

    const jobPromises = channels.map(channel => 
      axios.post(`${API_BASE}/add`, {
        channelIdentifier: channel.name,
        keywords: channel.keywords,
        options: { includeAnalysis: true }
      })
    );

    const results = await Promise.all(jobPromises);
    const jobIds = results.map(res => res.data.jobId);

    console.log('✅ 모든 작업 등록 완료:', jobIds);

    // 5초 후 상태 확인
    setTimeout(async () => {
      console.log('\n📊 5초 후 상태 확인:');
      await testQueueStatus();
    }, 5000);

    return jobIds;

  } catch (error) {
    console.error('❌ 다중 채널 등록 실패:', error.response?.data || error.message);
  }
}

/**
 * 작업 모니터링 (실시간)
 */
async function monitorJobs(jobIds, duration = 60000) {
  console.log(`👀 작업 모니터링 시작 (${duration/1000}초)...`);
  
  const startTime = Date.now();
  const interval = setInterval(async () => {
    try {
      console.log('\n--- 현재 상태 ---');
      await testQueueStatus();
      
      // 각 작업 상태 확인
      for (const jobId of jobIds) {
        try {
          const response = await axios.get(`${API_BASE}/job/${jobId}`);
          const job = response.data.job;
          console.log(`[${job.status}] ${job.channelIdentifier}: ${job.progress?.current || 0}% - ${job.progress?.message || 'N/A'}`);
        } catch (err) {
          console.log(`[ERROR] ${jobId}: 상태 조회 실패`);
        }
      }
      
      if (Date.now() - startTime > duration) {
        clearInterval(interval);
        console.log('\n✅ 모니터링 종료');
      }
      
    } catch (error) {
      console.error('❌ 모니터링 오류:', error.message);
    }
  }, 5000); // 5초마다 확인
}

/**
 * 메인 테스트 실행
 */
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 채널 분석 큐 시스템 테스트 시작\n');

  if (args.includes('--add')) {
    const jobId = await testAddJob();
    if (jobId) {
      setTimeout(() => testJobStatus(jobId), 2000);
    }
  }
  else if (args.includes('--status')) {
    await testQueueStatus();
  }
  else if (args.includes('--jobs')) {
    await testAllJobs();
  }
  else if (args.includes('--multi')) {
    const jobIds = await testMultipleChannels();
    if (jobIds && jobIds.length > 0) {
      setTimeout(() => monitorJobs(jobIds, 120000), 3000); // 2분 모니터링
    }
  }
  else {
    console.log('사용법:');
    console.log('  --add     : 단일 작업 추가 테스트');
    console.log('  --status  : 큐 상태 조회');
    console.log('  --jobs    : 모든 작업 목록 조회');
    console.log('  --multi   : 다중 채널 등록 + 모니터링 테스트');
    console.log('');
    console.log('예시:');
    console.log('  node scripts/test-channel-queue.js --multi');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testAddJob,
  testJobStatus,
  testQueueStatus,
  testAllJobs,
  testMultipleChannels,
  monitorJobs
};
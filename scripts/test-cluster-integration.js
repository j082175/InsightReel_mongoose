/**
 * 🧪 클러스터 시스템 통합 테스트
 * 실제 API 호출로 기능 검증
 */
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

class ClusterTester {
  async runTests() {
    console.log('🔍 클러스터 시스템 통합 테스트 시작...\n');
    
    try {
      // 1. 헬스 체크
      await this.testHealthCheck();
      
      // 2. 테스트 채널 데이터로 수집 테스트
      await this.testChannelCollection();
      
      // 3. 키워드 조회 테스트
      await this.testRecentKeywords();
      
      // 4. 채널 목록 조회
      await this.testChannelsList();
      
      // 5. 클러스터 목록 조회
      await this.testClustersList();
      
      // 6. 통계 조회
      await this.testStatistics();
      
      console.log('✅ 모든 테스트 통과!');
      
    } catch (error) {
      console.error('❌ 테스트 실패:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 서버가 실행되지 않은 것 같습니다. 먼저 서버를 시작해주세요:');
        console.log('   node server/index.js');
      }
    }
  }

  async testHealthCheck() {
    console.log('🏥 헬스 체크 테스트...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/cluster/health`);
      console.log('✅ 헬스 체크 성공:', response.data.status);
      console.log('📊 데이터:', response.data.data);
    } catch (error) {
      throw new Error(`헬스 체크 실패: ${error.message}`);
    }
    console.log('');
  }

  async testChannelCollection() {
    console.log('📊 채널 수집 테스트...');
    
    const testChannelData = {
      channelData: {
        id: 'UC_test_12345',
        name: '테스트 게임 채널',
        url: 'https://youtube.com/@testgamer',
        platform: 'youtube',
        subscribers: 50000,
        description: '재미있는 게임 실황과 리뷰를 제공합니다',
        thumbnailUrl: 'https://example.com/thumb.jpg'
      },
      keywords: ['게임', '실황', '리뷰', 'RPG']
    };

    try {
      const response = await axios.post(`${SERVER_URL}/api/cluster/collect-channel`, testChannelData);
      console.log('✅ 채널 수집 성공:', response.data.success);
      
      if (response.data.suggestions) {
        console.log('💡 클러스터 제안:', response.data.suggestions.length, '개');
        response.data.suggestions.forEach((suggestion, i) => {
          console.log(`   ${i+1}. ${suggestion.cluster?.name || '새 클러스터'} (점수: ${suggestion.score})`);
        });
      }
    } catch (error) {
      throw new Error(`채널 수집 실패: ${error.message}`);
    }
    console.log('');
  }

  async testRecentKeywords() {
    console.log('🏷️ 최근 키워드 조회 테스트...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/cluster/recent-keywords?limit=5`);
      console.log('✅ 키워드 조회 성공:', response.data.keywords.length, '개');
      response.data.keywords.forEach(keyword => {
        console.log(`   - ${keyword.keyword} (${keyword.frequency}회)`);
      });
    } catch (error) {
      throw new Error(`키워드 조회 실패: ${error.message}`);
    }
    console.log('');
  }

  async testChannelsList() {
    console.log('📋 채널 목록 조회 테스트...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/cluster/channels?limit=10`);
      console.log('✅ 채널 목록 조회 성공:', response.data.count, '개');
      response.data.channels.forEach((channel, i) => {
        console.log(`   ${i+1}. ${channel.name} (${channel.platform})`);
      });
    } catch (error) {
      throw new Error(`채널 목록 조회 실패: ${error.message}`);
    }
    console.log('');
  }

  async testClustersList() {
    console.log('🎯 클러스터 목록 조회 테스트...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/cluster/clusters`);
      console.log('✅ 클러스터 목록 조회 성공:', response.data.count, '개');
      response.data.clusters.forEach((cluster, i) => {
        console.log(`   ${i+1}. ${cluster.name} (채널 ${cluster.channelCount}개)`);
      });
    } catch (error) {
      throw new Error(`클러스터 목록 조회 실패: ${error.message}`);
    }
    console.log('');
  }

  async testStatistics() {
    console.log('📈 통계 조회 테스트...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/cluster/statistics`);
      console.log('✅ 통계 조회 성공');
      console.log('📊 전체 통계:');
      console.log(`   - 총 채널: ${response.data.statistics.totalChannels}개`);
      console.log(`   - 총 클러스터: ${response.data.statistics.clusters?.total || 0}개`);
      
      if (response.data.statistics.topKeywords?.length > 0) {
        console.log('🏷️ 인기 키워드:');
        response.data.statistics.topKeywords.slice(0, 5).forEach((item, i) => {
          console.log(`   ${i+1}. ${item.keyword} (${item.count}회)`);
        });
      }
    } catch (error) {
      throw new Error(`통계 조회 실패: ${error.message}`);
    }
    console.log('');
  }
}

// 테스트 실행
const tester = new ClusterTester();
tester.runTests().then(() => {
  console.log('🎉 테스트 완료!');
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
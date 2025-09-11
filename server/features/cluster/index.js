/**
 * 📊 채널 클러스터 시스템 - 메인 Export
 * 모든 클러스터 관련 기능을 통합 관리
 */

// 핵심 서비스들
const ClusterManager = require('./ClusterManager');
const TagExtractor = require('./TagExtractor');
const SimilarityCalculator = require('./SimilarityCalculator');

// 모델들
const ChannelAnalysisService = require('./ChannelAnalysisService');
const ClusterModel = require('./ClusterModel');

// 라우터
const clusterRoutes = require('./clusterRoutes');

// 로깅
const { ServerLogger } = require('../../utils/logger');

/**
 * 🚀 클러스터 시스템 초기화 함수
 */
function initializeClusterSystem(app) {
  try {
    // API 라우트 등록
    app.use('/api/cluster', clusterRoutes);
    
    ServerLogger.success('✅ 채널 클러스터 시스템 초기화 완료');
    return true;
  } catch (error) {
    ServerLogger.error('❌ 클러스터 시스템 초기화 실패', error);
    return false;
  }
}

/**
 * 📊 클러스터 시스템 상태 체크
 */
function getClusterSystemStatus() {
  return {
    name: '채널 클러스터 시스템',
    version: '1.0.0',
    status: 'active',
    features: [
      '채널 수집',
      '키워드 태깅',
      'AI 클러스터링',
      '유사도 계산',
      '자동 학습'
    ]
  };
}

// Export
module.exports = {
  ClusterManager,
  TagExtractor,
  SimilarityCalculator,
  ChannelAnalysisService,
  ClusterModel,
  clusterRoutes,
  initializeClusterSystem,
  getClusterSystemStatus
};
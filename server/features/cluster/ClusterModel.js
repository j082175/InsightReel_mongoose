const fs = require('fs').promises;
const path = require('path');
const { ServerLogger } = require('../../utils/logger');
const { FieldMapper } = require('../../types/field-mapper');

/**
 * 🎯 클러스터 모델
 * 채널 그룹(클러스터) 데이터를 관리
 */
class ClusterModel {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data');
    this.clustersFile = path.join(this.dataPath, 'clusters.json');
    this.clusters = new Map();
    
    this.initialize();
  }

  /**
   * 🚀 초기화
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.loadClusters();
      
      ServerLogger.success('✅ ClusterModel 초기화 완료', {
        clusterCount: this.clusters.size
      });
    } catch (error) {
      ServerLogger.error('❌ ClusterModel 초기화 실패', error);
      throw error;
    }
  }

  /**
   * 📚 클러스터 데이터 로드
   */
  async loadClusters() {
    try {
      const data = await fs.readFile(this.clustersFile, 'utf8');
      const clustersArray = JSON.parse(data);
      
      clustersArray.forEach(cluster => {
        this.clusters.set(cluster[FieldMapper.get('ID')], cluster);
      });
      
      ServerLogger.info('📚 클러스터 데이터 로드 완료', {
        count: this.clusters.size
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        ServerLogger.info('📝 새로운 클러스터 데이터 파일 생성');
        await this.saveClusters();
      } else {
        throw error;
      }
    }
  }

  /**
   * 💾 클러스터 데이터 저장
   */
  async saveClusters() {
    try {
      const clustersArray = Array.from(this.clusters.values());
      await fs.writeFile(
        this.clustersFile, 
        JSON.stringify(clustersArray, null, 2), 
        'utf8'
      );
      
      ServerLogger.debug('💾 클러스터 데이터 저장 완료', {
        count: clustersArray.length
      });
    } catch (error) {
      ServerLogger.error('❌ 클러스터 데이터 저장 실패', error);
      throw error;
    }
  }

  /**
   * 🆕 클러스터 생성
   */
  async create(clusterData) {
    try {
      const cluster = {
        [FieldMapper.get('ID')]: clusterData[FieldMapper.get('ID')] || this.generateClusterId(),
        [FieldMapper.get('NAME')]: clusterData[FieldMapper.get('NAME')],
        [FieldMapper.get('DESCRIPTION')]: clusterData[FieldMapper.get('DESCRIPTION')] || '',
        
        // 태그 정보
        [FieldMapper.get('COMMON_TAGS')]: clusterData[FieldMapper.get('COMMON_TAGS')] || [],
        [FieldMapper.get('KEYWORD_PATTERNS')]: clusterData[FieldMapper.get('KEYWORD_PATTERNS')] || [],
        
        // 채널 정보
        [FieldMapper.get('CHANNEL_IDS')]: clusterData[FieldMapper.get('CHANNEL_IDS')] || [],
        [FieldMapper.get('CHANNEL_COUNT')]: 0,
        
        // 통계
        [FieldMapper.get('TOTAL_SUBSCRIBERS')]: 0,
        [FieldMapper.get('AVG_SUBSCRIBERS')]: 0,
        [FieldMapper.get('AVG_CHANNEL_SIZE')]: 0,
        
        // 설정
        [FieldMapper.get('AUTO_ADD')]: clusterData[FieldMapper.get('AUTO_ADD')] || false,        // 자동 추가 허용
        [FieldMapper.get('THRESHOLD')]: clusterData[FieldMapper.get('THRESHOLD')] || 0.6,      // 자동 추가 임계값
        [FieldMapper.get('COLOR')]: clusterData[FieldMapper.get('COLOR')] || '#007bff',        // UI 색상
        
        // 메타데이터
        [FieldMapper.get('CREATED_BY')]: clusterData[FieldMapper.get('CREATED_BY')] || 'user',   // user or ai
        [FieldMapper.get('CREATED_AT')]: new Date(),
        [FieldMapper.get('UPDATED_AT')]: new Date(),
        [FieldMapper.get('IS_ACTIVE')]: true,
        [FieldMapper.get('VERSION')]: 1
      };

      this.clusters.set(cluster[FieldMapper.get('ID')], cluster);
      await this.saveClusters();

      ServerLogger.info('🆕 새 클러스터 생성', { 
        [FieldMapper.get('ID')]: cluster[FieldMapper.get('ID')], 
        [FieldMapper.get('NAME')]: cluster[FieldMapper.get('NAME')] 
      });

      return cluster;

    } catch (error) {
      ServerLogger.error('❌ 클러스터 생성 실패', error);
      throw error;
    }
  }

  /**
   * 🔄 클러스터 업데이트
   */
  async update(clusterId, updateData) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`클러스터를 찾을 수 없습니다: ${clusterId}`);
    }

    // 업데이트 가능한 필드들
    const updatableFields = [
      FieldMapper.get('NAME'), FieldMapper.get('DESCRIPTION'), FieldMapper.get('COMMON_TAGS'), FieldMapper.get('KEYWORD_PATTERNS'),
      FieldMapper.get('AUTO_ADD'), FieldMapper.get('THRESHOLD'), FieldMapper.get('COLOR'), FieldMapper.get('IS_ACTIVE')
    ];

    updatableFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        cluster[field] = updateData[field];
      }
    });

    cluster[FieldMapper.get('UPDATED_AT')] = new Date();
    cluster[FieldMapper.get('VERSION')]++;

    await this.saveClusters();

    ServerLogger.info('🔄 클러스터 업데이트', { 
      id: clusterId, 
      [FieldMapper.get('NAME')]: cluster[FieldMapper.get('NAME')] 
    });

    return cluster;
  }

  /**
   * 🔍 클러스터 조회
   */
  async findById(clusterId) {
    return this.clusters.get(clusterId) || null;
  }

  /**
   * 📊 전체 클러스터 조회
   */
  async getAll() {
    return Array.from(this.clusters.values());
  }

  /**
   * ✅ 활성 클러스터만 조회
   */
  async getAllActive() {
    const clusters = Array.from(this.clusters.values());
    return clusters.filter(cluster => cluster[FieldMapper.get('IS_ACTIVE')]);
  }

  /**
   * 📊 전체 클러스터 수
   */
  async getTotalCount() {
    return this.clusters.size;
  }

  /**
   * 🔍 이름으로 클러스터 검색
   */
  async findByName(name) {
    const results = [];
    for (const cluster of this.clusters.values()) {
      if (cluster[FieldMapper.get('NAME')].toLowerCase().includes(name.toLowerCase())) {
        results.push(cluster);
      }
    }
    return results;
  }

  /**
   * 🏷️ 태그로 클러스터 검색
   */
  async findByTag(tag) {
    const results = [];
    for (const cluster of this.clusters.values()) {
      if (cluster[FieldMapper.get('COMMON_TAGS')].some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
        results.push(cluster);
      }
    }
    return results;
  }

  /**
   * ➕ 클러스터에 채널 추가
   */
  async addChannel(clusterId, channelId) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`클러스터를 찾을 수 없습니다: ${clusterId}`);
    }

    if (!cluster[FieldMapper.get('CHANNEL_IDS')].includes(channelId)) {
      cluster[FieldMapper.get('CHANNEL_IDS')].push(channelId);
      cluster[FieldMapper.get('CHANNEL_COUNT')] = cluster[FieldMapper.get('CHANNEL_IDS')].length;
      cluster[FieldMapper.get('UPDATED_AT')] = new Date();
      
      await this.saveClusters();
      
      ServerLogger.info('➕ 클러스터에 채널 추가', { 
        clusterId, 
        channelId,
        totalChannels: cluster[FieldMapper.get('CHANNEL_COUNT')]
      });
    }

    return cluster;
  }

  /**
   * ➖ 클러스터에서 채널 제거
   */
  async removeChannel(clusterId, channelId) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new Error(`클러스터를 찾을 수 없습니다: ${clusterId}`);
    }

    cluster[FieldMapper.get('CHANNEL_IDS')] = cluster[FieldMapper.get('CHANNEL_IDS')].filter(id => id !== channelId);
    cluster[FieldMapper.get('CHANNEL_COUNT')] = cluster[FieldMapper.get('CHANNEL_IDS')].length;
    cluster[FieldMapper.get('UPDATED_AT')] = new Date();

    await this.saveClusters();

    ServerLogger.info('➖ 클러스터에서 채널 제거', { 
      clusterId, 
      channelId,
      totalChannels: cluster[FieldMapper.get('CHANNEL_COUNT')]
    });

    return cluster;
  }

  /**
   * 📊 클러스터 통계 업데이트
   */
  async updateStatistics(clusterId, channels) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;

    const channelData = channels.filter(ch => 
      cluster[FieldMapper.get('CHANNEL_IDS')].includes(ch[FieldMapper.get('ID')])
    );

    if (channelData.length === 0) {
      cluster[FieldMapper.get('TOTAL_SUBSCRIBERS')] = 0;
      cluster[FieldMapper.get('AVG_SUBSCRIBERS')] = 0;
      cluster[FieldMapper.get('AVG_CHANNEL_SIZE')] = 0;
    } else {
      cluster[FieldMapper.get('TOTAL_SUBSCRIBERS')] = channelData.reduce((sum, ch) => sum + (ch[FieldMapper.get('SUBSCRIBERS')] || 0), 0);
      cluster[FieldMapper.get('AVG_SUBSCRIBERS')] = Math.round(cluster[FieldMapper.get('TOTAL_SUBSCRIBERS')] / channelData.length);
      cluster[FieldMapper.get('AVG_CHANNEL_SIZE')] = Math.round(
        channelData.reduce((sum, ch) => sum + (ch.videoCount || 0), 0) / channelData.length
      );
    }

    cluster[FieldMapper.get('CHANNEL_COUNT')] = channelData.length;
    cluster[FieldMapper.get('UPDATED_AT')] = new Date();

    await this.saveClusters();

    return cluster;
  }

  /**
   * 🗑️ 클러스터 삭제
   */
  async delete(clusterId) {
    if (this.clusters.has(clusterId)) {
      const cluster = this.clusters.get(clusterId);
      this.clusters.delete(clusterId);
      await this.saveClusters();
      
      ServerLogger.info('🗑️ 클러스터 삭제', { 
        id: clusterId, 
        [FieldMapper.get('NAME')]: cluster[FieldMapper.get('NAME')] 
      });
      
      return true;
    }
    return false;
  }

  /**
   * 🔗 클러스터 병합
   */
  async merge(sourceClusterId, targetClusterId, newName = null) {
    const sourceCluster = this.clusters.get(sourceClusterId);
    const targetCluster = this.clusters.get(targetClusterId);

    if (!sourceCluster || !targetCluster) {
      throw new Error('병합할 클러스터를 찾을 수 없습니다');
    }

    // 채널 병합
    targetCluster[FieldMapper.get('CHANNEL_IDS')] = [
      ...new Set([...targetCluster[FieldMapper.get('CHANNEL_IDS')], ...sourceCluster[FieldMapper.get('CHANNEL_IDS')]])
    ];

    // 태그 병합
    targetCluster[FieldMapper.get('COMMON_TAGS')] = [
      ...new Set([...targetCluster[FieldMapper.get('COMMON_TAGS')], ...sourceCluster[FieldMapper.get('COMMON_TAGS')]])
    ];

    // 이름 변경 (옵션)
    if (newName) {
      targetCluster[FieldMapper.get('NAME')] = newName;
    }

    targetCluster[FieldMapper.get('CHANNEL_COUNT')] = targetCluster[FieldMapper.get('CHANNEL_IDS')].length;
    targetCluster[FieldMapper.get('UPDATED_AT')] = new Date();
    targetCluster[FieldMapper.get('VERSION')]++;

    // 소스 클러스터 삭제
    this.clusters.delete(sourceClusterId);

    await this.saveClusters();

    ServerLogger.info('🔗 클러스터 병합 완료', { 
      source: sourceCluster[FieldMapper.get('NAME')],
      target: targetCluster[FieldMapper.get('NAME')],
      totalChannels: targetCluster[FieldMapper.get('CHANNEL_COUNT')]
    });

    return targetCluster;
  }

  /**
   * ✂️ 클러스터 분할
   */
  async split(clusterId, channelIdsForNewCluster, newClusterName) {
    const originalCluster = this.clusters.get(clusterId);
    if (!originalCluster) {
      throw new Error(`클러스터를 찾을 수 없습니다: ${clusterId}`);
    }

    // 새 클러스터 생성
    const newCluster = await this.create({
      [FieldMapper.get('NAME')]: newClusterName,
      [FieldMapper.get('CHANNEL_IDS')]: channelIdsForNewCluster,
      [FieldMapper.get('COMMON_TAGS')]: [...originalCluster[FieldMapper.get('COMMON_TAGS')]],
      [FieldMapper.get('CREATED_BY')]: 'user'
    });

    // 원본 클러스터에서 채널 제거
    originalCluster[FieldMapper.get('CHANNEL_IDS')] = originalCluster[FieldMapper.get('CHANNEL_IDS')].filter(
      id => !channelIdsForNewCluster.includes(id)
    );
    originalCluster[FieldMapper.get('CHANNEL_COUNT')] = originalCluster[FieldMapper.get('CHANNEL_IDS')].length;
    originalCluster[FieldMapper.get('UPDATED_AT')] = new Date();

    await this.saveClusters();

    ServerLogger.info('✂️ 클러스터 분할 완료', { 
      original: originalCluster[FieldMapper.get('NAME')],
      new: newCluster[FieldMapper.get('NAME')],
      movedChannels: channelIdsForNewCluster.length
    });

    return { originalCluster, newCluster };
  }

  /**
   * 🎨 클러스터 색상 자동 할당
   */
  getNextAvailableColor() {
    const colors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
      '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
    ];
    
    const usedColors = Array.from(this.clusters.values()).map(c => c[FieldMapper.get('COLOR')]);
    const availableColors = colors.filter(color => !usedColors.includes(color));
    
    return availableColors.length > 0 
      ? availableColors[0] 
      : colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 🆔 클러스터 ID 생성
   */
  generateClusterId() {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🔍 고급 검색
   */
  async search(filters = {}) {
    let results = Array.from(this.clusters.values());

    // 활성 상태 필터
    if (filters.isActive !== undefined) {
      results = results.filter(cluster => cluster[FieldMapper.get('IS_ACTIVE')] === filters.isActive);
    }

    // 채널 수 범위 필터
    if (filters.minChannels) {
      results = results.filter(cluster => cluster[FieldMapper.get('CHANNEL_COUNT')] >= filters.minChannels);
    }
    if (filters.maxChannels) {
      results = results.filter(cluster => cluster[FieldMapper.get('CHANNEL_COUNT')] <= filters.maxChannels);
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(cluster => 
        filters.tags.some(tag => 
          cluster[FieldMapper.get('COMMON_TAGS')].some(clusterTag => 
            clusterTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // 생성자 필터
    if (filters.createdBy) {
      results = results.filter(cluster => cluster[FieldMapper.get('CREATED_BY')] === filters.createdBy);
    }

    // 정렬
    if (filters.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case 'channelCount':
            return b[FieldMapper.get('CHANNEL_COUNT')] - a[FieldMapper.get('CHANNEL_COUNT')];
          case 'name':
            return a[FieldMapper.get('NAME')].localeCompare(b[FieldMapper.get('NAME')]);
          case 'createdAt':
            return new Date(b[FieldMapper.get('CREATED_AT')]) - new Date(a[FieldMapper.get('CREATED_AT')]);
          case 'totalSubscribers':
            return b[FieldMapper.get('TOTAL_SUBSCRIBERS')] - a[FieldMapper.get('TOTAL_SUBSCRIBERS')];
          default:
            return 0;
        }
      });
    }

    // 제한
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * 📊 전체 통계
   */
  async getOverallStatistics() {
    const clusters = Array.from(this.clusters.values());
    const activeClusters = clusters.filter(c => c[FieldMapper.get('IS_ACTIVE')]);

    return {
      total: clusters.length,
      active: activeClusters.length,
      inactive: clusters.length - activeClusters.length,
      totalChannels: clusters.reduce((sum, c) => sum + c[FieldMapper.get('CHANNEL_COUNT')], 0),
      avgChannelsPerCluster: clusters.length > 0 
        ? Math.round(clusters.reduce((sum, c) => sum + c[FieldMapper.get('CHANNEL_COUNT')], 0) / clusters.length)
        : 0,
      largestCluster: clusters.reduce((max, c) => 
        c[FieldMapper.get('CHANNEL_COUNT')] > max[FieldMapper.get('CHANNEL_COUNT')] ? c : max, 
        { [FieldMapper.get('CHANNEL_COUNT')]: 0, [FieldMapper.get('NAME')]: 'none' }
      )
    };
  }
}

// 싱글톤 패턴
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ClusterModel();
    }
    return instance;
  },
  
  // 정적 메서드들
  create: async (data) => {
    const model = module.exports.getInstance();
    return await model.create(data);
  },
  
  findById: async (id) => {
    const model = module.exports.getInstance();
    return await model.findById(id);
  },
  
  getAll: async () => {
    const model = module.exports.getInstance();
    return await model.getAll();
  },
  
  getAllActive: async () => {
    const model = module.exports.getInstance();
    return await model.getAllActive();
  },
  
  getTotalCount: async () => {
    const model = module.exports.getInstance();
    return await model.getTotalCount();
  },
  
  search: async (filters) => {
    const model = module.exports.getInstance();
    return await model.search(filters);
  }
};
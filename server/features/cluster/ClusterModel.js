const fs = require('fs').promises;
const path = require('path');
const { ServerLogger } = require('../../utils/logger');

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
        this.clusters.set(cluster.id, cluster);
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
        id: clusterData.id || this.generateClusterId(),
        name: clusterData.name,
        description: clusterData.description || '',
        
        // 태그 정보
        commonTags: clusterData.commonTags || [],
        keywordPatterns: clusterData.keywordPatterns || [],
        
        // 채널 정보
        channelIds: clusterData.channelIds || [],
        channelCount: 0,
        
        // 통계
        totalSubscribers: 0,
        avgSubscribers: 0,
        avgChannelSize: 0,
        
        // 설정
        autoAdd: clusterData.autoAdd || false,        // 자동 추가 허용
        threshold: clusterData.threshold || 0.6,      // 자동 추가 임계값
        color: clusterData.color || '#007bff',        // UI 색상
        
        // 메타데이터
        createdBy: clusterData.createdBy || 'user',   // user or ai
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        version: 1
      };

      this.clusters.set(cluster.id, cluster);
      await this.saveClusters();

      ServerLogger.info('🆕 새 클러스터 생성', { 
        id: cluster.id, 
        name: cluster.name 
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
      'name', 'description', 'commonTags', 'keywordPatterns',
      'autoAdd', 'threshold', 'color', 'isActive'
    ];

    updatableFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        cluster[field] = updateData[field];
      }
    });

    cluster.updatedAt = new Date();
    cluster.version++;

    await this.saveClusters();

    ServerLogger.info('🔄 클러스터 업데이트', { 
      id: clusterId, 
      name: cluster.name 
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
    return clusters.filter(cluster => cluster.isActive);
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
      if (cluster.name.toLowerCase().includes(name.toLowerCase())) {
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
      if (cluster.commonTags.some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
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

    if (!cluster.channelIds.includes(channelId)) {
      cluster.channelIds.push(channelId);
      cluster.channelCount = cluster.channelIds.length;
      cluster.updatedAt = new Date();
      
      await this.saveClusters();
      
      ServerLogger.info('➕ 클러스터에 채널 추가', { 
        clusterId, 
        channelId,
        totalChannels: cluster.channelCount
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

    cluster.channelIds = cluster.channelIds.filter(id => id !== channelId);
    cluster.channelCount = cluster.channelIds.length;
    cluster.updatedAt = new Date();

    await this.saveClusters();

    ServerLogger.info('➖ 클러스터에서 채널 제거', { 
      clusterId, 
      channelId,
      totalChannels: cluster.channelCount
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
      cluster.channelIds.includes(ch.id)
    );

    if (channelData.length === 0) {
      cluster.totalSubscribers = 0;
      cluster.avgSubscribers = 0;
      cluster.avgChannelSize = 0;
    } else {
      cluster.totalSubscribers = channelData.reduce((sum, ch) => sum + (ch.subscribers || 0), 0);
      cluster.avgSubscribers = Math.round(cluster.totalSubscribers / channelData.length);
      cluster.avgChannelSize = Math.round(
        channelData.reduce((sum, ch) => sum + (ch.videoCount || 0), 0) / channelData.length
      );
    }

    cluster.channelCount = channelData.length;
    cluster.updatedAt = new Date();

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
        name: cluster.name 
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
    targetCluster.channelIds = [
      ...new Set([...targetCluster.channelIds, ...sourceCluster.channelIds])
    ];

    // 태그 병합
    targetCluster.commonTags = [
      ...new Set([...targetCluster.commonTags, ...sourceCluster.commonTags])
    ];

    // 이름 변경 (옵션)
    if (newName) {
      targetCluster.name = newName;
    }

    targetCluster.channelCount = targetCluster.channelIds.length;
    targetCluster.updatedAt = new Date();
    targetCluster.version++;

    // 소스 클러스터 삭제
    this.clusters.delete(sourceClusterId);

    await this.saveClusters();

    ServerLogger.info('🔗 클러스터 병합 완료', { 
      source: sourceCluster.name,
      target: targetCluster.name,
      totalChannels: targetCluster.channelCount
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
      name: newClusterName,
      channelIds: channelIdsForNewCluster,
      commonTags: [...originalCluster.commonTags],
      createdBy: 'user'
    });

    // 원본 클러스터에서 채널 제거
    originalCluster.channelIds = originalCluster.channelIds.filter(
      id => !channelIdsForNewCluster.includes(id)
    );
    originalCluster.channelCount = originalCluster.channelIds.length;
    originalCluster.updatedAt = new Date();

    await this.saveClusters();

    ServerLogger.info('✂️ 클러스터 분할 완료', { 
      original: originalCluster.name,
      new: newCluster.name,
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
    
    const usedColors = Array.from(this.clusters.values()).map(c => c.color);
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
      results = results.filter(cluster => cluster.isActive === filters.isActive);
    }

    // 채널 수 범위 필터
    if (filters.minChannels) {
      results = results.filter(cluster => cluster.channelCount >= filters.minChannels);
    }
    if (filters.maxChannels) {
      results = results.filter(cluster => cluster.channelCount <= filters.maxChannels);
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(cluster => 
        filters.tags.some(tag => 
          cluster.commonTags.some(clusterTag => 
            clusterTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // 생성자 필터
    if (filters.createdBy) {
      results = results.filter(cluster => cluster.createdBy === filters.createdBy);
    }

    // 정렬
    if (filters.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case 'channelCount':
            return b.channelCount - a.channelCount;
          case 'name':
            return a.name.localeCompare(b.name);
          case 'createdAt':
            return new Date(b.createdAt) - new Date(a.createdAt);
          case 'totalSubscribers':
            return b.totalSubscribers - a.totalSubscribers;
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
    const activeClusters = clusters.filter(c => c.isActive);

    return {
      total: clusters.length,
      active: activeClusters.length,
      inactive: clusters.length - activeClusters.length,
      totalChannels: clusters.reduce((sum, c) => sum + c.channelCount, 0),
      avgChannelsPerCluster: clusters.length > 0 
        ? Math.round(clusters.reduce((sum, c) => sum + c.channelCount, 0) / clusters.length)
        : 0,
      largestCluster: clusters.reduce((max, c) => 
        c.channelCount > max.channelCount ? c : max, 
        { channelCount: 0, name: 'none' }
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
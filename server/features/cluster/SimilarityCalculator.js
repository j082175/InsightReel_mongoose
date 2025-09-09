const { ServerLogger } = require('../../utils/logger');
const { FieldMapper } = require('../../types/field-mapper');

/**
 * 📊 유사도 계산기
 * 채널간, 태그간 유사도를 다양한 방법으로 계산
 */
class SimilarityCalculator {
  constructor() {
    ServerLogger.info('📊 SimilarityCalculator 초기화');
  }

  /**
   * 🏷️ 태그 기반 유사도 계산 (Jaccard 유사도)
   */
  calculateTagSimilarity(tags1, tags2) {
    if (!Array.isArray(tags1) || !Array.isArray(tags2)) {
      return 0;
    }

    if (tags1.length === 0 && tags2.length === 0) {
      return 1; // 둘 다 빈 배열이면 100% 유사
    }

    if (tags1.length === 0 || tags2.length === 0) {
      return 0; // 한쪽이 비어있으면 0% 유사
    }

    // 정규화 (소문자 변환, 공백 제거)
    const normalizedTags1 = tags1.map(tag => tag.toLowerCase().trim());
    const normalizedTags2 = tags2.map(tag => tag.toLowerCase().trim());

    // 교집합과 합집합 계산
    const intersection = normalizedTags1.filter(tag => 
      normalizedTags2.includes(tag)
    );
    
    const union = [...new Set([...normalizedTags1, ...normalizedTags2])];

    // Jaccard 유사도: |교집합| / |합집합|
    const similarity = intersection.length / union.length;

    return Math.round(similarity * 100) / 100; // 소수점 2자리
  }

  /**
   * 📊 가중치 기반 유사도 계산
   */
  calculateWeightedSimilarity(channel1, channel2, weights = {}) {
    const defaultWeights = {
      tags: 0.6,           // 태그 유사도 60%
      subscribers: 0.2,     // 구독자 규모 20%
      platform: 0.1,       // 플랫폼 10%
      description: 0.1      // 설명 유사도 10%
    };

    const finalWeights = { ...defaultWeights, ...weights };
    let totalSimilarity = 0;

    // 1. 태그 유사도
    const tagSimilarity = this.calculateTagSimilarity(
      channel1.allTags || [],
      channel2.allTags || []
    );
    totalSimilarity += tagSimilarity * finalWeights.tags;

    // 2. 구독자 규모 유사도
    const subscriberSimilarity = this.calculateSubscriberSimilarity(
      channel1[FieldMapper.get('SUBSCRIBERS')] || channel1.subscribers || 0,
      channel2[FieldMapper.get('SUBSCRIBERS')] || channel2.subscribers || 0
    );
    totalSimilarity += subscriberSimilarity * (finalWeights[FieldMapper.get('SUBSCRIBERS')] || finalWeights.subscribers);

    // 3. 플랫폼 유사도
    const platformSimilarity = (channel1.platform === channel2.platform) ? 1 : 0;
    totalSimilarity += platformSimilarity * finalWeights.platform;

    // 4. 설명 유사도
    const descriptionSimilarity = this.calculateTextSimilarity(
      channel1[FieldMapper.get('DESCRIPTION')] || channel1.description || '',
      channel2[FieldMapper.get('DESCRIPTION')] || channel2.description || ''
    );
    totalSimilarity += descriptionSimilarity * (finalWeights[FieldMapper.get('DESCRIPTION')] || finalWeights.description);

    return Math.round(totalSimilarity * 100) / 100;
  }

  /**
   * 👥 구독자 규모 유사도
   */
  calculateSubscriberSimilarity(subs1, subs2) {
    if (subs1 === 0 && subs2 === 0) return 1;
    if (subs1 === 0 || subs2 === 0) return 0;

    const ratio = Math.min(subs1, subs2) / Math.max(subs1, subs2);
    
    // 구독자 규모 범주로 분류
    const getSubscriberCategory = (subs) => {
      if (subs >= 1000000) return 'mega';      // 100만+
      if (subs >= 100000) return 'large';      // 10만+
      if (subs >= 10000) return 'medium';      // 1만+
      if (subs >= 1000) return 'small';        // 1천+
      return 'micro';                          // 1천 미만
    };

    const cat1 = getSubscriberCategory(subs1);
    const cat2 = getSubscriberCategory(subs2);

    // 같은 카테고리면 높은 유사도
    if (cat1 === cat2) {
      return 0.8 + (ratio * 0.2); // 0.8 ~ 1.0
    }

    // 인접 카테고리면 중간 유사도
    const categories = ['micro', 'small', 'medium', 'large', 'mega'];
    const index1 = categories.indexOf(cat1);
    const index2 = categories.indexOf(cat2);
    const distance = Math.abs(index1 - index2);

    if (distance === 1) {
      return 0.4 + (ratio * 0.2); // 0.4 ~ 0.6
    }

    // 멀면 낮은 유사도
    return ratio * 0.3; // 0 ~ 0.3
  }

  /**
   * 📝 텍스트 유사도 계산 (간단한 키워드 기반)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 && !text2) return 1;
    if (!text1 || !text2) return 0;

    // 텍스트를 단어로 분할
    const words1 = text1.toLowerCase().match(/[\w가-힣]+/g) || [];
    const words2 = text2.toLowerCase().match(/[\w가-힣]+/g) || [];

    // 의미있는 단어만 필터링 (길이 2 이상)
    const meaningfulWords1 = words1.filter(word => word.length >= 2);
    const meaningfulWords2 = words2.filter(word => word.length >= 2);

    return this.calculateTagSimilarity(meaningfulWords1, meaningfulWords2);
  }

  /**
   * 🎯 클러스터 적합도 점수
   */
  calculateClusterFitScore(channel, cluster) {
    const scores = [];

    // 1. 태그 매칭 점수 (가장 중요)
    const tagScore = this.calculateTagSimilarity(
      channel.allTags || [],
      cluster.commonTags || []
    );
    scores.push({ type: 'tags', score: tagScore, weight: 0.7 });

    // 2. 기존 채널들과의 평균 유사도
    if (cluster.channels && cluster.channels.length > 0) {
      const channelSimilarities = cluster.channels.map(clusterChannel => 
        this.calculateWeightedSimilarity(channel, clusterChannel)
      );
      const avgChannelSimilarity = channelSimilarities.reduce((a, b) => a + b, 0) / channelSimilarities.length;
      scores.push({ type: 'channels', score: avgChannelSimilarity, weight: 0.3 });
    }

    // 가중 평균 계산
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedScore = scores.reduce((sum, s) => sum + (s.score * s.weight), 0) / totalWeight;

    return {
      finalScore: Math.round(weightedScore * 100) / 100,
      breakdown: scores,
      confidence: this.calculateConfidence(scores)
    };
  }

  /**
   * 🎯 신뢰도 계산
   */
  calculateConfidence(scores) {
    // 모든 점수가 높으면 신뢰도 높음
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    
    // 점수들의 표준편차 계산 (일관성)
    const variance = scores.reduce((sum, s) => sum + Math.pow(s.score - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // 높은 평균 점수 + 낮은 표준편차 = 높은 신뢰도
    const consistency = 1 - Math.min(stdDev, 1);
    const confidence = (avgScore + consistency) / 2;
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * 📊 유사 채널 그룹 찾기
   */
  findSimilarChannelGroups(channels, threshold = 0.6, minGroupSize = 3) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < channels.length; i++) {
      if (used.has(i)) continue;

      const group = [channels[i]];
      used.add(i);

      // 유사한 채널들 찾기
      for (let j = i + 1; j < channels.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.calculateWeightedSimilarity(channels[i], channels[j]);
        
        if (similarity >= threshold) {
          group.push(channels[j]);
          used.add(j);
        }
      }

      // 최소 그룹 크기 이상인 경우만 추가
      if (group.length >= minGroupSize) {
        groups.push({
          channels: group,
          size: group.length,
          commonTags: this.extractCommonTags(group),
          avgSimilarity: this.calculateGroupCohesion(group)
        });
      }
    }

    return groups.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  }

  /**
   * 🏷️ 공통 태그 추출
   */
  extractCommonTags(channels, minFrequency = 0.5) {
    const tagCounts = new Map();
    const totalChannels = channels.length;

    // 태그 빈도 계산
    channels.forEach(channel => {
      (channel.allTags || []).forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // 최소 빈도 이상인 태그만 반환
    const commonTags = Array.from(tagCounts.entries())
      .filter(([tag, count]) => count / totalChannels >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, frequency: count / totalChannels }));

    return commonTags;
  }

  /**
   * 🤝 그룹 응집도 계산
   */
  calculateGroupCohesion(channels) {
    if (channels.length < 2) return 1;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        totalSimilarity += this.calculateWeightedSimilarity(channels[i], channels[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }
}

module.exports = SimilarityCalculator;
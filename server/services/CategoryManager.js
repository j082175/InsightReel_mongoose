const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');

/**
 * 카테고리 관리 클래스
 * JSON 파일 기반으로 카테고리를 관리하여 동적 변경 가능
 */
class CategoryManager {
  constructor() {
    this.categoriesPath = path.join(__dirname, '../config/categories.json');
    this.categories = null;
    this.loadCategories();
  }

  /**
   * 카테고리 파일 로드
   */
  loadCategories() {
    try {
      const data = fs.readFileSync(this.categoriesPath, 'utf8');
      const config = JSON.parse(data);
      this.categories = config.categories;
      this.defaultCategory = config.defaultCategory;
      this.version = config.version;
      ServerLogger.success(`카테고리 로드 완료 (v${this.version})`, null, 'CategoryManager');
    } catch (error) {
      ServerLogger.error('카테고리 파일 로드 실패', error, 'CategoryManager');
      // 기본 카테고리 설정
      this.categories = {};
      this.defaultCategory = { main: '없음', middle: '없음' };
    }
  }

  /**
   * 카테고리 파일 재로드 (런타임 중 변경 적용)
   */
  reloadCategories() {
    this.loadCategories();
    return { success: true, version: this.version };
  }

  /**
   * 모든 카테고리 조회
   */
  getAllCategories() {
    return this.categories;
  }

  /**
   * 대카테고리 목록 조회
   */
  getMainCategories() {
    return Object.keys(this.categories);
  }

  /**
   * 중카테고리 목록 조회
   */
  getMiddleCategories(mainCategory) {
    if (!this.categories[mainCategory]) {
      return [];
    }
    return Object.keys(this.categories[mainCategory]);
  }

  /**
   * 키워드 목록 조회
   */
  getKeywords(mainCategory, middleCategory) {
    if (!this.categories[mainCategory] || !this.categories[mainCategory][middleCategory]) {
      return [];
    }
    return this.categories[mainCategory][middleCategory];
  }

  /**
   * 카테고리 유효성 검증
   */
  validateCategory(mainCategory, middleCategory) {
    if (!mainCategory || !middleCategory) {
      return {
        isValid: false,
        error: '카테고리가 누락되었습니다'
      };
    }

    if (!this.categories[mainCategory]) {
      return {
        isValid: false,
        error: `유효하지 않은 대카테고리: ${mainCategory}`,
        suggestions: this.getMainCategories()
      };
    }

    if (!this.categories[mainCategory][middleCategory]) {
      return {
        isValid: false,
        error: `유효하지 않은 중카테고리: ${middleCategory}`,
        suggestions: this.getMiddleCategories(mainCategory)
      };
    }

    return { isValid: true };
  }

  /**
   * 키워드로 카테고리 추론
   */
  inferCategoryFromKeywords(keywords) {
    if (!keywords || keywords.length === 0) {
      return this.defaultCategory;
    }

    let bestMatch = {
      ...this.defaultCategory,
      score: 0
    };

    // 모든 카테고리를 순회하며 매칭
    for (const [mainCat, middleCats] of Object.entries(this.categories)) {
      for (const [middleCat, catKeywords] of Object.entries(middleCats)) {
        let score = 0;
        
        // 키워드 매칭 점수 계산
        for (const keyword of keywords) {
          for (const catKeyword of catKeywords) {
            if (keyword.toLowerCase().includes(catKeyword.toLowerCase()) ||
                catKeyword.toLowerCase().includes(keyword.toLowerCase())) {
              score += 1;
            }
          }
        }

        if (score > bestMatch.score) {
          bestMatch = {
            main: mainCat,
            middle: middleCat,
            score: score
          };
        }
      }
    }

    return {
      main: bestMatch.main,
      middle: bestMatch.middle,
      confidence: bestMatch.score > 0 ? Math.min(bestMatch.score / keywords.length, 1) : 0
    };
  }

  /**
   * 카테고리 추가 (동적 관리용)
   */
  addCategory(mainCategory, middleCategory, keywords) {
    if (!this.categories[mainCategory]) {
      this.categories[mainCategory] = {};
    }
    
    this.categories[mainCategory][middleCategory] = keywords;
    this.saveCategories();
    
    return { success: true, message: '카테고리가 추가되었습니다' };
  }

  /**
   * 카테고리 삭제
   */
  removeCategory(mainCategory, middleCategory = null) {
    if (!this.categories[mainCategory]) {
      return { success: false, error: '존재하지 않는 대카테고리입니다' };
    }

    if (middleCategory) {
      delete this.categories[mainCategory][middleCategory];
    } else {
      delete this.categories[mainCategory];
    }

    this.saveCategories();
    return { success: true, message: '카테고리가 삭제되었습니다' };
  }

  /**
   * 카테고리 파일 저장
   */
  saveCategories() {
    try {
      const config = {
        version: this.version,
        lastUpdated: new Date().toISOString().split('T')[0],
        categories: this.categories,
        defaultCategory: this.defaultCategory
      };
      
      fs.writeFileSync(this.categoriesPath, JSON.stringify(config, null, 2), 'utf8');
      ServerLogger.success('카테고리 파일 저장 완료', null, 'CategoryManager');
    } catch (error) {
      ServerLogger.error('카테고리 파일 저장 실패', error, 'CategoryManager');
      throw error;
    }
  }

  /**
   * 카테고리 통계
   */
  getStatistics() {
    const stats = {
      totalMainCategories: Object.keys(this.categories).length,
      totalMiddleCategories: 0,
      totalKeywords: 0,
      categoriesBreakdown: {}
    };

    for (const [mainCat, middleCats] of Object.entries(this.categories)) {
      let middleCount = 0;
      let keywordCount = 0;

      for (const keywords of Object.values(middleCats)) {
        middleCount++;
        keywordCount += keywords.length;
      }

      stats.totalMiddleCategories += middleCount;
      stats.totalKeywords += keywordCount;
      stats.categoriesBreakdown[mainCat] = {
        middleCategories: middleCount,
        keywords: keywordCount
      };
    }

    return stats;
  }
}

module.exports = CategoryManager;
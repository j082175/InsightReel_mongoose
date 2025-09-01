/**
 * 유연한 깊이의 카테고리 관리 시스템
 * 무한 depth 지원 + 태그 시스템
 */
class FlexibleCategoryManager {
  constructor() {
    this.categoriesPath = path.join(__dirname, '../config/categories-v2.json');
    this.loadCategories();
  }

  /**
   * 재귀적으로 카테고리 트리 탐색
   */
  findCategoryPath(node, targetName, currentPath = []) {
    if (node[targetName]) {
      return [...currentPath, targetName];
    }
    
    for (const [key, value] of Object.entries(node)) {
      if (value.subcategories) {
        const result = this.findCategoryPath(
          value.subcategories, 
          targetName, 
          [...currentPath, key]
        );
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * 카테고리 깊이 자동 판단
   */
  getCategoryDepth(path) {
    return path.length;
  }

  /**
   * 동적 깊이로 카테고리 추가
   */
  addCategoryAtPath(path, newCategory, data) {
    let current = this.categories;
    
    // 경로 따라가며 카테고리 찾기
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (!current[segment]) {
        throw new Error(`경로를 찾을 수 없음: ${segment}`);
      }
      
      // subcategories가 없으면 생성
      if (!current[segment].subcategories) {
        current[segment].subcategories = {};
      }
      current = current[segment].subcategories;
    }
    
    // 마지막 위치에 새 카테고리 추가
    const parent = path[path.length - 1];
    if (!current[parent].subcategories) {
      current[parent].subcategories = {};
    }
    
    current[parent].subcategories[newCategory] = {
      keywords: data.keywords || [],
      tags: data.tags || [],
      subcategories: data.subcategories || {}
    };
    
    this.saveCategories();
    return { success: true, path: [...path, newCategory] };
  }

  /**
   * 카테고리 경로를 문자열로 변환
   */
  formatCategoryPath(path) {
    return path.join(' > ');
  }

  /**
   * AI 분석용 프롬프트 생성 (깊이 무관)
   */
  buildDynamicPrompt(maxDepth = 3) {
    const structure = this.buildTreeStructure(this.categories, 0, maxDepth);
    
    return `
영상을 분석하여 카테고리를 분류하세요.
카테고리는 최대 ${maxDepth}단계까지 선택 가능합니다.

**카테고리 구조**:
${structure}

**응답 형식**:
{
  "category_path": ["대카테고리", "중카테고리", "소카테고리"],
  "tags": ["태그1", "태그2", "태그3"],
  "confidence": 0.95
}

카테고리는 위 구조에서 가장 적합한 깊이까지만 선택하세요.
깊이를 강제하지 말고, 확실한 수준까지만 분류하세요.
`;
  }

  /**
   * 트리 구조를 텍스트로 변환
   */
  buildTreeStructure(node, depth = 0, maxDepth = 3, prefix = '') {
    if (depth >= maxDepth) return '';
    
    let result = '';
    const indent = '  '.repeat(depth);
    
    for (const [key, value] of Object.entries(node)) {
      result += `${indent}${depth === 0 ? '📁' : depth === 1 ? '📂' : '📄'} ${key}\n`;
      
      if (value.subcategories && Object.keys(value.subcategories).length > 0) {
        result += this.buildTreeStructure(
          value.subcategories, 
          depth + 1, 
          maxDepth
        );
      }
    }
    
    return result;
  }

  /**
   * 태그 추천 시스템
   */
  suggestTags(categoryPath, keywords) {
    let current = this.categories;
    let allTags = new Set();
    
    // 경로 따라가며 모든 레벨의 태그 수집
    for (const segment of categoryPath) {
      if (current[segment]) {
        if (current[segment].tags) {
          current[segment].tags.forEach(tag => allTags.add(tag));
        }
        current = current[segment].subcategories || {};
      }
    }
    
    // 키워드 매칭으로 추가 태그 추천
    const suggestedTags = Array.from(allTags).filter(tag => 
      keywords.some(keyword => 
        tag.includes(keyword) || keyword.includes(tag)
      )
    );
    
    return suggestedTags;
  }

  /**
   * 통계 (깊이별)
   */
  getDepthStatistics() {
    const stats = {
      maxDepth: 0,
      depthDistribution: {},
      totalCategories: 0,
      totalTags: new Set()
    };
    
    const analyze = (node, depth = 1) => {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      stats.depthDistribution[depth] = (stats.depthDistribution[depth] || 0) + Object.keys(node).length;
      
      for (const [key, value] of Object.entries(node)) {
        stats.totalCategories++;
        
        if (value.tags) {
          value.tags.forEach(tag => stats.totalTags.add(tag));
        }
        
        if (value.subcategories) {
          analyze(value.subcategories, depth + 1);
        }
      }
    };
    
    analyze(this.categories);
    stats.totalTags = stats.totalTags.size;
    
    return stats;
  }
}

module.exports = FlexibleCategoryManager;
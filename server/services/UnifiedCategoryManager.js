const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');

/**
 * 통합 카테고리 관리자
 * 기존 3개 클래스의 모든 기능을 통합:
 * - CategoryManager: 기본 2단계 카테고리 시스템
 * - DynamicCategoryManager: AI 동적 카테고리 + 자가학습
 * - FlexibleCategoryManager: 무한 깊이 + 태그 시스템
 */
class UnifiedCategoryManager {
  constructor(options = {}) {
    // 작동 모드 설정
    this.mode = options.mode || process.env.CATEGORY_MANAGER_MODE || 'dynamic';
    // 'basic', 'dynamic', 'flexible'
    
    // 파일 경로들
    this.categoriesPath = path.join(__dirname, '../config/categories.json');
    this.categoriesV2Path = path.join(__dirname, '../config/categories-v2.json');
    this.normalizationRulesPath = path.join(__dirname, '../config/normalization-rules.json');
    this.categoryStatsPath = path.join(__dirname, '../config/category-stats.json');
    this.verifiedCategoriesPath = path.join(__dirname, '../config/verified-categories.json');
    
    // 데이터 초기화
    this.categories = null;
    this.categoriesV2 = null;
    this.normalizationRules = {};
    this.categoryStats = {};
    this.verifiedCategories = {};
    
    // 플랫폼별 대카테고리 설정 (Dynamic에서 가져옴)
    this.PLATFORM_CATEGORIES = {
      youtube: [
        "게임", "과학기술", "교육", "노하우/스타일", "뉴스/정치",
        "비영리/사회운동", "스포츠", "애완동물/동물", "엔터테인먼트",
        "여행/이벤트", "영화/애니메이션", "음악", "인물/블로그", 
        "자동차/교통", "코미디"
      ],
      tiktok: [
        "엔터테인먼트", "뷰티 및 스타일", "퍼포먼스", "스포츠 및 아웃도어",
        "사회", "라이프스타일", "차량 및 교통", "재능", "자연", 
        "문화/교육/기술", "가족/연애", "초자연적 현상 및 공포"
      ],
      instagram: [
        "엔터테인먼트", "뷰티 및 스타일", "퍼포먼스", "스포츠 및 아웃도어",
        "사회", "라이프스타일", "차량 및 교통", "재능", "자연", 
        "문화/교육/기술", "가족/연애", "초자연적 현상 및 공포"
      ]
    };
    
    // 모드에 따른 초기화
    this.initializeByMode();
    
    ServerLogger.success(`통합 카테고리 관리자 초기화 완료 (모드: ${this.mode})`, null, 'UNIFIED_CATEGORY');
  }

  /**
   * 모드별 초기화
   */
  initializeByMode() {
    switch (this.mode) {
      case 'basic':
        this.loadCategories();
        break;
      case 'dynamic':
        this.loadNormalizationRules();
        this.loadCategoryStats();
        this.loadVerifiedCategories();
        break;
      case 'flexible':
        this.loadCategoriesV2();
        break;
      default:
        ServerLogger.warn(`알 수 없는 카테고리 모드: ${this.mode}, dynamic으로 기본 설정`, null, 'UNIFIED_CATEGORY');
        this.mode = 'dynamic';
        this.loadNormalizationRules();
        this.loadCategoryStats();
        this.loadVerifiedCategories();
    }
  }

  /**
   * 기본 카테고리 로드 (CategoryManager)
   */
  loadCategories() {
    try {
      const data = fs.readFileSync(this.categoriesPath, 'utf8');
      const config = JSON.parse(data);
      this.categories = config.categories;
      this.defaultCategory = config.defaultCategory;
      this.version = config.version;
      ServerLogger.success(`기본 카테고리 로드 완료 (v${this.version})`, null, 'UNIFIED_CATEGORY');
    } catch (error) {
      ServerLogger.error('기본 카테고리 파일 로드 실패', error, 'UNIFIED_CATEGORY');
      this.categories = {};
      this.defaultCategory = { main: '미분류', middle: '기본' };
    }
  }

  /**
   * V2 카테고리 로드 (FlexibleCategoryManager)
   */
  loadCategoriesV2() {
    try {
      const data = fs.readFileSync(this.categoriesV2Path, 'utf8');
      this.categoriesV2 = JSON.parse(data);
      ServerLogger.success('V2 카테고리 로드 완료', null, 'UNIFIED_CATEGORY');
    } catch (error) {
      ServerLogger.error('V2 카테고리 파일 로드 실패', error, 'UNIFIED_CATEGORY');
      this.categoriesV2 = {};
    }
  }

  /**
   * 정규화 규칙 로드 (DynamicCategoryManager)
   */
  loadNormalizationRules() {
    try {
      if (fs.existsSync(this.normalizationRulesPath)) {
        const data = fs.readFileSync(this.normalizationRulesPath, 'utf8');
        this.normalizationRules = JSON.parse(data);
        ServerLogger.success('정규화 규칙 로드 완료', null, 'UNIFIED_CATEGORY');
      } else {
        this.normalizationRules = {};
        ServerLogger.info('정규화 규칙 파일 없음, 기본값 사용', null, 'UNIFIED_CATEGORY');
      }
    } catch (error) {
      ServerLogger.error('정규화 규칙 로드 실패', error, 'UNIFIED_CATEGORY');
      this.normalizationRules = {};
    }
  }

  /**
   * 카테고리 통계 로드 (DynamicCategoryManager)
   */
  loadCategoryStats() {
    try {
      if (fs.existsSync(this.categoryStatsPath)) {
        const data = fs.readFileSync(this.categoryStatsPath, 'utf8');
        this.categoryStats = JSON.parse(data);
        ServerLogger.success('카테고리 통계 로드 완료', null, 'UNIFIED_CATEGORY');
      } else {
        this.categoryStats = {};
        ServerLogger.info('카테고리 통계 파일 없음, 기본값 사용', null, 'UNIFIED_CATEGORY');
      }
    } catch (error) {
      ServerLogger.error('카테고리 통계 로드 실패', error, 'UNIFIED_CATEGORY');
      this.categoryStats = {};
    }
  }

  /**
   * 검증된 카테고리 로드 (DynamicCategoryManager)
   */
  loadVerifiedCategories() {
    try {
      if (fs.existsSync(this.verifiedCategoriesPath)) {
        const data = fs.readFileSync(this.verifiedCategoriesPath, 'utf8');
        this.verifiedCategories = JSON.parse(data);
        const patternCount = Object.keys(this.verifiedCategories).length;
        ServerLogger.success(`검증된 카테고리 로드 완료: ${patternCount}개 패턴`, null, 'UNIFIED_CATEGORY');
      } else {
        this.verifiedCategories = {};
        ServerLogger.info('검증된 카테고리 파일 없음, 기본값 사용', null, 'UNIFIED_CATEGORY');
      }
    } catch (error) {
      ServerLogger.error('검증된 카테고리 로드 실패', error, 'UNIFIED_CATEGORY');
      this.verifiedCategories = {};
    }
  }

  /**
   * 모드별 카테고리 가져오기
   */
  getCategories(platform = 'youtube') {
    switch (this.mode) {
      case 'basic':
        return this.categories;
      case 'dynamic':
        return this.getMainCategoriesForPlatform(platform);
      case 'flexible':
        return this.categoriesV2;
      default:
        return {};
    }
  }

  /**
   * 플랫폼별 메인 카테고리 가져오기 (DynamicCategoryManager)
   */
  getMainCategoriesForPlatform(platform = 'youtube') {
    // 안전한 문자열 변환
    const platformStr = platform && typeof platform === 'string' ? platform : 'youtube';
    const normalizedPlatform = platformStr.toLowerCase();
    
    // 알려진 플랫폼들을 정규화
    const platformMap = {
      'youtube': 'youtube',
      'tiktok': 'tiktok',
      'instagram': 'tiktok', // Instagram은 TikTok과 동일한 카테고리 사용
      'ig': 'tiktok',
      'tt': 'tiktok'
    };
    
    const mappedPlatform = platformMap[normalizedPlatform] || 'youtube';
    const categories = this.PLATFORM_CATEGORIES[mappedPlatform] || this.PLATFORM_CATEGORIES.youtube;
    
    ServerLogger.info(`📂 플랫폼 '${platform}' → '${mappedPlatform}' 카테고리 ${categories.length}개 반환`, null, 'UNIFIED_CATEGORY');
    
    return categories;
  }

  /**
   * 카테고리 검증 (모드별 분기)
   */
  validateCategory(category, platform = 'youtube') {
    switch (this.mode) {
      case 'basic':
        return this.validateBasicCategory(category);
      case 'dynamic':
        return this.validateDynamicCategory(category, platform);
      case 'flexible':
        return this.validateFlexibleCategory(category);
      default:
        return { valid: false, message: `알 수 없는 모드: ${this.mode}` };
    }
  }

  /**
   * 기본 카테고리 검증
   */
  validateBasicCategory(category) {
    if (!this.categories || !category) {
      return { valid: false, message: '카테고리 데이터가 없습니다' };
    }
    
    const { main, middle } = category;
    
    if (!this.categories[main]) {
      return { valid: false, message: `존재하지 않는 대카테고리: ${main}` };
    }
    
    if (!this.categories[main][middle]) {
      return { valid: false, message: `존재하지 않는 중카테고리: ${middle}` };
    }
    
    return { valid: true, message: '유효한 카테고리' };
  }

  /**
   * 동적 카테고리 검증
   */
  validateDynamicCategory(category, platform) {
    const availableCategories = this.getMainCategoriesForPlatform(platform);
    
    if (!category || typeof category !== 'string') {
      return { valid: false, message: '카테고리가 문자열이 아닙니다' };
    }
    
    // > 로 구분된 동적 카테고리인지 확인
    if (category.includes(' > ')) {
      const parts = category.split(' > ').map(part => part.trim());
      const mainCategory = parts[0];
      
      if (!availableCategories.includes(mainCategory)) {
        return { 
          valid: false, 
          message: `플랫폼 ${platform}에서 지원하지 않는 대카테고리: ${mainCategory}`,
          suggestion: `사용 가능한 카테고리: ${availableCategories.slice(0, 3).join(', ')}...`
        };
      }
      
      return { valid: true, message: '유효한 동적 카테고리' };
    }
    
    // 단일 카테고리인 경우
    if (!availableCategories.includes(category)) {
      return { 
        valid: false, 
        message: `플랫폼 ${platform}에서 지원하지 않는 카테고리: ${category}`,
        suggestion: `사용 가능한 카테고리: ${availableCategories.slice(0, 3).join(', ')}...`
      };
    }
    
    return { valid: true, message: '유효한 카테고리' };
  }

  /**
   * 유연한 카테고리 검증
   */
  validateFlexibleCategory(category) {
    if (!this.categoriesV2) {
      return { valid: false, message: 'V2 카테고리 데이터가 로드되지 않았습니다' };
    }
    
    // 재귀적으로 카테고리 존재 확인
    const path = this.findCategoryPath(this.categoriesV2, category);
    
    if (path) {
      return { valid: true, message: '유효한 카테고리', path };
    } else {
      return { valid: false, message: `존재하지 않는 카테고리: ${category}` };
    }
  }

  /**
   * 재귀적 카테고리 경로 찾기 (FlexibleCategoryManager)
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
   * AI 프롬프트 생성 (모드별)
   */
  buildPrompt(metadata, platform = 'youtube') {
    switch (this.mode) {
      case 'basic':
        return this.buildBasicPrompt(metadata);
      case 'dynamic':
        return this.buildDynamicCategoryPrompt(platform);
      case 'flexible':
        return this.buildFlexiblePrompt(metadata);
      default:
        return this.buildDynamicCategoryPrompt(platform);
    }
  }

  /**
   * 기본 프롬프트 생성
   */
  buildBasicPrompt(metadata) {
    const categoryStructure = this.buildCategoryStructure();
    
    return `다음 카테고리 중에서 가장 적절한 것을 선택해주세요:

${categoryStructure}

메타데이터: ${JSON.stringify(metadata, null, 2)}

응답 형식:
{
  "main_category": "선택한 대카테고리",
  "middle_category": "선택한 중카테고리",
  "confidence": 0.8,
  "keywords": ["키워드1", "키워드2"],
  "hashtags": ["#태그1", "#태그2"]
}`;
  }

  /**
   * 동적 카테고리 프롬프트 생성
   */
  buildDynamicCategoryPrompt(platform = 'youtube') {
    // 안전한 문자열 변환
    const platformStr = platform && typeof platform === 'string' ? platform : 'youtube';
    const categories = this.getMainCategoriesForPlatform(platformStr);
    
    return `당신은 ${platformStr} 플랫폼의 비디오 콘텐츠를 분석하는 전문가입니다.

다음 ${categories.length}개의 대카테고리 중에서 가장 적절한 카테고리를 선택하고, 하위 카테고리를 생성하세요:

📂 사용 가능한 대카테고리:
${categories.map((cat, index) => `${index + 1}. ${cat}`).join('\n')}

🎯 카테고리 깊이 규칙:
- **최소 깊이**: 3단계 (대카테고리 > 중카테고리 > 소카테고리)
- **최대 깊이**: 6단계까지 허용
- **권장 깊이**: 콘텐츠에 적합한 만큼 자연스럽게 (4-5단계 선호)

⚠️ **중요**: 의미 있고 구체적인 분류가 가능할 때만 깊게 만드세요. 억지로 단계를 늘리지 마세요.

카테고리 예시:
- 3단계: "음악 > K-POP > 댄스" (충분히 구체적인 경우)
- 4단계: "게임 > RPG > 액션 RPG > 모바일" (플랫폼 구분이 의미 있는 경우)
- 5단계: "교육 > 언어 > 영어 > 회화 > 초급" (세분화가 자연스러운 경우)
- 6단계: "스포츠 > 축구 > 리그 > 프리미어리그 > 맨유 > 하이라이트" (매우 구체적인 경우)

응답 형식 (JSON):
{
  "full_path": "대카테고리 > 중카테고리 > 소카테고리 [> 추가 단계들...]",
  "main_category": "대카테고리",
  "depth": 4,
  "confidence": 0.85,
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "hashtags": ["#태그1", "#태그2"],
  "content": "콘텐츠 요약"
}`;
  }

  /**
   * 유연한 프롬프트 생성
   */
  buildFlexiblePrompt(metadata) {
    return `무한 깊이 카테고리 시스템을 사용하여 가장 적절한 카테고리를 생성해주세요.

메타데이터: ${JSON.stringify(metadata, null, 2)}

자유롭게 카테고리 계층을 생성할 수 있습니다.
예: "엔터테인먼트 > 음악 > K-POP > 댄스"

응답 형식:
{
  "category": "생성된 카테고리 경로",
  "tags": ["태그1", "태그2", "태그3"],
  "confidence": 0.9,
  "depth": 4
}`;
  }

  /**
   * 카테고리 구조를 텍스트로 변환
   */
  buildCategoryStructure() {
    if (!this.categories) return '카테고리 데이터가 없습니다.';
    
    let structure = '';
    for (const [main, subcategories] of Object.entries(this.categories)) {
      structure += `\n📂 ${main}:\n`;
      for (const [middle, keywords] of Object.entries(subcategories)) {
        structure += `  └─ ${middle}: ${keywords.slice(0, 3).join(', ')}...\n`;
      }
    }
    return structure;
  }

  /**
   * 통계 정보 조회
   */
  getStatistics() {
    const stats = {
      mode: this.mode,
      timestamp: new Date().toISOString()
    };
    
    switch (this.mode) {
      case 'basic':
        stats.categories = this.categories ? Object.keys(this.categories).length : 0;
        stats.version = this.version;
        break;
      case 'dynamic':
        stats.platforms = Object.keys(this.PLATFORM_CATEGORIES);
        stats.totalCategories = Object.values(this.PLATFORM_CATEGORIES).flat().length;
        stats.verifiedPatterns = Object.keys(this.verifiedCategories).length;
        stats.normalizationRules = Object.keys(this.normalizationRules).length;
        break;
      case 'flexible':
        stats.v2Categories = this.categoriesV2 ? Object.keys(this.categoriesV2).length : 0;
        break;
    }
    
    return stats;
  }

  /**
   * 설정 저장 (모든 모드 지원)
   */
  saveSettings() {
    try {
      switch (this.mode) {
        case 'basic':
          if (this.categories) {
            const config = {
              version: this.version,
              categories: this.categories,
              defaultCategory: this.defaultCategory
            };
            fs.writeFileSync(this.categoriesPath, JSON.stringify(config, null, 2));
          }
          break;
        case 'dynamic':
          if (this.normalizationRules) {
            fs.writeFileSync(this.normalizationRulesPath, JSON.stringify(this.normalizationRules, null, 2));
          }
          if (this.categoryStats) {
            fs.writeFileSync(this.categoryStatsPath, JSON.stringify(this.categoryStats, null, 2));
          }
          if (this.verifiedCategories) {
            fs.writeFileSync(this.verifiedCategoriesPath, JSON.stringify(this.verifiedCategories, null, 2));
          }
          break;
        case 'flexible':
          if (this.categoriesV2) {
            fs.writeFileSync(this.categoriesV2Path, JSON.stringify(this.categoriesV2, null, 2));
          }
          break;
      }
      ServerLogger.success(`${this.mode} 모드 설정 저장 완료`, null, 'UNIFIED_CATEGORY');
      return true;
    } catch (error) {
      ServerLogger.error('설정 저장 실패', error, 'UNIFIED_CATEGORY');
      return false;
    }
  }

  /**
   * 모드 변경
   */
  switchMode(newMode) {
    if (['basic', 'dynamic', 'flexible'].includes(newMode)) {
      const oldMode = this.mode;
      this.mode = newMode;
      this.initializeByMode();
      ServerLogger.info(`카테고리 관리자 모드 변경: ${oldMode} → ${newMode}`, null, 'UNIFIED_CATEGORY');
      return true;
    } else {
      ServerLogger.warn(`유효하지 않은 모드: ${newMode}`, null, 'UNIFIED_CATEGORY');
      return false;
    }
  }

  // ============== Dynamic Category Manager 호환성 메소드들 ==============

  /**
   * 자가 학습 시스템 활성화 여부 확인
   */
  isSelfLearningEnabled() {
    return this.mode === 'dynamic' && process.env.USE_SELF_LEARNING_CATEGORIES === 'true';
  }

  /**
   * 폴백 카테고리 반환
   */
  getFallbackCategory(metadata) {
    const platform = metadata.platform || 'youtube';
    const categories = this.getMainCategoriesForPlatform(platform);
    const mainCategory = categories[0] || '엔터테인먼트';
    const fullPath = `${mainCategory} > 일반 > 기본`; // 최소 3단계 보장
    
    return {
      category: '미분류',
      mainCategory: mainCategory,
      middleCategory: '기본',
      fullPath: fullPath,
      depth: 3,
      confidence: 0.3,
      keywords: [],
      hashtags: [],
      source: 'fallback',
      platform: platform
    };
  }

  /**
   * 콘텐츠 시그니처 생성
   */
  generateContentSignature(metadata) {
    const platform = metadata.platform || 'youtube';
    const keywords = [];
    
    // 메타데이터에서 키워드 추출
    if (metadata.caption) keywords.push(...metadata.caption.toLowerCase().split(/\s+/).slice(0, 5));
    if (metadata.hashtags) keywords.push(...metadata.hashtags.map(tag => tag.replace('#', '').toLowerCase()));
    if (metadata.title) keywords.push(...metadata.title.toLowerCase().split(/\s+/).slice(0, 3));
    
    // 중복 제거 및 정렬
    const uniqueKeywords = [...new Set(keywords)].filter(k => k.length > 2).slice(0, 5);
    
    return `${platform}:${uniqueKeywords.join(',')}`;
  }

  /**
   * 유사한 검증된 패턴 찾기 (기본 구현)
   */
  findSimilarVerifiedPattern(contentSignature) {
    if (this.mode !== 'dynamic' || !this.verifiedCategories.patterns) {
      return null;
    }
    
    // 간단한 키워드 매칭으로 유사도 계산
    const [platform, keywords] = contentSignature.split(':');
    const searchKeywords = keywords.split(',');
    
    let bestMatch = null;
    let maxSimilarity = 0;
    
    for (const [signature, pattern] of Object.entries(this.verifiedCategories.patterns)) {
      const [patternPlatform, patternKeywords] = signature.split(':');
      
      if (patternPlatform !== platform) continue;
      
      const patternKeywordList = patternKeywords.split(',');
      const intersection = searchKeywords.filter(k => patternKeywordList.includes(k));
      const similarity = intersection.length / Math.max(searchKeywords.length, patternKeywordList.length);
      
      if (similarity > maxSimilarity && similarity > 0.4) {
        maxSimilarity = similarity;
        bestMatch = {
          signature,
          similarity,
          verifiedCategory: pattern.verifiedCategory,
          confidence: pattern.confidence,
          analysisCount: pattern.analysisCount
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * 검증된 카테고리 사용량 업데이트
   */
  updateVerifiedCategoryUsage(signature) {
    if (this.verifiedCategories.patterns && this.verifiedCategories.patterns[signature]) {
      this.verifiedCategories.patterns[signature].lastUsed = new Date().toISOString();
      this.verifiedCategories.patterns[signature].usageCount = 
        (this.verifiedCategories.patterns[signature].usageCount || 0) + 1;
    }
  }

  /**
   * 검증된 카테고리에서 분석 저장 (단순화된 구현)
   */
  saveVerifiedCategoryFromAnalysis(contentSignature, analysisResults) {
    if (this.mode !== 'dynamic') return null;
    
    // 20개 결과 중 가장 많이 나온 카테고리 찾기
    const categoryVotes = {};
    
    analysisResults.forEach(result => {
      const category = result.category || result.mainCategory;
      if (category) {
        categoryVotes[category] = (categoryVotes[category] || 0) + 1;
      }
    });
    
    const bestCategory = Object.entries(categoryVotes)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (!bestCategory) return null;
    
    const [categoryName, votes] = bestCategory;
    const confidence = votes / analysisResults.length;
    
    if (confidence < 0.6) return null; // 60% 미만은 저장하지 않음
    
    const verifiedData = {
      verifiedCategory: {
        fullPath: categoryName,
        parts: categoryName.split(' > '),
        mainCategory: categoryName.split(' > ')[0],
        middleCategory: categoryName.split(' > ')[1] || '일반'
      },
      analysisCount: analysisResults.length,
      totalVotes: votes,
      voteRatio: confidence,
      confidence: confidence,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    if (!this.verifiedCategories.patterns) {
      this.verifiedCategories = { patterns: {}, metadata: { totalPatterns: 0 } };
    }
    
    this.verifiedCategories.patterns[contentSignature] = verifiedData;
    this.verifiedCategories.metadata.totalPatterns = Object.keys(this.verifiedCategories.patterns).length;
    this.verifiedCategories.metadata.lastUpdated = new Date().toISOString();
    
    this.saveSettings();
    
    ServerLogger.success(`🎯 검증된 카테고리 저장: ${categoryName} (${votes}/${analysisResults.length}표)`, null, 'UNIFIED_CATEGORY');
    
    return verifiedData;
  }

  /**
   * 검증된 카테고리 참조 프롬프트 생성
   */
  buildVerifiedCategoryReference(similarPattern) {
    if (!similarPattern || !similarPattern.verifiedCategory) {
      return '';
    }
    
    const { verifiedCategory, confidence, analysisCount, similarity } = similarPattern;
    
    return `

**참고할 검증된 카테고리 정보:**
이와 유사한 콘텐츠(유사도: ${(similarity * 100).toFixed(1)}%)에서 ${analysisCount}번 분석 결과:
- 검증된 카테고리: "${verifiedCategory.fullPath}"
- 신뢰도: ${(confidence * 100).toFixed(1)}%

이 정보를 참고하되, 현재 콘텐츠에 더 적합한 카테고리가 있다면 그것을 선택하세요.`;
  }

  /**
   * 동적 카테고리 응답 처리 (일관성 기반 깊이 조정)
   */
  processDynamicCategoryResponse(aiResponse, metadata, modelUsed) {
    try {
      // JSON 응답 파싱
      let parsedResponse;
      
      if (typeof aiResponse === 'string') {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON 형식을 찾을 수 없음');
        }
      } else {
        parsedResponse = aiResponse;
      }
      
      const platform = metadata.platform || 'youtube';
      const availableCategories = this.getMainCategoriesForPlatform(platform);
      
      // 일관성 레벨 확인
      const consistencyLevel = parsedResponse.consistency_level || 'medium';
      const consistencyReason = parsedResponse.consistency_reason || '일관성 분석 없음';
      
      // 카테고리 정규화
      let finalCategory = parsedResponse.category || parsedResponse.main_category || '미분류';
      let fullPath = parsedResponse.full_path || finalCategory;
      let mainCategory = fullPath.split(' > ')[0] || fullPath;
      let middleCategory = fullPath.split(' > ')[1] || '일반';
      
      // fullPath에서 depth 계산
      let depth = parsedResponse.depth;
      if (!depth && fullPath) {
        depth = fullPath.split(' > ').length;
      }
      
      // 대카테고리가 플랫폼에서 지원되지 않으면 수정
      if (!availableCategories.includes(mainCategory)) {
        mainCategory = availableCategories[0];
        finalCategory = mainCategory;
        middleCategory = '일반';
        fullPath = mainCategory;
        depth = 1;
      }
      
      // 🎯 일관성 기반 깊이 조정
      if (consistencyLevel === 'low') {
        // 일관성 부족: 대카테고리만
        fullPath = mainCategory;
        middleCategory = '일반';
        depth = 1;
        ServerLogger.warn(`⚠️ 일관성 부족으로 대카테고리만 지정: ${mainCategory} (${consistencyReason})`);
      } else if (consistencyLevel === 'medium') {
        // 일관성 중간: 대카테고리 + 중카테고리까지만 (최대 2단계)
        const parts = fullPath.split(' > ').slice(0, 2);
        fullPath = parts.join(' > ');
        depth = Math.min(depth, 2);
        if (depth === 1) {
          fullPath = `${mainCategory} > 일반`;
          middleCategory = '일반';
          depth = 2;
        }
        ServerLogger.info(`ℹ️ 일관성 중간으로 중카테고리까지만: ${fullPath} (${consistencyReason})`);
      } else {
        // 일관성 높음: 기존 로직 유지 (3-6단계)
        if (depth < 3) {
          if (depth === 1) {
            fullPath = `${mainCategory} > 일반 > 기본`;
            depth = 3;
          } else if (depth === 2) {
            fullPath = `${fullPath} > 기본`;
            depth = 3;
          }
        } else if (depth > 6) {
          const parts = fullPath.split(' > ').slice(0, 6);
          fullPath = parts.join(' > ');
          depth = 6;
        }
        ServerLogger.success(`✅ 일관성 높음으로 세부 카테고리 생성: ${fullPath} (${consistencyReason})`);
      }
      
      return {
        category: finalCategory,
        mainCategory: mainCategory,
        middleCategory: middleCategory,
        fullPath: fullPath,
        depth: depth,
        keywords: Array.isArray(parsedResponse.keywords) ? parsedResponse.keywords : [],
        hashtags: Array.isArray(parsedResponse.hashtags) ? parsedResponse.hashtags : [],
        summary: parsedResponse.summary || '내용 분석 완료',
        confidence: parsedResponse.confidence || 0.7,
        source: 'dynamic-ai',
        modelUsed: modelUsed,
        platform: platform,
        // 일관성 정보 추가
        consistencyLevel: consistencyLevel,
        consistencyReason: consistencyReason
      };
      
    } catch (error) {
      ServerLogger.error('동적 카테고리 응답 파싱 실패', error, 'UNIFIED_CATEGORY');
      return this.getFallbackCategory(metadata);
    }
  }

  /**
   * 자가 학습 통계 조회
   */
  getSelfLearningStats() {
    if (this.mode !== 'dynamic') {
      return {
        enabled: false,
        message: '자가 학습 시스템은 dynamic 모드에서만 사용 가능합니다.'
      };
    }
    
    const patterns = this.verifiedCategories.patterns || {};
    const totalPatterns = Object.keys(patterns).length;
    
    return {
      enabled: this.isSelfLearningEnabled(),
      totalVerifiedPatterns: totalPatterns,
      totalUsage: Object.values(patterns).reduce((sum, p) => sum + (p.usageCount || 0), 0),
      lastUpdated: this.verifiedCategories.metadata?.lastUpdated || null,
      mode: this.mode
    };
  }

  /**
   * 시스템 통계 조회
   */
  getSystemStats() {
    const baseStats = this.getStatistics();
    
    if (this.mode === 'dynamic') {
      const selfLearningStats = this.getSelfLearningStats();
      baseStats.selfLearning = selfLearningStats;
    }
    
    return baseStats;
  }
}

module.exports = UnifiedCategoryManager;
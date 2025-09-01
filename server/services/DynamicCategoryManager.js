const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');

/**
 * 동적 카테고리 관리 클래스
 * AI가 자유롭게 생성한 카테고리 경로를 정규화하고 관리
 */
class DynamicCategoryManager {
  constructor() {
    this.normalizationRulesPath = path.join(__dirname, '../config/normalization-rules.json');
    this.categoryStatsPath = path.join(__dirname, '../config/category-stats.json');
    
    this.loadNormalizationRules();
    this.loadCategoryStats();
    
    // 고정된 대카테고리 (변경 불가)
    this.FIXED_MAIN_CATEGORIES = [
      "게임", "과학기술", "교육", "노하우/스타일", "뉴스/정치",
      "비영리/사회운동", "스포츠", "애완동물/동물", "엔터테인먼트",
      "여행/이벤트", "영화/애니메이션", "음악", "인물/블로그", 
      "자동차/교통", "코미디"
    ];
  }

  /**
   * 정규화 규칙 로드
   */
  loadNormalizationRules() {
    try {
      if (fs.existsSync(this.normalizationRulesPath)) {
        const data = fs.readFileSync(this.normalizationRulesPath, 'utf8');
        this.normalizationRules = JSON.parse(data);
      } else {
        this.initializeNormalizationRules();
      }
      ServerLogger.success('정규화 규칙 로드 완료', null, 'DynamicCategoryManager');
    } catch (error) {
      ServerLogger.error('정규화 규칙 로드 실패', error, 'DynamicCategoryManager');
      this.initializeNormalizationRules();
    }
  }

  /**
   * 카테고리 통계 로드
   */
  loadCategoryStats() {
    try {
      if (fs.existsSync(this.categoryStatsPath)) {
        const data = fs.readFileSync(this.categoryStatsPath, 'utf8');
        this.categoryStats = JSON.parse(data);
      } else {
        this.initializeCategoryStats();
      }
      ServerLogger.success('카테고리 통계 로드 완료', null, 'DynamicCategoryManager');
    } catch (error) {
      ServerLogger.error('카테고리 통계 로드 실패', error, 'DynamicCategoryManager');
      this.initializeCategoryStats();
    }
  }

  /**
   * 초기 정규화 규칙 생성
   */
  initializeNormalizationRules() {
    this.normalizationRules = {
      synonyms: {
        "호러": ["공포게임", "무서운게임", "호러게임", "공포", "무서운"],
        "실황": ["Let's Play", "스트리밍", "라이브", "게임플레이", "플레이"],
        "한식": ["한국요리", "코리안푸드", "한국음식"],
        "프로그래밍": ["코딩", "개발", "프로그래밍언어"],
        "파이썬": ["Python", "파이썬언어"],
        "요리": ["쿡방", "레시피", "음식"],
        "브이로그": ["일상", "데일리", "Vlog"],
        "뷰티": ["메이크업", "화장", "코스메틱"],
        "피트니스": ["운동", "헬스", "홈트", "트레이닝"]
      },
      preferred: {
        "공포게임": "호러",
        "무서운게임": "호러",
        "호러게임": "호러",
        "무서운": "호러",
        "공포": "호러",
        "Let's Play": "실황",
        "스트리밍": "실황",
        "라이브": "실황",
        "게임플레이": "실황",
        "플레이": "실황",
        "한국요리": "한식",
        "코리안푸드": "한식",
        "한국음식": "한식",
        "코딩": "프로그래밍",
        "개발": "프로그래밍",
        "프로그래밍언어": "프로그래밍",
        "Python": "파이썬",
        "파이썬언어": "파이썬",
        "쿡방": "요리",
        "레시피": "요리",
        "음식": "요리",
        "일상": "브이로그",
        "데일리": "브이로그",
        "Vlog": "브이로그",
        "메이크업": "뷰티",
        "화장": "뷰티",
        "코스메틱": "뷰티",
        "운동": "피트니스",
        "헬스": "피트니스",
        "홈트": "피트니스",
        "트레이닝": "피트니스"
      }
    };
    this.saveNormalizationRules();
  }

  /**
   * 초기 카테고리 통계 생성
   */
  initializeCategoryStats() {
    this.categoryStats = {
      usage: {},
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    this.saveCategoryStats();
  }

  /**
   * 동적 카테고리 경로 정규화
   */
  normalizeCategoryPath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') {
      return null;
    }

    const parts = rawPath.split(' > ').map(part => part.trim());
    
    // 대카테고리 검증
    if (!this.FIXED_MAIN_CATEGORIES.includes(parts[0])) {
      ServerLogger.warn(`유효하지 않은 대카테고리: ${parts[0]}`, null, 'DynamicCategoryManager');
      return null;
    }

    // 각 부분을 정규화
    const normalized = parts.map(part => {
      return this.normalizationRules.preferred[part] || part;
    });

    const normalizedPath = normalized.join(' > ');
    
    // 사용 통계 업데이트
    this.updateCategoryUsage(normalizedPath);
    
    return {
      original: rawPath,
      normalized: normalizedPath,
      parts: normalized,
      depth: normalized.length
    };
  }

  /**
   * AI가 생성한 카테고리 응답 처리
   */
  processDynamicCategoryResponse(aiResponse, metadata) {
    try {
      let categoryData = null;

      // JSON 응답 파싱 시도
      if (typeof aiResponse === 'string') {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          categoryData = JSON.parse(jsonMatch[0]);
        }
      } else if (typeof aiResponse === 'object') {
        categoryData = aiResponse;
      }

      if (!categoryData || !categoryData.full_path) {
        ServerLogger.warn('AI 응답에서 카테고리 경로를 찾을 수 없음', null, 'DynamicCategoryManager');
        return this.getFallbackCategory(metadata);
      }

      // 카테고리 경로 정규화
      const normalized = this.normalizeCategoryPath(categoryData.full_path);
      if (!normalized) {
        ServerLogger.warn(`카테고리 정규화 실패: ${categoryData.full_path}`, null, 'DynamicCategoryManager');
        return this.getFallbackCategory(metadata);
      }

      return {
        mainCategory: normalized.parts[0],
        middleCategory: normalized.parts[1] || '일반',  // 중카테고리 추가 (호환성)
        fullPath: normalized.normalized,
        categoryPath: normalized.parts,
        depth: normalized.depth,
        keywords: Array.isArray(categoryData.keywords) ? categoryData.keywords.slice(0, 5) : [],
        hashtags: Array.isArray(categoryData.hashtags) ? categoryData.hashtags.slice(0, 5) : [],
        content: categoryData.content || categoryData.description || '',  // AI 분석 내용 보존
        confidence: categoryData.confidence || 0.8,
        source: 'dynamic-ai-generated',
        normalized: true
      };

    } catch (error) {
      ServerLogger.error('동적 카테고리 응답 처리 실패', error, 'DynamicCategoryManager');
      return this.getFallbackCategory(metadata);
    }
  }

  /**
   * 폴백 카테고리 생성
   */
  getFallbackCategory(metadata) {
    // 메타데이터에서 키워드 추출하여 가장 적합한 대카테고리 선택
    const { caption = '', hashtags = [] } = metadata;
    const text = (caption + ' ' + hashtags.join(' ')).toLowerCase();

    let bestMainCategory = '엔터테인먼트'; // 기본값

    // 간단한 키워드 매칭 (우선순위 순서)
    const keywordMap = {
      '게임': ['게임', 'game', '플레이', '실황', '게이밍'],
      '노하우/스타일': ['요리', '뷰티', '메이크업', '패션', 'DIY', '인테리어', '쿡방', '화장'],
      '영화/애니메이션': ['영화', '드라마', '애니', '예고편', '시네마'],
      '과학기술': ['기술', '과학', '테크', '컴퓨터', 'AI', '로봇', '스마트폰'],
      '교육': ['교육', '강의', '학습', '공부', '튜토리얼', '수업'],
      '뉴스/정치': ['뉴스', '정치', '시사', '이슈', '분석'],
      '비영리/사회운동': ['봉사', '기부', '환경', '사회', '공익'],
      '스포츠': ['운동', '피트니스', '헬스', '스포츠', '경기', '홈트'],
      '애완동물/동물': ['동물', '펫', '강아지', '고양이', '반려동물'],
      '엔터테인먼트': ['예능', '밈', '챌린지', '트렌드'],
      '여행/이벤트': ['여행', '캠핑', '축제', '이벤트'],
      '음악': ['음악', '노래', '뮤직', '커버', '라이브'],
      '인물/블로그': ['일상', '브이로그', '인터뷰', '스토리'],
      '자동차/교통': ['자동차', '차', '튜닝', '드라이빙'],
      '코미디': ['코미디', '개그', '웃긴', '재미', '유머']
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        bestMainCategory = category;
        break;
      }
    }

    return {
      mainCategory: bestMainCategory,
      middleCategory: '일반',  // 중카테고리 추가 (호환성)
      fullPath: `${bestMainCategory} > 일반`,
      categoryPath: [bestMainCategory, '일반'],
      depth: 2,
      keywords: ['영상', '콘텐츠'],
      hashtags: ['#영상', '#콘텐츠'],
      content: `${bestMainCategory} 관련 콘텐츠`,  // 기본 분석 내용
      confidence: 0.5,
      source: 'fallback-metadata',
      normalized: false
    };
  }

  /**
   * 카테고리 사용 통계 업데이트
   */
  updateCategoryUsage(categoryPath) {
    if (!this.categoryStats.usage[categoryPath]) {
      this.categoryStats.usage[categoryPath] = {
        count: 0,
        firstUsed: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
    }

    this.categoryStats.usage[categoryPath].count += 1;
    this.categoryStats.usage[categoryPath].lastUsed = new Date().toISOString();
    this.categoryStats.lastUpdated = new Date().toISOString();

    // 주기적으로 통계 저장 (매 10회마다)
    if (Object.values(this.categoryStats.usage).reduce((sum, stat) => sum + stat.count, 0) % 10 === 0) {
      this.saveCategoryStats();
    }
  }

  /**
   * 동의어 학습 및 정규화 규칙 업데이트
   */
  learnFromUserFeedback(originalCategory, correctedCategory) {
    if (originalCategory === correctedCategory) {
      return;
    }

    // 새로운 정규화 규칙 추가
    const original = originalCategory.split(' > ').pop(); // 마지막 부분
    const corrected = correctedCategory.split(' > ').pop();

    if (original !== corrected) {
      this.normalizationRules.preferred[original] = corrected;
      
      // 동의어 그룹에 추가
      let synonymGroup = null;
      for (const [key, synonyms] of Object.entries(this.normalizationRules.synonyms)) {
        if (key === corrected || synonyms.includes(corrected)) {
          synonymGroup = key === corrected ? key : corrected;
          break;
        }
      }

      if (synonymGroup) {
        if (!this.normalizationRules.synonyms[synonymGroup].includes(original)) {
          this.normalizationRules.synonyms[synonymGroup].push(original);
        }
      } else {
        this.normalizationRules.synonyms[corrected] = [original];
      }

      this.saveNormalizationRules();
      ServerLogger.info(`정규화 규칙 학습: ${original} → ${corrected}`, null, 'DynamicCategoryManager');
    }
  }

  /**
   * 인기 카테고리 조회
   */
  getPopularCategories(limit = 10) {
    const sorted = Object.entries(this.categoryStats.usage)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, limit);

    return sorted.map(([path, stats]) => ({
      path,
      count: stats.count,
      lastUsed: stats.lastUsed
    }));
  }

  /**
   * 카테고리 추천
   */
  recommendCategories(keywords, limit = 5) {
    const recommendations = [];
    
    // 기존 카테고리에서 키워드 매칭
    for (const [path, stats] of Object.entries(this.categoryStats.usage)) {
      let score = 0;
      const pathParts = path.split(' > ');
      
      keywords.forEach(keyword => {
        pathParts.forEach(part => {
          if (part.toLowerCase().includes(keyword.toLowerCase()) ||
              keyword.toLowerCase().includes(part.toLowerCase())) {
            score += 1;
          }
        });
      });

      if (score > 0) {
        recommendations.push({
          path,
          score: score * stats.count, // 매칭 점수 * 사용 빈도
          count: stats.count
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 정규화 규칙 저장
   */
  saveNormalizationRules() {
    try {
      fs.writeFileSync(this.normalizationRulesPath, JSON.stringify(this.normalizationRules, null, 2), 'utf8');
    } catch (error) {
      ServerLogger.error('정규화 규칙 저장 실패', error, 'DynamicCategoryManager');
    }
  }

  /**
   * 카테고리 통계 저장
   */
  saveCategoryStats() {
    try {
      fs.writeFileSync(this.categoryStatsPath, JSON.stringify(this.categoryStats, null, 2), 'utf8');
    } catch (error) {
      ServerLogger.error('카테고리 통계 저장 실패', error, 'DynamicCategoryManager');
    }
  }

  /**
   * 고정 대카테고리 목록 반환
   */
  getFixedMainCategories() {
    return [...this.FIXED_MAIN_CATEGORIES];
  }

  /**
   * 동적 카테고리 프롬프트 생성
   */
  buildDynamicCategoryPrompt(metadata) {
    const platform = metadata.platform || '소셜미디어';
    
    return `이 ${platform} 영상을 분석하여 카테고리를 분류해주세요.

**분류 규칙:**
1. 대카테고리는 반드시 다음 중 하나 선택: ${this.FIXED_MAIN_CATEGORIES.join(', ')}
2. 하위 카테고리는 콘텐츠에 맞게 적절한 깊이까지 자유롭게 생성
3. 너무 깊게 들어가지 말고, 의미있는 구분선까지만 생성 (최대 4-5단계)
4. 한국어 사용, 간결하고 명확한 용어 사용

**예시:**
- 간단한 콘텐츠: "요리 > 한식"
- 구체적인 콘텐츠: "게임 > 호러 > 1인칭 > 생존게임"  
- 교육 콘텐츠: "교육 > 프로그래밍 > 파이썬"

**JSON 응답 형식:**
{
  "main_category": "선택한 대카테고리",
  "category_path": ["하위1", "하위2", "하위3"],
  "full_path": "대카테고리 > 하위1 > 하위2 > 하위3",
  "content": "영상에서 보이는 내용과 주요 활동을 설명",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"],
  "confidence": 0.95,
  "depth": 4
}

콘텐츠 정보:
- 캡션: "${metadata.caption || ''}"
- 플랫폼: ${metadata.platform || 'unknown'}`;
  }

  /**
   * 시스템 통계 조회
   */
  getSystemStats() {
    const uniquePaths = Object.keys(this.categoryStats.usage).length;
    const totalUsage = Object.values(this.categoryStats.usage).reduce((sum, stat) => sum + stat.count, 0);
    const avgDepth = Object.keys(this.categoryStats.usage).reduce((sum, path) => sum + path.split(' > ').length, 0) / uniquePaths || 0;

    return {
      totalCategories: uniquePaths,
      totalUsage: totalUsage,
      averageDepth: Math.round(avgDepth * 100) / 100,
      normalizationRules: Object.keys(this.normalizationRules.preferred).length,
      synonymGroups: Object.keys(this.normalizationRules.synonyms).length,
      lastUpdated: this.categoryStats.lastUpdated
    };
  }
}

module.exports = DynamicCategoryManager;
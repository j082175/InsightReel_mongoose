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
    this.verifiedCategoriesPath = path.join(__dirname, '../config/verified-categories.json');
    
    this.loadNormalizationRules();
    this.loadCategoryStats();
    this.loadVerifiedCategories();
    
    // 플랫폼별 대카테고리 설정
    this.PLATFORM_CATEGORIES = {
      // YouTube용 기존 15개 대카테고리
      youtube: [
        "게임", "과학기술", "교육", "노하우/스타일", "뉴스/정치",
        "비영리/사회운동", "스포츠", "애완동물/동물", "엔터테인먼트",
        "여행/이벤트", "영화/애니메이션", "음악", "인물/블로그", 
        "자동차/교통", "코미디"
      ],
      // TikTok/Instagram용 12개 대카테고리
      tiktok: [
        "엔터테인먼트", "뷰티 및 스타일", "퍼포먼스", "스포츠 및 아웃도어",
        "사회", "라이프스타일", "차량 및 교통", "재능",
        "자연", "문화, 교육 및 기술", "가족 및 연애", "초자연적 현상 및 공포"
      ],
      instagram: [
        "엔터테인먼트", "뷰티 및 스타일", "퍼포먼스", "스포츠 및 아웃도어",
        "사회", "라이프스타일", "차량 및 교통", "재능",
        "자연", "문화, 교육 및 기술", "가족 및 연애", "초자연적 현상 및 공포"
      ]
    };
    
    // 하위 호환성을 위해 FIXED_MAIN_CATEGORIES 유지 (기본값은 YouTube)
    this.FIXED_MAIN_CATEGORIES = this.PLATFORM_CATEGORIES.youtube;
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
   * 검증된 카테고리 로드 (자가 학습 시스템)
   */
  loadVerifiedCategories() {
    try {
      if (fs.existsSync(this.verifiedCategoriesPath)) {
        const data = fs.readFileSync(this.verifiedCategoriesPath, 'utf8');
        this.verifiedCategories = JSON.parse(data);
      } else {
        this.initializeVerifiedCategories();
      }
      ServerLogger.success(`검증된 카테고리 로드 완료: ${Object.keys(this.verifiedCategories.patterns).length}개 패턴`, null, 'DynamicCategoryManager');
    } catch (error) {
      ServerLogger.error('검증된 카테고리 로드 실패', error, 'DynamicCategoryManager');
      this.initializeVerifiedCategories();
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
   * 검증된 카테고리 초기화 (자가 학습 시스템)
   */
  initializeVerifiedCategories() {
    this.verifiedCategories = {
      patterns: {}, // 컨텐츠 패턴별 검증된 카테고리
      metadata: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPatterns: 0,
        totalVerifications: 0
      }
    };
    this.saveVerifiedCategories();
    ServerLogger.info('검증된 카테고리 초기화 완료', null, 'DynamicCategoryManager');
  }

  /**
   * 동적 카테고리 경로 정규화
   */
  normalizeCategoryPath(rawPath, platform = 'youtube') {
    if (!rawPath || typeof rawPath !== 'string') {
      return null;
    }

    const parts = rawPath.split(' > ').map(part => part.trim());
    
    // 플랫폼별 대카테고리 검증
    const validCategories = this.getMainCategoriesForPlatform(platform);
    if (!validCategories.includes(parts[0])) {
      ServerLogger.warn(`유효하지 않은 대카테고리: ${parts[0]} (플랫폼: ${platform})`, null, 'DynamicCategoryManager');
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
  processDynamicCategoryResponse(aiResponse, metadata, aiModel = null) {
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

      // 카테고리 경로 정규화 (플랫폼 정보 포함)
      const platform = metadata.platform || 'youtube';
      const normalized = this.normalizeCategoryPath(categoryData.full_path, platform);
      if (!normalized) {
        ServerLogger.warn(`카테고리 정규화 실패: ${categoryData.full_path} (플랫폼: ${platform})`, null, 'DynamicCategoryManager');
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
        summary: categoryData.summary || '',  // AI 분석 내용 보존
        confidence: categoryData.confidence || 0.8,
        source: 'dynamic-ai-generated',
        aiModel: aiModel || 'AI',  // AI 모델 정보 보존
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
    // 플랫폼별 적절한 기본 카테고리 선택
    const platform = metadata.platform || 'youtube';
    const validCategories = this.getMainCategoriesForPlatform(platform);
    
    // 메타데이터에서 키워드 추출하여 가장 적합한 대카테고리 선택
    const { caption = '', hashtags = [] } = metadata;
    const text = (caption + ' ' + hashtags.join(' ')).toLowerCase();

    let bestMainCategory = validCategories[0]; // 첫 번째 카테고리를 기본값으로

    // 플랫폼별 키워드 매핑
    const youtubeKeywordMap = {
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

    const tikTokInstagramKeywordMap = {
      '엔터테인먼트': ['예능', '밈', '챌린지', '트렌드', '재미', '웃긴'],
      '뷰티 및 스타일': ['뷰티', '메이크업', '화장', '패션', '스타일', '옷'],
      '퍼포먼스': ['댄스', '노래', '연주', '공연', '쇼'],
      '스포츠 및 아웃도어': ['운동', '피트니스', '헬스', '스포츠', '경기', '홈트', '캠핑', '등산'],
      '사회': ['시사', '뉴스', '정치', '이슈', '사회문제'],
      '라이프스타일': ['일상', '브이로그', '라이프', '데일리', '생활'],
      '차량 및 교통': ['자동차', '차', '튜닝', '드라이빙', '바이크'],
      '재능': ['기술', '스킬', '능력', '재주', 'DIY', '만들기'],
      '자연': ['동물', '펫', '강아지', '고양이', '반려동물', '자연', '식물', '꽃'],
      '문화, 교육 및 기술': ['교육', '강의', '학습', '공부', '튜토리얼', '기술', '과학', '문화'],
      '가족 및 연애': ['가족', '연애', '사랑', '육아', '아이', '부모'],
      '초자연적 현상 및 공포': ['공포', '호러', '무서운', '귀신', '초자연']
    };

    const keywordMap = platform === 'youtube' ? youtubeKeywordMap : tikTokInstagramKeywordMap;

    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (validCategories.includes(category) && keywords.some(keyword => text.includes(keyword))) {
        bestMainCategory = category;
        break;
      }
    }

    return {
      mainCategory: bestMainCategory,
      middleCategory: '일반',  // 중카테고리 추가 (호환성)
      fullPath: `${bestMainCategory} > 일반 > 기본`,  // 최소 3단계로 수정
      categoryPath: [bestMainCategory, '일반', '기본'],
      depth: 3,
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
   * 검증된 카테고리 저장
   */
  saveVerifiedCategories() {
    try {
      fs.writeFileSync(this.verifiedCategoriesPath, JSON.stringify(this.verifiedCategories, null, 2), 'utf8');
    } catch (error) {
      ServerLogger.error('검증된 카테고리 저장 실패', error, 'DynamicCategoryManager');
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
  /**
   * 플랫폼에 맞는 대카테고리 목록 반환
   * @param {string} platform - 플랫폼 이름 (youtube, tiktok, instagram)
   * @returns {Array} 대카테고리 목록
   */
  getMainCategoriesForPlatform(platform) {
    const normalizedPlatform = platform?.toLowerCase();
    
    // YouTube는 기존 15개 카테고리 사용
    if (normalizedPlatform === 'youtube') {
      return this.PLATFORM_CATEGORIES.youtube;
    }
    
    // TikTok, Instagram은 새로운 12개 카테고리 사용
    if (normalizedPlatform === 'tiktok' || normalizedPlatform === 'instagram') {
      return this.PLATFORM_CATEGORIES[normalizedPlatform] || this.PLATFORM_CATEGORIES.tiktok;
    }
    
    // 기본값은 YouTube 카테고리
    ServerLogger.warn(`알 수 없는 플랫폼: ${platform}, YouTube 카테고리 사용`, null, 'DynamicCategoryManager');
    return this.PLATFORM_CATEGORIES.youtube;
  }

  buildDynamicCategoryPrompt(metadata) {
    // 플랫폼에 따라 다른 대카테고리 사용
    const platform = metadata.platform || 'youtube';
    const categories = this.getMainCategoriesForPlatform(platform);
    
    ServerLogger.info(`플랫폼: ${platform}, 대카테고리 수: ${categories.length}개`, null, 'DynamicCategoryManager');
    
    return `이 ${platform} 영상을 분석하여 카테고리를 분류해주세요.

**분류 규칙:**
1. 대카테고리는 반드시 다음 중 하나 선택: ${categories.join(', ')}
2. 하위 카테고리는 가능한 한 구체적이고 깊게 분류 (최대 6단계까지)
3. 영상의 세부 특징을 최대한 반영하여 구체적으로 분류
4. 한국어 사용, 간결하고 명확한 용어 사용
5. **중요: 가능한 한 깊게 분류하여 영상의 정확한 특성을 표현하세요**

**예시 (깊게 분류할수록 좋음):**
- 최소: "요리 > 한식" → 더 깊게: "요리 > 한식 > 찌개 > 김치찌개 > 돼지고기김치찌개"
- 보통: "게임 > FPS" → 더 깊게: "게임 > FPS > 배틀로얄 > 발로란트 > 랭크전 > 에이전트가이드"  
- 좋음: "교육 > 프로그래밍 > 웹개발 > 프론트엔드 > React > Hooks > useState"
- 매우 좋음: "엔터테인먼트 > 예능 > 리얼리티 > 서바이벌 > 무인도 > 생존챌린지"

**JSON 응답 형식:**
{
  "main_category": "선택한 대카테고리",
  "category_path": ["하위1", "하위2", ...],  // 필요한 만큼 (최대 5개)
  "full_path": "대카테고리 > 하위1 > 하위2 > ...",  // 전체 경로 (최대 6단계까지만)
  "content": "영상에서 보이는 내용과 주요 활동을 설명",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"],
  "confidence": 0.95,
  "depth": 3  // 실제 깊이 (1~6)
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
      verifiedPatterns: this.verifiedCategories ? Object.keys(this.verifiedCategories.patterns).length : 0,
      lastUpdated: this.categoryStats.lastUpdated
    };
  }

  // ====================================
  // 자가 학습 카테고리 시스템 (Self-Learning Category System)
  // ====================================

  /**
   * 콘텐츠 시그니처 생성 (유사 콘텐츠 식별용)
   * @param {Object} metadata - 콘텐츠 메타데이터
   * @returns {string} 콘텐츠 시그니처
   */
  generateContentSignature(metadata) {
    const { caption = '', hashtags = [], platform = 'youtube' } = metadata;
    
    // 키워드 추출 및 정규화
    const text = (caption + ' ' + hashtags.join(' ')).toLowerCase();
    const words = text.match(/[\w가-힣]+/g) || [];
    
    // 의미있는 키워드 추출 (길이 2 이상, 특정 단어들)
    const meaningfulWords = words
      .filter(word => word.length >= 2)
      .filter(word => !['the', 'and', 'or', 'but', '그리고', '하지만', '그런데', '그래서'].includes(word))
      .slice(0, 10); // 상위 10개만
    
    // 정렬하여 일관된 시그니처 생성
    meaningfulWords.sort();
    
    const signature = `${platform}:${meaningfulWords.join(',')}`;
    return signature;
  }

  /**
   * 유사한 검증된 패턴 찾기
   * @param {string} contentSignature - 콘텐츠 시그니처
   * @returns {Object|null} 유사한 검증된 카테고리 정보
   */
  findSimilarVerifiedPattern(contentSignature) {
    if (!this.verifiedCategories || !this.verifiedCategories.patterns) {
      return null;
    }

    const patterns = this.verifiedCategories.patterns;
    const [platform, keywords] = contentSignature.split(':');
    const currentKeywords = keywords.split(',').filter(k => k.length > 0);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [patternSignature, verifiedData] of Object.entries(patterns)) {
      const [patternPlatform, patternKeywords] = patternSignature.split(':');
      
      // 플랫폼이 다르면 스킵
      if (patternPlatform !== platform) continue;
      
      const patternKeywordList = patternKeywords.split(',').filter(k => k.length > 0);
      
      // 키워드 유사도 계산
      const intersection = currentKeywords.filter(k => patternKeywordList.includes(k));
      const union = [...new Set([...currentKeywords, ...patternKeywordList])];
      const similarity = intersection.length / union.length;
      
      // 유사도가 0.3 이상이고 현재 최고 점수보다 높으면 업데이트
      if (similarity >= 0.3 && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          signature: patternSignature,
          similarity,
          verifiedCategory: verifiedData.verifiedCategory,
          analysisCount: verifiedData.analysisCount,
          confidence: verifiedData.confidence
        };
      }
    }
    
    if (bestMatch) {
      ServerLogger.info(`✅ 유사 패턴 발견: ${bestMatch.signature} (유사도: ${(bestMatch.similarity * 100).toFixed(1)}%)`, null, 'SelfLearning');
    }
    
    return bestMatch;
  }

  /**
   * 새로운 검증된 카테고리 저장
   * @param {string} contentSignature - 콘텐츠 시그니처
   * @param {Array} analysisResults - 20번 분석 결과들
   * @returns {Object} 검증된 카테고리 정보
   */
  saveVerifiedCategoryFromAnalysis(contentSignature, analysisResults) {
    // 카테고리별 투표 집계
    const votes = {};
    const validResults = analysisResults.filter(result => result && result.fullPath);
    
    for (const result of validResults) {
      const categoryKey = result.fullPath;
      if (!votes[categoryKey]) {
        votes[categoryKey] = {
          count: 0,
          examples: []
        };
      }
      votes[categoryKey].count++;
      votes[categoryKey].examples.push({
        keywords: result.keywords || [],
        hashtags: result.hashtags || [],
        summary: result.summary || '',
        confidence: result.confidence || 0
      });
    }
    
    // 가장 많은 표를 받은 카테고리 선택
    let bestCategory = null;
    let maxVotes = 0;
    
    for (const [category, voteData] of Object.entries(votes)) {
      if (voteData.count > maxVotes) {
        maxVotes = voteData.count;
        bestCategory = {
          fullPath: category,
          count: voteData.count,
          examples: voteData.examples
        };
      }
    }
    
    if (!bestCategory) {
      ServerLogger.error('검증된 카테고리 생성 실패: 유효한 분석 결과 없음', null, 'SelfLearning');
      return null;
    }
    
    // 신뢰도 계산 (투표 비율 * 평균 confidence)
    const voteRatio = bestCategory.count / validResults.length;
    const avgConfidence = bestCategory.examples.reduce((sum, ex) => sum + ex.confidence, 0) / bestCategory.examples.length;
    const finalConfidence = voteRatio * avgConfidence;
    
    // 검증된 카테고리 저장
    const verifiedData = {
      verifiedCategory: {
        fullPath: bestCategory.fullPath,
        parts: bestCategory.fullPath.split(' > '),
        mainCategory: bestCategory.fullPath.split(' > ')[0],
        middleCategory: bestCategory.fullPath.split(' > ')[1] || '일반'
      },
      analysisCount: validResults.length,
      totalVotes: maxVotes,
      voteRatio: voteRatio,
      confidence: finalConfidence,
      examples: bestCategory.examples.slice(0, 5), // 최대 5개 예시만 저장
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    this.verifiedCategories.patterns[contentSignature] = verifiedData;
    this.verifiedCategories.metadata.totalPatterns++;
    this.verifiedCategories.metadata.totalVerifications++;
    this.verifiedCategories.metadata.lastUpdated = new Date().toISOString();
    
    this.saveVerifiedCategories();
    
    ServerLogger.success(`🎯 검증된 카테고리 저장: ${bestCategory.fullPath} (${maxVotes}/${validResults.length}표, 신뢰도: ${(finalConfidence * 100).toFixed(1)}%)`, null, 'SelfLearning');
    
    return verifiedData;
  }

  /**
   * 검증된 카테고리 참조용 프롬프트 생성
   * @param {Object} similarPattern - 유사한 검증된 패턴
   * @returns {string} 참조용 프롬프트 텍스트
   */
  buildVerifiedCategoryReference(similarPattern) {
    if (!similarPattern || !similarPattern.verifiedCategory) {
      return '';
    }
    
    const { verifiedCategory, confidence, analysisCount, similarity } = similarPattern;
    
    const referencePrompt = `

**참고할 검증된 카테고리 정보:**
이와 유사한 콘텐츠(유사도: ${(similarity * 100).toFixed(1)}%)에서 ${analysisCount}번 분석 결과:
- 검증된 카테고리: "${verifiedCategory.fullPath}"
- 신뢰도: ${(confidence * 100).toFixed(1)}%

위 검증된 카테고리를 참고하되, 현재 영상의 실제 내용에 더 적합한 카테고리가 있다면 새로운 분류를 사용하세요.`;

    return referencePrompt;
  }

  /**
   * 검증된 카테고리 사용 통계 업데이트
   * @param {string} contentSignature - 사용된 패턴 시그니처
   */
  updateVerifiedCategoryUsage(contentSignature) {
    if (this.verifiedCategories.patterns[contentSignature]) {
      this.verifiedCategories.patterns[contentSignature].lastUsed = new Date().toISOString();
      this.saveVerifiedCategories();
    }
  }

  /**
   * 자가 학습 시스템 활성 여부 확인
   * @returns {boolean} 활성 여부
   */
  isSelfLearningEnabled() {
    return process.env.USE_SELF_LEARNING_CATEGORIES === 'true';
  }

  /**
   * 자가 학습 통계 조회
   * @returns {Object} 통계 정보
   */
  getSelfLearningStats() {
    if (!this.verifiedCategories) {
      return { enabled: false };
    }

    const patterns = this.verifiedCategories.patterns || {};
    const totalPatterns = Object.keys(patterns).length;
    
    // 플랫폼별 통계
    const platformStats = {};
    for (const [signature, data] of Object.entries(patterns)) {
      const platform = signature.split(':')[0];
      if (!platformStats[platform]) {
        platformStats[platform] = 0;
      }
      platformStats[platform]++;
    }
    
    // 신뢰도별 분포
    const confidenceDistribution = {
      high: 0, // 0.8 이상
      medium: 0, // 0.5 이상
      low: 0 // 0.5 미만
    };
    
    for (const data of Object.values(patterns)) {
      if (data.confidence >= 0.8) {
        confidenceDistribution.high++;
      } else if (data.confidence >= 0.5) {
        confidenceDistribution.medium++;
      } else {
        confidenceDistribution.low++;
      }
    }

    return {
      enabled: this.isSelfLearningEnabled(),
      totalPatterns,
      platformStats,
      confidenceDistribution,
      totalVerifications: this.verifiedCategories.metadata.totalVerifications || 0,
      created: this.verifiedCategories.metadata.created,
      lastUpdated: this.verifiedCategories.metadata.lastUpdated
    };
  }
}

module.exports = DynamicCategoryManager;
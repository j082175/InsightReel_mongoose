const { ServerLogger } = require('../utils/logger');
const UnifiedCategoryManager = require('./UnifiedCategoryManager');

/**
 * AI 프롬프트 동적 생성 클래스
 */
class PromptBuilder {
  constructor(categoryManager) {
    this.categoryManager = categoryManager;
    this.dynamicCategoryManager = UnifiedCategoryManager.getInstance({ mode: 'dynamic' });
    this.useDynamicCategories = process.env.USE_DYNAMIC_CATEGORIES === 'true';
  }

  /**
   * 카테고리 구조를 프롬프트용 텍스트로 변환
   */
  buildCategoryStructure() {
    const categories = this.categoryManager.getAllCategories();
    const structure = [];
    
    for (const [mainCat, middleCats] of Object.entries(categories)) {
      const middleOptions = Object.keys(middleCats).join(' | ');
      structure.push(`• ${mainCat} → ${middleOptions}`);
    }
    
    return structure.join('\n');
  }

  /**
   * 단일 프레임 분석 프롬프트 생성
   */
  buildSingleFramePrompt(metadata) {
    // 동적 카테고리 모드인 경우
    if (this.useDynamicCategories) {
      return this.dynamicCategoryManager.buildDynamicCategoryPrompt(metadata);
    }
    
    // 기존 2단계 카테고리 모드
    const platform = metadata.platform || '소셜미디어';
    const categoryStructure = this.buildCategoryStructure();
    const mainCategories = this.categoryManager.getMainCategories();
    
    return `이 ${platform} 영상의 스크린샷을 보고 정확한 카테고리를 분류해주세요.

**이미지 분석 지침:**
1. 화면에 보이는 주요 내용 (인물, 객체, 배경, 텍스트, 자막)
2. 영상의 주제와 목적
3. 시각적 단서들 (UI, 브랜드, 로고, 환경)

**카테고리 분류 체계** (반드시 이 중에서 선택):
${categoryStructure}

**JSON 응답 형식** (반드시 이 형식을 따르세요):
{
  "content": "이미지에서 보이는 내용을 설명하세요",
  "main_category": "${mainCategories.length}개 대카테고리 중 하나를 정확히 선택",
  "middle_category": "선택한 대카테고리의 중카테고리 중 하나를 정확히 선택",
  "keywords": ["관련", "키워드", "다섯개", "선택", "하세요"],
  "hashtags": ["#관련", "#해시태그", "#다섯개", "#선택", "#하세요"],
  "confidence": 0.95
}

**주의사항:**
- main_category는 위에 나열된 대카테고리 중 하나여야 합니다
- middle_category는 선택한 대카테고리에 속한 중카테고리여야 합니다
- 키워드와 해시태그는 한국어로 작성하세요
- confidence는 0~1 사이의 숫자입니다`;
  }

  /**
   * 다중 프레임 분석 프롬프트 생성
   */
  buildMultipleFramesPrompt(frameCount, metadata) {
    // 동적 카테고리 모드인 경우
    if (this.useDynamicCategories) {
      const dynamicPrompt = this.dynamicCategoryManager.buildDynamicCategoryPrompt(metadata);
      // 다중 프레임용으로 약간 수정
      return dynamicPrompt.replace('영상을 분석하여', `${frameCount}개 프레임으로 구성된 영상을 분석하여`)
        .replace('콘텐츠 정보:', `이 ${frameCount}개의 이미지들은 같은 비디오에서 시간순으로 추출된 프레임들입니다. 전체적인 흐름과 내용을 파악하여 분석해주세요.\n\n콘텐츠 정보:`);
    }
    
    // 기존 2단계 카테고리 모드
    const platform = metadata.platform || '소셜미디어';
    const categoryStructure = this.buildCategoryStructure();
    const mainCategories = this.categoryManager.getMainCategories();
    
    return `이 ${platform} 영상의 ${frameCount}개 프레임을 분석하고 카테고리를 분류해주세요.
각 프레임은 영상의 다른 시점을 나타냅니다.

**분석 방법:**
1. 전체 비디오 내용: 시간에 따른 변화와 전체적인 스토리를 설명
2. 카테고리 분류 (2단계):
   **중요: 반드시 아래 구조에서만 선택하세요**:
   
${categoryStructure}

3. 키워드: 비디오 전체 내용을 대표하는 한국어 키워드 5개
4. 해시태그: SNS용 한국어 해시태그 5개 (#포함)
5. 신뢰도: 0~1 사이의 분석 신뢰도

**JSON 응답 형식** (반드시 이 형식을 따르세요):
{
  "content": "비디오 전체 내용을 시간순으로 설명",
  "main_category": "${mainCategories.length}개 대카테고리 중 하나를 정확히 선택",
  "middle_category": "선택한 대카테고리의 중카테고리 중 하나를 정확히 선택",
  "keywords": ["관련", "키워드", "다섯개", "선택", "하세요"],
  "hashtags": ["#관련", "#해시태그", "#다섯개", "#선택", "#하세요"],
  "confidence": 0.95
}`;
  }

  /**
   * 카테고리 수정 프롬프트 생성
   */
  buildCorrectionPrompt(errorReason, mainCategory = null) {
    const categories = this.categoryManager.getAllCategories();
    
    if (errorReason === 'Invalid main category') {
      const validCategories = this.categoryManager.getMainCategories();
      return `
⚠️ **중요**: 이전 분석에서 유효하지 않은 대카테고리를 선택했습니다.
다음 중에서만 선택하세요:
${validCategories.join(', ')}

절대 위 목록에 없는 카테고리를 만들지 마세요.`;
    } 
    
    if (errorReason === 'Invalid middle category for main category') {
      const validMiddleCategories = mainCategory 
        ? this.categoryManager.getMiddleCategories(mainCategory)
        : [];
      
      return `
⚠️ **중요**: 이전 분석에서 대카테고리와 중카테고리 조합이 잘못되었습니다.
${mainCategory ? `"${mainCategory}"의 유효한 중카테고리: ${validMiddleCategories.join(', ')}` : ''}
각 대카테고리에 맞는 정확한 중카테고리만 선택하세요.

잘못된 조합을 절대 만들지 마세요.`;
    }
    
    return `
⚠️ 이전 분석이 실패했습니다. 다시 분석해주세요.
카테고리 선택 시 제공된 목록에서만 선택하세요.`;
  }

  /**
   * 카테고리 선택 예시 생성 (AI 학습용)
   */
  buildExamples() {
    const categories = this.categoryManager.getAllCategories();
    const examples = [];
    
    // 각 대카테고리별로 예시 생성
    for (const [mainCat, middleCats] of Object.entries(categories)) {
      const middleOptions = Object.keys(middleCats);
      if (middleOptions.length > 0) {
        examples.push({
          main: mainCat,
          middle: middleOptions[0],
          description: `${mainCat} 카테고리의 ${middleOptions[0]} 관련 콘텐츠`
        });
      }
    }
    
    return examples;
  }

  /**
   * 프롬프트 검증
   */
  validatePrompt(prompt) {
    const requiredElements = [
      'main_category',
      'middle_category',
      'keywords',
      'hashtags',
      'confidence'
    ];
    
    const missingElements = requiredElements.filter(element => 
      !prompt.includes(element)
    );
    
    if (missingElements.length > 0) {
      ServerLogger.warn('프롬프트에 필수 요소 누락:', missingElements, 'PromptBuilder');
    }
    
    return missingElements.length === 0;
  }
}

module.exports = PromptBuilder;
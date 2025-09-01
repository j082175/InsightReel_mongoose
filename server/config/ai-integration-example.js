/**
 * AIAnalyzer.js 통합 예시
 * 
 * 이 파일은 AIAnalyzer.js를 수정하는 방법을 보여줍니다.
 * 실제 적용 시 AIAnalyzer.js의 해당 부분을 이렇게 수정하면 됩니다.
 */

const CategoryManager = require('./CategoryManager');
const PromptBuilder = require('./PromptBuilder');

class AIAnalyzer {
  constructor() {
    // 기존 Gemini 설정...
    
    // 카테고리 매니저와 프롬프트 빌더 초기화
    this.categoryManager = new CategoryManager();
    this.promptBuilder = new PromptBuilder(this.categoryManager);
    
    // 기존의 하드코딩된 this.categories 제거
    // this.categories = { ... } ← 이 부분 삭제
  }

  /**
   * 프롬프트 생성 메서드 수정
   */
  buildSimpleAnalysisPrompt(metadata) {
    // 기존 하드코딩된 프롬프트 대신 동적 생성
    return this.promptBuilder.buildSingleFramePrompt(metadata);
  }

  /**
   * 다중 프레임 프롬프트 생성 메서드 수정
   */
  buildMultipleFramesPrompt(frameCount, metadata) {
    return this.promptBuilder.buildMultipleFramesPrompt(frameCount, metadata);
  }

  /**
   * 카테고리 검증 메서드 수정
   */
  validateCategoryPair(mainCategory, middleCategory, preferredMainCategory = null) {
    // CategoryManager의 검증 메서드 사용
    const validation = this.categoryManager.validateCategory(mainCategory, middleCategory);
    
    if (!validation.isValid) {
      // 선호 카테고리가 있는 경우 대체 처리
      if (preferredMainCategory) {
        const middleCategories = this.categoryManager.getMiddleCategories(preferredMainCategory);
        if (middleCategories.length > 0) {
          return {
            isValid: true,
            mainCategory: preferredMainCategory,
            middleCategory: middleCategories[0],
            reason: 'Used preferred category'
          };
        }
      }
      
      return {
        isValid: false,
        reason: validation.error,
        suggestions: validation.suggestions
      };
    }
    
    return {
      isValid: true,
      mainCategory: mainCategory,
      middleCategory: middleCategory
    };
  }

  /**
   * URL 기반 카테고리 추론 수정
   */
  inferCategoryFromURL(url, caption) {
    // 키워드 추출 로직...
    const keywords = this.extractKeywordsFromText(caption);
    
    // CategoryManager의 추론 메서드 사용
    const inference = this.categoryManager.inferCategoryFromKeywords(keywords);
    
    return {
      mainCategory: inference.main,
      middleCategory: inference.middle,
      confidence: inference.confidence || 0.5
    };
  }

  /**
   * AI 응답 후처리에서 카테고리 수정 프롬프트 생성
   */
  async retryWithCorrection(imagePath, errorReason, metadata) {
    // PromptBuilder의 수정 프롬프트 생성 메서드 사용
    const correctionPrompt = this.promptBuilder.buildCorrectionPrompt(
      errorReason, 
      metadata.mainCategory
    );
    
    const fullPrompt = this.promptBuilder.buildSingleFramePrompt(metadata) + '\n\n' + correctionPrompt;
    
    // AI 재호출...
    return await this.queryGemini(fullPrompt, imageBase64);
  }
}

// API 엔드포인트 추가 예시
const express = require('express');
const router = express.Router();

// 카테고리 조회
router.get('/api/categories', (req, res) => {
  const categoryManager = req.app.locals.categoryManager;
  res.json({
    success: true,
    categories: categoryManager.getAllCategories(),
    version: categoryManager.version
  });
});

// 카테고리 재로드
router.post('/api/categories/reload', (req, res) => {
  const categoryManager = req.app.locals.categoryManager;
  const result = categoryManager.reloadCategories();
  res.json(result);
});

// 카테고리 통계
router.get('/api/categories/stats', (req, res) => {
  const categoryManager = req.app.locals.categoryManager;
  res.json({
    success: true,
    stats: categoryManager.getStatistics()
  });
});

// 카테고리 추가 (관리자용)
router.post('/api/categories/add', (req, res) => {
  const { mainCategory, middleCategory, keywords } = req.body;
  const categoryManager = req.app.locals.categoryManager;
  
  try {
    const result = categoryManager.addCategory(mainCategory, middleCategory, keywords);
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
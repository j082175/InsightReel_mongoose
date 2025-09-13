const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');
const UnifiedCategoryManager = require('./UnifiedCategoryManager');
const UnifiedGeminiManager = require('../utils/unified-gemini-manager');
const { AI } = require('../config/constants');
// GoogleGenerativeAI는 UnifiedGeminiManager에서 처리하므로 제거

class AIAnalyzer {
  constructor() {
    
    // 통합 카테고리 시스템 초기화
    const categoryMode = process.env.USE_DYNAMIC_CATEGORIES === 'true' ? 'dynamic' : 
                        process.env.USE_FLEXIBLE_CATEGORIES === 'true' ? 'flexible' : 'basic';
    
    this.categoryManager = UnifiedCategoryManager.getInstance({ mode: categoryMode });
    this.useDynamicCategories = categoryMode !== 'basic';
    
    // AI 시스템 설정 (상호 배타적)
    this.useGemini = process.env.USE_GEMINI === 'true';
    this.geminiApiKey = process.env.GOOGLE_API_KEY;
    
    if (this.useGemini && !this.geminiApiKey) {
      throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다. Gemini API 키가 필요합니다.');
    }
    
    // 통합 Gemini 관리자 사용
    if (this.useGemini) {
      // 전역 설정과 동일한 모드 사용
      const mode = process.env.GEMINI_FALLBACK_MODE || 'single-model';
      const strategy = process.env.GEMINI_FALLBACK_STRATEGY || 'flash';
      
      this.geminiManager = UnifiedGeminiManager.getInstance({
        strategy: strategy,
        retryAttempts: 3,
        retryDelay: 2000
      });
      
      // 싱글톤이므로 UnifiedGeminiManager에서 이미 로그를 출력함 (중복 방지)
    } else {
      throw new Error('Gemini API를 사용해야 합니다. USE_GEMINI=true로 설정하세요.');
    }
    
    // 2단계 카테고리 정의 (대카테고리 > 중카테고리)
    this.categories = {
      '게임': {
        '플레이·리뷰': ['Let\'s Play', '신작 첫인상', '스피드런', '실황', '게임플레이', 'lets-play', 'gameplay'],
        '가이드·분석': ['공략', '세계관·스토리 해설', '게임공략', '스토리', '해설', 'guide', 'walkthrough'],
        'e스포츠': ['프로 경기', '하이라이트', '선수 다큐', '프로경기', '토너먼트', 'esports', 'tournament'],
        '장르 전문': ['FPS', 'RPG', '시뮬레이션', '롤플레잉', '슈팅게임', 'role-playing', 'simulation']
      },
      '과학·기술': {
        '디바이스 리뷰': ['모바일', 'PC', '카메라', '스마트폰', '컴퓨터', 'smartphone', 'computer'],
        '프로그래밍·코딩 강좌': ['프로그래밍', '코딩', '개발', '파이썬', '자바', 'programming', 'coding'],
        '과학 이론·실험': ['DIY', '실험 쇼', '과학실험', '만들기', 'diy', 'experiment'],
        '미래 트렌드': ['AI', '로봇', '우주', '인공지능', '로보틱스', 'artificial-intelligence', 'robotics']
      },
      '교육': {
        '외국어 강의': ['영어', '일본어', '중국어', '영어회화', 'english', 'language'],
        '학문·교양': ['역사', '경제', '심리', '한국사', '경제학', '심리학', 'history', 'economics'],
        '시험·자격증 대비': ['공무원', '자격증', '토익', '토플', 'civil-service', 'certification'],
        '자기계발·학습법': ['자기계발', '학습법', '공부법', '동기부여', 'self-development', 'study-method']
      },
      'How-to & 라이프스타일': {
        '요리·베이킹': ['쿡방', '요리', '베이킹', '레시피', '디저트', 'cooking', 'baking'],
        'DIY·공예·인테리어': ['DIY', '인테리어', '만들기', '홈데코', '집꾸미기', 'diy', 'interior'],
        '뷰티·패션': ['메이크업', 'OOTD', '화장법', '패션', '코디', 'makeup', 'fashion'],
        '생활 꿀팁·가전·정리': ['생활팁', '꿀팁', '정리', '수납', '미니멀', 'life-tips', 'organization']
      },
      '뉴스·시사': {
        '시사 브리핑·이슈 분석': ['시사브리핑', '이슈분석', '뉴스', '시사', '분석', 'news', 'analysis'],
        '정치 평론·토론': ['정치평론', '토론', '정치', '논쟁', 'politics', 'debate'],
        '탐사보도·다큐': ['탐사보도', '다큐멘터리', '다큐', '취재', 'documentary', 'investigation'],
        '공식 뉴스 클립': ['공식뉴스', '뉴스클립', 'official-news', 'news-clip']
      },
      '사회·공익': {
        '환경·인권 캠페인': ['환경', '인권', '환경보호', '기후변화', '사회정의', 'environment', 'human-rights'],
        '자선·봉사·기부': ['자선', '봉사', '기부', '자원봉사', 'charity', 'volunteer'],
        '지속가능·ESG 콘텐츠': ['지속가능', 'ESG', '친환경', '사회적책임', 'sustainability', 'social-responsibility']
      },
      '스포츠': {
        '경기 하이라이트': ['경기하이라이트', '스포츠', '축구', '야구', '농구', 'sports', 'highlights'],
        '분석·전술 해설': ['전술해설', '경기분석', '스포츠분석', 'tactics', 'sports-analysis'],
        '피트니스·홈트': ['피트니스', '홈트', '운동', '헬스', '다이어트', 'fitness', 'workout'],
        '선수 인터뷰·다큐': ['선수인터뷰', '스포츠다큐', '선수다큐', 'athlete-interview', 'sports-documentary']
      },
      '동물': {
        '반려동물 브이로그': ['반려동물', '펫', '강아지', '고양이', '반려견', 'pet', 'dog', 'cat'],
        '훈련·케어·정보': ['펫케어', '반려동물훈련', '동물병원', 'pet-care', 'animal-training'],
        '야생동물·자연 다큐': ['야생동물', '자연다큐', '동물다큐', 'wildlife', 'nature-documentary']
      },
      '엔터테인먼트': {
        '예능·밈·챌린지': ['예능', '밈', '챌린지', '트렌드', 'variety', 'meme', 'challenge'],
        '연예 뉴스·K-culture': ['연예뉴스', 'K-culture', '케이팝', '한류', 'k-pop', 'korean-culture'],
        '웹드라마·웹예능': ['웹드라마', '웹예능', '미니드라마', 'web-drama', 'web-variety'],
        '이벤트·라이브 쇼': ['이벤트', '라이브쇼', '콘서트', 'event', 'live-show']
      },
      '여행·이벤트': {
        '여행 Vlog': ['여행브이로그', '여행', '여행지', 'travel-vlog', 'travel'],
        '정보·꿀팁·루트': ['여행정보', '여행팁', '여행루트', 'travel-info', 'travel-tips'],
        '테마 여행·캠핑·차박': ['테마여행', '캠핑', '차박', '백패킹', 'camping', 'car-camping'],
        '축제·콘서트 스케치': ['축제', '콘서트', '페스티벌', 'festival', 'concert']
      },
      '영화·드라마·애니': {
        '공식 예고편·클립': ['예고편', '공식클립', '트레일러', 'trailer', 'official-clip'],
        '리뷰·해석': ['영화리뷰', '드라마리뷰', '해석', '분석', 'movie-review', 'drama-review'],
        '제작 비하인드·메이킹': ['비하인드', '메이킹', '제작과정', 'behind-the-scenes', 'making'],
        '팬 애니메이션·단편': ['팬애니', '애니메이션', '단편', 'fan-animation', 'animation']
      },
      '음악': {
        '뮤직비디오': ['뮤직비디오', 'MV', '음악', 'music-video'],
        '커버·리믹스': ['커버', '리믹스', '노래커버', 'cover', 'remix'],
        '라이브·버스킹': ['라이브', '버스킹', '공연', 'live', 'busking'],
        '악기 연주·작곡 강좌': ['악기연주', '작곡', '음악강좌', 'instrument', 'composition']
      },
      '라이프·블로그': {
        '일상 Vlog·Q&A': ['일상브이로그', 'QnA', '브이로그', 'daily-vlog', 'lifestyle'],
        '경험담·스토리텔링': ['경험담', '스토리텔링', '이야기', 'story', 'experience'],
        '동기부여·마인드셋': ['동기부여', '마인드셋', '자기계발', 'motivation', 'mindset'],
        '가족·커플·룸메이트 일상': ['가족', '커플', '룸메이트', '일상', 'family', 'couple']
      },
      '자동차·모빌리티': {
        '신차 리뷰·시승': ['신차리뷰', '시승', '자동차리뷰', 'car-review', 'test-drive'],
        '정비·케어·튜닝': ['자동차정비', '튜닝', '자동차케어', 'car-maintenance', 'tuning'],
        '모터스포츠': ['모터스포츠', '레이싱', 'motorsports', 'racing'],
        '드라이브·차박 Vlog': ['드라이브', '차박', '자동차여행', 'drive', 'car-camping']
      },
      '코미디': {
        '스케치·콩트': ['스케치', '콩트', '상황극', 'sketch', 'skit'],
        '패러디·풍자': ['패러디', '풍자', '모방', 'parody', 'satire'],
        '몰래카메라·리액션': ['몰래카메라', '리액션', '숨은카메라', 'hidden-camera', 'reaction'],
        '스탠드업·개그 톡': ['스탠드업', '개그톡', '단독공연', 'stand-up', 'comedy-talk']
      }
    };
  }

  /**
   * Gemini 연결 테스트
   */
  async testConnection() {
    try {
      if (this.geminiManager) {
        const result = await this.geminiManager.generateContent('Hello');
        return {
          status: 'success',
          service: 'UnifiedGemini',
          model: result.model,
          response: result.text
        };
      } else {
        throw new Error('Gemini 관리자가 초기화되지 않았습니다.');
      }
    } catch (error) {
      throw new Error(`Gemini 연결 실패: ${error.message}`);
    }
  }

  async analyzeVideo(thumbnailPaths, metadata) {
    ServerLogger.info('analyzeVideo 함수 시작', null, 'AI');
    ServerLogger.info('📁 썸네일 경로들:', thumbnailPaths);
    ServerLogger.info('📋 메타데이터:', JSON.stringify(metadata, null, 2));
    
    
    // 동적 카테고리 모드인지 확인
    if (this.useDynamicCategories) {
      ServerLogger.info('🚀 동적 카테고리 모드 사용', null, 'AI');
      return await this.analyzeDynamicCategories(thumbnailPaths, metadata);
    }
    
    // 기존 2단계 카테고리 분석
    ServerLogger.info('📊 기존 2단계 카테고리 모드 사용', null, 'AI');
    
    // URL 기반 기본 카테고리 추론 (일관성 확보)
    const urlBasedCategory = this.inferCategoryFromUrl(metadata.url);
    ServerLogger.info('🎯 URL 기반 카테고리 추론:', urlBasedCategory);
    
    try {
      // 다중 프레임 분석인지 단일 프레임 분석인지 확인
      if (Array.isArray(thumbnailPaths) && thumbnailPaths.length > 1) {
        ServerLogger.info(`🎬 다중 프레임 분석 시작: ${thumbnailPaths.length}개 프레임`);
        return await this.analyzeMultipleFrames(thumbnailPaths, urlBasedCategory, metadata);
      } else {
        // 단일 프레임 분석 (기존 로직)
        const singlePath = Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths;
        ServerLogger.info(`📸 단일 프레임 분석 시작: ${singlePath}`);
        return await this.analyzeSingleFrame(singlePath, urlBasedCategory, metadata);
      }
      
    } catch (error) {
      ServerLogger.error('AI 분석 실패:', error);
      
      // 폴백: URL 기반 분석 사용
      return this.createAnalysisFromUrl(urlBasedCategory, metadata);
    }
  }

  /**
   * 동적 카테고리 분석 (자가 학습 시스템 적용)
   */
  async analyzeDynamicCategories(thumbnailPaths, metadata) {
    let dynamicStartTime = Date.now();
    ServerLogger.info('🚀 동적 카테고리 분석 시작', null, 'AI');
    
    try {
      // 자가 학습 시스템 활성화 여부 확인
      if (this.categoryManager.isSelfLearningEnabled()) {
        ServerLogger.info('🧠 자가 학습 카테고리 시스템 활성화됨', null, 'SelfLearning');
        return await this.analyzeWithSelfLearning(thumbnailPaths, metadata);
      }
      
      // 기존 동적 카테고리 분석 로직
      return await this.analyzeWithBasicDynamic(thumbnailPaths, metadata);
      
    } catch (error) {
      ServerLogger.error('동적 카테고리 분석 실패:', error);
      // 폴백: 기본 카테고리 사용
      return this.categoryManager.getFallbackCategory(metadata);
    }
  }

  /**
   * 자가 학습 시스템을 이용한 분석
   */
  async analyzeWithSelfLearning(thumbnailPaths, metadata) {
    const startTime = Date.now();
    
    // 1단계: 콘텐츠 시그니처 생성
    const contentSignature = this.categoryManager.generateContentSignature(metadata);
    ServerLogger.info(`🔍 콘텐츠 시그니처: ${contentSignature}`, null, 'SelfLearning');
    
    // 2단계: 유사한 검증된 패턴 찾기
    const similarPattern = this.categoryManager.findSimilarVerifiedPattern(contentSignature);
    
    if (similarPattern) {
      // 기존 검증된 패턴이 있는 경우 - 참조 분석
      ServerLogger.info(`🎯 기존 검증된 패턴 사용: ${similarPattern.signature}`, null, 'SelfLearning');
      
      const result = await this.analyzeWithVerifiedReference(thumbnailPaths, metadata, similarPattern);
      
      // 사용 통계 업데이트
      this.categoryManager.updateVerifiedCategoryUsage(similarPattern.signature);
      
      const duration = Date.now() - startTime;
      ServerLogger.info(`⏱️ 참조 분석 총 소요시간: ${duration}ms (${(duration / 1000).toFixed(2)}초)`, null, 'SelfLearning');
      
      return result;
    } else {
      // 새로운 패턴 - 20번 분석하여 검증된 카테고리 생성
      ServerLogger.info('🆕 새로운 콘텐츠 패턴 감지 - 20번 분석 시작', null, 'SelfLearning');
      
      const analysisResults = await this.performMultipleAnalysis(thumbnailPaths, metadata, 20);
      
      // 검증된 카테고리 저장
      const verifiedCategory = this.categoryManager.saveVerifiedCategoryFromAnalysis(
        contentSignature, 
        analysisResults
      );
      
      if (verifiedCategory) {
        const result = {
          mainCategory: verifiedCategory.verifiedCategory.mainCategory,
          middleCategory: verifiedCategory.verifiedCategory.middleCategory,
          fullPath: verifiedCategory.verifiedCategory.fullPath,
          categoryPath: verifiedCategory.verifiedCategory.parts,
          depth: verifiedCategory.verifiedCategory.parts.length,
          keywords: verifiedCategory.examples[0]?.keywords || [],
          hashtags: verifiedCategory.examples[0]?.hashtags || [],
          summary: verifiedCategory.examples[0]?.summary || '',
          confidence: verifiedCategory.confidence,
          source: 'self-learning-verified',
          analysisCount: verifiedCategory.analysisCount,
          totalVotes: verifiedCategory.totalVotes,
          voteRatio: verifiedCategory.voteRatio
        };
        
        const duration = Date.now() - startTime;
        ServerLogger.info(`⏱️ 20번 분석 및 검증 총 소요시간: ${duration}ms (${(duration / 1000).toFixed(2)}초)`, null, 'SelfLearning');
        
        return result;
      } else {
        // 검증 실패 시 폴백
        ServerLogger.warn('검증된 카테고리 생성 실패 - 폴백 사용', null, 'SelfLearning');
        return this.categoryManager.getFallbackCategory(metadata);
      }
    }
  }

  /**
   * 검증된 패턴 참조하여 분석
   */
  async analyzeWithVerifiedReference(thumbnailPaths, metadata, similarPattern) {
    // 기본 동적 프롬프트 생성
    const basePrompt = this.categoryManager.buildDynamicCategoryPrompt(metadata.platform);
    
    // 검증된 카테고리 참조 정보 추가
    const referencePrompt = this.categoryManager.buildVerifiedCategoryReference(similarPattern);
    const fullPrompt = basePrompt + referencePrompt;
    
    ServerLogger.info('📝 검증된 패턴 참조 프롬프트 생성 완료', null, 'SelfLearning');
    
    // AI 분석 수행 (1번만)
    const aiStartTime = Date.now();
    let aiResponse = null;
    
    if (Array.isArray(thumbnailPaths) && thumbnailPaths.length > 1) {
      aiResponse = await this.queryDynamicMultiFrame(fullPrompt, thumbnailPaths);
    } else {
      const singlePath = Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths;
      const imageBase64 = await this.encodeImageToBase64(singlePath);
      aiResponse = await this.queryGemini(fullPrompt, imageBase64);
    }
    
    const aiDuration = Date.now() - aiStartTime;
    ServerLogger.info(`⏱️ 참조 AI 분석 소요시간: ${aiDuration}ms (${(aiDuration / 1000).toFixed(2)}초)`, null, 'SelfLearning');
    
    // 응답 처리
    const result = this.categoryManager.processDynamicCategoryResponse(aiResponse, metadata, this.lastUsedModel);
    result.source = 'self-learning-referenced';
    result.referencePattern = similarPattern.signature;
    result.referenceSimilarity = similarPattern.similarity;
    
    return result;
  }

  /**
   * 여러 번 분석 수행 (검증용)
   */
  async performMultipleAnalysis(thumbnailPaths, metadata, count = 20) {
    ServerLogger.info(`🔄 ${count}번 병렬 분석 시작`, null, 'SelfLearning');
    
    const basePrompt = this.categoryManager.buildDynamicCategoryPrompt(metadata.platform);
    const results = [];
    const batchSize = 5; // 동시 요청 수 제한
    
    // 이미지 인코딩 (한 번만)
    let imageBase64 = null;
    if (!Array.isArray(thumbnailPaths) || thumbnailPaths.length === 1) {
      const singlePath = Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths;
      imageBase64 = await this.encodeImageToBase64(singlePath);
    }
    
    // 배치로 나누어 처리
    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);
      const batchPromises = [];
      
      for (let j = 0; j < currentBatch; j++) {
        const analysisPromise = (async () => {
          try {
            let aiResponse = null;
            if (Array.isArray(thumbnailPaths) && thumbnailPaths.length > 1) {
              aiResponse = await this.queryDynamicMultiFrame(basePrompt, thumbnailPaths);
            } else {
              aiResponse = await this.queryGemini(basePrompt, imageBase64);
            }
            
            return this.categoryManager.processDynamicCategoryResponse(aiResponse, metadata, this.lastUsedModel);
          } catch (error) {
            ServerLogger.warn(`분석 ${i + j + 1}번 실패: ${error.message}`, null, 'SelfLearning');
            return null;
          }
        })();
        
        batchPromises.push(analysisPromise);
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      ServerLogger.info(`📊 배치 ${Math.floor(i/batchSize) + 1} 완료: ${i + currentBatch}/${count}`, null, 'SelfLearning');
      
      // 다음 배치 전 잠시 대기 (API 제한 방지)
      if (i + batchSize < count) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const validResults = results.filter(r => r !== null);
    ServerLogger.success(`✅ ${count}번 분석 완료: ${validResults.length}개 유효 결과`, null, 'SelfLearning');
    
    return validResults;
  }

  /**
   * 기존 동적 카테고리 분석 (자가 학습 비활성화 시)
   */
  async analyzeWithBasicDynamic(thumbnailPaths, metadata) {
    let dynamicStartTime = Date.now();
    ServerLogger.info('📊 기본 동적 카테고리 분석 시작', null, 'AI');
    
    // 동적 프롬프트 생성
    const dynamicPrompt = this.categoryManager.buildDynamicCategoryPrompt(metadata.platform);
    ServerLogger.info('📝 동적 프롬프트 생성 완료', null, 'AI');
    
    let aiResponse = null;
    
    // AI 분석 수행
    const aiStartTime = Date.now();
    
    // 프레임 수에 따른 분석 방법 선택
    if (Array.isArray(thumbnailPaths) && thumbnailPaths.length > 1) {
      // 다중 프레임 분석
      ServerLogger.info(`🎬 다중 프레임 동적 분석: ${thumbnailPaths.length}개`);
      aiResponse = await this.queryDynamicMultiFrame(dynamicPrompt, thumbnailPaths);
    } else {
      // 단일 프레임 분석
      const singlePath = Array.isArray(thumbnailPaths) ? thumbnailPaths[0] : thumbnailPaths;
      ServerLogger.info(`📸 단일 프레임 동적 분석: ${singlePath}`);
      const imageBase64 = await this.encodeImageToBase64(singlePath);
      aiResponse = await this.queryGemini(dynamicPrompt, imageBase64);
    }
    
    const aiEndTime = Date.now();
    const aiDuration = aiEndTime - aiStartTime;
    ServerLogger.info(`⏱️ AI 동적 질의 소요시간: ${aiDuration}ms (${(aiDuration / 1000).toFixed(2)}초)`);
    
    if (!aiResponse) {
      throw new Error('AI 응답을 받지 못했습니다');
    }

    // 🔍 AI 원본 응답 로깅 (댓글 분석 확인용)
    ServerLogger.info('🤖 AI 원본 응답 (처리 전):', aiResponse.substring(0, 1000) + (aiResponse.length > 1000 ? '...[truncated]' : ''));

    // 동적 카테고리 응답 처리
    const processStartTime = Date.now();
    const result = this.categoryManager.processDynamicCategoryResponse(aiResponse, metadata, this.lastUsedModel);
    const processEndTime = Date.now();
    const processDuration = processEndTime - processStartTime;
    
    const dynamicEndTime = Date.now();
    const dynamicTotalDuration = dynamicEndTime - dynamicStartTime;
    
    ServerLogger.info('✅ 기본 동적 카테고리 분석 완료:', {
      mainCategory: result.mainCategory,
      fullPath: result.fullPath,
      depth: result.depth,
      confidence: result.confidence
    });
    
    ServerLogger.info(`⏱️ 기본 동적 분석 총 소요시간: ${dynamicTotalDuration}ms (${(dynamicTotalDuration / 1000).toFixed(2)}초)`);
    
    const returnData = {
      summary: result.summary || '영상 분석 내용',
      mainCategory: result.mainCategory,
      middleCategory: result.middleCategory,
      fullCategoryPath: result.fullPath,
      categoryDepth: result.depth,
      keywords: result.keywords,
      hashtags: result.hashtags,
      confidence: result.confidence,
      source: result.source,
      isDynamicCategory: true,
      aiModel: this.lastUsedModel || 'unknown'
    };
    
    ServerLogger.info(`🔍 AIAnalyzer 반환 데이터:`, {
      categoryDepth: returnData.categoryDepth,
      fullCategoryPath: returnData.fullCategoryPath,
      원본depth: result.depth
    });
    
    return returnData;
  }

  /**
   * 다중 프레임 동적 분석
   */
  async queryDynamicMultiFrame(prompt, thumbnailPaths) {
    const maxRetries = 3;
    const retryDelays = [10000, 10000, 10000];
    
    // 모든 이미지를 Base64로 인코딩
    const imageContents = [];
    for (const imagePath of thumbnailPaths) {
      const imageBase64 = await this.encodeImageToBase64(imagePath);
      imageContents.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        ServerLogger.info(`🔮 동적 다중 프레임 Gemini 호출 (시도 ${attempt + 1}/${maxRetries})`);
        
        // 🔄 통합 관리자 사용으로 변경 - 다중 이미지 지원 (thinking 모드 활성화)
        const result = await this.geminiManager.generateContentWithImages(prompt, imageContents, {
          modelType: AI.MODELS.GEMINI_FLASH_LITE,  // Flash Lite 모델 명시적 지정
          thinkingBudget: -1  // 동적 thinking 모드
        });
        
        const text = result.text;
        
        ServerLogger.info('✅ 동적 다중 프레임 응답 성공');
        return text;
        
      } catch (error) {
        ServerLogger.error(`동적 다중 프레임 에러 (시도 ${attempt + 1}/${maxRetries}):`, error.message);
        
        // 재시도 불가능한 오류들
        if (error.message.includes('API key') || 
            error.message.includes('authentication') ||
            error.message.includes('permission') ||
            error.message.includes('quota')) {
          break;
        }
        
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = retryDelays[attempt];
        ServerLogger.info(`⏳ ${delay/1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('모든 재시도 실패');
  }

  async analyzeSingleFrame(thumbnailPath, urlBasedCategory, metadata) {
    ServerLogger.info(`AI 분석 시작: ${thumbnailPath}`);
    
    // 이미지 파일을 base64로 인코딩
    ServerLogger.info('1. 이미지 인코딩 중...');
    const imageBase64 = await this.encodeImageToBase64(thumbnailPath);
    ServerLogger.info('1. 이미지 인코딩 완료, 길이:', imageBase64.length);
    
    // AI에게 분석 요청 (더 간단한 프롬프트)
    ServerLogger.info('2. AI 프롬프트 생성 중...');
    const analysisPrompt = this.buildSimpleAnalysisPrompt(metadata);
    ServerLogger.info('2. AI 프롬프트 생성 완료, 길이:', analysisPrompt.length);
    
    ServerLogger.info('3. AI 호출 시작...');
    ServerLogger.info('🔮 사용할 AI: Gemini');
    
    let aiResponse;
    let geminiError = null;
    try {
      aiResponse = await this.queryGemini(analysisPrompt, imageBase64);
      ServerLogger.info('3. AI 호출 완료');
      ServerLogger.info('AI 원본 응답:', aiResponse);
    } catch (error) {
      ServerLogger.error('❌ AI 호출 실패:', error.message);
      aiResponse = null;
      geminiError = this.generateGeminiErrorDetails(error);
    }
    
    // AI + URL 기반 하이브리드 분석
    const analysis = await this.combineAnalysis(aiResponse, urlBasedCategory, metadata, [thumbnailPath], geminiError);
    ServerLogger.info('✅ 단일 프레임 분석 완료:', analysis);
    return analysis;
  }

  async analyzeMultipleFrames(thumbnailPaths, urlBasedCategory, metadata) {
    ServerLogger.info(`🎬 다중 프레임 분석 시작: ${thumbnailPaths.length}개 프레임`);
    
    // Gemini를 사용한 한 번에 모든 프레임 분석
    return await this.analyzeMultipleFramesWithGemini(thumbnailPaths, urlBasedCategory, metadata);
    const frameAnalyses = [];
    const allKeywords = [];
    const allContents = [];
    
    // 각 프레임을 순차적으로 분석
    for (let i = 0; i < thumbnailPaths.length; i++) {
      const framePath = thumbnailPaths[i];
      const frameNumber = i + 1;
      
      try {
        ServerLogger.info(`📸 프레임 ${frameNumber}/${thumbnailPaths.length} 분석 중: ${path.basename(framePath)}`);
        
        // 이미지 인코딩
        const imageBase64 = await this.encodeImageToBase64(framePath);
        
        // 프레임별 분석 프롬프트 (더 상세한 분석)
        const framePrompt = this.buildFrameAnalysisPrompt(metadata, frameNumber, thumbnailPaths.length);
        
        // Gemini AI 호출
        const aiResponse = await this.queryGemini(framePrompt, imageBase64);
        
        // 응답 파싱
        const frameAnalysis = this.parseFrameResponse(aiResponse, frameNumber);
        frameAnalyses.push(frameAnalysis);
        
        // 키워드와 내용 수집
        if (frameAnalysis.keywords) {
          allKeywords.push(...frameAnalysis.keywords);
        }
        if (frameAnalysis.content) {
          allContents.push(`[프레임 ${frameNumber}] ${frameAnalysis.content}`);
        }
        
        ServerLogger.info(`✅ 프레임 ${frameNumber} 분석 완료:`, frameAnalysis);
        
        // 과도한 요청 방지를 위한 딜레이
        if (i < thumbnailPaths.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        ServerLogger.error(`❌ 프레임 ${frameNumber} 분석 실패:`, error);
        frameAnalyses.push({
          frameNumber,
          summary: `프레임 ${frameNumber} 분석 실패`,
          keywords: [],
          confidence: 0.1
        });
      }
    }
    
    // 모든 프레임 분석 결과를 종합
    const combinedAnalysis = this.combineMultiFrameAnalyses(frameAnalyses, allKeywords, allContents, urlBasedCategory, metadata);
    
    ServerLogger.info('🎯 다중 프레임 분석 최종 결과:', combinedAnalysis);
    return combinedAnalysis;
  }

  async encodeImageToBase64(imagePath) {
    try {
      ServerLogger.info(`📸 이미지 인코딩 시작: ${imagePath}`);
      
      // URL인지 파일 경로인지 확인
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // URL인 경우 다운로드
        const axios = require('axios');
        ServerLogger.info(`🌐 URL 이미지 다운로드 시도: ${imagePath}`);
        const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
        return Buffer.from(response.data).toString('base64');
      } else {
        // 로컬 파일인 경우
        ServerLogger.info(`📁 로컬 파일 읽기 시도: ${imagePath}`);
        const imageBuffer = fs.readFileSync(imagePath);
        return imageBuffer.toString('base64');
      }
    } catch (error) {
      ServerLogger.error(`❌ 이미지 인코딩 실패 - 경로: ${imagePath}, 오류: ${error.message}`);
      throw new Error(`이미지 인코딩 실패: ${error.message}`);
    }
  }

  buildAnalysisPrompt(metadata) {
    const { caption = '', hashtags = [], author = '' } = metadata;
    
    return `이 이미지를 보고 다음 정보를 분석해주세요:

1. 주요 내용: 이미지에서 보이는 주요 객체, 활동, 상황을 설명
2. 카테고리 (2단계로 분류):
   대카테고리 15개 중 하나를 선택하고, 각 대카테고리에 해당하는 중카테고리를 선택하세요.
   
   **중요: 반드시 아래 구조를 정확히 따라야 합니다**:
   
   * 게임 > (플레이·리뷰 | 가이드·분석 | e스포츠 | 장르 전문)
   * 과학·기술 > (디바이스 리뷰 | 프로그래밍·코딩 강좌 | 과학 이론·실험 | 미래 트렌드)
   * 교육 > (외국어 강의 | 학문·교양 | 시험·자격증 대비 | 자기계발·학습법)
   * How-to & 라이프스타일 > (요리·베이킹 | DIY·공예·인테리어 | 뷰티·패션 | 생활 꿀팁·가전·정리)
   * 뉴스·시사 > (시사 브리핑·이슈 분석 | 정치 평론·토론 | 탐사보도·다큐 | 공식 뉴스 클립)
   * 사회·공익 > (환경·인권 캠페인 | 자선·봉사·기부 | 지속가능·ESG 콘텐츠)
   * 스포츠 > (경기 하이라이트 | 분석·전술 해설 | 피트니스·홈트 | 선수 인터뷰·다큐)
   * 동물 > (반려동물 브이로그 | 훈련·케어·정보 | 야생동물·자연 다큐)
   * 엔터테인먼트 > (예능·밈·챌린지 | 연예 뉴스·K-culture | 웹드라마·웹예능 | 이벤트·라이브 쇼)
   * 여행·이벤트 > (여행 Vlog | 정보·꿀팁·루트 | 테마 여행·캠핑·차박 | 축제·콘서트 스케치)
   * 영화·드라마·애니 > (공식 예고편·클립 | 리뷰·해석 | 제작 비하인드·메이킹 | 팬 애니메이션·단편)
   * 음악 > (뮤직비디오 | 커버·리믹스 | 라이브·버스킹 | 악기 연주·작곡 강좌)
   * 라이프·블로그 > (일상 Vlog·Q&A | 경험담·스토리텔링 | 동기부여·마인드셋 | 가족·커플·룸메이트 일상)
   * 자동차·모빌리티 > (신차 리뷰·시승 | 정비·케어·튜닝 | 모터스포츠 | 드라이브·차박 Vlog)
   * 코미디 > (스케치·콩트 | 패러디·풍자 | 몰래카메라·리액션 | 스탠드업·개그 톡)
3. 키워드: 내용과 관련된 키워드 5개 (한글)
4. 해시태그: 영상에 적합한 해시태그 5개 (#포함)

추가 정보:
- 캡션: "${caption}"
- 해시태그: ${hashtags.join(', ')}
- 작성자: "${author}"

**중요**: 반드시 위의 카테고리 구조에서만 선택하세요. 다른 카테고리는 절대 사용하지 마세요.

응답은 다음 JSON 형식으로만 답변해주세요:
{
  "summary": "이미지에서 보이는 내용을 설명하세요",
  "main_category": "위 15개 대카테고리 중 하나를 정확히 선택",
  "middle_category": "선택한 대카테고리의 중카테고리 중 하나를 정확히 선택", 
  "keywords": ["관련", "키워드", "다섯개", "선택", "하세요"],
  "hashtags": ["#관련", "#해시태그", "#다섯개", "#선택", "#하세요"],
  "confidence": 0.95
}

예시 올바른 조합:
- "main_category": "게임", "middle_category": "플레이·리뷰"
- "main_category": "음악", "middle_category": "뮤직비디오" 
- "main_category": "라이프·블로그", "middle_category": "일상 Vlog·Q&A"

절대 하지 말아야 할 잘못된 조합:
- "main_category": "사회·공익", "middle_category": "여행·이벤트" (❌)
- "main_category": "How-to & 라이프스타일", "middle_category": "생활 꿀팁·가전·정리" (✅)`;
  }

  /**
   * 🔄 통합 관리자로 단순화된 API 호출 메소드
   */
  async _queryWithEnhancedMultiApi(prompt, imageBase64) {
    try {
      ServerLogger.info('🚀 통합 Gemini 관리자 사용', null, 'AI');
      
      // 통합 관리자로 단순화된 호출 - Flash Lite 모델 사용
      const result = await this.geminiManager.generateContent(prompt, imageBase64, {
        modelType: AI.MODELS.GEMINI_FLASH_LITE,  // Flash Lite 모델 명시적 지정
        thinkingBudget: -1  // 동적 thinking 모드
      });
      
      return result.text;
    } catch (error) {
      ServerLogger.error('통합 Gemini 관리자 호출 실패', error, 'AI');
      throw error;
    }
  }

  // 🗑️ 레거시 헬퍼 메서드들 제거됨 - UnifiedGeminiManager에서 모든 기능 제공

  /**
   * 안전한 응답 텍스트 추출
   */
  _safeExtractResponseText(result) {
    if (!result) {
      throw new Error('API 응답이 null입니다');
    }
    
    if (!result.response) {
      throw new Error('API 응답에 response 속성이 없습니다');
    }
    
    if (typeof result.response.text !== 'function') {
      throw new Error('응답 텍스트 추출 함수를 찾을 수 없습니다');
    }
    
    const responseText = result.response.text();
    
    if (!responseText || typeof responseText !== 'string') {
      throw new Error('응답 텍스트가 유효하지 않습니다');
    }
    
    return responseText;
  }


  async queryGemini(prompt, imageBase64) {
    try {
      ServerLogger.info('🤖 통합 Gemini 관리자 사용', null, 'AI');
      const result = await this.geminiManager.generateContent(prompt, imageBase64, {
        modelType: AI.MODELS.GEMINI_FLASH_LITE,  // Flash Lite 모델 명시적 지정
        thinkingBudget: -1  // 동적 thinking 모드
      });

      // UnifiedGeminiManager는 문자열을 직접 반환함
      const responseText = result;

      // 사용된 모델 추적
      this.lastUsedModel = 'unified-gemini';

      ServerLogger.info(`📊 모델 사용: ${this.lastUsedModel}`, null, 'AI');
      ServerLogger.info(`🔍 Gemini 원본 응답 내용: ${responseText ? responseText.substring(0, 200) : 'null/undefined'}`, null, 'AI');

      return responseText;
      
    } catch (error) {
      ServerLogger.error('통합 Gemini 호출 실패:', error, 'AI');
      throw error;
    }
  }

  async parseAIResponse(aiResponse, metadata, imagePaths = null) {
    ServerLogger.info('🟡 parseAIResponse 함수 시작');
    ServerLogger.info('🟡 원본 AI 응답 길이:', aiResponse ? aiResponse.length : 'null');
    
    try {
      // JSON 응답 추출 시도 (```json``` 마크다운 제거)
      let cleanResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      
      ServerLogger.info('🔍 파싱 전 AI 응답 정리:', cleanResponse);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        ServerLogger.info('🔍 파싱된 JSON:', parsed);
        ServerLogger.info('🔍 AI가 반환한 카테고리:', { 
          main: parsed.main_category, 
          middle: parsed.middle_category 
        });
        
        const categoryResult = await this.validateAndInferCategories(parsed, metadata, imagePaths);
        ServerLogger.info('🔍 카테고리 검증 결과:', categoryResult);
        
        return {
          summary: parsed.summary || '내용 분석 실패',
          mainCategory: categoryResult.mainCategory,
          middleCategory: categoryResult.middleCategory,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : [],
          confidence: parsed.confidence || 0.7,
          source: 'gemini'
        };
      }
      
      // JSON이 아닌 경우 텍스트 파싱 시도
      return this.parseTextResponse(aiResponse, metadata);
      
    } catch (error) {
      ServerLogger.info('🚨 AI 응답 파싱 실패, 폴백 사용:');
      ServerLogger.info('에러:', error.message);
      ServerLogger.info('AI 원본 응답:', aiResponse);
      return this.getFallbackAnalysis(metadata);
    }
  }

  parseTextResponse(response, metadata) {
    // 텍스트에서 정보 추출
    const lines = response.split('\n');
    
    let content = '영상 내용';
    const categoryResult = this.inferCategoriesFromMetadata(metadata);
    let keywords = [];
    let hashtags = [];
    
    lines.forEach(line => {
      if (line.includes('키워드') || line.includes('keyword')) {
        const keywordMatches = line.match(/[\uAC00-\uD7AF]+/g);
        if (keywordMatches) {
          keywords = keywordMatches.slice(0, 5);
        }
      }
      
      if (line.includes('해시태그') || line.includes('hashtag')) {
        const hashtagMatches = line.match(/#[\uAC00-\uD7AFa-zA-Z0-9_]+/g);
        if (hashtagMatches) {
          hashtags = hashtagMatches.slice(0, 5);
        }
      }
    });
    
    return {
      content,
      mainCategory: categoryResult.mainCategory,
      middleCategory: categoryResult.middleCategory,
      keywords,
      hashtags,
      confidence: 0.6,
      source: 'gemini-text-parsed'
    };
  }

  async validateAndInferCategories(parsed, metadata, imagePaths = null) {
    // AI 응답에서 카테고리 정보 추출
    let mainCategory = parsed.main_category;
    let middleCategory = parsed.middle_category;
    
    // 유효성 검증 및 추론
    const validatedResult = this.validateCategoryHierarchy(mainCategory, middleCategory);
    
    // 검증 실패 시 메타데이터에서 추론
    if (!validatedResult.isValid) {
      return this.inferCategoriesFromMetadata(metadata);
    }
    
    return {
      mainCategory: validatedResult.mainCategory,
      middleCategory: validatedResult.middleCategory
    };
  }

  validateCategoryHierarchy(mainCategory, middleCategory) {
    ServerLogger.info('🔍 카테고리 검증 시작:', { mainCategory, middleCategory });
    
    const validMainCategories = Object.keys(this.categories);
    ServerLogger.info('유효한 대카테고리들:', validMainCategories);
    
    // 대카테고리 검증
    if (!mainCategory || !validMainCategories.includes(mainCategory)) {
      ServerLogger.info('❌ 대카테고리 검증 실패:', mainCategory);
      return this.findBestCategoryMatch(middleCategory);
    }
    
    const validMiddleCategories = Object.keys(this.categories[mainCategory]);
    ServerLogger.info(`"${mainCategory}"의 유효한 중카테고리들:`, validMiddleCategories);
    
    // 중카테고리 검증
    if (!middleCategory || !validMiddleCategories.includes(middleCategory)) {
      ServerLogger.info('❌ 중카테고리 검증 실패:', middleCategory);
      return this.findBestCategoryMatch(middleCategory, mainCategory);
    }
    
    ServerLogger.info('✅ 카테고리 검증 성공');
    return {
      isValid: true,
      mainCategory,
      middleCategory
    };
  }

  // AI 카테고리 재분석 함수
  async retryAnalysisWithCorrection(imagePaths, metadata, errorReason) {
    try {
      ServerLogger.info('🔄 재분석 시작:', { errorReason, imageCount: imagePaths.length });
      
      // 오류 이유에 따른 수정된 프롬프트 생성
      let correctionPrompt = '';
      if (errorReason === 'Invalid main category') {
        correctionPrompt = `
⚠️ **중요**: 이전 분석에서 잘못된 대카테고리를 선택했습니다.
반드시 다음 15개 대카테고리 중 하나만 선택하세요:
게임, 과학·기술, 교육, How-to & 라이프스타일, 뉴스·시사, 사회·공익, 스포츠, 동물, 엔터테인먼트, 여행·이벤트, 영화·드라마·애니, 음악, 라이프·블로그, 자동차·모빌리티, 코미디

다른 카테고리명은 절대 사용하지 마세요.
`;
      } else if (errorReason === 'Invalid middle category for main category') {
        correctionPrompt = `
⚠️ **중요**: 이전 분석에서 대카테고리와 중카테고리 조합이 잘못되었습니다.
각 대카테고리에 맞는 정확한 중카테고리만 선택하세요.
예: "게임" → "플레이·리뷰", "가이드·분석", "e스포츠", "장르 전문" 중 하나만

잘못된 조합을 절대 만들지 마세요.
`;
      } else {
        correctionPrompt = `
⚠️ **중요**: 이전 분석에서 카테고리 오류가 발생했습니다.
아래 카테고리 체계를 정확히 따라주세요.
`;
      }
      
      // 기본 프롬프트에 수정 지시사항 추가
      const retryPrompt = correctionPrompt + this.buildSimpleAnalysisPrompt(metadata);
      
      let retryResult = null;
      
      // Gemini 재시도
      if (this.useGemini) {
        try {
          if (imagePaths.length === 1) {
            ServerLogger.info('🔄 Gemini 단일 프레임 재분석 시도');
            const imageBase64 = await this.encodeImageToBase64(imagePaths[0]);
            retryResult = await this.queryGemini(retryPrompt, imageBase64);
          } else {
            ServerLogger.info(`🔄 Gemini 다중 프레임 재분석 시도 (${imagePaths.length}개)`);
            retryResult = await this.retryMultiFrameAnalysisWithGemini(imagePaths, metadata, correctionPrompt);
          }
        } catch (error) {
          ServerLogger.info('❌ Gemini 재분석 실패:', error.message);
        }
      }
      
      
      if (retryResult) {
        ServerLogger.info('✅ 재분석 응답 수신');
        ServerLogger.info('🔍 재분석 원본 응답 길이:', retryResult.length);
        
        // JSON 파싱 시도
        try {
          const jsonMatch = retryResult.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
            const parsed = JSON.parse(jsonStr);
            ServerLogger.info('✅ 재분석 JSON 파싱 성공:', { 
              main: parsed.main_category, 
              middle: parsed.middle_category 
            });
            return parsed;
          } else {
            ServerLogger.info('❌ 재분석 응답에서 JSON 패턴을 찾을 수 없음');
            ServerLogger.info('🔍 재분석 응답 샘플:', retryResult.substring(0, 200));
            return null;
          }
        } catch (parseError) {
          ServerLogger.error('❌ 재분석 JSON 파싱 실패:', parseError.message);
          ServerLogger.info('🔍 재분석 응답 샘플:', retryResult.substring(0, 200));
          return null;
        }
      } else {
        ServerLogger.info('❌ 모든 재분석 시도 실패');
        return null;
      }
    } catch (error) {
      ServerLogger.error('재분석 중 오류:', error);
      return null;
    }
  }

  // 다중 프레임 재분석 함수 (Gemini용)
  async retryMultiFrameAnalysisWithGemini(imagePaths, metadata, correctionPrompt) {
    try {
      // 모든 이미지를 Base64로 인코딩
      const imageContents = [];
      for (const imagePath of imagePaths) {
        const imageBase64 = await this.encodeImageToBase64(imagePath);
        imageContents.push({
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg"
          }
        });
      }
      
      // 다중 프레임 재분석 프롬프트 생성
      const basePrompt = this.buildGeminiMultiFramePrompt(metadata, imagePaths.length);
      const retryPrompt = correctionPrompt + basePrompt;
      
      ServerLogger.info('🔮 Gemini 다중 프레임 재분석 API 호출...');
      
      // 🔄 통합 관리자 사용으로 변경 - 다중 이미지 재분석
      const result = await this.geminiManager.generateContentWithImages(retryPrompt, imageContents, {
        modelType: AI.MODELS.GEMINI_FLASH_LITE,  // Flash Lite 모델 명시적 지정
        thinkingBudget: -1  // 재시도에서도 동적 thinking 모드
      });
      
      const aiResponse = result.text;
      
      ServerLogger.info('✅ Gemini 다중 프레임 재분석 응답 수신');
      
      // 응답 파싱
      return await this.parseAIResponse(aiResponse, metadata, imagePaths);
      
    } catch (error) {
      ServerLogger.error('다중 프레임 재분석 오류:', error);
      throw error;
    }
  }

  // AI 카테고리 유효성 검증 함수
  validateCategoryPair(mainCategory, middleCategory) {
    if (!mainCategory || !middleCategory) {
      return { isValid: false, reason: 'Missing category' };
    }
    
    // "없음" 카테고리는 무효로 처리
    if (mainCategory === '없음' || middleCategory === '없음') {
      return { isValid: false, reason: 'Invalid category - contains 없음' };
    }
    
    // 카테고리 체계에서 유효한 조합인지 확인
    if (!this.categories[mainCategory]) {
      return { isValid: false, reason: 'Invalid main category' };
    }
    
    if (!this.categories[mainCategory][middleCategory]) {
      return { isValid: false, reason: 'Invalid middle category for main category' };
    }
    
    return { isValid: true };
  }

  findBestCategoryMatch(keyword, preferredMainCategory = null) {
    ServerLogger.info('🔄 카테고리 매칭 시도:', { keyword, preferredMainCategory });
    
    // 키워드 기반 매칭
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      
      // 자전거 → 스포츠 > 피트니스·홈트
      if (keywordLower.includes('자전거') || keywordLower.includes('bike') || keywordLower.includes('cycle')) {
        return { isValid: true, mainCategory: '스포츠', middleCategory: '피트니스·홈트' };
      }
      
      // 운동 관련 키워드
      if (keywordLower.includes('운동') || keywordLower.includes('피트니스') || keywordLower.includes('헬스')) {
        return { isValid: true, mainCategory: '스포츠', middleCategory: '피트니스·홈트' };
      }
    }
    
    // 선호 대카테고리가 있는 경우 첫 번째 중카테고리 사용
    if (preferredMainCategory && this.categories[preferredMainCategory]) {
      const firstMiddleCategory = Object.keys(this.categories[preferredMainCategory])[0];
      return { 
        isValid: true, 
        mainCategory: preferredMainCategory, 
        middleCategory: firstMiddleCategory 
      };
    }
    
    // 기본값
    ServerLogger.info('⚡ 기본 카테고리 사용');
    return { isValid: true, mainCategory: '라이프·블로그', middleCategory: '일상 Vlog·Q&A' };
  }

  inferCategoriesFromMetadata(metadata) {
    const { caption = '', hashtags = [] } = metadata;
    const text = (caption + ' ' + hashtags.join(' ')).toLowerCase();
    
    // 키워드 기반 카테고리 추론
    for (const [mainCategory, middleCategories] of Object.entries(this.categories)) {
      for (const [middleCategory, keywords] of Object.entries(middleCategories)) {
        for (const keyword of keywords) {
          if (text.includes(keyword.toLowerCase())) {
            return {
              mainCategory,
              middleCategory
            };
          }
        }
      }
    }
    
    // 기본값: 라이프·블로그 > 일상 Vlog·Q&A
    return {
      mainCategory: '라이프·블로그',
      middleCategory: '일상 Vlog·Q&A'
    };
  }

  getFallbackAnalysis(metadata) {
    const { caption = '', hashtags = [], author = '' } = metadata;
    const categoryResult = this.inferCategoriesFromMetadata(metadata);
    
    return {
      summary: caption || '영상 내용',
      mainCategory: categoryResult.mainCategory,
      middleCategory: categoryResult.middleCategory,
      keywords: this.extractKeywordsFromText(caption + ' ' + hashtags.join(' ')),
      hashtags: this.generateHashtagsFromMetadata(hashtags, categoryResult),
      confidence: 0.5,
      source: 'fallback-analysis'
    };
  }

  extractKeywordsFromText(text) {
    if (!text) return ['영상', '콘텐츠'];
    
    // 한글 키워드 추출 (간단한 방식)
    const koreanWords = text.match(/[\uAC00-\uD7AF]{2,}/g) || [];
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    
    const allWords = [...koreanWords, ...englishWords]
      .filter(word => word.length >= 2)
      .slice(0, 5);
    
    return allWords.length > 0 ? allWords : ['영상', '콘텐츠'];
  }

  generateHashtagsFromMetadata(existingHashtags, categoryResult) {
    const generatedTags = [];
    
    // 기존 해시태그 활용 (# 추가)
    existingHashtags.forEach(tag => {
      const cleanTag = tag.replace(/^#/, ''); // # 제거
      if (cleanTag && generatedTags.length < 3) {
        generatedTags.push(`#${cleanTag}`);
      }
    });
    
    // 카테고리 기반 해시태그 추가
    if (categoryResult.middleCategory && generatedTags.length < 5) {
      generatedTags.push(`#${categoryResult.middleCategory}`);
    }
    
    // 부족한 경우 기본 해시태그 추가
    const defaultTags = ['#영상', '#컨텐츠', '#일상'];
    for (const tag of defaultTags) {
      if (generatedTags.length >= 5) break;
      if (!generatedTags.includes(tag)) {
        generatedTags.push(tag);
      }
    }
    
    return generatedTags.slice(0, 5);
  }

  // 통계용 분석 결과 요약
  // URL 패턴 기반 카테고리 추론 (일관성 확보)
  inferCategoryFromUrl(url) {
    // URL만으로는 정확한 카테고리 추론이 어려우므로 "없음"으로 설정
    return { mainCategory: '없음', middleCategory: '없음' };
  }

  // 간단한 AI 프롬프트 (일관성 향상)
  buildSimpleAnalysisPrompt(metadata) {
    const platform = metadata.platform || '소셜미디어';

    // 댓글 데이터가 있는 경우 추가 정보로 활용
    let commentAnalysis = '';
    if (metadata.topComments && metadata.topComments.trim().length > 0) {
      // 모든 댓글 활용 (길이 제한 제거)
      const comments = metadata.topComments.trim();
      commentAnalysis = `

**⭐ 시청자 댓글 반응 분석 (매우 중요):**
${comments}

**댓글 활용 지침:**
1. 댓글에서 나타나는 주요 키워드와 반응을 분석하세요
2. 시청자들이 언급하는 내용의 주제를 파악하세요
3. 댓글의 톤과 감정을 통해 영상의 장르를 추정하세요
4. 이모티콘과 반응을 통해 엔터테인먼트/교육/정보 성격을 판단하세요
5. 댓글 내용이 썸네일만으로는 알 수 없는 영상의 진짜 내용을 알려줍니다
6. **💥 떡상 이유 분석**: 댓글에서 왜 사람들이 열광하는지, 어떤 포인트가 화제가 되는지 파악하세요

**댓글 분석이 카테고리 판단과 인기 요인 분석에 핵심적인 역할을 합니다!**`;
    }

    return `이 ${platform} 영상의 스크린샷을 보고 정확한 카테고리를 분류해주세요.${commentAnalysis}

**종합 분석 지침 (댓글 우선):**
1. **댓글 분석 (최우선)**: 시청자 반응에서 나타나는 진짜 영상 내용과 장르 파악
2. **이미지 분석**: 화면에 보이는 주요 내용 (인물, 객체, 배경, 텍스트, 자막)
3. **맥락 파악**: 댓글 + 이미지를 종합하여 영상의 주제와 목적 판단
4. **카테고리 결정**: 댓글에서 파악한 내용을 기반으로 가장 적합한 카테고리 선택

**⚠️ 중요: 댓글이 있다면 댓글 내용이 카테고리 판단의 핵심 근거가 됩니다!**

**카테고리 분류 체계** (반드시 이 중에서 선택):

**📋 필수 응답 필드:**
- main_category: 대카테고리 (예: "게임")
- middle_category: 중카테고리 (예: "가이드·분석")
- summary: 이 영상이 왜 인기있고 떡상하고 있는지 댓글 반응을 통해 분석
- keywords: 키워드 배열
- hashtags: 해시태그 배열
- confidence: 신뢰도 (0.1~1.0)
• 과학·기술 → 디바이스 리뷰 | 프로그래밍·코딩 강좌 | 과학 이론·실험 | 미래 트렌드
• 교육 → 외국어 강의 | 학문·교양 | 시험·자격증 대비 | 자기계발·학습법
• How-to & 라이프스타일 → 요리·베이킹 | DIY·공예·인테리어 | 뷰티·패션 | 생활 꿀팁·가전·정리
• 요리·먹방 → 요리·레시피 | 먹방·맛집·리뷰 | 베이킹·카페·디저트 | 다이어트·건강식
• 사회·공익 → 시사·정치·경제 | 사회 문제·환경 | 공익·자선·봉사 | 인권·정의·평등
• 동물 → 반려동물 브이로그 | 훈련·케어·정보 | 야생동물·자연 다큐
• 엔터테인먼트 → 예능·밈·챌린지 | 연예 뉴스·K-culture | 웹드라마·웹예능 | 이벤트·라이브 쇼
• 여행·이벤트 → 여행 Vlog | 정보·꿀팁·루트 | 테마 여행·캠핑·차박 | 축제·콘서트 스케치
• 영화·드라마·애니 → 공식 예고편·클립 | 리뷰·해석 | 제작 비하인드·메이킹 | 팬 애니메이션·단편
• 음악 → 뮤직비디오 | 커버·리믹스 | 라이브·버스킹 | 악기 연주·작곡 강좌
• 라이프·블로그 → 일상 Vlog·Q&A | 경험담·스토리텔링 | 동기부여·마인드셋 | 가족·커플·룸메이트 일상
• 자동차·모빌리티 → 신차 리뷰·시승 | 정비·케어·튜닝 | 모터스포츠 | 드라이브·차박 Vlog
• 코미디 → 스케치·콩트 | 패러디·풍자 | 몰래카메라·리액션 | 스탠드업·개그 톡

**JSON 응답 형식:**
{
  "main_category": "대카테고리명",
  "middle_category": "중카테고리명", 
  "summary": "영상 내용 분석 (2-3문장)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"]
}

**중요:** main_category와 middle_category는 반드시 위의 정확한 카테고리명을 사용해야 합니다.`;
  }

  // 다중 프레임 분석용 프롬프트
  buildFrameAnalysisPrompt(metadata, frameNumber, totalFrames) {
    return `이 이미지는 동영상의 프레임 ${frameNumber}/${totalFrames}입니다.

다음을 분석해주세요:
1. 주요 내용: 이 프레임에서 보이는 주요 객체, 행동, 상황을 상세히 설명
2. 키워드: 이 프레임과 관련된 구체적인 키워드 3-5개 (한글)
3. 특징: 이 프레임만의 독특한 특징이나 중요한 요소

JSON 형식으로 답변:
{
  "summary": "프레임의 상세한 내용 설명",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "features": "이 프레임의 특별한 특징",
  "confidence": 0.9
}

추가 정보:
- 캡션: "${metadata.caption || ''}"
- 작성자: "${metadata.channelName || ''}" // 🚀 자동화
- 플랫폼: ${metadata.platform || 'unknown'}`;
  }

  // 프레임 분석 응답 파싱
  parseFrameResponse(aiResponse, frameNumber) {
    try {
      // JSON 응답 추출
      let cleanResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          frameNumber,
          summary: parsed.summary || `프레임 ${frameNumber} 내용`,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          features: parsed.features || '',
          confidence: parsed.confidence || 0.7
        };
      }
      
      // JSON 파싱 실패 시 텍스트에서 정보 추출
      return this.parseFrameTextResponse(aiResponse, frameNumber);
      
    } catch (error) {
      ServerLogger.error(`프레임 ${frameNumber} 응답 파싱 실패:`, error);
      return {
        frameNumber,
        summary: `프레임 ${frameNumber} 분석 오류`,
        keywords: [],
        features: '',
        confidence: 0.3
      };
    }
  }

  // 프레임 텍스트 응답 파싱
  parseFrameTextResponse(response, frameNumber) {
    const lines = response.split('\n');
    let content = `프레임 ${frameNumber} 내용`;
    let keywords = [];
    let features = '';
    
    lines.forEach(line => {
      if (line.includes('내용') || line.includes('content')) {
        const contentMatch = line.match(/[:：]\s*(.+)/);
        if (contentMatch) {
          content = contentMatch[1].trim();
        }
      }
      
      if (line.includes('키워드') || line.includes('keyword')) {
        const keywordMatches = line.match(/[\uAC00-\uD7AF]+/g);
        if (keywordMatches) {
          keywords = keywordMatches.slice(0, 5);
        }
      }
      
      if (line.includes('특징') || line.includes('features')) {
        const featureMatch = line.match(/[:：]\s*(.+)/);
        if (featureMatch) {
          features = featureMatch[1].trim();
        }
      }
    });
    
    return {
      frameNumber,
      content,
      keywords,
      features,
      confidence: 0.6
    };
  }

  // 다중 프레임 분석 결과 종합
  combineMultiFrameAnalyses(frameAnalyses, allKeywords, allContents, urlBasedCategory, metadata) {
    // 키워드 빈도 계산 및 상위 키워드 선택
    const keywordCounts = {};
    allKeywords.forEach(keyword => {
      if (keyword && keyword.length > 1) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    });
    
    const topKeywords = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);
    
    // 전체 신뢰도 계산
    const totalConfidence = frameAnalyses.reduce((sum, frame) => sum + (frame.confidence || 0), 0);
    const avgConfidence = frameAnalyses.length > 0 ? totalConfidence / frameAnalyses.length : 0.5;
    
    // 종합 내용 생성
    const combinedContent = this.generateCombinedContent(frameAnalyses, allContents);
    
    // 해시태그 생성
    const hashtags = this.generateHashtagsFromKeywords(topKeywords);
    
    return {
      summary: combinedContent,
      mainCategory: urlBasedCategory.mainCategory, // "없음"이 그대로 저장됨
      middleCategory: urlBasedCategory.middleCategory, // "없음"이 그대로 저장됨
      keywords: topKeywords,
      hashtags: hashtags,
      confidence: Math.min(avgConfidence + 0.1, 0.95), // 다중 프레임 보너스
      source: 'gemini',
      frameCount: frameAnalyses.length,
      frameAnalyses: frameAnalyses, // 개별 프레임 분석 결과 보관
      analysis_metadata: {
        successful_frames: frameAnalyses.filter(f => f.confidence > 0.5).length,
        avg_confidence: avgConfidence,
        top_keywords: topKeywords,
        analysis_duration: new Date().toISOString()
      }
    };
  }

  // 종합 내용 생성
  generateCombinedContent(frameAnalyses, allContents) {
    if (!frameAnalyses || frameAnalyses.length === 0) {
      return '영상 분석 실패';
    }
    
    // 신뢰도가 높은 프레임들의 내용을 우선적으로 사용
    const reliableFrames = frameAnalyses
      .filter(frame => frame.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
    
    if (reliableFrames.length === 0) {
      return `${frameAnalyses.length}개 프레임으로 구성된 영상`;
    }
    
    // 주요 내용들을 조합
    const mainContents = reliableFrames
      .slice(0, 3) // 상위 3개 프레임만 사용
      .map(frame => frame.content)
      .filter(content => content && content.length > 5);
    
    if (mainContents.length === 1) {
      return mainContents[0];
    } else if (mainContents.length > 1) {
      // 중복 제거 및 요약
      const uniqueContents = [...new Set(mainContents)];
      if (uniqueContents.length === 1) {
        return uniqueContents[0];
      }
      
      // 여러 내용을 자연스럽게 조합
      return `${uniqueContents[0]}. 또한 ${uniqueContents.slice(1).join(', ')} 등의 장면들이 포함된 영상입니다.`;
    }
    
    return `${frameAnalyses.length}개의 다양한 장면으로 구성된 영상`;
  }

  // AI + URL 기반 하이브리드 분석
  async combineAnalysis(aiResponse, urlBasedCategory, metadata, imagePaths = null, geminiError = null) {
    try {
      ServerLogger.info('🔍 AI 응답 분석 시작...');
      ServerLogger.info('AI 응답 존재 여부:', !!aiResponse);
      
      // AI 응답에서 새로운 구조의 데이터 추출
      let aiData = { 
        summary: null, 
        content: null,
        analysisContent: null,
        description: null,
        keywords: [], 
        hashtags: [],
        main_category: null,
        middle_category: null
      };
      
      if (aiResponse) {
        ServerLogger.info('AI 응답 길이:', aiResponse.length);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        ServerLogger.info('JSON 패턴 매칭 결과:', !!jsonMatch);
        
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            ServerLogger.info('파싱된 AI 데이터:', parsed);
            
            aiData.content = parsed.content;
            aiData.analysisContent = parsed.analysisContent || parsed.content;
            aiData.summary = parsed.summary;
            aiData.description = parsed.description;
            
            // 🚀 플레이스홀더 텍스트 감지 및 처리
            if (this.isPlaceholderContent(aiData.analysisContent) || 
                this.isPlaceholderContent(aiData.summary) || 
                this.isPlaceholderContent(aiData.content)) {
              
              ServerLogger.info('🔍 플레이스홀더 콘텐츠 감지 - 지능형 폴백 적용');
              const fallbackContent = this.generateIntelligentFallback(metadata, urlBasedCategory, null);
              
              if (this.isPlaceholderContent(aiData.analysisContent)) {
                aiData.analysisContent = fallbackContent.analysisContent;
              }
              if (this.isPlaceholderContent(aiData.summary)) {
                aiData.summary = fallbackContent.summary;
              }
              if (this.isPlaceholderContent(aiData.content)) {
                aiData.content = fallbackContent.content;
              }
              if (this.isPlaceholderContent(aiData.description)) {
                aiData.description = fallbackContent.description;
              }
            }
            aiData.keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
            aiData.hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
            aiData.main_category = parsed.main_category;
            aiData.middle_category = parsed.middle_category;
            
            ServerLogger.info('✅ AI 데이터 추출 성공:', aiData);
          } catch (e) {
            ServerLogger.info('❌ AI JSON 파싱 실패:', e.message);
            ServerLogger.info('파싱 실패한 JSON:', jsonMatch[0]);
          }
        } else {
          ServerLogger.info('❌ JSON 패턴을 찾을 수 없음. AI 원본 응답:');
          ServerLogger.info(aiResponse.substring(0, 500));
        }
      } else {
        ServerLogger.info('❌ AI 응답이 null 또는 undefined - 메타데이터 기반 폴백 생성');
        
        // 🚀 Gemini가 블록된 경우 메타데이터 기반으로 의미있는 콘텐츠 생성
        const fallbackContent = this.generateIntelligentFallback(metadata, urlBasedCategory, geminiError);
        aiData.content = fallbackContent.content;
        aiData.analysisContent = fallbackContent.analysisContent;
        aiData.summary = fallbackContent.summary;
        aiData.description = fallbackContent.description;
        aiData.keywords = fallbackContent.keywords;
        aiData.hashtags = fallbackContent.hashtags;
        
        ServerLogger.info('🔄 지능형 폴백 콘텐츠 생성 완료:', {
          contentLength: fallbackContent.content?.length || 0,
          keywordsCount: fallbackContent.keywords.length,
          hashtagsCount: fallbackContent.hashtags.length
        });
      }
      
      // AI가 카테고리를 제대로 분석했는지 검증
      let finalMainCategory = urlBasedCategory.mainCategory;
      let finalMiddleCategory = urlBasedCategory.middleCategory;
      
      // 🎯 YouTube categoryId가 있는 경우 우선 사용
      if (metadata.categoryId) {
        const youtubeMappedCategory = this.mapYouTubeCategoryToKorean(metadata.categoryId, metadata.title, metadata.channelName);
        if (youtubeMappedCategory.main !== '엔터테인먼트' || metadata.categoryId === '24') {
          ServerLogger.info(`🎬 YouTube 카테고리 우선 적용: ${youtubeMappedCategory.main}/${youtubeMappedCategory.middle}`);
          finalMainCategory = youtubeMappedCategory.main;
          finalMiddleCategory = youtubeMappedCategory.middle;
        }
      }
      
      ServerLogger.info('🔍 AI 카테고리 검증 전:', {
        main: aiData.main_category,
        middle: aiData.middle_category,
        hasMain: !!aiData.main_category,
        hasMiddle: !!aiData.middle_category
      });
      
      if (aiData.main_category && aiData.middle_category) {
        // AI 카테고리 유효성 검증
        const validation = this.validateCategoryPair(aiData.main_category, aiData.middle_category);
        ServerLogger.info('🔍 카테고리 검증 결과:', validation);
        
        if (validation.isValid) {
          ServerLogger.info('✅ AI 카테고리 분석 성공, AI 분류 사용:', {
            main: aiData.main_category,
            middle: aiData.middle_category
          });
          finalMainCategory = aiData.main_category;
          finalMiddleCategory = aiData.middle_category;
        } else {
          ServerLogger.info('❌ AI 카테고리 무효, 재분석 시도:', {
            ai_main: aiData.main_category,
            ai_middle: aiData.middle_category,
            reason: validation.reason,
            url_main: urlBasedCategory.mainCategory,
            url_middle: urlBasedCategory.middleCategory
          });
          
          // 재분석 시도 (1회만)
          try {
            ServerLogger.info('🔄 AI 카테고리 재분석 중...');
            const retryResponse = await this.retryAnalysisWithCorrection(imagePaths, metadata, validation.reason);
            
            if (retryResponse && retryResponse.main_category && retryResponse.middle_category) {
              const retryValidation = this.validateCategoryPair(retryResponse.main_category, retryResponse.middle_category);
              if (retryValidation.isValid) {
                ServerLogger.info('✅ 재분석 성공, 수정된 AI 분류 사용:', {
                  main: retryResponse.main_category,
                  middle: retryResponse.middle_category
                });
                finalMainCategory = retryResponse.main_category;
                finalMiddleCategory = retryResponse.middle_category;
                // 재분석 결과로 다른 필드도 업데이트
                aiData.content = retryResponse.content || aiData.content;
                aiData.keywords = retryResponse.keywords || aiData.keywords;
                aiData.hashtags = retryResponse.hashtags || aiData.hashtags;
                aiData.confidence = retryResponse.confidence || aiData.confidence;
              } else {
                ServerLogger.info('❌ 재분석도 실패, URL 기반 카테고리 사용:', {
                  retry_main: retryResponse.main_category,
                  retry_middle: retryResponse.middle_category,
                  reason: retryValidation.reason
                });
              }
            } else {
              ServerLogger.info('❌ 재분석 응답 없음, URL 기반 카테고리 사용');
            }
          } catch (retryError) {
            ServerLogger.info('❌ 재분석 중 오류 발생, URL 기반 카테고리 사용:', retryError.message);
          }
        }
      }
      
      // 최종 분석 결과 반환 (무조건 폴백 보장)
      const result = {
        summary: aiData.summary || this.generateFallbackSummary(metadata),
        content: aiData.content || this.generateFallbackContent(metadata), 
        analysisContent: aiData.analysisContent || this.generateFallbackAnalysisContent(metadata, finalMainCategory, finalMiddleCategory),
        description: aiData.description || (metadata.description || metadata.caption || "설명없음"),
        mainCategory: finalMainCategory,
        middleCategory: finalMiddleCategory,
        keywords: aiData.keywords.length > 0 ? aiData.keywords.slice(0, 5) : this.extractKeywordsFromMetadata(metadata),
        hashtags: aiData.hashtags.length > 0 ? aiData.hashtags : this.generateHashtagsFromKeywords(aiData.keywords.length > 0 ? aiData.keywords : this.extractKeywordsFromMetadata(metadata)),
        confidence: aiData.main_category ? 0.9 : 0.6, // AI 카테고리 성공시 높은 신뢰도
        source: aiResponse ? 'gemini' : 'intelligent-fallback',
        aiModel: this.lastUsedModel || 'unknown'
      };

      // Gemini 오류 정보가 있으면 추가
      if (geminiError) {
        result.aiError = {
          occurred: true,
          type: 'gemini_analysis_failed',
          message: geminiError.userMessage,
          technical: geminiError.technical,
          timestamp: geminiError.timestamp,
          retryable: geminiError.retryable
        };
      }

      return result;
      
    } catch (error) {
      ServerLogger.error('❌ 하이브리드 분석 실패:', error.message);
      ServerLogger.error('Stack trace:', error.stack);
      ServerLogger.info('🔄 URL_BASED 분석으로 폴백');
      return this.createAnalysisFromUrl(urlBasedCategory, metadata);
    }
  }

  // URL 기반 분석 생성
  createAnalysisFromUrl(urlBasedCategory, metadata) {
    return {
      summary: '영상 분석',
      mainCategory: urlBasedCategory.mainCategory, // "없음"이 그대로 저장됨
      middleCategory: urlBasedCategory.middleCategory, // "없음"이 그대로 저장됨
      keywords: ['영상', '소셜미디어', '콘텐츠'],
      hashtags: ['#영상', '#소셜미디어', '#콘텐츠'],
      confidence: 0.3,
      source: 'url-based-analysis'
    };
  }

  // 키워드 기반 해시태그 생성
  generateHashtagsFromKeywords(keywords) {
    const hashtags = keywords.map(keyword => `#${keyword}`).slice(0, 3);
    
    // 부족한 경우 기본 해시태그 추가
    const defaultTags = ['#인스타그램', '#릴스', '#영상'];
    for (const tag of defaultTags) {
      if (hashtags.length >= 5) break;
      if (!hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }
    
    return hashtags.slice(0, 5);
  }

  generateSummary(analysisResults) {
    const mainCategories = {};
    const middleCategories = {};
    let totalConfidence = 0;
    
    analysisResults.forEach(result => {
      // 2단계 카테고리별 통계
      const mainCat = result.mainCategory || '기타';
      const middleCat = result.middleCategory || '기타';
      
      mainCategories[mainCat] = (mainCategories[mainCat] || 0) + 1;
      middleCategories[middleCat] = (middleCategories[middleCat] || 0) + 1;
      
      totalConfidence += result.confidence;
    });
    
    return {
      totalVideos: analysisResults.length,
      averageConfidence: totalConfidence / analysisResults.length,
      topMainCategories: Object.entries(mainCategories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topMiddleCategories: Object.entries(middleCategories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }

  // ============ Gemini 관련 메서드들 ============

  async analyzeMultipleFramesWithGemini(thumbnailPaths, urlBasedCategory, metadata) {
    ServerLogger.info('🔮 Gemini 다중 프레임 분석 시작:', thumbnailPaths.length + '개');
    
    const maxRetries = AI.RETRY.MAX_RETRIES;
    const retryDelays = AI.RETRY.RETRY_DELAYS;
    
    // 모든 이미지를 Base64로 인코딩 (재시도 전에 미리 처리)
    const imageContents = [];
    for (const imagePath of thumbnailPaths) {
      const imageBase64 = await this.encodeImageToBase64(imagePath);
      imageContents.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }
    
    // 다중 프레임 분석 프롬프트 생성
    const prompt = this.buildGeminiMultiFramePrompt(metadata, thumbnailPaths.length);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        ServerLogger.info(`🔮 Gemini API 호출 시작... (시도 ${attempt + 1}/${maxRetries})`);
        
        // 🔄 통합 관리자 사용으로 변경 - 최종 다중 이미지 분석
        const result = await this.geminiManager.generateContentWithImages(prompt, imageContents, {
          modelType: AI.MODELS.GEMINI_FLASH_LITE,  // Flash Lite 모델 명시적 지정
          thinkingBudget: -1  // 카테고리 분석에도 동적 thinking 모드
        });
        
        const aiResponse = result.text;
        
        ServerLogger.info('🔮 Gemini AI 원본 응답:', aiResponse);
        
        // 응답 파싱 및 결과 생성
        const analysis = this.parseGeminiResponse(aiResponse, urlBasedCategory, metadata);
        analysis.frameCount = thumbnailPaths.length;
        analysis.analysisMethod = 'gemini-multi-frame';
        
        ServerLogger.info('✅ Gemini 다중 프레임 분석 완료:', analysis);
        return analysis;
        
      } catch (error) {
        ServerLogger.error(`Gemini 다중 프레임 분석 에러 (시도 ${attempt + 1}/${maxRetries}):`, error.message);
        
        // 재시도 불가능한 오류들
        if (error.message.includes('API key') || 
            error.message.includes('authentication') ||
            error.message.includes('permission') ||
            error.message.includes('quota')) {
          ServerLogger.error('재시도 불가능한 오류, 즉시 실패 처리');
          break; // for 루프 탈출하여 catch 블록으로
        }
        
        // 마지막 시도인 경우 오류 던짐
        if (attempt === maxRetries - 1) {
          ServerLogger.error('모든 재시도 실패, 최종 오류 발생');
          throw error; // catch 블록으로
        }
        
        // 재시도 가능한 오류 (503 Service Unavailable, 네트워크 오류 등)
        const delay = retryDelays[attempt];
        ServerLogger.info(`⏳ ${delay/1000}초 후 재시도... (${attempt + 2}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 모든 재시도 실패 또는 재시도 불가능한 오류 발생 시
    ServerLogger.error('❌ Gemini 다중 프레임 분석 최종 실패');
    
    // 상세한 오류 정보 생성
    const errorDetails = this.generateGeminiErrorDetails(new Error('다중 프레임 분석 실패'));
    
    // 기본 분석 결과 반환
    const categoryResult = this.determineFinalCategory('', '', urlBasedCategory, metadata);
    
    return {
        category: categoryResult.fullCategory,
        mainCategory: categoryResult.mainCategory,
        middleCategory: categoryResult.middleCategory,
        keywords: this.extractKeywordsFromContent(metadata.caption || ''),
        hashtags: this.generateHashtagsFromMetadata(metadata.hashtags || [], categoryResult),
        summary: `Gemini 분석 실패: ${error.message}`,
        confidence: 0.3,
        source: 'fallback-metadata',
        frameCount: thumbnailPaths.length,
        analysisMethod: 'gemini-fallback',
        // 클라이언트용 오류 정보 추가
        aiError: {
          occurred: true,
          type: 'gemini_analysis_failed',
          message: errorDetails.userMessage,
          technical: errorDetails.technical,
          timestamp: new Date().toISOString(),
          retryable: errorDetails.retryable
        }
      };
    }

  buildGeminiMultiFramePrompt(metadata, frameCount) {
    const { caption = '', hashtags = [], author = '' } = metadata;

    // 댓글 데이터가 있는 경우 추가 정보로 활용
    let commentAnalysis = '';
    if (metadata.topComments && metadata.topComments.trim().length > 0) {
      // 모든 댓글 활용 (길이 제한 제거)
      const comments = metadata.topComments.trim();
      commentAnalysis = `

**⭐ 시청자 댓글 반응 분석 (매우 중요):**
${comments}

**댓글 기반 카테고리 판단:**
- 댓글에서 나타나는 반응과 키워드를 통해 영상의 실제 내용을 파악하세요
- 시청자들의 감정 반응(웃음, 놀람, 공감 등)을 카테고리 판단에 활용하세요
- 썸네일만으로는 알기 어려운 영상의 진짜 주제를 댓글에서 찾으세요
- **💥 떡상 요인**: 댓글에서 이 영상이 왜 화제가 되고 인기있는지 분석하세요`;
    }

    return `이 ${frameCount}장의 이미지들은 같은 비디오에서 시간순으로 추출된 프레임들입니다.
전체적인 흐름과 내용을 파악하여 다음 정보를 분석해주세요:${commentAnalysis}

1. **전체 비디오 내용**: 댓글 반응을 통해 파악한 실제 내용 + 시간에 따른 변화와 전체적인 스토리를 설명
   - 댓글에서 나타나는 시청자 반응이 영상의 진짜 내용을 알려줍니다
2. 카테고리 분류 (2단계):
   **중요: 반드시 아래 구조에서만 선택하세요**:
   
   * 게임 > (플레이·리뷰 | 가이드·분석 | e스포츠 | 장르 전문)
   * 과학·기술 > (디바이스 리뷰 | 프로그래밍·코딩 강좌 | 과학 이론·실험 | 미래 트렌드)
   * 교육 > (외국어 강의 | 학문·교양 | 시험·자격증 대비 | 자기계발·학습법)
   * How-to & 라이프스타일 > (요리·베이킹 | DIY·공예·인테리어 | 뷰티·패션 | 생활 꿀팁·가전·정리)
   * 뉴스·시사 > (시사 브리핑·이슈 분석 | 정치 평론·토론 | 탐사보도·다큐 | 공식 뉴스 클립)
   * 사회·공익 > (환경·인권 캠페인 | 자선·봉사·기부 | 지속가능·ESG 콘텐츠)
   * 스포츠 > (경기 하이라이트 | 분석·전술 해설 | 피트니스·홈트 | 선수 인터뷰·다큐)
   * 동물 > (반려동물 브이로그 | 훈련·케어·정보 | 야생동물·자연 다큐)
   * 엔터테인먼트 > (예능·밈·챌린지 | 연예 뉴스·K-culture | 웹드라마·웹예능 | 이벤트·라이브 쇼)
   * 여행·이벤트 > (여행 Vlog | 정보·꿀팁·루트 | 테마 여행·캠핑·차박 | 축제·콘서트 스케치)
   * 영화·드라마·애니 > (공식 예고편·클립 | 리뷰·해석 | 제작 비하인드·메이킹 | 팬 애니메이션·단편)
   * 음악 > (뮤직비디오 | 커버·리믹스 | 라이브·버스킹 | 악기 연주·작곡 강좌)
   * 라이프·블로그 > (일상 Vlog·Q&A | 경험담·스토리텔링 | 동기부여·마인드셋 | 가족·커플·룸메이트 일상)
   * 자동차·모빌리티 > (신차 리뷰·시승 | 정비·케어·튜닝 | 모터스포츠 | 드라이브·차박 Vlog)
   * 코미디 > (스케치·콩트 | 패러디·풍자 | 몰래카메라·리액션 | 스탠드업·개그 톡)

3. 키워드: 비디오 전체와 관련된 키워드 5개 (한글)
4. 해시태그: 영상에 적합한 해시태그 5개 (#포함)

추가 정보:
- 캡션: "${caption}"
- 해시태그: ${hashtags.join(', ')}
- 작성자: "${author}"

**중요**: 반드시 JSON 형식으로만 답변하세요:
{
  "summary": "비디오 전체 내용을 시간순으로 설명",
  "main_category": "15개 대카테고리 중 하나를 정확히 선택",
  "middle_category": "선택한 대카테고리의 중카테고리 중 하나를 정확히 선택",
  "keywords": ["관련", "키워드", "다섯개", "선택", "하세요"],
  "hashtags": ["#관련", "#해시태그", "#다섯개", "#선택", "#하세요"],
  "confidence": 0.95
}`;

  }

  parseGeminiResponse(aiResponse, urlBasedCategory, metadata) {
    try {
      // JSON 응답 파싱 시도
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const aiResult = JSON.parse(cleanResponse);
      
      ServerLogger.info('✅ Gemini JSON 파싱 성공:', aiResult);
      
      // 카테고리 검증 및 조합
      const categoryResult = this.determineFinalCategory(
        aiResult.main_category || '',
        aiResult.middle_category || '',
        urlBasedCategory,
        metadata
      );
      
      return {
        category: categoryResult.fullCategory,
        mainCategory: categoryResult.mainCategory,
        middleCategory: categoryResult.middleCategory,
        keywords: Array.isArray(aiResult.keywords) ? aiResult.keywords.slice(0, 5) : this.extractKeywordsFromContent(aiResult.content || ''),
        hashtags: Array.isArray(aiResult.hashtags) ? aiResult.hashtags.slice(0, 5) : this.generateHashtagsFromMetadata(metadata.hashtags || [], categoryResult),
        summary: aiResult.summary || '비디오 분석 결과',
        confidence: aiResult.confidence || 0.8,
        source: 'gemini'
      };
      
    } catch (parseError) {
      ServerLogger.warn('⚠️ Gemini JSON 파싱 실패, 텍스트 분석으로 전환:', parseError.message);
      
      // JSON 파싱 실패 시 텍스트 기반 분석
      return this.parseTextResponse(aiResponse, urlBasedCategory, metadata);
    }
  }

  parseTextResponse(response, urlBasedCategory, metadata) {
    // 기존 텍스트 파싱 로직과 동일
    const lines = response.split('\n');
    let content = '비디오 분석 결과';
    let mainCategory = '';
    let middleCategory = '';
    let keywords = [];
    let hashtags = [];
    
    lines.forEach(line => {
      if (line.includes('내용') || line.includes('content')) {
        const contentMatch = line.match(/[:：]\s*(.+)/);
        if (contentMatch) {
          content = contentMatch[1].trim();
        }
      }
      
      if (line.includes('대카테고리') || line.includes('main_category')) {
        const categoryMatch = line.match(/[:：]\s*(.+)/);
        if (categoryMatch) {
          mainCategory = categoryMatch[1].trim();
        }
      }
      
      if (line.includes('중카테고리') || line.includes('middle_category')) {
        const categoryMatch = line.match(/[:：]\s*(.+)/);
        if (categoryMatch) {
          middleCategory = categoryMatch[1].trim();
        }
      }
    });
    
    const categoryResult = this.determineFinalCategory(mainCategory, middleCategory, urlBasedCategory, metadata);
    
    return {
      category: categoryResult.fullCategory,
      mainCategory: categoryResult.mainCategory,
      middleCategory: categoryResult.middleCategory,
      keywords: keywords.length > 0 ? keywords : this.extractKeywordsFromContent(content),
      hashtags: hashtags.length > 0 ? hashtags : this.generateHashtagsFromMetadata(metadata.hashtags || [], categoryResult),
      summary: content,
      confidence: 0.7,
      source: 'gemini-text-parsed'
    };
  }

  // 최종 카테고리 결정 함수
  determineFinalCategory(mainCategory, middleCategory, urlBasedCategory, metadata) {
    // AI가 제공한 카테고리가 있으면 우선 사용
    if (mainCategory && middleCategory) {
      return {
        fullCategory: `${mainCategory} > ${middleCategory}`,
        mainCategory: mainCategory,
        middleCategory: middleCategory
      };
    }
    
    // URL 기반 카테고리가 있으면 사용
    if (urlBasedCategory && urlBasedCategory.mainCategory) {
      return {
        fullCategory: `${urlBasedCategory.mainCategory} > ${urlBasedCategory.middleCategory}`,
        mainCategory: urlBasedCategory.mainCategory,
        middleCategory: urlBasedCategory.middleCategory
      };
    }
    
    // 메타데이터에서 추론
    const categoryResult = this.inferCategoriesFromMetadata(metadata);
    return {
      fullCategory: `${categoryResult.mainCategory} > ${categoryResult.middleCategory}`,
      mainCategory: categoryResult.mainCategory,
      middleCategory: categoryResult.middleCategory
    };
  }

  /**
   * Gemini 오류 상세 정보 생성
   */
  generateGeminiErrorDetails(error) {
    const errorMessage = error.message || '';
    const errorCode = error.code || error.status || 'UNKNOWN';
    
    // 일반적인 Gemini API 오류 패턴 분석
    let userMessage = '🤖 AI 분석 중 오류가 발생했습니다';
    let technical = errorMessage;
    let retryable = false;
    
    // API 키 관련 오류
    if (errorMessage.includes('API_KEY') || errorMessage.includes('authentication') || errorCode === 401) {
      userMessage = '🔑 API 키 인증 오류 - 관리자에게 문의하세요';
      retryable = false;
    }
    // 할당량 초과
    else if (errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED') || errorCode === 429) {
      userMessage = '📊 일일 사용량 초과 - 잠시 후 다시 시도해주세요';
      retryable = true;
    }
    // 네트워크 타임아웃
    else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND')) {
      userMessage = '🌐 네트워크 연결 오류 - 잠시 후 다시 시도해주세요';
      retryable = true;
    }
    // 이미지 크기/형식 오류
    else if (errorMessage.includes('image') && (errorMessage.includes('large') || errorMessage.includes('format'))) {
      userMessage = '🖼️ 이미지 처리 오류 - 영상 품질 문제일 수 있습니다';
      retryable = true;
    }
    // 서버 내부 오류
    else if (errorCode >= 500 || errorMessage.includes('Internal error')) {
      userMessage = '⚙️ AI 서비스 일시적 오류 - 잠시 후 다시 시도해주세요';
      retryable = true;
    }
    // 요청이 너무 큰 경우
    else if (errorMessage.includes('too large') || errorMessage.includes('REQUEST_TOO_LARGE')) {
      userMessage = '📏 요청 크기 초과 - 영상이 너무 길거나 복잡합니다';
      retryable = false;
    }
    // 콘텐츠 정책 위반 - 더 구체적 감지
    else if (errorMessage.includes('safety') || 
             errorMessage.includes('blocked') || 
             errorMessage.includes('Response was blocked due to OTHER') ||
             errorMessage.includes('Text not available') ||
             errorMessage.includes('SAFETY')) {
      userMessage = '🛡️ AI 안전 정책으로 인해 분석이 차단되었습니다 - 메타데이터 기반 분석으로 대체됩니다';
      retryable = false;
    }

    return {
      userMessage,
      technical,
      retryable,
      errorCode,
      timestamp: new Date().toISOString()
    };
  }







  /**
   * Gemini 사용량 통계 조회
   */
  getGeminiUsageStats() {
    if (this.geminiManager) {
      return this.geminiManager.getUsageStats();
    }
    
    return {
      status: 'no_manager',
      message: 'Gemini 관리자가 초기화되지 않았습니다.'
    };
  }

  /**
   * Gemini 헬스체크 조회
   */
  async getGeminiHealthCheck() {
    if (this.geminiManager) {
      return await this.geminiManager.healthCheck();
    }
    
    return {
      status: 'no_manager',
      message: 'Gemini 관리자가 초기화되지 않았습니다.'
    };
  }

  /**
   * 🚀 지능형 폴백 시스템 - Gemini 블록 시 메타데이터 기반 콘텐츠 생성
   */
  generateIntelligentFallback(metadata, urlBasedCategory, geminiError) {
    ServerLogger.info('🔄 지능형 폴백 콘텐츠 생성 시작...');
    
    const title = metadata.title || metadata.caption || '제목 없음';
    const channelName = metadata.channelName || '채널 정보 없음';
    const description = metadata.description || metadata.caption || '';
    const viewCount = metadata.views || 0;
    const likeCount = metadata.likes || 0;
    
    // 카테고리 기반 분석 생성
    const categoryContext = this.getCategoryAnalysisContext(urlBasedCategory.mainCategory, urlBasedCategory.middleCategory);
    
    // 메타데이터에서 키워드 추출
    const extractedKeywords = this.extractKeywordsFromMetadata(metadata);
    
    const content = this.generateIntelligentContent(title, channelName, description, categoryContext, extractedKeywords);
    const analysisContent = this.generateIntelligentAnalysisContent(title, channelName, categoryContext, viewCount, likeCount, geminiError);
    const summary = this.generateIntelligentSummary(title, channelName, categoryContext);
    const description_field = this.generateIntelligentDescription(title, channelName, description, categoryContext);
    
    return {
      content,
      analysisContent,
      summary,
      description: description_field,
      keywords: extractedKeywords,
      hashtags: this.generateIntelligentHashtags(extractedKeywords, categoryContext)
    };
  }

  /**
   * 카테고리별 분석 컨텍스트 제공
   */
  getCategoryAnalysisContext(mainCategory, middleCategory) {
    const categoryMap = {
      '음악': {
        '팝': { context: '팝 음악', keywords: ['음악', '멜로디', '가사', '뮤직비디오', '아티스트'], action: '노래하며' },
        '클래식': { context: '클래식 음악', keywords: ['클래식', '오케스트라', '연주', '작곡가'], action: '연주하며' },
        '힙합': { context: '힙합 음악', keywords: ['힙합', '랩', '비트', '라이딩'], action: '랩하며' },
        '댄스': { context: '댄스 음악', keywords: ['댄스', '비트', '리듬', '클럽'], action: '춤추며' }
      },
      '게임': {
        '플레이·리뷰': { context: '게임 플레이', keywords: ['게임', '플레이', '리뷰', '공략'], action: '게임하며' },
        'e스포츠': { context: 'e스포츠 경기', keywords: ['e스포츠', '프로경기', '토너먼트'], action: '경기하며' }
      },
      '엔터테인먼트': {
        '예능·밈·챌린지': { context: '엔터테인먼트 콘텐츠', keywords: ['예능', '재미', '웃음', '챌린지'], action: '재미있게' },
        '연예 뉴스·K-culture': { context: '연예 및 K-culture', keywords: ['연예', 'K-pop', '한류', '스타'], action: '소개하며' }
      }
    };

    const category = categoryMap[mainCategory];
    if (category && category[middleCategory]) {
      return category[middleCategory];
    }
    
    return { 
      context: `${mainCategory} 관련 콘텐츠`, 
      keywords: [mainCategory, middleCategory, '영상', '콘텐츠'], 
      action: '제작하며' 
    };
  }

  /**
   * 지능형 콘텐츠 생성
   */
  generateIntelligentContent(title, channelName, description, categoryContext, keywords) {
    const keywordText = keywords.slice(0, 3).join(', ');
    
    if (description && description.length > 20) {
      return `${channelName}이 업로드한 "${title}" 영상입니다. ${categoryContext.context} 분야의 콘텐츠로, ${keywordText} 등의 요소가 포함되어 있습니다. ${description.substring(0, 100)}...`;
    } else {
      return `${channelName}이 제작한 "${title}"는 ${categoryContext.context} 장르의 영상으로, 시청자들에게 ${keywordText} 관련 콘텐츠를 제공합니다.`;
    }
  }

  /**
   * 지능형 분석 콘텐츠 생성
   */
  generateIntelligentAnalysisContent(title, channelName, categoryContext, viewCount, likeCount, geminiError) {
    const engagement = likeCount > 0 ? `${likeCount.toLocaleString()}개의 좋아요` : '양호한 반응';
    const popularity = viewCount > 10000 ? '인기 콘텐츠' : viewCount > 1000 ? '관심을 받고 있는 콘텐츠' : '새로운 콘텐츠';
    
    let analysisReason = '';
    if (geminiError?.message?.includes('blocked due to OTHER')) {
      analysisReason = ' AI 콘텐츠 정책으로 인해 메타데이터 기반으로 분석되었습니다.';
    }
    
    return `"${title}"은 ${channelName}이 제작한 ${categoryContext.context} 영역의 ${popularity}입니다. 현재 ${engagement}을 받으며 좋은 반응을 보이고 있습니다. ${categoryContext.context} 특성상 ${categoryContext.action} 제작된 콘텐츠로 분석됩니다.${analysisReason}`;
  }

  /**
   * 지능형 요약 생성
   */
  generateIntelligentSummary(title, channelName, categoryContext) {
    return `${channelName}의 "${title}" - ${categoryContext.context} 콘텐츠`;
  }

  /**
   * 지능형 설명 생성
   */
  generateIntelligentDescription(title, channelName, description, categoryContext) {
    if (description && description.length > 10) {
      return `${categoryContext.context} 분야: ${description.substring(0, 150)}...`;
    }
    return `${channelName}이 제작한 ${categoryContext.context} 영상 "${title}"`;
  }

  /**
   * 메타데이터에서 키워드 추출
   */
  extractKeywordsFromMetadata(metadata) {
    const keywords = new Set();
    
    // 제목에서 키워드 추출
    if (metadata.title) {
      const titleWords = metadata.title
        .replace(/[^\w\sㄱ-ㅎ가-힣]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 2 && word.length <= 10);
      titleWords.forEach(word => keywords.add(word));
    }
    
    // 채널명 추가
    if (metadata.channelName) {
      keywords.add(metadata.channelName);
    }
    
    // 기본 키워드 추가
    keywords.add('영상');
    keywords.add('콘텐츠');
    
    return Array.from(keywords).slice(0, 5);
  }

  /**
   * 지능형 해시태그 생성
   */
  generateIntelligentHashtags(keywords, categoryContext) {
    const hashtags = [];
    
    // 키워드 기반 해시태그
    keywords.slice(0, 3).forEach(keyword => {
      hashtags.push(`#${keyword}`);
    });
    
    // 카테고리 기반 해시태그
    categoryContext.keywords.slice(0, 2).forEach(keyword => {
      if (!hashtags.some(tag => tag.includes(keyword))) {
        hashtags.push(`#${keyword}`);
      }
    });
    
    return hashtags.slice(0, 5);
  }

  /**
   * 기본 폴백 메서드들 (하위 호환성)
   */
  generateFallbackSummary(metadata) {
    const title = metadata.title || metadata.caption || '영상';
    const channelName = metadata.channelName || '채널';
    return `${channelName}의 "${title}"`;
  }

  generateFallbackContent(metadata) {
    const title = metadata.title || '제목 없음';
    const channelName = metadata.channelName || '작성자';
    const description = metadata.description || metadata.caption || '';
    
    if (description && description.length > 20) {
      return `${channelName}이 업로드한 "${title}" 영상입니다. ${description.substring(0, 200)}...`;
    }
    return `${channelName}이 업로드한 "${title}" 영상입니다. 이 콘텐츠는 다양한 시청자들에게 유용한 정보와 재미를 제공합니다.`;
  }

  generateFallbackAnalysisContent(metadata, mainCategory, middleCategory) {
    const title = metadata.title || '영상';
    const channelName = metadata.channelName || '채널';
    const viewCount = metadata.views || 0;
    
    const popularityLevel = viewCount > 1000000 ? '인기' : viewCount > 100000 ? '관심을 받는' : '새로운';
    
    return `"${title}"은 ${channelName}이 제작한 ${mainCategory}/${middleCategory} 카테고리의 ${popularityLevel} 콘텐츠입니다. 현재 ${viewCount.toLocaleString()}회 조회수를 기록하며 시청자들의 관심을 받고 있습니다.`;
  }

  generateFallbackDescription(metadata) {
    const originalDesc = metadata.description || metadata.caption;
    if (originalDesc && originalDesc.length > 10) {
      return originalDesc;
    }
    
    const title = metadata.title || '영상';
    const channelName = metadata.channelName || '채널';
    
    return `${channelName}에서 제작한 "${title}" 콘텐츠입니다. 시청자들에게 유익한 정보와 재미를 제공합니다.`;
  }

  /**
   * 플레이스홀더 콘텐츠 감지
   */
  isPlaceholderContent(content) {
    // null, undefined, 빈 문자열, N/A 체크
    if (!content || 
        content === 'N/A' || 
        content === '' || 
        content === 'undefined' || 
        content === 'null' ||
        content.trim() === '') {
      return true;
    }
    
    const placeholderPatterns = [
      '실제 AI 분석 내용',
      '영상 내용', 
      '영상 분석',
      '내용 분석 완료',
      'AI 분석 결과',
      '분석 중...',
      '처리 중...',
      '영상 설명이 제공되지 않았습니다',
      '제목 없음',
      '채널 정보 없음'
    ];
    
    // 문자열이 아닌 경우 처리
    if (typeof content !== 'string') {
      return true;
    }
    
    return placeholderPatterns.some(pattern => 
      content.includes(pattern)
    );
  }

  /**
   * YouTube 카테고리 ID를 한국어 카테고리로 매핑
   */
  mapYouTubeCategoryToKorean(categoryId, title, channelName) {
    const youtubeCategoryMap = {
      '1': { main: '영화·애니메이션', middle: '영화' },
      '2': { main: '자동차·교통', middle: '스포츠카' },
      '10': { main: '음악', middle: '팝' },  // Music
      '15': { main: '동물', middle: '반려동물 브이로그' },
      '17': { main: '스포츠', middle: '경기 하이라이트' },
      '19': { main: '여행·이벤트', middle: '여행 Vlog' },
      '20': { main: '게임', middle: '플레이·리뷰' },
      '22': { main: 'How-to & 라이프스타일', middle: '생활 꿀팁·가전·정리' },
      '23': { main: '사회·공익', middle: '환경·인권 캠페인' },
      '24': { main: '엔터테인먼트', middle: '예능·밈·챌린지' },
      '25': { main: '뉴스·시사', middle: '시사 브리핑·이슈 분석' },
      '26': { main: 'How-to & 라이프스타일', middle: 'DIY·공예·인테리어' },
      '27': { main: '교육', middle: '학문·교양' },
      '28': { main: '과학·기술', middle: '과학 이론·실험' }
    };
    
    const mapping = youtubeCategoryMap[String(categoryId)];
    if (mapping) {
      ServerLogger.info(`🎯 YouTube 카테고리 매핑: categoryId ${categoryId} → ${mapping.main}/${mapping.middle}`);
      return mapping;
    }
    
    // 기본값
    ServerLogger.info(`⚠️ 알 수 없는 YouTube 카테고리 ID: ${categoryId}`);
    return { main: '엔터테인먼트', middle: '예능·밈·챌린지' };
  }
}

module.exports = AIAnalyzer;
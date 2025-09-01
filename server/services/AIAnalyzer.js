const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');

class AIAnalyzer {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'llava:latest';
    
    // Gemini 설정
    this.useGemini = process.env.USE_GEMINI === 'true';
    this.geminiApiKey = process.env.GOOGLE_API_KEY;
    
    if (this.useGemini && !this.geminiApiKey) {
      ServerLogger.warn('USE_GEMINI=true이지만 GOOGLE_API_KEY가 설정되지 않음. Ollama 사용', null, 'AI');
      this.useGemini = false;
    }
    
    ServerLogger.info(`AI 설정 - USE_GEMINI: ${process.env.USE_GEMINI}, API_KEY 존재: ${!!this.geminiApiKey}`, null, 'AI');
    
    if (this.useGemini) {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
      this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      ServerLogger.success('Gemini API 초기화 완료', null, 'AI');
    } else {
      ServerLogger.info('Ollama 모드로 실행 중', null, 'AI');
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

  async testConnection() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      
      const models = response.data.models || [];
      const hasLlava = models.some(model => model.name.includes('llava'));
      
      if (!hasLlava) {
        throw new Error('LLaVA 모델이 설치되지 않았습니다. `ollama pull llava` 명령으로 설치해주세요.');
      }
      
      return {
        status: 'connected',
        models: models.map(m => m.name),
        recommendedModel: this.modelName
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama 서버가 실행되지 않았습니다. `ollama serve` 명령으로 시작해주세요.');
      }
      throw error;
    }
  }

  async analyzeVideo(thumbnailPaths, metadata) {
    ServerLogger.info('analyzeVideo 함수 시작', null, 'AI');
    ServerLogger.info('📁 썸네일 경로들:', thumbnailPaths);
    ServerLogger.info('📋 메타데이터:', JSON.stringify(metadata, null, 2));
    
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
    ServerLogger.info(`🔮 사용할 AI: ${this.useGemini ? 'Gemini' : 'Ollama'}`);
    
    let aiResponse;
    try {
      aiResponse = this.useGemini 
        ? await this.queryGemini(analysisPrompt, imageBase64)
        : await this.queryOllama(analysisPrompt, imageBase64);
      ServerLogger.info('3. AI 호출 완료');
      ServerLogger.info('AI 원본 응답:', aiResponse);
    } catch (error) {
      ServerLogger.error('❌ AI 호출 실패:', error.message);
      aiResponse = null;
    }
    
    // AI + URL 기반 하이브리드 분석
    const analysis = this.combineAnalysis(aiResponse, urlBasedCategory, metadata);
    ServerLogger.info('✅ 단일 프레임 분석 완료:', analysis);
    return analysis;
  }

  async analyzeMultipleFrames(thumbnailPaths, urlBasedCategory, metadata) {
    ServerLogger.info(`🎬 다중 프레임 분석 시작: ${thumbnailPaths.length}개 프레임`);
    
    // Gemini를 사용하는 경우 한 번에 모든 프레임 분석
    if (this.useGemini) {
      return await this.analyzeMultipleFramesWithGemini(thumbnailPaths, urlBasedCategory, metadata);
    }
    
    // Ollama를 사용하는 경우 순차 분석 (기존 방식)
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
        
        // AI 호출
        const aiResponse = this.useGemini 
          ? await this.queryGemini(framePrompt, imageBase64)
          : await this.queryOllama(framePrompt, imageBase64);
        
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
          content: `프레임 ${frameNumber} 분석 실패`,
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
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
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
  "content": "이미지에서 보이는 내용을 설명하세요",
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

  async queryOllama(prompt, imageBase64) {
    try {
      ServerLogger.info('AI 요청 시작 - 모델:', this.modelName);
      ServerLogger.info('AI 프롬프트 길이:', prompt.length);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1,  // 더 일관된 답변을 위해 매우 낮은 온도
          top_k: 5,          // 토큰 선택 범위 줄임
          top_p: 0.7,        // 확률 임계값 낮춤
          seed: 42           // 동일 시드로 일관성 보장
        }
      }, {
        timeout: 60000  // 60초 타임아웃
      });

      ServerLogger.info('AI 응답 상태:', response.status);
      ServerLogger.info('AI 응답 길이:', response.data.response?.length || 0);
      
      return response.data.response;
    } catch (error) {
      ServerLogger.error('AI 호출 에러:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama 서버 연결 실패');
      }
      if (error.response?.status === 404) {
        throw new Error(`모델 '${this.modelName}'을 찾을 수 없습니다. 'ollama pull llava' 명령으로 설치해주세요.`);
      }
      throw error;
    }
  }

  async queryGemini(prompt, imageBase64) {
    try {
      ServerLogger.info('AI 요청 시작 - 모델: Gemini');
      ServerLogger.info('AI 프롬프트 길이:', prompt.length);
      
      // base64 이미지를 Gemini 형식으로 변환
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      };
      
      const result = await this.geminiModel.generateContent([
        prompt,
        imagePart
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      ServerLogger.info('AI 응답 상태: 성공');
      ServerLogger.info('AI 응답 길이:', text?.length || 0);
      
      return text;
    } catch (error) {
      ServerLogger.error('Gemini 호출 에러:', error.message);
      if (error.message.includes('quota')) {
        throw new Error('Gemini API 할당량 초과');
      }
      if (error.message.includes('API key')) {
        throw new Error('Gemini API 키 오류');
      }
      throw error;
    }
  }

  parseAIResponse(aiResponse, metadata) {
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
        
        const categoryResult = this.validateAndInferCategories(parsed, metadata);
        ServerLogger.info('🔍 카테고리 검증 결과:', categoryResult);
        
        return {
          content: parsed.content || '내용 분석 실패',
          mainCategory: categoryResult.mainCategory,
          middleCategory: categoryResult.middleCategory,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : [],
          confidence: parsed.confidence || 0.7,
          source: this.useGemini ? this.geminiModel.model : this.modelName
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
      source: `${this.useGemini ? this.geminiModel.model : this.modelName}-text-parsed`
    };
  }

  validateAndInferCategories(parsed, metadata) {
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

  // AI 카테고리 유효성 검증 함수
  validateCategoryPair(mainCategory, middleCategory) {
    if (!mainCategory || !middleCategory) {
      return { isValid: false, reason: 'Missing category' };
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
      content: caption || '영상 내용',
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
    if (!url) return { mainCategory: '라이프·블로그', middleCategory: '일상 Vlog·Q&A' };
    
    const urlLower = url.toLowerCase();
    
    // Instagram 릴스는 기본적으로 라이프 블로그 성격
    if (urlLower.includes('instagram.com/reels')) {
      return { mainCategory: '라이프·블로그', middleCategory: '일상 Vlog·Q&A' };
    }
    
    // 기타 플랫폼별 기본 추론 로직 (확장 가능)
    return { mainCategory: '라이프·블로그', middleCategory: '일상 Vlog·Q&A' };
  }

  // 간단한 AI 프롬프트 (일관성 향상)
  buildSimpleAnalysisPrompt(metadata) {
    const platform = metadata.platform || '소셜미디어';
    return `이 ${platform} 영상의 스크린샷을 보고 정확한 카테고리를 분류해주세요.

**이미지 분석 지침:**
1. 화면에 보이는 주요 내용 (인물, 객체, 배경, 텍스트, 자막)
2. 영상의 주제와 목적 (요리, 패션, 게임, 교육, 엔터테인먼트 등)
3. 시각적 단서들 (UI, 브랜드, 로고, 환경)

**카테고리 분류 체계** (반드시 이 중에서 선택):
• 게임 → 플레이·리뷰 | 가이드·분석 | e스포츠 | 장르 전문
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
  "content": "영상 내용 분석 (2-3문장)",
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
  "content": "프레임의 상세한 내용 설명",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "features": "이 프레임의 특별한 특징",
  "confidence": 0.9
}

추가 정보:
- 캡션: "${metadata.caption || ''}"
- 작성자: "${metadata.author || ''}"
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
          content: parsed.content || `프레임 ${frameNumber} 내용`,
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
        content: `프레임 ${frameNumber} 분석 오류`,
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
      content: combinedContent,
      mainCategory: urlBasedCategory.mainCategory,
      middleCategory: urlBasedCategory.middleCategory,
      keywords: topKeywords,
      hashtags: hashtags,
      confidence: Math.min(avgConfidence + 0.1, 0.95), // 다중 프레임 보너스
      source: this.useGemini ? this.geminiModel.model : this.modelName,
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
  combineAnalysis(aiResponse, urlBasedCategory, metadata) {
    try {
      ServerLogger.info('🔍 AI 응답 분석 시작...');
      ServerLogger.info('AI 응답 존재 여부:', !!aiResponse);
      
      // AI 응답에서 새로운 구조의 데이터 추출
      let aiData = { 
        content: '영상 내용', 
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
            
            aiData.content = parsed.content || '영상 내용';
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
        ServerLogger.info('❌ AI 응답이 null 또는 undefined');
      }
      
      // AI가 카테고리를 제대로 분석했는지 검증
      let finalMainCategory = urlBasedCategory.mainCategory;
      let finalMiddleCategory = urlBasedCategory.middleCategory;
      
      if (aiData.main_category && aiData.middle_category) {
        // AI 카테고리 유효성 검증
        const validation = this.validateCategoryPair(aiData.main_category, aiData.middle_category);
        if (validation.isValid) {
          ServerLogger.info('✅ AI 카테고리 분석 성공, AI 분류 사용:', {
            main: aiData.main_category,
            middle: aiData.middle_category
          });
          finalMainCategory = aiData.main_category;
          finalMiddleCategory = aiData.middle_category;
        } else {
          ServerLogger.info('❌ AI 카테고리 무효, URL 기반 카테고리 사용:', {
            ai_main: aiData.main_category,
            ai_middle: aiData.middle_category,
            url_main: urlBasedCategory.mainCategory,
            url_middle: urlBasedCategory.middleCategory
          });
        }
      }
      
      // 최종 분석 결과 반환
      return {
        content: aiData.content,
        mainCategory: finalMainCategory,
        middleCategory: finalMiddleCategory,
        keywords: aiData.keywords.slice(0, 5),
        hashtags: aiData.hashtags.length > 0 ? aiData.hashtags : this.generateHashtagsFromKeywords(aiData.keywords),
        confidence: aiData.main_category ? 0.9 : 0.6, // AI 카테고리 성공시 높은 신뢰도
        source: this.useGemini ? this.geminiModel.model : this.modelName
      };
      
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
      content: '인스타그램 릴스 영상',
      mainCategory: urlBasedCategory.mainCategory,
      middleCategory: urlBasedCategory.middleCategory,
      keywords: ['인스타그램', '릴스', '영상', '소셜미디어'],
      hashtags: ['#인스타그램', '#릴스', '#영상', '#소셜미디어'],
      confidence: 0.7,
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
    
    try {
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
      
      // 다중 프레임 분석 프롬프트 생성
      const prompt = this.buildGeminiMultiFramePrompt(metadata, thumbnailPaths.length);
      
      ServerLogger.info('🔮 Gemini API 호출 시작...');
      
      // Gemini API 호출
      const result = await this.geminiModel.generateContent([
        prompt,
        ...imageContents
      ]);
      
      const response = await result.response;
      const aiResponse = response.text();
      
      ServerLogger.info('🔮 Gemini AI 원본 응답:', aiResponse);
      
      // 응답 파싱 및 결과 생성
      const analysis = this.parseGeminiResponse(aiResponse, urlBasedCategory, metadata);
      analysis.frameCount = thumbnailPaths.length;
      analysis.analysisMethod = 'gemini-multi-frame';
      
      ServerLogger.info('✅ Gemini 다중 프레임 분석 완료:', analysis);
      return analysis;
      
    } catch (error) {
      ServerLogger.error('❌ Gemini 다중 프레임 분석 실패:', error);
      
      // Gemini 전용 모드: 실패해도 Ollama로 폴백하지 않음
      ServerLogger.info('⚠️ Gemini 전용 모드로 실행 중 - Ollama 폴백 건너뜀');
      
      // 기본 분석 결과 반환
      const categoryResult = this.determineFinalCategory('', '', urlBasedCategory, metadata);
      
      return {
        category: categoryResult.fullCategory,
        mainCategory: categoryResult.mainCategory,
        middleCategory: categoryResult.middleCategory,
        keywords: this.extractKeywordsFromContent(metadata.caption || ''),
        hashtags: this.generateHashtagsFromMetadata(metadata.hashtags || [], categoryResult),
        content: `Gemini 분석 실패: ${error.message}`,
        confidence: 0.3,
        source: 'fallback-metadata',
        frameCount: thumbnailPaths.length,
        analysisMethod: 'gemini-fallback'
      };
    }
  }

  buildGeminiMultiFramePrompt(metadata, frameCount) {
    const { caption = '', hashtags = [], author = '' } = metadata;
    
    return `이 ${frameCount}장의 이미지들은 같은 비디오에서 시간순으로 추출된 프레임들입니다. 
전체적인 흐름과 내용을 파악하여 다음 정보를 분석해주세요:

1. 전체 비디오 내용: 시간에 따른 변화와 전체적인 스토리를 설명
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
  "content": "비디오 전체 내용을 시간순으로 설명",
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
        content: aiResult.content || '비디오 분석 결과',
        confidence: aiResult.confidence || 0.8,
        source: this.useGemini ? this.geminiModel.model : this.modelName
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
      content: content,
      confidence: 0.7,
      source: `${this.useGemini ? this.geminiModel.model : this.modelName}-text-parsed`
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
}

module.exports = AIAnalyzer;
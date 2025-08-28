const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIAnalyzer {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.modelName = process.env.OLLAMA_MODEL || 'llava:latest';
    
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

  async analyzeVideo(thumbnailPath, metadata) {
    console.log('🔥🔥🔥 analyzeVideo 함수 시작 🔥🔥🔥');
    console.log('📁 썸네일 경로:', thumbnailPath);
    console.log('📋 메타데이터:', JSON.stringify(metadata, null, 2));
    
    // URL 기반 기본 카테고리 추론 (일관성 확보)
    const urlBasedCategory = this.inferCategoryFromUrl(metadata.url);
    console.log('🎯 URL 기반 카테고리 추론:', urlBasedCategory);
    
    try {
      console.log(`AI 분석 시작: ${thumbnailPath}`);
      
      // 이미지 파일을 base64로 인코딩
      console.log('1. 이미지 인코딩 중...');
      const imageBase64 = await this.encodeImageToBase64(thumbnailPath);
      console.log('1. 이미지 인코딩 완료, 길이:', imageBase64.length);
      
      // AI에게 분석 요청 (더 간단한 프롬프트)
      console.log('2. AI 프롬프트 생성 중...');
      const analysisPrompt = this.buildSimpleAnalysisPrompt(metadata);
      console.log('2. AI 프롬프트 생성 완료, 길이:', analysisPrompt.length);
      
      console.log('3. AI 호출 시작...');
      const aiResponse = await this.queryOllama(analysisPrompt, imageBase64);
      console.log('3. AI 호출 완료');
      
      console.log('AI 원본 응답:', aiResponse);
      
      // AI + URL 기반 하이브리드 분석
      const analysis = this.combineAnalysis(aiResponse, urlBasedCategory, metadata);
      console.log('✅ 하이브리드 분석 완료:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('AI 분석 실패:', error);
      
      // 폴백: URL 기반 분석 사용
      return this.createAnalysisFromUrl(urlBasedCategory, metadata);
    }
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
   
   * 게임 > (플레이·리뷰 | 공략·팁 | 하이라이트·클립 | E스포츠·대회)
   * 과학·기술 > (디바이스 리뷰 | IT 뉴스·트렌드 | 코딩·개발 강의 | 과학 실험·교육)
   * 교육 > (외국어 강의 | 학습·시험 정보 | 자격증·취업 강의 | 교육 정보·진로)
   * How-to & 라이프스타일 > (요리·베이킹 | DIY·수공예 | 생활 꿀팁·가전·정리 | 뷰티·패션 스타일링)
   * 뉴스·시사 > (시사 브리핑·이슈 분석 | 경제·정치 해설 | 국제 뉴스·외교 | 공식 뉴스 클립)
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
- "main_category": "How-to & 라이프스타일", "middle_category": "생활 꿀팁·가전·정리" (❌)`;
  }

  async queryOllama(prompt, imageBase64) {
    try {
      console.log('AI 요청 시작 - 모델:', this.modelName);
      console.log('AI 프롬프트 길이:', prompt.length);
      
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

      console.log('AI 응답 상태:', response.status);
      console.log('AI 응답 길이:', response.data.response?.length || 0);
      
      return response.data.response;
    } catch (error) {
      console.error('AI 호출 에러:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama 서버 연결 실패');
      }
      if (error.response?.status === 404) {
        throw new Error(`모델 '${this.modelName}'을 찾을 수 없습니다. 'ollama pull llava' 명령으로 설치해주세요.`);
      }
      throw error;
    }
  }

  parseAIResponse(aiResponse, metadata) {
    console.log('🟡 parseAIResponse 함수 시작');
    console.log('🟡 원본 AI 응답 길이:', aiResponse ? aiResponse.length : 'null');
    
    try {
      // JSON 응답 추출 시도 (```json``` 마크다운 제거)
      let cleanResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      
      console.log('🔍 파싱 전 AI 응답 정리:', cleanResponse);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('🔍 파싱된 JSON:', parsed);
        console.log('🔍 AI가 반환한 카테고리:', { 
          main: parsed.main_category, 
          middle: parsed.middle_category 
        });
        
        const categoryResult = this.validateAndInferCategories(parsed, metadata);
        console.log('🔍 카테고리 검증 결과:', categoryResult);
        
        return {
          content: parsed.content || '내용 분석 실패',
          mainCategory: categoryResult.mainCategory,
          middleCategory: categoryResult.middleCategory,
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : [],
          confidence: parsed.confidence || 0.7,
          source: 'AI'
        };
      }
      
      // JSON이 아닌 경우 텍스트 파싱 시도
      return this.parseTextResponse(aiResponse, metadata);
      
    } catch (error) {
      console.log('🚨 AI 응답 파싱 실패, 폴백 사용:');
      console.log('에러:', error.message);
      console.log('AI 원본 응답:', aiResponse);
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
      source: 'TEXT_PARSE'
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
    console.log('🔍 카테고리 검증 시작:', { mainCategory, middleCategory });
    
    const validMainCategories = Object.keys(this.categories);
    console.log('유효한 대카테고리들:', validMainCategories);
    
    // 대카테고리 검증
    if (!mainCategory || !validMainCategories.includes(mainCategory)) {
      console.log('❌ 대카테고리 검증 실패:', mainCategory);
      return this.findBestCategoryMatch(middleCategory);
    }
    
    const validMiddleCategories = Object.keys(this.categories[mainCategory]);
    console.log(`"${mainCategory}"의 유효한 중카테고리들:`, validMiddleCategories);
    
    // 중카테고리 검증
    if (!middleCategory || !validMiddleCategories.includes(middleCategory)) {
      console.log('❌ 중카테고리 검증 실패:', middleCategory);
      return this.findBestCategoryMatch(middleCategory, mainCategory);
    }
    
    console.log('✅ 카테고리 검증 성공');
    return {
      isValid: true,
      mainCategory,
      middleCategory
    };
  }

  findBestCategoryMatch(keyword, preferredMainCategory = null) {
    console.log('🔄 카테고리 매칭 시도:', { keyword, preferredMainCategory });
    
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
    console.log('⚡ 기본 카테고리 사용');
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
      source: 'FALLBACK'
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
    return `이 이미지를 보고 간단히 설명해주세요:

1. 주요 내용: 이미지에서 보이는 것을 2-3문장으로 설명
2. 키워드: 관련 키워드 3-5개 (한글)

JSON 형식으로 답변:
{
  "content": "이미지 내용을 간단히 설명",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;
  }

  // AI + URL 기반 하이브리드 분석
  combineAnalysis(aiResponse, urlBasedCategory, metadata) {
    try {
      // AI 응답에서 내용과 키워드만 추출
      let aiData = { content: '영상 내용', keywords: [] };
      
      if (aiResponse) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            aiData.content = parsed.content || '영상 내용';
            aiData.keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
          } catch (e) {
            console.log('AI JSON 파싱 실패, 기본값 사용');
          }
        }
      }
      
      // URL 기반 카테고리 + AI 콘텐츠 결합
      return {
        content: aiData.content,
        mainCategory: urlBasedCategory.mainCategory,
        middleCategory: urlBasedCategory.middleCategory,
        keywords: aiData.keywords.slice(0, 5),
        hashtags: this.generateHashtagsFromKeywords(aiData.keywords),
        confidence: 0.8, // 하이브리드 분석의 높은 신뢰도
        source: 'HYBRID'
      };
      
    } catch (error) {
      console.error('하이브리드 분석 실패:', error);
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
      source: 'URL_BASED'
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
}

module.exports = AIAnalyzer;
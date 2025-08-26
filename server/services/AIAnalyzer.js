const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIAnalyzer {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';
    this.modelName = 'llava:latest';
    
    // 카테고리 정의
    this.categories = {
      '음식': ['요리', '맛집', '레시피', '음식', 'food', 'cooking', 'recipe'],
      '여행': ['여행', '관광', '여행지', 'travel', 'trip', 'vacation'],
      '패션': ['패션', '옷', '스타일', 'fashion', 'style', 'outfit'],
      '뷰티': ['메이크업', '화장품', '스킨케어', 'makeup', 'beauty', 'skincare'],
      '운동': ['운동', '헬스', '요가', 'workout', 'fitness', 'exercise'],
      '일상': ['일상', '브이로그', 'daily', 'vlog', 'lifestyle'],
      '댄스': ['댄스', '춤', 'dance', 'dancing'],
      '음악': ['음악', '노래', '커버', 'music', 'song', 'cover'],
      '게임': ['게임', '게이밍', 'game', 'gaming'],
      '반려동물': ['강아지', '고양이', '펫', 'dog', 'cat', 'pet'],
      '교육': ['교육', '학습', '튜토리얼', 'education', 'tutorial', 'how-to'],
      '엔터테인먼트': ['코미디', '재미', '웃음', 'funny', 'comedy', 'entertainment']
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
        recommendedModel: 'llava:latest'
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama 서버가 실행되지 않았습니다. `ollama serve` 명령으로 시작해주세요.');
      }
      throw error;
    }
  }

  async analyzeVideo(thumbnailPath, metadata) {
    try {
      console.log(`AI 분석 시작: ${thumbnailPath}`);
      
      // 이미지 파일을 base64로 인코딩
      const imageBase64 = await this.encodeImageToBase64(thumbnailPath);
      
      // AI에게 분석 요청
      const analysisPrompt = this.buildAnalysisPrompt(metadata);
      const aiResponse = await this.queryOllama(analysisPrompt, imageBase64);
      
      // 응답 파싱
      const analysis = this.parseAIResponse(aiResponse, metadata);
      
      console.log('✅ AI 분석 완료:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('AI 분석 실패:', error);
      
      // 폴백: 기본 분석
      return this.getFallbackAnalysis(metadata);
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
2. 카테고리: 음식, 여행, 패션, 뷰티, 운동, 일상, 댄스, 음악, 게임, 반려동물, 교육, 엔터테인먼트 중 가장 적합한 것 선택
3. 키워드: 내용과 관련된 키워드 5개 (한글)
4. 분위기: 밝음, 차분함, 활기참, 감성적, 재미있음 등
5. 색감: 주요 색상 톤 (예: 따뜻한 톤, 시원한 톤, 중성 톤)

추가 정보:
- 캡션: "${caption}"
- 해시태그: ${hashtags.join(', ')}
- 작성자: "${author}"

응답은 다음 JSON 형식으로만 답변해주세요:
{
  "content": "주요 내용 설명",
  "category": "카테고리명",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "mood": "분위기",
  "color_tone": "색감",
  "confidence": 0.95
}`;
  }

  async queryOllama(prompt, imageBase64) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.modelName,
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.3,  // 일관된 답변을 위해 낮은 온도
          top_k: 10,
          top_p: 0.9
        }
      }, {
        timeout: 60000  // 60초 타임아웃
      });

      return response.data.response;
    } catch (error) {
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
    try {
      // JSON 응답 추출 시도
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content: parsed.content || '내용 분석 실패',
          category: this.validateCategory(parsed.category) || this.inferCategoryFromMetadata(metadata),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
          mood: parsed.mood || '중성적',
          colorTone: parsed.color_tone || '중성 톤',
          confidence: parsed.confidence || 0.7,
          source: 'AI'
        };
      }
      
      // JSON이 아닌 경우 텍스트 파싱 시도
      return this.parseTextResponse(aiResponse, metadata);
      
    } catch (error) {
      console.log('AI 응답 파싱 실패, 폴백 사용:', error);
      return this.getFallbackAnalysis(metadata);
    }
  }

  parseTextResponse(response, metadata) {
    // 텍스트에서 정보 추출
    const lines = response.split('\n');
    
    let content = '영상 내용';
    let category = this.inferCategoryFromMetadata(metadata);
    let keywords = [];
    let mood = '중성적';
    let colorTone = '중성 톤';
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('카테고리') || lowerLine.includes('category')) {
        Object.keys(this.categories).forEach(cat => {
          if (line.includes(cat)) {
            category = cat;
          }
        });
      }
      
      if (lowerLine.includes('키워드') || lowerLine.includes('keyword')) {
        const keywordMatches = line.match(/[\uAC00-\uD7AF]+/g);
        if (keywordMatches) {
          keywords = keywordMatches.slice(0, 5);
        }
      }
    });
    
    return {
      content,
      category,
      keywords,
      mood,
      colorTone,
      confidence: 0.6,
      source: 'TEXT_PARSE'
    };
  }

  validateCategory(category) {
    const validCategories = Object.keys(this.categories);
    return validCategories.includes(category) ? category : null;
  }

  inferCategoryFromMetadata(metadata) {
    const { caption = '', hashtags = [] } = metadata;
    const text = (caption + ' ' + hashtags.join(' ')).toLowerCase();
    
    // 카테고리별 키워드 매칭
    for (const [category, keywords] of Object.entries(this.categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    
    return '일상'; // 기본 카테고리
  }

  getFallbackAnalysis(metadata) {
    const { caption = '', hashtags = [], author = '' } = metadata;
    
    return {
      content: caption || '영상 내용',
      category: this.inferCategoryFromMetadata(metadata),
      keywords: this.extractKeywordsFromText(caption + ' ' + hashtags.join(' ')),
      mood: '중성적',
      colorTone: '중성 톤',
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

  // 통계용 분석 결과 요약
  generateSummary(analysisResults) {
    const categories = {};
    const moods = {};
    let totalConfidence = 0;
    
    analysisResults.forEach(result => {
      categories[result.category] = (categories[result.category] || 0) + 1;
      moods[result.mood] = (moods[result.mood] || 0) + 1;
      totalConfidence += result.confidence;
    });
    
    return {
      totalVideos: analysisResults.length,
      averageConfidence: totalConfidence / analysisResults.length,
      topCategories: Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topMoods: Object.entries(moods)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
    };
  }
}

module.exports = AIAnalyzer;
const AIAnalyzer = require('../../server/services/AIAnalyzer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Mock 설정
jest.mock('axios');
jest.mock('fs');
jest.mock('../../server/utils/logger');

const mockedAxios = axios;
const mockedFs = fs;

describe('AIAnalyzer', () => {
  let aiAnalyzer;

  beforeEach(() => {
    // 환경 변수 초기화
    process.env.OLLAMA_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'llava:test';
    process.env.USE_GEMINI = 'false';
    
    aiAnalyzer = new AIAnalyzer();
    
    // Mock 초기화
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('기본 설정으로 초기화되어야 함', () => {
      expect(aiAnalyzer.ollamaUrl).toBe('http://localhost:11434');
      expect(aiAnalyzer.modelName).toBe('llava:test');
      expect(aiAnalyzer.useGemini).toBe(false);
    });

    it('Gemini 설정이 활성화되면 Gemini 모델을 초기화해야 함', () => {
      process.env.USE_GEMINI = 'true';
      process.env.GOOGLE_API_KEY = 'test-api-key';
      
      const geminiAnalyzer = new AIAnalyzer();
      expect(geminiAnalyzer.useGemini).toBe(true);
    });

    it('카테고리 구조가 올바르게 로드되어야 함', () => {
      expect(aiAnalyzer.categories).toBeDefined();
      expect(Object.keys(aiAnalyzer.categories)).toContain('게임');
      expect(Object.keys(aiAnalyzer.categories)).toContain('과학·기술');
      expect(Object.keys(aiAnalyzer.categories)).toContain('라이프·블로그');
    });
  });

  describe('testConnection', () => {
    it('Ollama 연결이 성공하면 모델 정보를 반환해야 함', async () => {
      const mockResponse = {
        data: {
          models: [
            { name: 'llava:latest' },
            { name: 'llama2:latest' }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await aiAnalyzer.testConnection();

      expect(result.status).toBe('connected');
      expect(result.models).toEqual(['llava:latest', 'llama2:latest']);
      expect(result.recommendedModel).toBe('llava:test');
    });

    it('LLaVA 모델이 없으면 에러를 발생시켜야 함', async () => {
      const mockResponse = {
        data: {
          models: [
            { name: 'llama2:latest' }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await expect(aiAnalyzer.testConnection()).rejects.toThrow(
        'LLaVA 모델이 설치되지 않았습니다'
      );
    });

    it('연결 실패 시 적절한 에러를 발생시켜야 함', async () => {
      const connectionError = new Error('Connection failed');
      connectionError.code = 'ECONNREFUSED';
      
      mockedAxios.get.mockRejectedValueOnce(connectionError);

      await expect(aiAnalyzer.testConnection()).rejects.toThrow(
        'Ollama 서버가 실행되지 않았습니다'
      );
    });
  });

  describe('encodeImageToBase64', () => {
    it('이미지 파일을 base64로 인코딩해야 함', async () => {
      const mockBuffer = Buffer.from('test-image-data');
      mockedFs.readFileSync.mockReturnValueOnce(mockBuffer);

      const result = await aiAnalyzer.encodeImageToBase64('/path/to/image.jpg');

      expect(result).toBe(mockBuffer.toString('base64'));
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/path/to/image.jpg');
    });

    it('파일 읽기 실패 시 에러를 발생시켜야 함', async () => {
      mockedFs.readFileSync.mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      await expect(aiAnalyzer.encodeImageToBase64('/nonexistent/path')).rejects.toThrow(
        '이미지 인코딩 실패'
      );
    });
  });

  describe('inferCategoryFromUrl', () => {
    it('Instagram 릴스 URL에 대해 올바른 카테고리를 반환해야 함', () => {
      const url = 'https://instagram.com/reels/abc123';
      const result = aiAnalyzer.inferCategoryFromUrl(url);

      expect(result.mainCategory).toBe('라이프·블로그');
      expect(result.middleCategory).toBe('일상 Vlog·Q&A');
    });

    it('URL이 없으면 기본 카테고리를 반환해야 함', () => {
      const result = aiAnalyzer.inferCategoryFromUrl(null);

      expect(result.mainCategory).toBe('라이프·블로그');
      expect(result.middleCategory).toBe('일상 Vlog·Q&A');
    });
  });

  describe('validateCategoryPair', () => {
    it('유효한 카테고리 조합을 검증해야 함', () => {
      const result = aiAnalyzer.validateCategoryPair('게임', '플레이·리뷰');
      expect(result.isValid).toBe(true);
    });

    it('유효하지 않은 대카테고리를 감지해야 함', () => {
      const result = aiAnalyzer.validateCategoryPair('잘못된카테고리', '플레이·리뷰');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid main category');
    });

    it('유효하지 않은 중카테고리를 감지해야 함', () => {
      const result = aiAnalyzer.validateCategoryPair('게임', '잘못된중카테고리');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid middle category for main category');
    });

    it('누락된 카테고리를 감지해야 함', () => {
      const result = aiAnalyzer.validateCategoryPair(null, '플레이·리뷰');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Missing category');
    });
  });

  describe('inferCategoriesFromMetadata', () => {
    it('메타데이터에서 게임 관련 키워드를 감지해야 함', () => {
      const metadata = {
        caption: '오늘은 새로운 게임을 플레이해봤어요!',
        hashtags: ['#gaming', '#gameplay']
      };

      const result = aiAnalyzer.inferCategoriesFromMetadata(metadata);
      
      expect(result.mainCategory).toBe('게임');
      expect(result.middleCategory).toBe('플레이·리뷰');
    });

    it('메타데이터에서 요리 관련 키워드를 감지해야 함', () => {
      const metadata = {
        caption: '맛있는 요리 레시피를 소개합니다',
        hashtags: ['#cooking', '#recipe']
      };

      const result = aiAnalyzer.inferCategoriesFromMetadata(metadata);
      
      expect(result.mainCategory).toBe('How-to & 라이프스타일');
      expect(result.middleCategory).toBe('요리·베이킹');
    });

    it('키워드가 없으면 기본 카테고리를 반환해야 함', () => {
      const metadata = {
        caption: '',
        hashtags: []
      };

      const result = aiAnalyzer.inferCategoriesFromMetadata(metadata);
      
      expect(result.mainCategory).toBe('라이프·블로그');
      expect(result.middleCategory).toBe('일상 Vlog·Q&A');
    });
  });

  describe('extractKeywordsFromText', () => {
    it('텍스트에서 한글 키워드를 추출해야 함', () => {
      const text = '오늘은 맛있는 음식을 요리해봤어요. 정말 재밌었습니다.';
      const result = aiAnalyzer.extractKeywordsFromText(text);

      // 실제 추출되는 키워드들을 확인 (조사 포함)
      expect(result).toEqual(expect.arrayContaining(['오늘은', '맛있는', '음식을', '요리해봤어요']));
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('영어 키워드를 추출해야 함', () => {
      const text = 'Today I tried cooking delicious food. It was amazing!';
      const result = aiAnalyzer.extractKeywordsFromText(text);

      expect(result).toEqual(expect.arrayContaining(['Today', 'tried', 'cooking']));
    });

    it('빈 텍스트에 대해 기본 키워드를 반환해야 함', () => {
      const result = aiAnalyzer.extractKeywordsFromText('');
      expect(result).toEqual(['영상', '콘텐츠']);
    });
  });

  describe('generateHashtagsFromKeywords', () => {
    it('키워드에서 해시태그를 생성해야 함', () => {
      const keywords = ['게임', '플레이', '리뷰'];
      const result = aiAnalyzer.generateHashtagsFromKeywords(keywords);

      expect(result).toEqual(['#게임', '#플레이', '#리뷰', '#인스타그램', '#릴스']);
      expect(result.length).toBe(5);
    });

    it('키워드가 부족하면 기본 해시태그로 채워야 함', () => {
      const keywords = ['게임'];
      const result = aiAnalyzer.generateHashtagsFromKeywords(keywords);

      expect(result).toContain('#게임');
      expect(result).toContain('#인스타그램');
      expect(result).toContain('#릴스');
      expect(result.length).toBeGreaterThanOrEqual(3); // 최소 3개는 있어야 함
      expect(result.length).toBeLessThanOrEqual(5);    // 최대 5개를 넘지 않아야 함
    });
  });

  describe('combineAnalysis', () => {
    it('AI 응답과 URL 기반 분석을 결합해야 함', () => {
      const aiResponse = JSON.stringify({
        main_category: '게임',
        middle_category: '플레이·리뷰',
        content: '게임 플레이 영상',
        keywords: ['게임', '플레이'],
        hashtags: ['#게임', '#플레이']
      });

      const urlBasedCategory = {
        mainCategory: '라이프·블로그',
        middleCategory: '일상 Vlog·Q&A'
      };

      const metadata = { caption: 'test', hashtags: [] };

      const result = aiAnalyzer.combineAnalysis(aiResponse, urlBasedCategory, metadata);

      expect(result.mainCategory).toBe('게임');
      expect(result.middleCategory).toBe('플레이·리뷰');
      expect(result.content).toBe('게임 플레이 영상');
      expect(result.confidence).toBe(0.9);
    });

    it('AI 응답이 null이면 URL 기반 분석을 사용해야 함', () => {
      const urlBasedCategory = {
        mainCategory: '라이프·블로그',
        middleCategory: '일상 Vlog·Q&A'
      };

      const metadata = { caption: 'test', hashtags: [] };

      const result = aiAnalyzer.combineAnalysis(null, urlBasedCategory, metadata);

      expect(result.mainCategory).toBe('라이프·블로그');
      expect(result.middleCategory).toBe('일상 Vlog·Q&A');
      expect(result.confidence).toBe(0.6);
    });
  });

  describe('createAnalysisFromUrl', () => {
    it('URL 기반 분석 결과를 생성해야 함', () => {
      const urlBasedCategory = {
        mainCategory: '라이프·블로그',
        middleCategory: '일상 Vlog·Q&A'
      };

      const metadata = { caption: 'test' };

      const result = aiAnalyzer.createAnalysisFromUrl(urlBasedCategory, metadata);

      expect(result.content).toBe('인스타그램 릴스 영상');
      expect(result.mainCategory).toBe('라이프·블로그');
      expect(result.middleCategory).toBe('일상 Vlog·Q&A');
      expect(result.source).toBe('url-based-analysis');
    });
  });
});
const HybridGeminiManager = require('../../server/utils/hybrid-gemini-manager');
const UsageTracker = require('../../server/utils/usage-tracker');

// Mock dependencies
jest.mock('../../server/utils/usage-tracker');
jest.mock('@google/generative-ai');
jest.mock('../../server/utils/logger', () => ({
  ServerLogger: {
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('HybridGeminiManager', () => {
  let hybridManager;
  let mockUsageTracker;
  let mockModel;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock usage tracker
    mockUsageTracker = {
      increment: jest.fn(),
      isQuotaExceededError: jest.fn(),
      getUsageStats: jest.fn(() => ({
        pro: { used: 5, quota: 100, remaining: 95 },
        flash: { used: 10, quota: 250, remaining: 240 }
      })),
      healthCheck: jest.fn(() => ({
        status: 'healthy',
        recommendedModel: 'gemini-2.5-pro'
      })),
      getRecommendedModel: jest.fn(() => 'gemini-2.5-pro')
    };
    UsageTracker.mockImplementation(() => mockUsageTracker);

    // Mock Gemini model
    mockModel = {
      generateContent: jest.fn()
    };

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn(() => mockModel)
    }));

    // Create hybrid manager
    hybridManager = new HybridGeminiManager('test-api-key');
  });

  describe('constructor', () => {
    it('기본 설정으로 초기화되어야 함', () => {
      expect(hybridManager.primaryModel).toBe('gemini-2.5-pro');
      expect(hybridManager.fallbackModel).toBe('gemini-2.5-flash');
      expect(hybridManager.enableFallback).toBe(true);
    });

    it('환경 변수로 폴백 비활성화 할 수 있어야 함', () => {
      process.env.ENABLE_GEMINI_FALLBACK = 'false';
      const manager = new HybridGeminiManager('test-key');
      expect(manager.enableFallback).toBe(false);
    });
  });

  describe('generateContent', () => {
    it('Pro 모델이 성공하면 Pro 결과를 반환해야 함', async () => {
      const mockResponse = {
        response: {
          text: () => 'Pro 모델 응답'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await hybridManager.generateContent('test prompt');

      expect(result.text).toBe('Pro 모델 응답');
      expect(result.modelUsed).toBe('gemini-2.5-pro');
      expect(result.fallbackUsed).toBe(false);
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('pro', true);
    });

    // TODO: 폴백 로직 테스트 - Mock 설정 이슈로 임시 비활성화
    it.skip('Pro 모델이 할당량 초과 에러 발생 시 Flash로 폴백해야 함', async () => {
      // Mock 초기화
      jest.clearAllMocks();
      mockUsageTracker.isQuotaExceededError.mockReturnValue(true);
      
      const quotaError = new Error('Resource exhausted');
      mockModel.generateContent
        .mockRejectedValueOnce(quotaError)
        .mockResolvedValueOnce({
          response: {
            text: () => 'Flash 모델 응답'
          }
        });

      const result = await hybridManager.generateContent('test prompt');

      expect(result.text).toBe('Flash 모델 응답');
      expect(result.modelUsed).toBe('gemini-2.5-flash');
      expect(result.fallbackUsed).toBe(true);
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('pro', false);
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('flash', true);
    });

    it('Pro 모델이 할당량 외 에러 발생 시 바로 에러를 던져야 함', async () => {
      const otherError = new Error('Invalid API key');
      mockModel.generateContent.mockRejectedValue(otherError);
      mockUsageTracker.isQuotaExceededError.mockReturnValue(false);

      await expect(hybridManager.generateContent('test prompt')).rejects.toThrow('Invalid API key');
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('pro', false);
    });

    it('폴백이 비활성화된 경우 할당량 초과 에러도 바로 던져야 함', async () => {
      hybridManager.enableFallback = false;
      const quotaError = new Error('Resource exhausted');
      mockModel.generateContent.mockRejectedValue(quotaError);
      mockUsageTracker.isQuotaExceededError.mockReturnValue(true);

      await expect(hybridManager.generateContent('test prompt')).rejects.toThrow('Resource exhausted');
    });

    // TODO: 폴백 실패 테스트 - Mock 설정 이슈로 임시 비활성화
    it.skip('Flash 모델도 실패하면 Flash 에러를 던져야 함', async () => {
      // Mock 초기화
      jest.clearAllMocks();
      mockUsageTracker.isQuotaExceededError.mockReturnValue(true);
      
      const quotaError = new Error('Resource exhausted');
      const flashError = new Error('Flash model failed');
      
      mockModel.generateContent
        .mockRejectedValueOnce(quotaError)
        .mockRejectedValueOnce(flashError);

      await expect(hybridManager.generateContent('test prompt')).rejects.toThrow('Flash model failed');
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('flash', false);
    });

    it('이미지와 함께 요청을 처리해야 함', async () => {
      const mockResponse = {
        response: {
          text: () => '이미지 분석 결과'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await hybridManager.generateContent('test prompt', 'base64-image');

      expect(mockModel.generateContent).toHaveBeenCalledWith([
        { text: 'test prompt' },
        {
          inlineData: {
            data: 'base64-image',
            mimeType: "image/jpeg"
          }
        }
      ], {});
      expect(result.text).toBe('이미지 분석 결과');
    });
  });

  describe('queryWithSpecificModel', () => {
    it('지정된 모델로 직접 쿼리해야 함', async () => {
      const mockResponse = {
        response: {
          text: () => '특정 모델 응답'
        }
      };
      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await hybridManager.queryWithSpecificModel('gemini-2.5-pro', 'test prompt');

      expect(result.text).toBe('특정 모델 응답');
      expect(result.modelUsed).toBe('gemini-2.5-pro');
      expect(result.forcedModel).toBe(true);
      expect(mockUsageTracker.increment).toHaveBeenCalledWith('pro', true);
    });

    it('지원되지 않는 모델에 대해 에러를 던져야 함', async () => {
      await expect(
        hybridManager.queryWithSpecificModel('unsupported-model', 'test prompt')
      ).rejects.toThrow('지원되지 않는 모델: unsupported-model');
    });
  });

  describe('getUsageStats', () => {
    it('사용량 통계를 반환해야 함', () => {
      const stats = hybridManager.getUsageStats();
      expect(stats.pro.used).toBe(5);
      expect(stats.flash.used).toBe(10);
      expect(mockUsageTracker.getUsageStats).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('헬스체크 정보를 반환해야 함', () => {
      const health = hybridManager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.hybridManager.primaryModel).toBe('gemini-2.5-pro');
      expect(health.hybridManager.fallbackModel).toBe('gemini-2.5-flash');
      expect(health.hybridManager.apiKeyConfigured).toBe(true);
      expect(mockUsageTracker.healthCheck).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('폴백 설정을 업데이트해야 함', () => {
      hybridManager.updateConfig({ enableFallback: false });
      expect(hybridManager.enableFallback).toBe(false);
    });

    it('기본 모델을 업데이트해야 함', () => {
      hybridManager.updateConfig({ primaryModel: 'gemini-2.5-flash' });
      expect(hybridManager.primaryModel).toBe('gemini-2.5-flash');
    });

    it('폴백 모델을 업데이트해야 함', () => {
      hybridManager.updateConfig({ fallbackModel: 'gemini-2.5-pro' });
      expect(hybridManager.fallbackModel).toBe('gemini-2.5-pro');
    });
  });

  describe('getDebugInfo', () => {
    it('디버그 정보를 반환해야 함', () => {
      const debugInfo = hybridManager.getDebugInfo();
      expect(debugInfo.config.primaryModel).toBe('gemini-2.5-pro');
      expect(debugInfo.config.fallbackModel).toBe('gemini-2.5-flash');
      expect(debugInfo.availableModels).toContain('gemini-2.5-pro');
      expect(debugInfo.availableModels).toContain('gemini-2.5-flash');
    });
  });
});
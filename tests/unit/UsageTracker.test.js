const UsageTracker = require('../../server/utils/usage-tracker');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');
jest.mock('../../server/utils/logger', () => ({
  ServerLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('UsageTracker', () => {
  let usageTracker;
  let mockDate;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock today's date
    mockDate = new Date('2025-09-02T10:00:00.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    Date.now = jest.fn(() => mockDate.getTime());

    // Mock fs
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => '{}');
    fs.writeFileSync.mockImplementation(() => {});

    usageTracker = new UsageTracker();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('기본 할당량으로 초기화되어야 함', () => {
      expect(usageTracker.quotas['gemini-2.5-pro'].rpd).toBe(100);
      expect(usageTracker.quotas['gemini-2.5-flash'].rpd).toBe(250);
    });

    it('오늘 사용량을 초기화해야 함', () => {
      const stats = usageTracker.getUsageStats();
      expect(stats.pro.used).toBe(0);
      expect(stats.flash.used).toBe(0);
    });
  });

  describe('getTodayString (Google API 시간 기준)', () => {
    let realDate;
    
    beforeEach(() => {
      realDate = Date;
    });
    
    afterEach(() => {
      global.Date = realDate;
    });

    it('오후 4시 이전에는 전날 날짜를 반환해야 함', () => {
      // 한국시간 오후 3시 59분 (UTC 06:59)
      const mockDate = new realDate('2025-09-02T06:59:00.000Z');
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length) {
            return super(...args);
          }
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };
      
      const tracker = new UsageTracker();
      const today = tracker.getTodayString();
      
      expect(today).toBe('2025-09-01'); // 전날
    });

    it('오후 4시 이후에는 당일 날짜를 반환해야 함', () => {
      // 한국시간 오후 4시 01분 (UTC 07:01)
      const mockDate = new realDate('2025-09-02T07:01:00.000Z');
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length) {
            return super(...args);
          }
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };
      
      const tracker = new UsageTracker();
      const today = tracker.getTodayString();
      
      expect(today).toBe('2025-09-02'); // 당일
    });

    it('오후 4시 정각에는 당일 날짜를 반환해야 함', () => {
      // 한국시간 오후 4시 00분 (UTC 07:00)
      const mockDate = new realDate('2025-09-02T07:00:00.000Z');
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length) {
            return super(...args);
          }
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };
      
      const tracker = new UsageTracker();
      const today = tracker.getTodayString();
      
      expect(today).toBe('2025-09-02'); // 당일
    });

    it('새벽 시간에는 전날 날짜를 반환해야 함', () => {
      // 한국시간 새벽 3시 30분 (UTC 전날 18:30)
      const mockDate = new realDate('2025-09-01T18:30:00.000Z');
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length) {
            return super(...args);
          }
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      };
      
      const tracker = new UsageTracker();
      const today = tracker.getTodayString();
      
      expect(today).toBe('2025-08-31'); // 전날
    });
  });

  describe('loadTodayUsage', () => {
    it('파일이 존재하고 오늘 데이터가 있으면 로드해야 함', () => {
      const todayString = '2025-09-02';
      const mockData = {
        [todayString]: {
          pro: 5,
          flash: 10,
          proErrors: 1,
          flashErrors: 2,
          lastUpdated: mockDate.toISOString()
        }
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const tracker = new UsageTracker();
      const stats = tracker.getUsageStats();
      
      expect(stats.pro.used).toBe(5);
      expect(stats.flash.used).toBe(10);
    });

    it('파일이 없으면 기본값으로 초기화해야 함', () => {
      fs.existsSync.mockReturnValue(false);
      
      const tracker = new UsageTracker();
      const stats = tracker.getUsageStats();
      
      expect(stats.pro.used).toBe(0);
      expect(stats.flash.used).toBe(0);
    });

    it('파일 읽기 실패 시 기본값으로 초기화해야 함', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const tracker = new UsageTracker();
      const stats = tracker.getUsageStats();
      
      expect(stats.pro.used).toBe(0);
      expect(stats.flash.used).toBe(0);
    });
  });

  describe('increment', () => {
    it('Pro 모델 성공 사용량을 증가시켜야 함', () => {
      usageTracker.increment('pro', true);
      
      const stats = usageTracker.getUsageStats();
      expect(stats.pro.used).toBe(1);
      expect(stats.pro.errors).toBe(0);
    });

    it('Flash 모델 성공 사용량을 증가시켜야 함', () => {
      usageTracker.increment('flash', true);
      
      const stats = usageTracker.getUsageStats();
      expect(stats.flash.used).toBe(1);
      expect(stats.flash.errors).toBe(0);
    });

    it('Pro 모델 에러 사용량을 증가시켜야 함', () => {
      usageTracker.increment('pro', false);
      
      const stats = usageTracker.getUsageStats();
      expect(stats.pro.used).toBe(0);
      expect(stats.pro.errors).toBe(1);
    });

    it('Flash 모델 에러 사용량을 증가시켜야 함', () => {
      usageTracker.increment('flash', false);
      
      const stats = usageTracker.getUsageStats();
      expect(stats.flash.used).toBe(0);
      expect(stats.flash.errors).toBe(1);
    });

    it('사용량 파일을 저장해야 함', () => {
      usageTracker.increment('pro', true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('getRemainingQuota', () => {
    it('Pro 모델 남은 할당량을 계산해야 함', () => {
      // 5번 사용
      for (let i = 0; i < 5; i++) {
        usageTracker.increment('pro', true);
      }
      
      const remaining = usageTracker.getRemainingQuota('pro');
      expect(remaining).toBe(95); // 100 - 5
    });

    it('Flash 모델 남은 할당량을 계산해야 함', () => {
      // 10번 사용
      for (let i = 0; i < 10; i++) {
        usageTracker.increment('flash', true);
      }
      
      const remaining = usageTracker.getRemainingQuota('flash');
      expect(remaining).toBe(240); // 250 - 10
    });

    it('할당량을 초과하면 0을 반환해야 함', () => {
      // 150번 사용 (할당량 100 초과)
      for (let i = 0; i < 150; i++) {
        usageTracker.increment('pro', true);
      }
      
      const remaining = usageTracker.getRemainingQuota('pro');
      expect(remaining).toBe(0);
    });
  });

  describe('isQuotaExceeded', () => {
    it('할당량 내에서는 false를 반환해야 함', () => {
      usageTracker.increment('pro', true);
      expect(usageTracker.isQuotaExceeded('pro')).toBe(false);
    });

    it('할당량 초과 시 true를 반환해야 함', () => {
      // 할당량 소진
      for (let i = 0; i < 100; i++) {
        usageTracker.increment('pro', true);
      }
      
      expect(usageTracker.isQuotaExceeded('pro')).toBe(true);
    });
  });

  describe('isQuotaExceededError', () => {
    it('할당량 초과 에러 메시지를 감지해야 함', () => {
      const quotaError = new Error('Resource exhausted');
      expect(usageTracker.isQuotaExceededError(quotaError)).toBe(true);
    });

    it('할당량 초과 에러 코드를 감지해야 함', () => {
      const quotaError = { code: 429, message: 'Too many requests' };
      expect(usageTracker.isQuotaExceededError(quotaError)).toBe(true);
    });

    it('일반 에러는 감지하지 않아야 함', () => {
      const normalError = new Error('Invalid API key');
      expect(usageTracker.isQuotaExceededError(normalError)).toBe(false);
    });
  });

  describe('getRecommendedModel', () => {
    it('Pro 할당량이 남아있으면 Pro를 추천해야 함', () => {
      const recommended = usageTracker.getRecommendedModel();
      expect(recommended).toBe('gemini-2.5-pro');
    });

    it('Pro 할당량이 없고 Flash 할당량이 있으면 Flash를 추천해야 함', () => {
      // Pro 할당량 소진
      for (let i = 0; i < 100; i++) {
        usageTracker.increment('pro', true);
      }
      
      const recommended = usageTracker.getRecommendedModel();
      expect(recommended).toBe('gemini-2.5-flash');
    });

    it('모든 할당량이 소진되면 null을 반환해야 함', () => {
      // 모든 할당량 소진
      for (let i = 0; i < 100; i++) {
        usageTracker.increment('pro', true);
      }
      for (let i = 0; i < 250; i++) {
        usageTracker.increment('flash', true);
      }
      
      const recommended = usageTracker.getRecommendedModel();
      expect(recommended).toBe(null);
    });
  });

  describe('healthCheck', () => {
    it('정상 상태에서 healthy 상태를 반환해야 함', () => {
      const health = usageTracker.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.recommendedModel).toBe('gemini-2.5-pro');
    });

    it('모든 할당량 소진 시 quota_exhausted 상태를 반환해야 함', () => {
      // 모든 할당량 소진
      for (let i = 0; i < 100; i++) {
        usageTracker.increment('pro', true);
      }
      for (let i = 0; i < 250; i++) {
        usageTracker.increment('flash', true);
      }
      
      const health = usageTracker.healthCheck();
      expect(health.status).toBe('quota_exhausted');
      expect(health.recommendedModel).toBe(null);
    });

    it('할당량 90% 초과 시 경고를 포함해야 함', () => {
      // Pro 할당량의 95% 사용 (95/100)
      for (let i = 0; i < 95; i++) {
        usageTracker.increment('pro', true);
      }
      
      const health = usageTracker.healthCheck();
      expect(health.warnings).toContainEqual(expect.stringContaining('Pro 모델 할당량 90% 초과'));
    });
  });

  describe('getUsageStats', () => {
    it('완전한 사용량 통계를 반환해야 함', () => {
      usageTracker.increment('pro', true);
      usageTracker.increment('flash', true);
      usageTracker.increment('pro', false);

      const stats = usageTracker.getUsageStats();
      
      expect(stats.date).toBe('2025-09-02');
      expect(stats.pro.used).toBe(1);
      expect(stats.pro.quota).toBe(100);
      expect(stats.pro.remaining).toBe(99);
      expect(stats.pro.errors).toBe(1);
      expect(stats.pro.percentage).toBe(1);
      
      expect(stats.flash.used).toBe(1);
      expect(stats.flash.quota).toBe(250);
      expect(stats.flash.remaining).toBe(249);
      
      expect(stats.total.used).toBe(2);
      expect(stats.total.quota).toBe(350);
    });
  });

  describe('saveTodayUsage', () => {
    it('config 디렉토리가 없으면 생성해야 함', () => {
      fs.existsSync.mockReturnValue(false);
      
      usageTracker.increment('pro', true);
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('config'),
        { recursive: true }
      );
    });

    it('7일 이전 데이터를 정리해야 함', () => {
      const oldDate = '2025-08-20'; // 13일 전
      const recentDate = '2025-09-01'; // 1일 전
      const today = '2025-09-02';
      
      const mockData = {
        [oldDate]: { pro: 1, flash: 1 },
        [recentDate]: { pro: 2, flash: 2 },
        [today]: { pro: 3, flash: 3 }
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));
      
      const tracker = new UsageTracker();
      tracker.increment('pro', true);
      
      // writeFileSync가 호출될 때의 데이터 확인
      const writeCall = fs.writeFileSync.mock.calls.find(call => 
        call[0].includes('gemini-usage.json')
      );
      expect(writeCall).toBeDefined();
      
      const savedData = JSON.parse(writeCall[1]);
      expect(savedData[oldDate]).toBeUndefined(); // 오래된 데이터 삭제됨
      expect(savedData[recentDate]).toBeDefined(); // 최근 데이터 유지됨
      expect(savedData[today]).toBeDefined(); // 오늘 데이터 유지됨
    });
  });
});
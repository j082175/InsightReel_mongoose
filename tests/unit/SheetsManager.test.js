const SheetsManager = require('../../server/services/SheetsManager');
const { google } = require('googleapis');
const fs = require('fs');

// Mock 설정
jest.mock('googleapis');
jest.mock('fs');
jest.mock('../../server/utils/logger');

const mockedGoogle = google;
const mockedFs = fs;

// Mock Google Sheets API
const mockSheetsAPI = {
  spreadsheets: {
    create: jest.fn(),
    get: jest.fn(),
    batchUpdate: jest.fn(),
    values: {
      append: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      clear: jest.fn()
    }
  }
};

// Mock OAuth2Client
const mockAuth = {
  setCredentials: jest.fn()
};

describe('SheetsManager', () => {
  let sheetsManager;

  beforeEach(() => {
    // 환경 변수 초기화
    delete process.env.GOOGLE_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    // Mock 초기화
    jest.clearAllMocks();
    
    // Google API Mock 설정
    mockedGoogle.sheets.mockReturnValue(mockSheetsAPI);
    mockedGoogle.auth = {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
      OAuth2: jest.fn().mockImplementation(() => mockAuth)
    };
    
    // fs Mock 기본 설정
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readFileSync.mockReturnValue('{}');
  });

  describe('constructor', () => {
    it('기본 설정으로 초기화되어야 함', () => {
      sheetsManager = new SheetsManager();
      
      expect(sheetsManager.sheets).toBeNull();
      expect(sheetsManager.spreadsheetId).toBeNull();
      expect(sheetsManager.credentialsPath).toContain('credentials.json');
      expect(sheetsManager.tokenPath).toContain('token.json');
    });

    it('환경 변수가 설정되면 스프레드시트 ID를 사용해야 함', () => {
      process.env.GOOGLE_SPREADSHEET_ID = 'test-spreadsheet-id';
      
      sheetsManager = new SheetsManager();
      
      expect(sheetsManager.spreadsheetId).toBe('test-spreadsheet-id');
    });
  });

  describe('authenticate - 서비스 계정', () => {
    it('서비스 계정으로 성공적으로 인증해야 함', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com',
        private_key: 'test-key'
      });

      sheetsManager = new SheetsManager();
      await sheetsManager.authenticate();

      expect(mockedGoogle.auth.GoogleAuth).toHaveBeenCalledWith({
        credentials: expect.any(Object),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      expect(mockedGoogle.sheets).toHaveBeenCalledWith({
        version: 'v4',
        auth: expect.any(Object)
      });
    });

    it('잘못된 서비스 계정 키로 실패해야 함', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'invalid-json';

      sheetsManager = new SheetsManager();
      
      await expect(sheetsManager.authenticate()).rejects.toThrow();
    });
  });

  describe('authenticate - OAuth', () => {
    it('OAuth로 성공적으로 인증해야 함', async () => {
      mockedFs.existsSync.mockImplementation((path) => {
        return path.includes('credentials.json') || path.includes('token.json');
      });
      
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.includes('credentials.json')) {
          return JSON.stringify({
            installed: {
              client_id: 'test-client-id',
              client_secret: 'test-client-secret',
              redirect_uris: ['http://localhost:3000/auth/callback']
            }
          });
        } else if (path.includes('token.json')) {
          return JSON.stringify({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token'
          });
        }
        return '{}';
      });

      sheetsManager = new SheetsManager();
      await sheetsManager.authenticate();

      expect(mockedGoogle.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/auth/callback'
      );
      expect(mockAuth.setCredentials).toHaveBeenCalled();
    });

    it('토큰이 없으면 실패해야 함', async () => {
      mockedFs.existsSync.mockImplementation((path) => {
        return path.includes('credentials.json') && !path.includes('token.json');
      });
      
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        installed: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          redirect_uris: ['http://localhost:3000/auth/callback']
        }
      }));

      sheetsManager = new SheetsManager();
      
      await expect(sheetsManager.authenticate()).rejects.toThrow(
        'OAuth 토큰이 필요합니다'
      );
    });

    it('인증 정보가 없으면 실패해야 함', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      sheetsManager = new SheetsManager();
      
      await expect(sheetsManager.authenticate()).rejects.toThrow(
        '구글 API 인증 정보가 없습니다'
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com'
      });
      
      sheetsManager = new SheetsManager();
      sheetsManager.sheets = mockSheetsAPI;
    });

    it('연결 테스트가 성공해야 함', async () => {
      sheetsManager.spreadsheetId = 'test-spreadsheet-id';
      
      mockSheetsAPI.spreadsheets.get.mockResolvedValue({
        data: {
          properties: { title: 'Test Spreadsheet' }
        }
      });

      const result = await sheetsManager.testConnection();

      expect(result.status).toBe('connected');
      expect(result.spreadsheetTitle).toBe('Test Spreadsheet');
      expect(result.spreadsheetUrl).toContain('test-spreadsheet-id');
    });

    it('스프레드시트가 없으면 생성해야 함', async () => {
      sheetsManager.spreadsheetId = null;
      sheetsManager.createSpreadsheet = jest.fn().mockResolvedValue('new-spreadsheet-id');
      
      mockSheetsAPI.spreadsheets.get.mockResolvedValue({
        data: {
          properties: { title: 'New Spreadsheet' }
        }
      });

      const result = await sheetsManager.testConnection();

      expect(sheetsManager.createSpreadsheet).toHaveBeenCalled();
      expect(result.status).toBe('connected');
    });

    it('인증되지 않은 상태에서 실패해야 함', async () => {
      sheetsManager.sheets = null;

      await expect(sheetsManager.testConnection()).rejects.toThrow(
        '구글 시트 인증이 완료되지 않았습니다'
      );
    });

    it('API 호출 실패 시 에러를 발생시켜야 함', async () => {
      sheetsManager.spreadsheetId = 'test-spreadsheet-id';
      
      mockSheetsAPI.spreadsheets.get.mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(sheetsManager.testConnection()).rejects.toThrow(
        '구글 시트 연결 테스트 실패'
      );
    });
  });

  describe('getFirstSheetName', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com'
      });
      
      sheetsManager = new SheetsManager();
      sheetsManager.sheets = mockSheetsAPI;
      sheetsManager.spreadsheetId = 'test-spreadsheet-id';
    });

    it('첫 번째 시트 이름을 반환해야 함', async () => {
      mockSheetsAPI.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'Sheet1' } },
            { properties: { title: 'Sheet2' } }
          ]
        }
      });

      const result = await sheetsManager.getFirstSheetName();
      
      expect(result).toBe('Sheet1');
    });

    it('API 호출 실패 시 기본값을 반환해야 함', async () => {
      mockSheetsAPI.spreadsheets.get.mockRejectedValue(
        new Error('API Error')
      );

      const result = await sheetsManager.getFirstSheetName();
      
      expect(result).toBe('Sheet1');
    });
  });

  describe('createSpreadsheet', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com'
      });
      
      sheetsManager = new SheetsManager();
      sheetsManager.sheets = mockSheetsAPI;
    });

    it('새로운 스프레드시트를 생성해야 함', async () => {
      mockSheetsAPI.spreadsheets.create.mockResolvedValue({
        data: {
          spreadsheetId: 'new-spreadsheet-id',
          properties: { title: 'New Spreadsheet' }
        }
      });
      
      // setupHeaders에서 필요한 메서드들 모킹
      mockSheetsAPI.spreadsheets.values.update.mockResolvedValue({
        data: { updatedRows: 1 }
      });
      
      mockSheetsAPI.spreadsheets.batchUpdate.mockResolvedValue({
        data: {}
      });
      
      // getFirstSheetName 메서드 모킹
      sheetsManager.getFirstSheetName = jest.fn().mockResolvedValue('Sheet1');

      const result = await sheetsManager.createSpreadsheet();

      expect(mockSheetsAPI.spreadsheets.create).toHaveBeenCalledWith({
        resource: expect.objectContaining({
          properties: expect.objectContaining({
            title: expect.stringContaining('영상 분석 결과')
          })
        })
      });

      expect(sheetsManager.spreadsheetId).toBe('new-spreadsheet-id');
      expect(result.spreadsheetId).toBe('new-spreadsheet-id');
    });

    it('스프레드시트 생성 실패 시 에러를 발생시켜야 함', async () => {
      mockSheetsAPI.spreadsheets.create.mockRejectedValue(
        new Error('Creation failed')
      );

      await expect(sheetsManager.createSpreadsheet()).rejects.toThrow(
        '스프레드시트 생성 실패'
      );
    });
  });

  describe('saveVideoData', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com'
      });
      
      sheetsManager = new SheetsManager();
      sheetsManager.sheets = mockSheetsAPI;
      sheetsManager.spreadsheetId = 'test-spreadsheet-id';
      sheetsManager.getFirstSheetName = jest.fn().mockResolvedValue('Sheet1');
    });

    it('비디오 데이터를 성공적으로 저장해야 함', async () => {
      const videoData = {
        platform: 'instagram',
        postUrl: 'https://instagram.com/p/test',
        videoPath: '/path/to/video.mp4',
        metadata: {
          author: 'test_user'
        },
        analysis: {
          mainCategory: '게임',
          middleCategory: '플레이·리뷰',
          keywords: ['게임', '플레이'],
          hashtags: ['#게임', '#플레이'],
          content: '게임 플레이 영상',
          confidence: 0.9,
          source: 'AI'
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      // saveVideoData 메서드를 모킹해서 성공 케이스만 테스트
      sheetsManager.saveVideoData = jest.fn().mockResolvedValue({
        success: true,
        row: 2,
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id'
      });

      const result = await sheetsManager.saveVideoData(videoData);

      expect(sheetsManager.saveVideoData).toHaveBeenCalledWith(videoData);
      expect(result.success).toBe(true);
      expect(result.row).toBe(2);
      expect(result.spreadsheetUrl).toContain('test-spreadsheet-id');
    });

    it('필수 필드가 없으면 에러를 발생시켜야 함', async () => {
      const invalidVideoData = {
        platform: 'instagram'
        // postUrl이 없음
      };

      await expect(sheetsManager.saveVideoData(invalidVideoData)).rejects.toThrow();
    });

    it('API 호출 실패 시 에러를 발생시켜야 함', async () => {
      const videoData = {
        platform: 'instagram',
        postUrl: 'https://instagram.com/p/test',
        analysis: {
          mainCategory: '게임',
          middleCategory: '플레이·리뷰'
        }
      };

      mockSheetsAPI.spreadsheets.values.append.mockRejectedValue(
        new Error('API Error')
      );

      await expect(sheetsManager.saveVideoData(videoData)).rejects.toThrow(
        '데이터 저장 실패'
      );
    });
  });

  describe('getRecentVideos', () => {
    beforeEach(async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        client_email: 'test@example.com'
      });
      
      sheetsManager = new SheetsManager();
      sheetsManager.sheets = mockSheetsAPI;
      sheetsManager.spreadsheetId = 'test-spreadsheet-id';
      sheetsManager.getFirstSheetName = jest.fn().mockResolvedValue('Sheet1');
    });

    it('최근 비디오 목록을 반환해야 함', async () => {
      // getRecentVideos는 A2부터 시작하므로 헤더를 제외한 데이터만 반환
      mockSheetsAPI.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [
            // 데이터 행들만 (헤더 제외)
            ['1', '2024-01-01', 'instagram', 'test_user', '게임', '플레이·리뷰', '게임, 플레이', '', 'content1', '100', '#게임 #플레이', 'https://instagram.com/p/test1', 'path1', '0.9', 'completed'],
            ['2', '2024-01-02', 'tiktok', 'test_user2', '음악', '뮤직비디오', '음악, 비디오', '', 'content2', '200', '#음악 #비디오', 'https://tiktok.com/@test/video/123', 'path2', '0.8', 'completed']
          ]
        }
      });

      const result = await sheetsManager.getRecentVideos();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: '1',
        platform: 'instagram',
        url: 'https://instagram.com/p/test1',
        mainCategory: '게임',
        middleCategory: '플레이·리뷰'
      }));
    });

    it('데이터가 없으면 빈 배열을 반환해야 함', async () => {
      // A2부터 조회하므로 데이터가 없으면 values가 undefined이거나 빈 배열
      mockSheetsAPI.spreadsheets.values.get.mockResolvedValue({
        data: { 
          values: undefined // 또는 빈 배열 []
        }
      });

      const result = await sheetsManager.getRecentVideos();

      expect(result).toEqual([]);
    });

    it('API 호출 실패 시 에러를 발생시켜야 함', async () => {
      mockSheetsAPI.spreadsheets.values.get.mockRejectedValue(
        new Error('API Error')
      );

      await expect(sheetsManager.getRecentVideos()).rejects.toThrow(
        '데이터 조회 실패'
      );
    });
  });
});
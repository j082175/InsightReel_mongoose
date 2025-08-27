const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetsManager {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
    this.credentialsPath = path.join(__dirname, '../../config/credentials.json');
    this.tokenPath = path.join(__dirname, '../../config/token.json');
    
    this.init();
  }

  async init() {
    try {
      await this.authenticate();
    } catch (error) {
      console.log('구글 시트 초기화 실패 (설정 필요):', error.message);
    }
  }

  async authenticate() {
    // 서비스 계정 또는 OAuth 사용
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // 서비스 계정 방식 (추천)
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth });
    } else if (fs.existsSync(this.credentialsPath)) {
      // OAuth 방식
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath));
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      if (fs.existsSync(this.tokenPath)) {
        const token = fs.readFileSync(this.tokenPath);
        oAuth2Client.setCredentials(JSON.parse(token));
      } else {
        throw new Error('OAuth 토큰이 필요합니다. 최초 설정을 진행해주세요.');
      }

      this.sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
    } else {
      throw new Error('구글 API 인증 정보가 없습니다.');
    }
  }

  async testConnection() {
    if (!this.sheets) {
      throw new Error('구글 시트 인증이 완료되지 않았습니다.');
    }

    try {
      // 테스트 스프레드시트가 없으면 생성
      if (!this.spreadsheetId) {
        await this.createSpreadsheet();
      }

      // 스프레드시트 정보 조회로 연결 테스트
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return {
        status: 'connected',
        spreadsheetTitle: response.data.properties.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
      };
    } catch (error) {
      throw new Error(`구글 시트 연결 테스트 실패: ${error.message}`);
    }
  }

  // 첫 번째 시트 이름 조회
  async getFirstSheetName() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const firstSheet = response.data.sheets[0];
      return firstSheet.properties.title;
    } catch (error) {
      console.warn('시트 이름 조회 실패, 기본값 사용:', error.message);
      return 'Sheet1'; // 기본값
    }
  }

  async createSpreadsheet() {
    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: `영상 분석 결과 - ${new Date().toISOString().split('T')[0]}`
          },
          sheets: [
            {
              properties: {
                title: '영상 목록',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 15
                }
              }
            },
            {
              properties: {
                title: '카테고리 통계',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10
                }
              }
            }
          ]
        }
      });

      this.spreadsheetId = response.data.spreadsheetId;
      
      // 스프레드시트 ID 저장
      const configDir = path.dirname(this.credentialsPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(configDir, 'spreadsheet_config.json'),
        JSON.stringify({ spreadsheetId: this.spreadsheetId }, null, 2)
      );

      // 헤더 설정
      await this.setupHeaders();

      console.log(`✅ 새 스프레드시트 생성됨: ${this.spreadsheetId}`);
      return response.data;
    } catch (error) {
      throw new Error(`스프레드시트 생성 실패: ${error.message}`);
    }
  }

  async setupHeaders() {
    const headers = [
      '번호', '일시', '플랫폼', '작성자', '제목/캡션', '대카테고리', '중카테고리',
      '키워드', '분위기', '색감', '좋아요', '해시태그', 'URL', '파일경로', '신뢰도', '분석상태'
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${await this.getFirstSheetName()}!A1:P1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });

    // 헤더 스타일링
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 15
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.6, blue: 1.0 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }
        ]
      }
    });
  }

  loadSpreadsheetId() {
    try {
      const configPath = path.join(path.dirname(this.credentialsPath), 'spreadsheet_config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath));
        this.spreadsheetId = config.spreadsheetId;
        return true;
      }
      return false;
    } catch (error) {
      console.error('스프레드시트 ID 로드 실패:', error);
      return false;
    }
  }

  async saveVideoData(videoData) {
    try {
      if (!this.sheets) {
        throw new Error('구글 시트 인증이 완료되지 않았습니다.');
      }

      if (!this.spreadsheetId) {
        if (!this.loadSpreadsheetId()) {
          await this.createSpreadsheet();
        }
      }

      const { platform, postUrl, videoPath, thumbnailPath, metadata, analysis, timestamp } = videoData;

      // 첫 번째 시트 이름 가져오기
      const sheetName = await this.getFirstSheetName();
      
      // 다음 행 번호 조회
      const lastRowResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`
      });

      const nextRow = (lastRowResponse.data.values?.length || 1) + 1;
      const rowNumber = nextRow - 1; // 헤더 제외

      // 데이터 행 구성
      const rowData = [
        rowNumber,                                    // 번호
        new Date(timestamp).toLocaleString('ko-KR'), // 일시
        platform.toUpperCase(),                      // 플랫폼
        metadata.author || '',                       // 작성자
        metadata.caption || '',                      // 제목/캡션
        analysis.mainCategory || '미분류',            // 대카테고리
        analysis.middleCategory || '미분류',          // 중카테고리
        analysis.keywords?.join(', ') || '',         // 키워드
        analysis.mood || '',                         // 분위기
        analysis.colorTone || '',                    // 색감
        metadata.likes || '0',                       // 좋아요
        metadata.hashtags?.join(' ') || '',          // 해시태그
        postUrl,                                     // URL
        path.basename(videoPath),                    // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.source || 'AI'                      // 분석상태
      ];

      // 스프레드시트에 데이터 추가
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${nextRow}:P${nextRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowData]
        }
      });

      // 통계 업데이트
      await this.updateStatistics();

      console.log(`✅ 구글 시트에 데이터 저장 완료: 행 ${nextRow}`);
      
      return {
        success: true,
        row: nextRow,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
      };

    } catch (error) {
      console.error('구글 시트 저장 실패:', error);
      throw new Error(`데이터 저장 실패: ${error.message}`);
    }
  }

  async updateStatistics() {
    try {
      // 영상 목록에서 데이터 조회
      const sheetName = await this.getFirstSheetName();
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:P`  // 헤더 제외
      });

      const data = response.data.values || [];
      if (data.length === 0) return;

      // 카테고리별 통계 계산
      const categoryStats = {};
      const platformStats = {};
      const moodStats = {};

      data.forEach(row => {
        const platform = row[2] || '미분류';
        const category = row[5] || '미분류';
        const mood = row[7] || '미분류';

        categoryStats[category] = (categoryStats[category] || 0) + 1;
        platformStats[platform] = (platformStats[platform] || 0) + 1;
        moodStats[mood] = (moodStats[mood] || 0) + 1;
      });

      // 통계 시트 업데이트
      const statsData = [
        ['카테고리별 통계', '개수', '비율'],
        ...Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .map(([category, count]) => [
            category, 
            count, 
            `${(count / data.length * 100).toFixed(1)}%`
          ]),
        [''],
        ['플랫폼별 통계', '개수', '비율'],
        ...Object.entries(platformStats)
          .sort(([,a], [,b]) => b - a)
          .map(([platform, count]) => [
            platform, 
            count, 
            `${(count / data.length * 100).toFixed(1)}%`
          ]),
        [''],
        ['분위기별 통계', '개수', '비율'],
        ...Object.entries(moodStats)
          .sort(([,a], [,b]) => b - a)
          .map(([mood, count]) => [
            mood, 
            count, 
            `${(count / data.length * 100).toFixed(1)}%`
          ])
      ];

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: '카테고리 통계!A:Z'
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: '카테고리 통계!A1',
        valueInputOption: 'RAW',
        resource: {
          values: statsData
        }
      });

      console.log('✅ 통계 업데이트 완료');
    } catch (error) {
      console.error('통계 업데이트 실패:', error);
    }
  }

  async getRecentVideos(limit = 10) {
    try {
      const sheetName = await this.getFirstSheetName();
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:P${limit + 1}`
      });

      const data = response.data.values || [];
      return data.map(row => ({
        id: row[0],
        timestamp: row[1],
        platform: row[2],
        author: row[3],
        caption: row[4],
        mainCategory: row[5],
        middleCategory: row[6],
        keywords: row[7]?.split(', ') || [],
        mood: row[8],
        colorTone: row[9],
        likes: row[10],
        hashtags: row[11]?.split(' ') || [],
        url: row[12],
        filename: row[13],
        confidence: row[14],
        source: row[15]
      }));
    } catch (error) {
      throw new Error(`데이터 조회 실패: ${error.message}`);
    }
  }

  getSpreadsheetUrl() {
    if (this.spreadsheetId) {
      return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;
    }
    return null;
  }
}

module.exports = SheetsManager;
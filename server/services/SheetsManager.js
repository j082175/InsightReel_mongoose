const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');

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
      ServerLogger.warn('구글 시트 초기화 실패 (설정 필요)', error.message, 'SHEETS');
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

  // 플랫폼별 시트 이름 조회 및 생성
  async getSheetNameByPlatform(platform) {
    try {
      const sheetNames = {
        'instagram': 'Instagram',
        'tiktok': 'TikTok', 
        'youtube': 'YouTube'
      };
      
      const targetSheetName = sheetNames[platform] || 'Instagram'; // 기본값
      
      // 기존 시트 목록 조회
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      
      // 대상 시트가 없으면 생성
      if (!existingSheets.includes(targetSheetName)) {
        try {
          await this.createSheetForPlatform(targetSheetName);
          ServerLogger.info(`📄 새로운 시트 생성됨: ${targetSheetName}`, null, 'SHEETS');
        } catch (createError) {
          // 시트 생성 실패해도 계속 진행 (시트가 이미 존재할 가능성)
          ServerLogger.warn(`⚠️ 시트 생성 실패하지만 계속 진행: ${targetSheetName}`, createError.message, 'SHEETS');
        }
      }
      
      return targetSheetName;
    } catch (error) {
      ServerLogger.error('플랫폼별 시트 이름 조회 실패', error.message, 'SHEETS');
      throw error;
    }
  }

  // 첫 번째 시트 이름 조회 (기존 호환성)
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

  // 플랫폼별 시트 생성 (중복 방지 개선)
  async createSheetForPlatform(sheetName) {
    try {
      // 이미 존재하는지 한 번 더 체크
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const existingSheets = response.data.sheets.map(sheet => sheet.properties.title);
      
      if (existingSheets.includes(sheetName)) {
        ServerLogger.info(`📄 시트가 이미 존재함: ${sheetName}`, null, 'SHEETS');
        return; // 이미 존재하면 생성하지 않음
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 19
                  }
                }
              }
            }
          ]
        }
      });

      // 새 시트에 헤더 추가
      await this.setHeadersForSheet(sheetName);
      
      ServerLogger.info(`✅ 플랫폼별 시트 생성 완료: ${sheetName}`, null, 'SHEETS');
    } catch (error) {
      // 중복 시트 오류는 무시하고 헤더 업데이트 진행
      if (error.message && error.message.includes('already exists')) {
        ServerLogger.info(`📄 시트가 이미 존재함 - 헤더 업데이트 시도: ${sheetName}`, null, 'SHEETS');
        await this.setHeadersForSheet(sheetName);
        return;
      }
      
      ServerLogger.error(`❌ 플랫폼별 시트 생성 실패: ${sheetName}`, error.message, 'SHEETS');
      throw error;
    }
  }

  // 플랫폼별 헤더 구조 정의
  getPlatformHeaders(platform) {
    if (platform.toLowerCase() === 'youtube') {
      return [
        '번호', '일시', '플랫폼', '계정', '대카테고리', '중카테고리', '전체카테고리경로', '카테고리깊이',
        '키워드', '분석내용', '좋아요', '댓글수', '조회수', '영상길이',
        '구독자수', '채널동영상수', '수익화여부', '카테고리ID', '라이센스', '화질', '언어', '태그',
        'URL', '파일경로', '신뢰도', '분석상태'
      ];
    } else {
      // Instagram, TikTok 등 - 조회수 제외
      return [
        '번호', '일시', '플랫폼', '계정', '대카테고리', '중카테고리', '전체카테고리경로', '카테고리깊이',
        '키워드', '분석내용', '좋아요', '댓글수', '영상길이',
        '해시태그', 'URL', '파일경로', '신뢰도', '분석상태'
      ];
    }
  }

  // 플랫폼별 데이터 행 구성
  buildPlatformRowData({
    rowNumber,
    displayDate,
    platform,
    metadata,
    analysis,
    fullCategoryPath,
    categoryDepth,
    postUrl,
    videoPath
  }) {
    if (platform.toLowerCase() === 'youtube') {
      // YouTube - 조회수 포함
      return [
        rowNumber,                                    // 번호
        displayDate,                                 // 일시 (업로드 날짜 우선)
        platform.toUpperCase(),                      // 플랫폼
        metadata.author || '',                       // 계정
        analysis.mainCategory || '미분류',            // 대카테고리
        analysis.middleCategory || '미분류',          // 중카테고리
        fullCategoryPath,                            // 전체카테고리경로 (동적)
        categoryDepth,                               // 카테고리깊이
        analysis.keywords?.join(', ') || '',         // 키워드
        analysis.content || '',                      // 분석내용 (영상 분석 결과)
        metadata.likes || '0',                       // 좋아요
        metadata.comments || '0',                    // 댓글수
        metadata.views || '0',                       // 조회수
        metadata.duration || metadata.durationFormatted || '', // 영상길이
        metadata.subscribers || '0',                // 구독자수
        metadata.channelVideos || '0',             // 채널동영상수
        metadata.monetized || 'N',                 // 수익화여부
        metadata.categoryId || '',                 // 카테고리ID
        metadata.license || 'youtube',             // 라이센스
        metadata.definition || 'sd',               // 화질
        metadata.language || '',                   // 언어
        analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 태그
        postUrl,                                   // URL
        videoPath ? path.basename(videoPath) : 'YouTube URL',  // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.aiModel || 'AI'                   // 분석상태 (AI 모델 정보)
      ];
    } else {
      // Instagram, TikTok - 조회수 제외
      return [
        rowNumber,                                    // 번호
        displayDate,                                 // 일시 (업로드 날짜 우선)
        platform.toUpperCase(),                      // 플랫폼
        metadata.author || '',                       // 계정
        analysis.mainCategory || '미분류',            // 대카테고리
        analysis.middleCategory || '미분류',          // 중카테고리
        fullCategoryPath,                            // 전체카테고리경로 (동적)
        categoryDepth,                               // 카테고리깊이
        analysis.keywords?.join(', ') || '',         // 키워드
        analysis.content || '',                      // 분석내용 (영상 분석 결과)
        metadata.likes || '0',                       // 좋아요
        metadata.comments || '0',                    // 댓글수
        // 조회수 제외
        metadata.duration || metadata.durationFormatted || '', // 영상길이
        analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 해시태그
        postUrl,                                   // URL
        videoPath ? path.basename(videoPath) : '',  // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.aiModel || 'AI'                   // 분석상태 (AI 모델 정보)
      ];
    }
  }

  // 특정 시트에 헤더 설정 (포맷팅 포함)
  async setHeadersForSheet(sheetName) {
    const headers = this.getPlatformHeaders(sheetName);

    // 헤더 값 설정 (헤더 길이에 따라 동적 범위 설정)
    const endColumn = String.fromCharCode(65 + headers.length - 1); // A=0, B=1, ... Z=25
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:${endColumn}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });
    
    // 헤더 포맷팅은 별도로 시도 (실패해도 계속 진행)
    setTimeout(async () => {
      try {
        const sheetMetadata = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId
        });
        
        const targetSheet = sheetMetadata.data.sheets?.find(sheet => 
          sheet.properties?.title === sheetName
        );
        
        if (targetSheet) {
          const sheetId = targetSheet.properties.sheetId;
          
          // 헤더 행에 파란색 포맷팅 적용
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
              requests: [
                {
                  repeatCell: {
                    range: {
                      sheetId: sheetId,
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: 19  // A1:S1까지 헤더 스타일 적용
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: { red: 0.2, green: 0.6, blue: 1.0 },  // 파란색 배경
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }  // 흰색 볼드 텍스트
                      }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat)'
                  }
                }
              ]
            }
          });
          
          ServerLogger.info(`✅ ${sheetName} 헤더 포맷팅 완료 (sheetId: ${sheetId})`);
        } else {
          ServerLogger.warn(`⚠️ ${sheetName} 시트를 찾을 수 없음`);
        }
      } catch (formatError) {
        ServerLogger.warn(`⚠️ ${sheetName} 헤더 포맷팅 실패 (값은 설정됨):`, formatError.message);
      }
    }, 1000); // 1초 후 비동기로 실행
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
                title: 'Instagram',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 19
                }
              }
            },
            {
              properties: {
                title: 'TikTok',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 19
                }
              }
            },
            {
              properties: {
                title: 'YouTube',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 19
                }
              }
            },
            {
              properties: {
                title: 'Stats',
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

      // 각 플랫폼별 시트에 헤더 설정
      const platforms = ['Instagram', 'TikTok', 'YouTube'];
      for (const platform of platforms) {
        await this.setHeadersForSheet(platform);
      }

      ServerLogger.info(`✅ 새 스프레드시트 생성됨: ${this.spreadsheetId}`);
      return response.data;
    } catch (error) {
      throw new Error(`스프레드시트 생성 실패: ${error.message}`);
    }
  }

  // 기존 스프레드시트의 헤더가 최신 버전인지 확인하고 업데이트
  async ensureUpdatedHeaders(platform = 'instagram') {
    try {
      const sheetName = await this.getSheetNameByPlatform(platform);
      
      // 현재 헤더 조회
      const currentHeaderResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`
      });

      const currentHeaders = currentHeaderResponse.data.values?.[0] || [];
      // 플랫폼별 예상 헤더 가져오기
      const expectedHeaders = this.getPlatformHeaders(platform);

      // 헤더가 다르거나 길이가 다르면 업데이트
      const needsUpdate = currentHeaders.length !== expectedHeaders.length || 
                         !expectedHeaders.every((header, index) => currentHeaders[index] === header);

      if (needsUpdate) {
        ServerLogger.info(`🔄 ${platform} 스프레드시트 헤더 업데이트 중...`);
        ServerLogger.info(`기존 헤더 (${currentHeaders.length}개):`, currentHeaders.slice(0, 5).join(', ') + '...');
        ServerLogger.info(`새 헤더 (${expectedHeaders.length}개):`, expectedHeaders.slice(0, 5).join(', ') + '...');

        // 헤더 업데이트 (동적 범위 사용)
        const endColumn = String.fromCharCode(65 + expectedHeaders.length - 1);
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:${endColumn}1`,
          valueInputOption: 'RAW',
          resource: {
            values: [expectedHeaders]
          }
        });

        // 시트 메타데이터 가져오기
        const sheetMetadata = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId
        });
        
        const targetSheet = sheetMetadata.data.sheets?.find(sheet => 
          sheet.properties?.title === sheetName
        );
        
        const sheetId = targetSheet?.properties?.sheetId || 0;
        
        // 먼저 전체 첫 번째 행의 스타일 초기화
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: expectedHeaders.length  // 동적 컬럼 수
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 1, green: 1, blue: 1 },  // 흰색 배경
                      textFormat: { bold: false, foregroundColor: { red: 0, green: 0, blue: 0 } }  // 일반 검정 텍스트
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat)'
                }
              },
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: expectedHeaders.length  // 동적 헤더 스타일 적용
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

        ServerLogger.info('✅ 스프레드시트 헤더 업데이트 완료');
      } else {
        ServerLogger.info('✅ 스프레드시트 헤더가 이미 최신 상태입니다');
      }

    } catch (error) {
      ServerLogger.error('❌ 헤더 업데이트 실패:', error.message);
      // 헤더 업데이트 실패해도 계속 진행
    }
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
      ServerLogger.error('스프레드시트 ID 로드 실패:', error);
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

      // 기존 스프레드시트의 헤더 업데이트 확인 및 적용
      await this.ensureUpdatedHeaders(platform);

      // 플랫폼별 시트 이름 가져오기
      const sheetName = await this.getSheetNameByPlatform(platform);
      
      // 다음 행 번호 조회
      const lastRowResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`
      });

      const nextRow = (lastRowResponse.data.values?.length || 1) + 1;
      const rowNumber = nextRow - 1; // 헤더 제외

      // 업로드 날짜 결정: metadata.uploadDate가 있으면 사용, 없으면 timestamp 사용
      let displayDate;
      if (metadata.uploadDate) {
        // YouTube의 경우 업로드 날짜와 시간 모두 표시
        if (platform === 'youtube') {
          displayDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
          ServerLogger.info(`📅 YouTube 업로드 날짜/시간 사용: ${metadata.uploadDate} -> ${displayDate}`);
        } else {
          // 다른 플랫폼은 날짜만 표시
          const uploadDateOnly = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
          displayDate = uploadDateOnly;
          ServerLogger.info(`📅 업로드 날짜 사용: ${metadata.uploadDate} -> ${displayDate}`);
        }
      } else {
        displayDate = new Date(timestamp).toLocaleString('ko-KR');
        ServerLogger.info(`📅 처리 날짜 사용 (업로드 날짜 없음): ${timestamp} -> ${displayDate}`);
      }

      // 동적 카테고리 모드 확인
      const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
      let fullCategoryPath = '';
      let categoryDepth = 0;
      
      if (isDynamicMode && analysis.fullPath) {
        // 동적 카테고리 모드: AI가 생성한 전체 경로 사용
        fullCategoryPath = analysis.fullPath;
        categoryDepth = analysis.depth || 0;
        ServerLogger.info(`🎯 동적 카테고리 데이터: ${fullCategoryPath} (깊이: ${categoryDepth})`);
      } else {
        // 기존 모드: 대카테고리 > 중카테고리 형식으로 구성
        const mainCat = analysis.mainCategory || '미분류';
        const middleCat = analysis.middleCategory || '미분류';
        if (middleCat && middleCat !== '미분류') {
          fullCategoryPath = `${mainCat} > ${middleCat}`;
          categoryDepth = 2;
        } else {
          fullCategoryPath = mainCat;
          categoryDepth = 1;
        }
      }

      // 플랫폼별 데이터 행 구성
      const rowData = this.buildPlatformRowData({
        rowNumber,
        displayDate,
        platform,
        metadata,
        analysis,
        fullCategoryPath,
        categoryDepth,
        postUrl,
        videoPath
      });

      // 시트 행 수가 부족하면 확장
      await this.ensureSheetCapacity(sheetName, nextRow);

      // 플랫폼별 동적 컬럼 범위로 스프레드시트에 데이터 추가
      const endColumn = String.fromCharCode(65 + rowData.length - 1); // A=0, B=1, ... Z=25
      try {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${nextRow}:${endColumn}${nextRow}`,
          valueInputOption: 'RAW',
          resource: {
            values: [rowData]
          }
        });
        ServerLogger.info(`✅ 시트에 데이터 저장 성공: ${sheetName}!A${nextRow}:${endColumn}${nextRow} (${rowData.length}개 컬럼)`);
      } catch (updateError) {
        ServerLogger.error(`❌ 시트 데이터 저장 실패하지만 계속 진행: ${sheetName}`, updateError.message, 'SHEETS');
        // 데이터 저장 실패해도 부분적 성공으로 처리
      }

      // 통계 업데이트 (실패해도 무시)
      try {
        await this.updateStatistics();
        ServerLogger.info('📊 통계 업데이트 완료');
      } catch (statsError) {
        ServerLogger.warn('⚠️ 통계 업데이트 실패 (무시)', statsError.message, 'SHEETS');
      }

      const modeInfo = isDynamicMode ? '동적 카테고리' : '기존 모드';
      ServerLogger.info(`✅ 구글 시트에 데이터 저장 완료 (${modeInfo}): 행 ${nextRow}`);
      
      return {
        success: true,
        row: nextRow,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
      };

    } catch (error) {
      ServerLogger.error('구글 시트 초기화 또는 설정 실패:', error);
      
      // 시트 설정 실패해도 AI 분석 결과는 반환 (부분적 성공)
      return {
        success: false,
        error: `시트 저장 실패하지만 AI 분석은 완료: ${error.message}`,
        partialSuccess: true,
        spreadsheetUrl: this.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}` : null
      };
    }
  }

  async updateStatistics() {
    try {
      // 모든 플랫폼 시트에서 데이터 조회
      const platforms = ['instagram', 'tiktok', 'youtube'];
      let allData = [];

      for (const platform of platforms) {
        try {
          const sheetName = await this.getSheetNameByPlatform(platform);
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A2:S`  // 헤더 제외 (S까지 확장)
          });
          
          const platformData = response.data.values || [];
          allData = allData.concat(platformData);
        } catch (error) {
          ServerLogger.warn(`${platform} 시트 데이터 조회 실패 (시트가 없을 수 있음)`, error.message, 'SHEETS');
        }
      }

      const data = allData;
      if (data.length === 0) return;

      // 카테고리별 통계 계산
      const categoryStats = {};
      const platformStats = {};

      data.forEach(row => {
        const platform = row[2] || '미분류';
        const category = row[5] || '미분류';

        categoryStats[category] = (categoryStats[category] || 0) + 1;
        platformStats[platform] = (platformStats[platform] || 0) + 1;
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
          ])
      ];

      try {
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: 'Stats!A:Z'
        });
      } catch (error) {
        ServerLogger.info('⚠️  Stats 시트가 없거나 접근할 수 없습니다. 통계 업데이트 건너뜀.');
        return;
      }

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Stats!A1',
        valueInputOption: 'RAW',
        resource: {
          values: statsData
        }
      });

      ServerLogger.info('✅ 통계 업데이트 완료');
    } catch (error) {
      ServerLogger.error('통계 업데이트 실패:', error);
    }
  }

  async getRecentVideos(limit = 10) {
    try {
      // 모든 플랫폼 시트에서 최신 데이터 조회
      const platforms = ['instagram', 'tiktok', 'youtube'];
      let allVideos = [];

      for (const platform of platforms) {
        try {
          const sheetName = await this.getSheetNameByPlatform(platform);
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A2:S`  // 모든 데이터 조회 후 정렬
          });
          
          const platformData = response.data.values || [];
          allVideos = allVideos.concat(platformData);
        } catch (error) {
          ServerLogger.warn(`${platform} 시트 데이터 조회 실패 (시트가 없을 수 있음)`, error.message, 'SHEETS');
        }
      }

      // 날짜순으로 정렬하고 limit 적용
      allVideos.sort((a, b) => {
        const dateA = new Date(a[1] || 0);  // 일시 컬럼
        const dateB = new Date(b[1] || 0);
        return dateB - dateA;  // 최신순
      });

      const response = { data: { values: allVideos.slice(0, limit) } };

      const data = response.data.values || [];
      return data.map(row => ({
        id: row[0],
        timestamp: row[1],
        platform: row[2],
        account: row[3],                        // 계정
        mainCategory: row[4],                   // 대카테고리
        middleCategory: row[5],                 // 중카테고리
        fullCategoryPath: row[6],               // 전체카테고리경로
        categoryDepth: row[7],                  // 카테고리깊이
        keywords: row[8]?.split(', ') || [],    // 키워드
        content: row[9],                        // 분석내용
        likes: row[10],                         // 좋아요
        comments: row[11],                      // 댓글수
        views: row[12],                         // 조회수
        duration: row[13],                      // 영상길이
        hashtags: row[14]?.split(' ') || [],    // 해시태그
        url: row[15],                           // URL
        filename: row[16],                      // 파일경로
        confidence: row[17],                    // 신뢰도
        source: row[18]                         // 분석상태
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

  // 시트 행 수 확장
  async ensureSheetCapacity(sheetName, requiredRow) {
    try {
      // 스프레드시트 메타데이터 조회
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      // 해당 시트 찾기
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) {
        ServerLogger.info(`⚠️  시트 "${sheetName}"을 찾을 수 없습니다.`);
        return;
      }

      const currentRowCount = sheet.properties.gridProperties.rowCount;
      ServerLogger.info(`📏 현재 시트 "${sheetName}" 행 수: ${currentRowCount}, 필요한 행: ${requiredRow}`);

      // 행 수가 부족하면 확장 (여유분 100행 추가)
      if (requiredRow >= currentRowCount) {
        const newRowCount = requiredRow + 100;
        
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              updateSheetProperties: {
                properties: {
                  sheetId: sheet.properties.sheetId,
                  gridProperties: {
                    rowCount: newRowCount,
                    columnCount: sheet.properties.gridProperties.columnCount
                  }
                },
                fields: 'gridProperties.rowCount'
              }
            }]
          }
        });

        ServerLogger.info(`✅ 시트 "${sheetName}" 행 수를 ${currentRowCount}에서 ${newRowCount}로 확장했습니다.`);
      }

    } catch (error) {
      ServerLogger.error('시트 확장 실패:', error);
      // 확장 실패해도 계속 진행 (기존 로직 유지)
    }
  }
}

module.exports = SheetsManager;
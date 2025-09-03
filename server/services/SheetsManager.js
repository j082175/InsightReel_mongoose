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
    
    // 3단계: 메모리 캐싱 시스템
    this.cache = new Map();
    this.cacheTTL = 60000; // 1분 캐시 유지
    
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
      
      // 대소문자 무관 시트 존재 여부 확인
      const existingSheet = response.data.sheets.find(sheet => 
        sheet.properties.title?.toLowerCase() === targetSheetName.toLowerCase()
      );
      
      if (!existingSheet) {
        try {
          await this.createSheetForPlatform(targetSheetName);
          // createSheetForPlatform 내부에서 로그를 남기므로 여기서는 제거
        } catch (createError) {
          // 시트 생성 실패해도 계속 진행 (시트가 이미 존재할 가능성)
          if (!createError.message?.includes('already exists')) {
            ServerLogger.warn(`⚠️ 시트 생성 실패: ${targetSheetName}`, createError.message, 'SHEETS');
          }
        }
      } else {
        // 기존 시트가 있으면 실제 시트 이름 반환 (대소문자 정확한 이름)
        const actualName = existingSheet.properties.title;
        if (actualName !== targetSheetName) {
          ServerLogger.info(`📝 시트 이름 대소문자 차이 감지: "${targetSheetName}" → "${actualName}"`, null, 'SHEETS');
        }
        return actualName;
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
      
      // 대소문자 무관 시트 존재 여부 확인
      const existingSheet = response.data.sheets.find(sheet => 
        sheet.properties.title?.toLowerCase() === sheetName.toLowerCase()
      );
      
      if (existingSheet) {
        const actualName = existingSheet.properties.title;
        if (actualName !== sheetName) {
          ServerLogger.info(`📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`, null, 'SHEETS');
        }
        ServerLogger.info(`📄 시트가 이미 존재함 - 헤더만 업데이트: ${actualName}`, null, 'SHEETS');
        await this.setHeadersForSheet(actualName); // 실제 시트 이름으로 헤더 업데이트
        return;
      }

      // 플랫폼별 컬럼 수 결정
      const headers = this.getPlatformHeaders(sheetName);
      const columnCount = headers.length + 5; // 여유분 추가

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
                    columnCount: columnCount
                  }
                }
              }
            }
          ]
        }
      });

      // 새 시트에 헤더 추가
      await this.setHeadersForSheet(sheetName);
      
      ServerLogger.info(`✅ 새로운 ${sheetName} 시트 생성 및 헤더 설정 완료 (${headers.length}개 컬럼)`, null, 'SHEETS');
    } catch (error) {
      // 중복 시트 오류는 무시하고 헤더 업데이트 진행
      if (error.message && error.message.includes('already exists')) {
        ServerLogger.info(`📄 시트 생성 중 중복 감지 - 헤더 업데이트: ${sheetName}`, null, 'SHEETS');
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
        '구독자수', '채널동영상수', '수익화여부', 'YouTube카테고리', '라이센스', '화질', '언어', '태그',
        'URL', '파일경로', '신뢰도', '분석상태', '카테고리일치율', '일치유형', '일치사유'
      ];
    } else {
      // Instagram, TikTok 등 - 조회수, 영상길이 제외
      return [
        '번호', '일시', '플랫폼', '계정', '대카테고리', '중카테고리', '전체카테고리경로', '카테고리깊이',
        '키워드', '분석내용', '좋아요', '댓글수',
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
        metadata.youtubeCategory || metadata.category || '',  // YouTube 카테고리
        metadata.license || 'youtube',             // 라이센스
        metadata.definition || 'sd',               // 화질
        metadata.language || '',                   // 언어
        analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 태그
        postUrl,                                   // URL
        videoPath ? path.basename(videoPath) : 'YouTube URL',  // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.aiModel || 'AI',                  // 분석상태 (AI 모델 정보)
        analysis.categoryMatch ? `${analysis.categoryMatch.matchScore}%` : '', // 카테고리일치율
        analysis.categoryMatch ? analysis.categoryMatch.matchType : '',        // 일치유형
        analysis.categoryMatch ? analysis.categoryMatch.matchReason : ''       // 일치사유
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
        // 조회수, 영상길이 제외
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
    const endColumn = this.getColumnLetter(headers.length);
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:${endColumn}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });
    
    // 헤더 포맷팅은 별도로 시도 (재시도 로직 포함)
    const headerCount = headers.length; // 클로저를 위해 복사
    setTimeout(async () => {
      try {
        // 시트 생성 직후 타이밍 이슈를 위한 재시도 로직
        let targetSheet = null;
        for (let retry = 0; retry < 3; retry++) {
          try {
            const sheetMetadata = await this.sheets.spreadsheets.get({
              spreadsheetId: this.spreadsheetId
            });
            
            // 대소문자 무관 시트 검색
            targetSheet = sheetMetadata.data.sheets?.find(sheet => 
              sheet.properties?.title?.toLowerCase() === sheetName.toLowerCase()
            );
            
            if (targetSheet) {
              const actualName = targetSheet.properties.title;
              if (actualName !== sheetName) {
                ServerLogger.info(`📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`);
              }
              break;
            }
            
            if (retry < 2) {
              await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
            }
          } catch (error) {
            if (retry < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              throw error;
            }
          }
        }
        
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
                      endColumnIndex: headerCount  // 동적 헤더 스타일 적용
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
          
          ServerLogger.info(`✅ ${sheetName} 헤더 포맷팅 완료 (${headerCount}개 컬럼, sheetId: ${sheetId})`);
        } else {
          ServerLogger.info(`⚠️ 헤더 포맷팅용 시트 "${sheetName}" 찾을 수 없음 - 포맷팅 건너뜀`);
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

        // 헤더 업데이트 (동적 범위 사용) - Z 이후 컬럼 지원
        const endColumn = this.getColumnLetter(expectedHeaders.length);
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
      const endColumn = this.getColumnLetter(rowData.length);
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
      
      // 새 비디오 저장 후 캐시 무효화
      this.invalidateCache();
      
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

  /**
   * 배치 비디오 데이터 저장 (50개 영상을 한 번에 저장)
   * @param {Array} videoDataArray - 비디오 데이터 배열
   * @param {string} platform - 플랫폼 ('youtube', 'instagram', 'tiktok')
   * @returns {Promise<Object>} 저장 결과
   */
  async saveVideoBatch(videoDataArray, platform = 'youtube') {
    try {
      if (!this.sheets) {
        throw new Error('구글 시트 인증이 완료되지 않았습니다.');
      }

      if (!videoDataArray || videoDataArray.length === 0) {
        return { success: true, saved: 0, message: '저장할 데이터가 없습니다.' };
      }

      if (!this.spreadsheetId) {
        if (!this.loadSpreadsheetId()) {
          await this.createSpreadsheet();
        }
      }

      const timestamp = new Date().toISOString();
      ServerLogger.info(`📦 배치 시트 저장 시작: ${videoDataArray.length}개 ${platform} 영상`);

      // 기존 스프레드시트의 헤더 업데이트 확인 및 적용
      await this.ensureUpdatedHeaders(platform);

      // 플랫폼별 시트 이름 가져오기
      const sheetName = await this.getSheetNameByPlatform(platform);
      
      // 다음 행 번호 조회
      const lastRowResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`
      });

      let nextRow = (lastRowResponse.data.values?.length || 1) + 1;
      const startingRowNumber = nextRow - 1; // 헤더 제외한 실제 행 번호

      // 배치 데이터를 시트 행 형태로 변환
      const batchRows = [];
      
      for (let i = 0; i < videoDataArray.length; i++) {
        const videoInfo = videoDataArray[i];
        const rowNumber = startingRowNumber + i;
        
        // YouTube API 데이터를 표준 형식으로 변환
        const standardVideoData = {
          platform: platform,
          postUrl: `https://youtube.com/watch?v=${videoInfo.videoId}`,
          videoPath: null, // YouTube는 URL만
          thumbnailPath: videoInfo.thumbnailUrl,
          metadata: {
            title: videoInfo.title,
            author: videoInfo.channel,
            description: videoInfo.description,
            uploadDate: videoInfo.publishedAt,
            likes: videoInfo.likes,
            comments: videoInfo.comments,
            views: videoInfo.views,
            duration: videoInfo.duration,
            durationFormatted: this.formatDuration(videoInfo.duration),
            subscribers: videoInfo.subscribers,
            channelVideos: videoInfo.channelVideos,
            channelViews: videoInfo.channelViews,
            channelCountry: videoInfo.channelCountry,
            channelDescription: videoInfo.channelDescription,
            youtubeCategory: videoInfo.youtubeCategory,
            categoryId: videoInfo.categoryId,
            monetized: videoInfo.definition === 'hd' ? 'Y' : 'N',
            license: 'youtube',
            definition: videoInfo.definition,
            language: videoInfo.language,
            tags: videoInfo.tags,
            hashtags: videoInfo.tags
          },
          analysis: {
            // YouTube 배치에서는 AI 분석 없이 카테고리만 사용
            mainCategory: videoInfo.youtubeCategory,
            middleCategory: '',
            fullCategoryPath: videoInfo.youtubeCategory,
            depth: 1,
            content: `YouTube 채널: ${videoInfo.channel}`,
            keywords: videoInfo.tags.slice(0, 10), // 처음 10개 태그만
            confidence: 0.95, // YouTube API는 신뢰도 높음
            aiModel: 'YouTube API',
            hashtags: videoInfo.tags
          },
          timestamp: timestamp
        };

        // 기존 buildRowData 로직 사용하여 행 데이터 생성
        const rowData = this.buildRowData(rowNumber, standardVideoData);
        batchRows.push(rowData);
      }

      // 시트 용량 확보 (배치 크기만큼)
      await this.ensureSheetCapacity(sheetName, nextRow + videoDataArray.length);

      // 배치로 한 번에 데이터 추가
      const range = `${sheetName}!A${nextRow}:${this.getColumnLetter(batchRows[0].length)}${nextRow + batchRows.length - 1}`;
      
      const batchResponse = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: batchRows
        }
      });

      const savedCount = batchRows.length;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;

      ServerLogger.info(`✅ 배치 저장 완료: ${savedCount}개 영상 저장됨`, {
        sheetName,
        range,
        spreadsheetUrl
      });

      // 배치 저장 후 캐시 무효화
      this.invalidateCache();

      return {
        success: true,
        saved: savedCount,
        total: videoDataArray.length,
        spreadsheetUrl: spreadsheetUrl,
        range: range,
        message: `${savedCount}개 영상이 ${sheetName} 시트에 일괄 저장되었습니다.`
      };

    } catch (error) {
      ServerLogger.error('배치 시트 저장 실패:', error);
      
      return {
        success: false,
        saved: 0,
        total: videoDataArray.length,
        error: `배치 저장 실패: ${error.message}`,
        spreadsheetUrl: this.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}` : null
      };
    }
  }

  /**
   * 기존 buildRowData 메소드를 사용하여 행 데이터 생성
   */
  buildRowData(rowNumber, videoData) {
    const { platform, postUrl, videoPath, metadata, analysis, timestamp } = videoData;

    // 업로드 날짜 결정
    let displayDate;
    if (metadata.uploadDate) {
      if (platform === 'youtube') {
        displayDate = new Date(metadata.uploadDate).toLocaleString('ko-KR');
      } else {
        displayDate = new Date(metadata.uploadDate).toLocaleDateString('ko-KR');
      }
    } else {
      displayDate = new Date(timestamp).toLocaleString('ko-KR');
    }

    // 동적 카테고리 처리
    const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
    let fullCategoryPath = '';
    let categoryDepth = 0;
    
    if (isDynamicMode && analysis.fullCategoryPath) {
      fullCategoryPath = analysis.fullCategoryPath;
      categoryDepth = analysis.depth || 0;
    } else {
      const mainCat = analysis.mainCategory || '미분류';
      const middleCat = analysis.middleCategory || '';
      if (middleCat && middleCat !== '미분류') {
        fullCategoryPath = `${mainCat} > ${middleCat}`;
        categoryDepth = 2;
      } else {
        fullCategoryPath = mainCat;
        categoryDepth = 1;
      }
    }

    // 플랫폼별 행 데이터 구성
    if (platform === 'youtube') {
      return [
        rowNumber,                                    // 번호
        displayDate,                                 // 일시
        platform.toUpperCase(),                      // 플랫폼
        metadata.author || '',                       // 계정
        analysis.mainCategory || '미분류',           // 대카테고리
        analysis.middleCategory || '',               // 중카테고리
        fullCategoryPath,                            // 전체카테고리경로
        categoryDepth,                               // 카테고리깊이
        analysis.keywords?.join(', ') || '',         // 키워드
        analysis.content || '',                      // 분석내용
        metadata.likes || '0',                       // 좋아요
        metadata.comments || '0',                    // 댓글수
        metadata.views || '0',                       // 조회수
        metadata.durationFormatted || '',            // 영상길이
        metadata.subscribers || '0',                // 구독자수
        metadata.channelVideos || '0',             // 채널동영상수
        metadata.monetized || 'N',                 // 수익화여부
        metadata.youtubeCategory || '',            // YouTube카테고리
        metadata.license || 'youtube',             // 라이센스
        metadata.definition || 'sd',               // 화질
        metadata.language || '',                   // 언어
        analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 태그
        postUrl,                                   // URL
        videoPath ? path.basename(videoPath) : 'YouTube URL',  // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.aiModel || 'AI',                  // 분석상태
        '', // 카테고리일치율 (배치에서는 비워둠)
        '', // 일치유형
        ''  // 일치사유
      ];
    } else {
      // Instagram, TikTok
      return [
        rowNumber,                                    // 번호
        displayDate,                                 // 일시
        platform.toUpperCase(),                      // 플랫폼
        metadata.author || '',                       // 계정
        analysis.mainCategory || '미분류',           // 대카테고리
        analysis.middleCategory || '',               // 중카테고리
        fullCategoryPath,                            // 전체카테고리경로
        categoryDepth,                               // 카테고리깊이
        analysis.keywords?.join(', ') || '',         // 키워드
        analysis.content || '',                      // 분석내용
        metadata.likes || '0',                       // 좋아요
        metadata.comments || '0',                    // 댓글수
        analysis.hashtags?.join(' ') || metadata.hashtags?.join(' ') || '', // 해시태그
        postUrl,                                     // URL
        videoPath ? path.basename(videoPath) : '',  // 파일경로
        (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
        analysis.aiModel || 'AI'                     // 분석상태
      ];
    }
  }

  /**
   * 초를 시:분:초 형식으로 변환
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  async updateStatistics() {
    try {
      // 모든 플랫폼 시트에서 데이터 조회
      const platforms = ['instagram', 'tiktok', 'youtube'];
      let allData = [];

      for (const platform of platforms) {
        try {
          // 통계용으로는 시트 이름만 가져오기 (시트 생성 시도 안함)
          const sheetNames = {
            'instagram': 'Instagram',
            'tiktok': 'TikTok', 
            'youtube': 'YouTube'
          };
          const sheetName = sheetNames[platform] || 'Instagram';
          
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
      // 3단계: 캐시 확인 (디버깅 정보 추가)
      const cacheKey = `recent_videos_${limit}`;
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      
      ServerLogger.info(`🔍 캐시 확인: key=${cacheKey}, 캐시존재=${!!cached}, TTL=${this.cacheTTL}ms`, 'SHEETS');
      
      if (cached) {
        const age = now - cached.timestamp;
        ServerLogger.info(`⏰ 캐시 나이: ${age}ms (TTL: ${this.cacheTTL}ms), 유효=${age < this.cacheTTL}`, 'SHEETS');
        
        if (age < this.cacheTTL) {
          ServerLogger.info(`✅ 캐시 HIT - 영상 목록 반환 (${cached.data.length}개)`, 'SHEETS');
          return cached.data;
        } else {
          ServerLogger.info(`❌ 캐시 EXPIRED - 새로 조회함`, 'SHEETS');
        }
      } else {
        ServerLogger.info(`❌ 캐시 MISS - 첫 번째 조회`, 'SHEETS');
      }

      // 모든 플랫폼 시트에서 최신 데이터 조회 (성능 최적화)
      const platforms = ['instagram', 'tiktok', 'youtube'];
      
      // 1단계: 범위 확대 - Instagram 9월 데이터 누락 방지를 위해 더 많이 조회
      const platformLimit = Math.max(50, limit * 5); // 최소 50개, 또는 limit*5 (9월 데이터 포함 위해 확대)
      ServerLogger.info(`📊 요청 limit=${limit}, 플랫폼당 조회할 행수=${platformLimit} (Instagram 9월 데이터 포함 위해 확대)`, 'SHEETS');
      
      // 2단계: 병렬 처리 - 모든 플랫폼 전체 데이터 조회 후 날짜로 정렬 (수정됨)
      const platformPromises = platforms.map(async (platform, index) => {
        try {
          const sheetName = await this.getSheetNameByPlatform(platform);
          const range = `${sheetName}!A2:S`;  // 전체 데이터 조회로 변경
          
          ServerLogger.info(`🔍 [${index + 1}/3] ${platform} 시트 전체 조회 시작: ${range}`, 'DEBUG');
          
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: range  // 전체 데이터 조회
          });
          
          let data = response.data.values || [];
          
          ServerLogger.info(`📋 [${index + 1}/3] ${platform} 시트에서 ${data.length}개 행 조회 (전체)`, 'DEBUG');
          
          if (data.length > 0) {
            // 🔥 핵심 수정: 각 플랫폼 데이터를 날짜(컬럼 1)로 정렬 후 최신 데이터만 선택
            data.sort((a, b) => {
              const dateA = new Date(a[1] || 0);  // 일시 컬럼
              const dateB = new Date(b[1] || 0);
              return dateB - dateA;  // 최신순 정렬
            });
            
            // 각 플랫폼에서 최신 platformLimit개만 선택
            data = data.slice(0, platformLimit);
            
            ServerLogger.info(`🎯 [${index + 1}/3] ${platform} 시트에서 날짜순 정렬 후 최신 ${data.length}개 선택`, 'DEBUG');
            
            // 선택된 데이터의 날짜 범위 확인
            if (data.length > 0) {
              const oldestDate = data[data.length - 1][1];
              const newestDate = data[0][1];
              ServerLogger.info(`📅 [${index + 1}/3] ${platform} 선택된 기간: ${newestDate} ~ ${oldestDate}`, 'DEBUG');
            }
          } else {
            ServerLogger.info(`⚠️ [${index + 1}/3] ${platform} 시트가 비어있음`, 'DEBUG');
          }
          
          return { platform, sheetName, data, count: data.length };
        } catch (error) {
          ServerLogger.error(`❌ [${index + 1}/3] ${platform} 시트 데이터 조회 실패`, error.message, 'DEBUG');
          return { platform, sheetName: 'N/A', data: [], count: 0, error: error.message };
        }
      });

      // 모든 플랫폼 데이터 병렬로 가져오기
      const platformResults = await Promise.all(platformPromises);
      let allVideos = [];
      
      // 🔍 각 플랫폼별 조회 결과 상세 분석
      ServerLogger.info(`🔍 각 플랫폼별 조회 결과:`, 'DEBUG');
      let totalRowsFromAllPlatforms = 0;
      
      platformResults.forEach((result, index) => {
        const { platform, sheetName, data, count, error } = result;
        totalRowsFromAllPlatforms += count;
        
        if (error) {
          ServerLogger.info(`  [${index + 1}] ${platform.toUpperCase()}: ❌ 실패 - ${error}`, 'DEBUG');
        } else {
          ServerLogger.info(`  [${index + 1}] ${platform.toUpperCase()}: ✅ ${count}개 행 조회됨 (시트명: ${sheetName})`, 'DEBUG');
          
          // 각 플랫폼 데이터의 플랫폼 값 분석
          if (data.length > 0) {
            const platformValues = data.map(row => row[2]).filter(p => p);
            const uniquePlatforms = [...new Set(platformValues)];
            ServerLogger.info(`    └─ 플랫폼 값 종류: [${uniquePlatforms.join(', ')}] (${platformValues.length}개 중 ${uniquePlatforms.length}개 고유값)`, 'DEBUG');
          }
        }
      });
      
      ServerLogger.info(`📊 전체 조회 결과: ${totalRowsFromAllPlatforms}개 행`, 'DEBUG');
      
      // 결과 합치기 (데이터만 추출)
      for (const result of platformResults) {
        if (result.data && result.data.length > 0) {
          allVideos = allVideos.concat(result.data);
          ServerLogger.info(`🔄 ${result.platform} 데이터 ${result.data.length}개 병합 중`, 'DEBUG');
        }
      }
      
      ServerLogger.info(`🎯 최종 병합된 전체 데이터: ${allVideos.length}개 행`, 'DEBUG');

      // 정렬 전 플랫폼별 분포 확인
      const beforeSortPlatforms = {};
      allVideos.forEach(row => {
        const platform = row[2] || 'UNKNOWN';
        beforeSortPlatforms[platform] = (beforeSortPlatforms[platform] || 0) + 1;
      });
      ServerLogger.info(`📊 정렬 전 플랫폼 분포: ${JSON.stringify(beforeSortPlatforms)}`, 'DEBUG');

      // 날짜순으로 정렬하고 limit 적용 (한국어 날짜 형식 지원)
      allVideos.sort((a, b) => {
        const dateStrA = a[1] || '';
        const dateStrB = b[1] || '';
        
        // 🔥 한국어 날짜 형식 변환 함수
        const parseKoreanDate = (dateStr) => {
          // "2025. 8. 29. 오후 8:17:30" → "2025/8/29 20:17:30"
          let normalized = dateStr
            .replace(/\. /g, '/') // "2025. 8. 29." → "2025/8/29"
            .replace(/\.$/, '') // 마지막 점 제거
            .replace(/오후 (\d+):/, (match, hour) => ` ${parseInt(hour) + 12}:`) // 오후 8: → 20:
            .replace(/오전 (\d+):/, ' $1:') // 오전 8: → 8:
            .replace(/오전 12:/, ' 0:') // 오전 12시는 0시
            .replace(/오후 12:/, ' 12:'); // 오후 12시는 12시 그대로
          
          return new Date(normalized);
        };
        
        const dateA = parseKoreanDate(dateStrA);
        const dateB = parseKoreanDate(dateStrB);
        
        return dateB - dateA;  // 최신순
      });

      // 🔥 정렬 후 상위 데이터 확인 (한국어 날짜 파싱 적용)
      const parseKoreanDate = (dateStr) => {
        let normalized = dateStr
          .replace(/\. /g, '/') 
          .replace(/\.$/, '') 
          .replace(/오후 (\d+):/, (match, hour) => ` ${parseInt(hour) + 12}:`)
          .replace(/오전 (\d+):/, ' $1:')
          .replace(/오전 12:/, ' 0:')
          .replace(/오후 12:/, ' 12:');
        return new Date(normalized);
      };
      
      const topVideos = allVideos.slice(0, Math.min(10, allVideos.length));
      ServerLogger.info(`📅 최종 정렬 후 상위 ${topVideos.length}개 영상 (한국어 날짜 파싱 적용):`, 'DEBUG');
      topVideos.forEach((row, index) => {
        const dateObj = parseKoreanDate(row[1]);
        const timestamp = dateObj.getTime();
        ServerLogger.info(`  [${index + 1}] ${row[2]} - ${row[1]} (timestamp: ${timestamp})`, 'DEBUG');
      });
      
      // 🔥 한국어 날짜 파싱 테스트
      ServerLogger.info(`🧪 한국어 날짜 파싱 테스트 (수정됨):`, 'DEBUG');
      ServerLogger.info(`  "2025. 7. 31." → ${parseKoreanDate("2025. 7. 31.").getTime()}`, 'DEBUG');
      ServerLogger.info(`  "2025. 8. 29. 오후 8:17:30" → ${parseKoreanDate("2025. 8. 29. 오후 8:17:30").getTime()}`, 'DEBUG');

      const response = { data: { values: allVideos.slice(0, limit) } };

      const data = response.data.values || [];
      const result = data.map(row => ({
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

      // 3단계: 캐시에 결과 저장
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      ServerLogger.info(`Sheets API 호출로 영상 목록 조회 완료 (${result.length}개, 캐시에 저장됨)`, 'SHEETS');
      return result;
    } catch (error) {
      throw new Error(`데이터 조회 실패: ${error.message}`);
    }
  }

  // 캐시 무효화 메소드 (새 비디오 추가 시 호출)
  invalidateCache() {
    this.cache.clear();
    ServerLogger.info('영상 목록 캐시 무효화 완료', 'SHEETS');
  }

  getSpreadsheetUrl() {
    if (this.spreadsheetId) {
      return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;
    }
    return null;
  }

  // 시트 행 수 확장 (재시도 로직 포함)
  async ensureSheetCapacity(sheetName, requiredRow) {
    try {
      // 시트 생성 직후 타이밍 이슈를 위한 재시도 로직
      let sheet = null;
      for (let retry = 0; retry < 3; retry++) {
        try {
          const spreadsheet = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId
          });
          
          // 대소문자 무관 시트 검색
          sheet = spreadsheet.data.sheets.find(s => 
            s.properties.title?.toLowerCase() === sheetName.toLowerCase()
          );
          
          if (sheet) {
            const actualName = sheet.properties.title;
            if (actualName !== sheetName) {
              ServerLogger.info(`📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`);
            }
            break;
          }
          
          if (retry < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
          }
        } catch (error) {
          if (retry < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
      
      if (!sheet) {
        ServerLogger.warn(`⚠️ 행 확장용 시트 "${sheetName}" 찾을 수 없음 - 행 확장 건너뜀`);
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

  /**
   * 숫자를 Excel 컬럼 문자로 변환 (A, B, ... Z, AA, AB, ... AC 등)
   * @param {number} columnNumber - 컬럼 번호 (1부터 시작)
   * @returns {string} Excel 컬럼 문자
   */
  getColumnLetter(columnNumber) {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--; // 0-based로 변환
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }
}

module.exports = SheetsManager;
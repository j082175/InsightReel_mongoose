const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { ServerLogger } = require('../utils/logger');
const VideoUrl = require('../models/VideoUrl');

const { PLATFORMS } = require('../config/api-messages');

class SheetsManager {
    constructor() {
        this.sheets = null;
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
        this.credentialsPath = path.join(
            __dirname,
            '../../config/credentials.json',
        );
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
            ServerLogger.warn(
                '구글 시트 초기화 실패 (설정 필요)',
                error.message,
                'SHEETS',
            );
        }
    }

    async authenticate() {
        // 서비스 계정 또는 OAuth 사용
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            // 서비스 계정 방식 (추천)
            const credentials = JSON.parse(
                process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            );
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.sheets = google.sheets({ version: 'v4', auth });
        } else if (fs.existsSync(this.credentialsPath)) {
            // OAuth 방식
            const credentials = JSON.parse(
                fs.readFileSync(this.credentialsPath),
            );
            const { client_secret, client_id, redirect_uris } =
                credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0],
            );

            if (fs.existsSync(this.tokenPath)) {
                const token = fs.readFileSync(this.tokenPath);
                oAuth2Client.setCredentials(JSON.parse(token));
            } else {
                throw new Error(
                    'OAuth 토큰이 필요합니다. 최초 설정을 진행해주세요.',
                );
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
                spreadsheetId: this.spreadsheetId,
            });

            return {
                status: 'connected',
                spreadsheetTitle: response.data.properties.title,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`,
            };
        } catch (error) {
            throw new Error(`구글 시트 연결 테스트 실패: ${error.message}`);
        }
    }

    // 플랫폼별 시트 이름 조회 및 생성
    async getSheetNameByPlatform(platform) {
        try {
            const sheetNames = {
                instagram: 'Instagram',
                tiktok: 'TikTok',
                youtube: 'YouTube',
            };

            const targetSheetName = sheetNames[platform] || 'Instagram'; // 기본값

            // 기존 시트 목록 조회
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const existingSheets = response.data.sheets.map(
                (sheet) => sheet.properties.title,
            );

            // 대소문자 무관 시트 존재 여부 확인
            const existingSheet = response.data.sheets.find(
                (sheet) =>
                    sheet.properties.title?.toLowerCase() ===
                    targetSheetName.toLowerCase(),
            );

            if (!existingSheet) {
                try {
                    await this.createSheetForPlatform(targetSheetName);
                    // createSheetForPlatform 내부에서 로그를 남기므로 여기서는 제거
                } catch (createError) {
                    // 시트 생성 실패해도 계속 진행 (시트가 이미 존재할 가능성)
                    if (!createError.message?.includes('already exists')) {
                        ServerLogger.warn(
                            `⚠️ 시트 생성 실패: ${targetSheetName}`,
                            createError.message,
                            'SHEETS',
                        );
                    }
                }
            } else {
                // 기존 시트가 있으면 실제 시트 이름 반환 (대소문자 정확한 이름)
                const actualName = existingSheet.properties.title;
                if (actualName !== targetSheetName) {
                    ServerLogger.info(
                        `📝 시트 이름 대소문자 차이 감지: "${targetSheetName}" → "${actualName}"`,
                        null,
                        'SHEETS',
                    );
                }
                return actualName;
            }

            return targetSheetName;
        } catch (error) {
            ServerLogger.error(
                '플랫폼별 시트 이름 조회 실패',
                error.message,
                'SHEETS',
            );
            throw error;
        }
    }

    // 첫 번째 시트 이름 조회 (기존 호환성)
    async getFirstSheetName() {
        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const firstSheet = response.data.sheets[0];
            return firstSheet.properties.title;
        } catch (error) {
            ServerLogger.warn(
                '시트 이름 조회 실패, 기본값 사용:',
                error.message,
            );
            return 'Sheet1'; // 기본값
        }
    }

    // 플랫폼별 시트 생성 (중복 방지 개선)
    async createSheetForPlatform(sheetName) {
        try {
            // 이미 존재하는지 한 번 더 체크
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const existingSheets = response.data.sheets.map(
                (sheet) => sheet.properties.title,
            );

            // 대소문자 무관 시트 존재 여부 확인
            const existingSheet = response.data.sheets.find(
                (sheet) =>
                    sheet.properties.title?.toLowerCase() ===
                    sheetName.toLowerCase(),
            );

            if (existingSheet) {
                const actualName = existingSheet.properties.title;
                if (actualName !== sheetName) {
                    ServerLogger.info(
                        `📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`,
                        null,
                        'SHEETS',
                    );
                }
                ServerLogger.info(
                    `📄 시트가 이미 존재함 - 헤더만 업데이트: ${actualName}`,
                    null,
                    'SHEETS',
                );
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
                                        columnCount: columnCount,
                                    },
                                },
                            },
                        },
                    ],
                },
            });

            // 새 시트에 헤더 추가
            await this.setHeadersForSheet(sheetName);

            ServerLogger.info(
                `✅ 새로운 ${sheetName} 시트 생성 및 헤더 설정 완료 (${headers.length}개 컬럼)`,
                null,
                'SHEETS',
            );
        } catch (error) {
            // 중복 시트 오류는 무시하고 헤더 업데이트 진행
            if (error.message && error.message.includes('already exists')) {
                ServerLogger.info(
                    `📄 시트 생성 중 중복 감지 - 헤더 업데이트: ${sheetName}`,
                    null,
                    'SHEETS',
                );
                await this.setHeadersForSheet(sheetName);
                return;
            }

            ServerLogger.error(
                `❌ 플랫폼별 시트 생성 실패: ${sheetName}`,
                error.message,
                'SHEETS',
            );
            throw error;
        }
    }

    // 플랫폼별 헤더 구조 정의
    getPlatformHeaders(platform) {
        if (platform.toUpperCase() === 'YOUTUBE') {
            // YouTube 시트 헤더 - 번호, 태그, 파일경로 제거, 일시->업로드날짜, 해시태그/멘션/설명/댓글/썸네일URL/수집시간 추가
            return [
                '업로드날짜',
                '플랫폼',
                '채널이름',
                'YouTube핸들명',
                '채널URL',
                '대카테고리',
                '중카테고리',
                '전체카테고리경로',
                '카테고리깊이',
                '키워드',
                '해시태그',
                '멘션',
                '설명',
                '분석내용',
                '댓글',
                '좋아요',
                '댓글수',
                '조회수',
                '영상길이',
                '구독자수',
                '채널동영상수',
                '수익화여부',
                'YouTube카테고리',
                '라이센스',
                '화질',
                '언어',
                'URL',
                '썸네일URL',
                '신뢰도',
                '분석상태',
                '카테고리일치율',
                '일치유형',
                '일치사유',
                '수집시간',
            ];
        } else {
            // Instagram, TikTok 등 - 번호, 파일경로 제거, 일시->업로드날짜, 채널이름 분리(채널이름+채널URL)
            return [
                '업로드날짜',
                '플랫폼',
                '채널이름',
                '채널URL',
                '대카테고리',
                '중카테고리',
                '전체카테고리경로',
                '카테고리깊이',
                '키워드',
                '해시태그',
                '멘션',
                '설명',
                '분석내용',
                '좋아요',
                '댓글수',
                'URL',
                '썸네일URL',
                '신뢰도',
                '분석상태',
                '수집시간',
            ];
        }
    }

    // 플랫폼별 데이터 행 구성
    buildPlatformRowData({
        rowNumber,
        uploadDate,
        platform,
        metadata,
        analysis,
        fullCategoryPath,
        categoryDepth,
        postUrl,
        videoPath,
        thumbnailPath, // 썸네일 경로 추가
    }) {
        if (platform.toUpperCase() === 'YOUTUBE') {
            // YouTube - 새로운 구조 (번호, 태그, 파일경로 제거, 해시태그/멘션/설명/댓글/썸네일URL/수집시간 추가)
            return [
                uploadDate, // 업로드날짜 (업로드 날짜 우선)
                platform.toUpperCase(), // 플랫폼
                metadata.channelName || '', // 채널명
                metadata.youtubeHandle || '', // YouTube핸들명
                metadata.channelUrl || '', // 채널URL
                analysis.mainCategory || '미분류', // 대카테고리
                analysis.middleCategory || '미분류', // 중카테고리
                fullCategoryPath, // 전체카테고리경로 (동적)
                categoryDepth, // 카테고리깊이
                analysis.keywords?.join(', ') || '', // 키워드
                analysis.hashtags?.join(' ') ||
                    metadata.hashtags?.join(' ') ||
                    '', // 해시태그 (설명에서 추출)
                analysis.mentions?.join(' ') ||
                    metadata.mentions?.join(' ') ||
                    '', // 멘션 (@username)
                metadata.description || '', // 설명
                analysis.summary || '', // 분석내용 (영상 분석 결과)
                metadata.comments || '', // 댓글
                metadata.likes || '0', // 좋아요
                metadata.commentsCount || '0', // 댓글수
                metadata.views || '0', // 조회수
                metadata.duration || '', // 영상길이
                metadata.subscribers || '0', // 구독자수
                metadata.channelVideos || '0', // 채널동영상수
                metadata.monetized || 'N', // 수익화여부
                metadata.youtubeCategory || metadata.category || '', // YouTube 카테고리
                metadata.license || 'YOUTUBE', // 라이센스
                metadata.definition || 'sd', // 화질
                metadata.language || '', // 언어
                postUrl, // URL
                metadata.thumbnailUrl || '', // 썸네일URL
                (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
                analysis.aiModel || '수동', // 분석상태 (AI 모델 정보)
                analysis.categoryMatch
                    ? `${analysis.categoryMatch.matchScore}%`
                    : '', // 카테고리일치율
                analysis.categoryMatch ? analysis.categoryMatch.matchType : '', // 일치유형
                analysis.categoryMatch
                    ? analysis.categoryMatch.matchReason
                    : '', // 일치사유
                new Date().toISOString(), // 수집시간
            ];
        } else {
            // Instagram, TikTok - 새로운 구조 (번호, 파일경로 제거, 채널이름/채널URL 분리, 해시태그/멘션/설명 추가)
            return [
                uploadDate, // 업로드날짜 (업로드 날짜 우선)
                platform.toUpperCase(), // 플랫폼
                metadata.channelName || '', // 채널이름
                metadata.channelUrl || '', // 채널URL
                analysis.mainCategory || '미분류', // 대카테고리
                analysis.middleCategory || '미분류', // 중카테고리
                fullCategoryPath, // 전체카테고리경로 (동적)
                categoryDepth, // 카테고리깊이
                analysis.keywords?.join(', ') || '', // 키워드
                analysis.hashtags?.join(' ') ||
                    metadata.hashtags?.join(' ') ||
                    '', // 해시태그
                analysis.mentions?.join(' ') ||
                    metadata.mentions?.join(' ') ||
                    '', // 멘션
                metadata.description || analysis.extractedText || '', // 설명
                analysis.summary || '', // 분석내용 (영상 분석 결과)
                metadata.likes || '0', // 좋아요
                metadata.commentsCount || '0', // 댓글수
                postUrl, // URL
                thumbnailPath || metadata.thumbnailUrl || '', // 썸네일URL
                (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
                analysis.aiModel || '수동', // 분석상태 (AI 모델 정보)
                new Date().toISOString(), // 수집시간
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
                values: [headers],
            },
        });

        // 헤더 포맷팅은 별도로 시도 (재시도 로직 포함)
        const headerCount = headers.length; // 클로저를 위해 복사
        setTimeout(async () => {
            try {
                // 시트 생성 직후 타이밍 이슈를 위한 재시도 로직
                let targetSheet = null;
                for (let retry = 0; retry < 3; retry++) {
                    try {
                        const sheetMetadata =
                            await this.sheets.spreadsheets.get({
                                spreadsheetId: this.spreadsheetId,
                            });

                        // 대소문자 무관 시트 검색
                        targetSheet = sheetMetadata.data.sheets?.find(
                            (sheet) =>
                                sheet.properties?.title?.toLowerCase() ===
                                sheetName.toLowerCase(),
                        );

                        if (targetSheet) {
                            const actualName = targetSheet.properties.title;
                            if (actualName !== sheetName) {
                                ServerLogger.info(
                                    `📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`,
                                );
                            }
                            break;
                        }

                        if (retry < 2) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 500),
                            ); // 0.5초 대기
                        }
                    } catch (error) {
                        if (retry < 2) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 500),
                            );
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
                                            endColumnIndex: headerCount, // 동적 헤더 스타일 적용
                                        },
                                        cell: {
                                            userEnteredFormat: {
                                                backgroundColor: {
                                                    red: 0.2,
                                                    green: 0.6,
                                                    blue: 1.0,
                                                }, // 파란색 배경
                                                textFormat: {
                                                    bold: true,
                                                    foregroundColor: {
                                                        red: 1,
                                                        green: 1,
                                                        blue: 1,
                                                    },
                                                }, // 흰색 볼드 텍스트
                                            },
                                        },
                                        fields: 'userEnteredFormat(backgroundColor,textFormat)',
                                    },
                                },
                            ],
                        },
                    });

                    ServerLogger.info(
                        `✅ ${sheetName} 헤더 포맷팅 완료 (${headerCount}개 컬럼, sheetId: ${sheetId})`,
                    );
                } else {
                    ServerLogger.info(
                        `⚠️ 헤더 포맷팅용 시트 "${sheetName}" 찾을 수 없음 - 포맷팅 건너뜀`,
                    );
                }
            } catch (formatError) {
                ServerLogger.warn(
                    `⚠️ ${sheetName} 헤더 포맷팅 실패 (값은 설정됨):`,
                    formatError.message,
                );
            }
        }, 1000); // 1초 후 비동기로 실행
    }

    async createSpreadsheet() {
        try {
            const response = await this.sheets.spreadsheets.create({
                resource: {
                    properties: {
                        title: `영상 분석 결과 - ${
                            new Date().toISOString().split('T')[0]
                        }`,
                    },
                    sheets: [
                        {
                            properties: {
                                title: 'Instagram',
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 19,
                                },
                            },
                        },
                        {
                            properties: {
                                title: 'TikTok',
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 19,
                                },
                            },
                        },
                        {
                            properties: {
                                title: 'YouTube',
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 19,
                                },
                            },
                        },
                        {
                            properties: {
                                title: 'Stats',
                                gridProperties: {
                                    rowCount: 100,
                                    columnCount: 10,
                                },
                            },
                        },
                    ],
                },
            });

            this.spreadsheetId = response.data.spreadsheetId;

            // 스프레드시트 ID 저장
            const configDir = path.dirname(this.credentialsPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(
                path.join(configDir, 'spreadsheet_config.json'),
                JSON.stringify({ spreadsheetId: this.spreadsheetId }, null, 2),
            );

            // 각 플랫폼별 시트에 헤더 설정
            const platforms = ['Instagram', 'TikTok', 'YouTube'];
            for (const platform of platforms) {
                await this.setHeadersForSheet(platform);
            }

            ServerLogger.info(
                `✅ 새 스프레드시트 생성됨: ${this.spreadsheetId}`,
            );
            return response.data;
        } catch (error) {
            throw new Error(`스프레드시트 생성 실패: ${error.message}`);
        }
    }

    // 기존 스프레드시트의 헤더가 최신 버전인지 확인하고 업데이트
    async ensureUpdatedHeaders(platform = 'INSTAGRAM') {
        try {
            const sheetName = await this.getSheetNameByPlatform(platform);

            // 현재 헤더 조회
            const currentHeaderResponse =
                await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!1:1`,
                });

            const currentHeaders = currentHeaderResponse.data.values?.[0] || [];
            // 플랫폼별 예상 헤더 가져오기
            const expectedHeaders = this.getPlatformHeaders(platform);

            // 헤더가 다르거나 길이가 다르면 업데이트
            const needsUpdate =
                currentHeaders.length !== expectedHeaders.length ||
                !expectedHeaders.every(
                    (header, index) => currentHeaders[index] === header,
                );

            if (needsUpdate) {
                ServerLogger.info(
                    `🔄 ${platform} 스프레드시트 헤더 업데이트 중...`,
                );
                ServerLogger.info(
                    `기존 헤더 (${currentHeaders.length}개):`,
                    currentHeaders.slice(0, 5).join(', ') + '...',
                );
                ServerLogger.info(
                    `새 헤더 (${expectedHeaders.length}개):`,
                    expectedHeaders.slice(0, 5).join(', ') + '...',
                );

                // 헤더 업데이트 (동적 범위 사용) - Z 이후 컬럼 지원
                const endColumn = this.getColumnLetter(expectedHeaders.length);
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A1:${endColumn}1`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [expectedHeaders],
                    },
                });

                // 시트 메타데이터 가져오기
                const sheetMetadata = await this.sheets.spreadsheets.get({
                    spreadsheetId: this.spreadsheetId,
                });

                const targetSheet = sheetMetadata.data.sheets?.find(
                    (sheet) => sheet.properties?.title === sheetName,
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
                                        endColumnIndex: expectedHeaders.length, // 동적 컬럼 수
                                    },
                                    cell: {
                                        userEnteredFormat: {
                                            backgroundColor: {
                                                red: 1,
                                                green: 1,
                                                blue: 1,
                                            }, // 흰색 배경
                                            textFormat: {
                                                bold: false,
                                                foregroundColor: {
                                                    red: 0,
                                                    green: 0,
                                                    blue: 0,
                                                },
                                            }, // 일반 검정 텍스트
                                        },
                                    },
                                    fields: 'userEnteredFormat(backgroundColor,textFormat)',
                                },
                            },
                            {
                                repeatCell: {
                                    range: {
                                        sheetId: sheetId,
                                        startRowIndex: 0,
                                        endRowIndex: 1,
                                        startColumnIndex: 0,
                                        endColumnIndex: expectedHeaders.length, // 동적 헤더 스타일 적용
                                    },
                                    cell: {
                                        userEnteredFormat: {
                                            backgroundColor: {
                                                red: 0.2,
                                                green: 0.6,
                                                blue: 1.0,
                                            },
                                            textFormat: {
                                                bold: true,
                                                foregroundColor: {
                                                    red: 1,
                                                    green: 1,
                                                    blue: 1,
                                                },
                                            },
                                        },
                                    },
                                    fields: 'userEnteredFormat(backgroundColor,textFormat)',
                                },
                            },
                        ],
                    },
                });

                ServerLogger.info('✅ 스프레드시트 헤더 업데이트 완료');
            } else {
                ServerLogger.info(
                    '✅ 스프레드시트 헤더가 이미 최신 상태입니다',
                );
            }
        } catch (error) {
            ServerLogger.error('❌ 헤더 업데이트 실패:', error.message);
            // 헤더 업데이트 실패해도 계속 진행
        }
    }

    loadSpreadsheetId() {
        try {
            const configPath = path.join(
                path.dirname(this.credentialsPath),
                'spreadsheet_config.json',
            );
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

            const {
                platform,
                postUrl,
                videoPath,
                thumbnailPath,
                metadata,
                analysis,
                timestamp,
            } = videoData;

            ServerLogger.info(
                `🔍 saveVideoData - Analysis 객체:`,
                JSON.stringify(analysis, null, 2),
            );

            // 기존 스프레드시트의 헤더 업데이트 확인 및 적용
            await this.ensureUpdatedHeaders(platform);

            // 플랫폼별 시트 이름 가져오기
            const sheetName = await this.getSheetNameByPlatform(platform);

            // 다음 행 번호 조회
            const lastRowResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
            });

            const nextRow = (lastRowResponse.data.values?.length || 1) + 1;
            const rowNumber = nextRow - 1; // 헤더 제외

            // 업로드 날짜 결정: metadata.uploadDate가 있으면 사용, 없으면 timestamp 사용
            let uploadDate;
            if (metadata.uploadDate) {
                // YouTube의 경우 업로드 날짜와 시간 모두 표시
                if (platform === PLATFORMS.YOUTUBE) {
                    uploadDate = new Date(metadata.uploadDate).toLocaleString(
                        'ko-KR',
                    );
                    ServerLogger.info(
                        `📅 YouTube 업로드 날짜/시간 사용: ${metadata.uploadDate} -> ${uploadDate}`,
                    );
                } else {
                    // 다른 플랫폼은 날짜만 표시
                    const uploadDateOnly = new Date(
                        metadata.uploadDate,
                    ).toLocaleDateString('ko-KR');
                    uploadDate = uploadDateOnly;
                    ServerLogger.info(
                        `📅 업로드 날짜 사용: ${metadata.uploadDate} -> ${uploadDate}`,
                    );
                }
            } else {
                uploadDate = new Date(timestamp).toLocaleString('ko-KR');
                ServerLogger.info(
                    `📅 처리 날짜 사용 (업로드 날짜 없음): ${timestamp} -> ${uploadDate}`,
                );
            }

            // 동적 카테고리 모드 확인
            const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
            let fullCategoryPath = '';
            let categoryDepth = 0;

            ServerLogger.info(`🔍 Analysis 필드값:`, {
                'analysis.categoryDepth': analysis.categoryDepth,
                'analysis.fullCategoryPath': analysis.fullCategoryPath,
                'analysis.depth': analysis.depth,
                'analysis.fullPath': analysis.fullPath,
            });

            if (
                isDynamicMode &&
                (analysis.fullCategoryPath || analysis.fullPath)
            ) {
                // 동적 카테고리 모드: AI가 생성한 전체 경로 사용
                fullCategoryPath =
                    analysis.fullCategoryPath || analysis.fullPath;
                categoryDepth = analysis.categoryDepth || analysis.depth || 0;
                ServerLogger.info(
                    `🎯 동적 카테고리 데이터: ${fullCategoryPath} (깊이: ${categoryDepth})`,
                );
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
                uploadDate,
                platform,
                metadata,
                analysis,
                fullCategoryPath,
                categoryDepth,
                postUrl,
                videoPath,
                thumbnailPath, // 썸네일 경로 전달
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
                        values: [rowData],
                    },
                });
                ServerLogger.info(
                    `✅ 시트에 데이터 저장 성공: ${sheetName}!A${nextRow}:${endColumn}${nextRow} (${rowData.length}개 컬럼)`,
                );
            } catch (updateError) {
                ServerLogger.error(
                    `❌ 시트 데이터 저장 실패하지만 계속 진행: ${sheetName}`,
                    updateError.message,
                    'SHEETS',
                );
                // 데이터 저장 실패해도 부분적 성공으로 처리
            }

            // 통계 업데이트 (실패해도 무시)
            try {
                await this.updateStatistics();
                ServerLogger.info('📊 통계 업데이트 완료');
            } catch (statsError) {
                ServerLogger.warn(
                    '⚠️ 통계 업데이트 실패 (무시)',
                    statsError.message,
                    'SHEETS',
                );
            }

            const modeInfo = isDynamicMode ? '동적 카테고리' : '기존 모드';
            ServerLogger.info(
                `✅ 구글 시트에 데이터 저장 완료 (${modeInfo}): 행 ${nextRow}`,
            );

            // 새 비디오 저장 후 캐시 무효화
            this.invalidateCache();

            // 🔗 MongoDB URL 상태 업데이트 (processing -> completed)
            try {
                const VideoUrl = require('../models/VideoUrl');
                const normalizedUrl = this.normalizeVideoUrl(postUrl);

                // processing 상태인 URL을 completed로 업데이트 (원본 게시일 포함)
                const originalPublishDate = metadata.uploadDate
                    ? new Date(metadata.uploadDate)
                    : null;
                const updateResult = await VideoUrl.updateStatus(
                    normalizedUrl,
                    'completed',
                    {
                        sheetName: sheetName,
                        column: 'N', // URL이 저장되는 컬럼
                        row: nextRow,
                    },
                    originalPublishDate,
                );

                if (updateResult.success) {
                    ServerLogger.info(
                        `🔗 MongoDB URL 상태 업데이트 완료: ${normalizedUrl} -> completed (${platform} ${nextRow}행)`,
                    );

                    // 🆕 Video 모델도 함께 업데이트 (원본 게시일 동기화)
                    const Video = require('../models/VideoModel');
                    await Video.createOrUpdateFromVideoUrl(
                        {
                            originalUrl: normalizedUrl,
                            platform: platform.toUpperCase(),
                            originalPublishDate: originalPublishDate,
                            processedAt: new Date(),
                        },
                        {
                            title: analysis.title || metadata.title || '미분류',
                            category: analysis.mainCategory || '미분류', // mainCategory 사용 🎯
                            keywords: analysis.keywords || [],
                            hashtags: analysis.keywords
                                ? analysis.keywords.map((k) => `#${k}`)
                                : [],
                            description:
                                analysis.content || analysis.description || '',
                            thumbnailPath: thumbnailPath,
                            thumbnailUrl: thumbnailPath,
                            likes: metadata.likes || 0,
                            views: metadata.views || 0,
                        },
                    );
                    ServerLogger.info(
                        `📊 Video 모델 동기화 완료: ${normalizedUrl}`,
                    );
                } else {
                    // processing 상태 레코드가 없는 경우 - 새로 생성 (fallback)
                    await VideoUrl.create({
                        normalizedUrl: normalizedUrl,
                        originalUrl: postUrl,
                        platform: platform,
                        status: 'completed',
                        sheetLocation: {
                            sheetName: sheetName,
                            column: 'N',
                            row: nextRow,
                        },
                    });

                    ServerLogger.info(
                        `🔗 MongoDB URL 새로 생성 (completed): ${normalizedUrl} (${platform} ${nextRow}행)`,
                    );
                }
            } catch (mongoError) {
                // MongoDB 저장 실패해도 전체 프로세스는 계속
                ServerLogger.warn(
                    `⚠️ MongoDB URL 상태 업데이트 실패 (무시): ${mongoError.message}`,
                );
            }

            return {
                success: true,
                row: nextRow,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`,
            };
        } catch (error) {
            ServerLogger.error('구글 시트 초기화 또는 설정 실패:', error);

            // 시트 설정 실패해도 AI 분석 결과는 반환 (부분적 성공)
            return {
                success: false,
                error: `시트 저장 실패하지만 AI 분석은 완료: ${error.message}`,
                partialSuccess: true,
                spreadsheetUrl: this.spreadsheetId
                    ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
                    : null,
            };
        }
    }

    /**
     * 배치 비디오 데이터 저장 (50개 영상을 한 번에 저장)
     * @param {Array} videoDataArray - 비디오 데이터 배열
     * @param {string} platform - 플랫폼 ('YOUTUBE', 'INSTAGRAM', 'TIKTOK')
     * @returns {Promise<Object>} 저장 결과
     */
    async saveVideoBatch(videoDataArray, platform = 'YOUTUBE') {
        try {
            if (!this.sheets) {
                throw new Error('구글 시트 인증이 완료되지 않았습니다.');
            }

            if (!videoDataArray || videoDataArray.length === 0) {
                return {
                    success: true,
                    saved: 0,
                    message: '저장할 데이터가 없습니다.',
                };
            }

            if (!this.spreadsheetId) {
                if (!this.loadSpreadsheetId()) {
                    await this.createSpreadsheet();
                }
            }

            const timestamp = new Date().toISOString();
            ServerLogger.info(
                `📦 배치 시트 저장 시작: ${videoDataArray.length}개 ${platform} 영상`,
            );

            // 기존 스프레드시트의 헤더 업데이트 확인 및 적용
            await this.ensureUpdatedHeaders(platform);

            // 플랫폼별 시트 이름 가져오기
            const sheetName = await this.getSheetNameByPlatform(platform);

            // 다음 행 번호 조회
            const lastRowResponse = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
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
                        durationFormatted: this.formatDuration(
                            videoInfo.duration,
                        ),
                        subscribers: videoInfo.subscribers,
                        channelVideos: videoInfo.channelVideos,
                        channelViews: videoInfo.channelViews,
                        channelCountry: videoInfo.channelCountry,
                        channelDescription: videoInfo.channelDescription,
                        youtubeCategory: videoInfo.youtubeCategory,
                        categoryId: videoInfo.categoryId,
                        monetized: videoInfo.definition === 'hd' ? 'Y' : 'N',
                        license: 'YOUTUBE',
                        definition: videoInfo.definition,
                        language: videoInfo.language,
                        tags: videoInfo.tags,
                        hashtags: videoInfo.tags,
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
                        hashtags: videoInfo.tags,
                    },
                    timestamp: timestamp,
                };

                // 기존 buildRowData 로직 사용하여 행 데이터 생성
                const rowData = this.buildRowData(rowNumber, standardVideoData);
                batchRows.push(rowData);
            }

            // 시트 용량 확보 (배치 크기만큼)
            await this.ensureSheetCapacity(
                sheetName,
                nextRow + videoDataArray.length,
            );

            // 배치로 한 번에 데이터 추가
            const range = `${sheetName}!A${nextRow}:${this.getColumnLetter(
                batchRows[0].length,
            )}${nextRow + batchRows.length - 1}`;

            const batchResponse = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                resource: {
                    values: batchRows,
                },
            });

            const savedCount = batchRows.length;
            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`;

            ServerLogger.info(
                `✅ 배치 저장 완료: ${savedCount}개 영상 저장됨`,
                {
                    sheetName,
                    range,
                    spreadsheetUrl,
                },
            );

            // 배치 저장 후 캐시 무효화
            this.invalidateCache();

            // 🔗 MongoDB URL들 상태 업데이트 (processing -> completed)
            try {
                const VideoUrl = require('../models/VideoUrl');
                let updatedCount = 0;
                let createdCount = 0;

                for (let i = 0; i < batchRows.length; i++) {
                    const videoData = videoDataArray[i];
                    const rowNumber = startRow + i;

                    if (videoData.postUrl) {
                        const originalUrl = videoData.postUrl;
                        const normalizedUrl =
                            this.normalizeVideoUrl(originalUrl);

                        try {
                            // processing 상태인 URL을 completed로 업데이트 시도 (원본 게시일 포함)
                            const originalPublishDate = videoData.metadata
                                ?.uploadDate
                                ? new Date(videoData.metadata.uploadDate)
                                : null;
                            const updateResult = await VideoUrl.updateStatus(
                                normalizedUrl,
                                'completed',
                                {
                                    sheetName: sheetName,
                                    column: 'N',
                                    row: rowNumber,
                                },
                                originalPublishDate,
                            );

                            if (updateResult.success) {
                                updatedCount++;
                            } else {
                                // processing 상태 레코드가 없는 경우 - 새로 생성 (fallback)
                                await VideoUrl.create({
                                    normalizedUrl: normalizedUrl,
                                    originalUrl: originalUrl,
                                    platform: platform,
                                    status: 'completed',
                                    sheetLocation: {
                                        sheetName: sheetName,
                                        column: 'N',
                                        row: rowNumber,
                                    },
                                });
                                createdCount++;
                            }
                        } catch (urlError) {
                            ServerLogger.warn(
                                `⚠️ URL 상태 처리 실패 (${normalizedUrl}): ${urlError.message}`,
                            );
                        }
                    }
                }

                ServerLogger.info(
                    `🔗 MongoDB 배치 URL 상태 처리 완료: 업데이트 ${updatedCount}개, 새로 생성 ${createdCount}개`,
                );
            } catch (mongoError) {
                // MongoDB 저장 실패해도 전체 프로세스는 계속
                ServerLogger.warn(
                    `⚠️ MongoDB 배치 URL 저장 실패 (무시): ${mongoError.message}`,
                );
            }

            return {
                success: true,
                saved: savedCount,
                total: videoDataArray.length,
                spreadsheetUrl: spreadsheetUrl,
                range: range,
                message: `${savedCount}개 영상이 ${sheetName} 시트에 일괄 저장되었습니다.`,
            };
        } catch (error) {
            ServerLogger.error('배치 시트 저장 실패:', error);

            return {
                success: false,
                saved: 0,
                total: videoDataArray.length,
                error: `배치 저장 실패: ${error.message}`,
                spreadsheetUrl: this.spreadsheetId
                    ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
                    : null,
            };
        }
    }

    /**
     * 기존 buildRowData 메소드를 사용하여 행 데이터 생성
     */
    buildRowData(rowNumber, videoData) {
        const { platform, postUrl, videoPath, metadata, analysis, timestamp } =
            videoData;

        // 업로드 날짜 결정
        let uploadDate;
        if (metadata.uploadDate) {
            if (platform === PLATFORMS.YOUTUBE) {
                uploadDate = new Date(metadata.uploadDate).toLocaleString(
                    'ko-KR',
                );
            } else {
                uploadDate = new Date(metadata.uploadDate).toLocaleDateString(
                    'ko-KR',
                );
            }
        } else {
            uploadDate = new Date(timestamp).toLocaleString('ko-KR');
        }

        // 동적 카테고리 처리
        const isDynamicMode = process.env.USE_DYNAMIC_CATEGORIES === 'true';
        let fullCategoryPath = '';
        let categoryDepth = 0;

        // AIAnalyzer가 반환하는 실제 필드를 확인
        const analysisCategoryPath =
            analysis.fullCategoryPath || analysis.fullCategoryPath;
        const analysisCategoryDepth =
            analysis.categoryDepth || analysis.categoryDepth;

        ServerLogger.info(
            `🔍 Category Debug: isDynamicMode=${isDynamicMode}, categoryPath="${analysisCategoryPath}", depth=${analysisCategoryDepth}`,
        );
        ServerLogger.info(
            `🔍 Analysis 객체 전체:`,
            JSON.stringify(analysis, null, 2),
        );

        if (isDynamicMode && analysisCategoryPath) {
            fullCategoryPath = analysisCategoryPath;
            categoryDepth = analysisCategoryDepth || 0;
            ServerLogger.info(
                `✅ 동적 모드 사용: ${fullCategoryPath} → depth: ${categoryDepth}`,
            );
        } else {
            // 동적 카테고리에서 표준 필드나 레거시 필드가 있으면 사용
            if (analysisCategoryPath) {
                fullCategoryPath = analysisCategoryPath;
                categoryDepth = fullCategoryPath.split(' > ').length;
                ServerLogger.info(
                    `🔍 CategoryDepth 계산: ${fullCategoryPath} → depth: ${categoryDepth}`,
                );
            } else {
                // 기존 방식: mainCategory, middleCategory 조합
                const mainCat = analysis.mainCategory || '미분류';
                const middleCat = analysis.middleCategory || '';
                ServerLogger.info(
                    `🔍 기존 방식: mainCat="${mainCat}", middleCat="${middleCat}"`,
                );
                if (middleCat && middleCat !== '미분류') {
                    fullCategoryPath = `${mainCat} > ${middleCat}`;
                    categoryDepth = 2;
                    ServerLogger.info(
                        `✅ 2단계 카테고리: ${fullCategoryPath} → depth: ${categoryDepth}`,
                    );
                } else {
                    fullCategoryPath = mainCat;
                    categoryDepth = 1;
                    ServerLogger.info(
                        `✅ 1단계 카테고리: ${fullCategoryPath} → depth: ${categoryDepth}`,
                    );
                }
            }
        }

        // 플랫폼별 행 데이터 구성
        if (platform === PLATFORMS.YOUTUBE) {
            return [
                rowNumber, // 번호
                uploadDate, // 일시
                platform.toUpperCase(), // 플랫폼
                metadata.channelName || '',
                metadata.youtubeHandle || '', // YouTube핸들명
                metadata.channelUrl || '', // 채널URL
                analysis.mainCategory || '미분류', // 대카테고리
                analysis.middleCategory || '', // 중카테고리
                fullCategoryPath, // 전체카테고리경로
                categoryDepth, // 카테고리깊이
                analysis.keywords?.join(', ') || '', // 키워드
                analysis.content || '', // 분석내용
                metadata.likes || '0', // 좋아요                metadata.commentsCount || '0', // 댓글수                metadata.views || '0', // 조회수                metadata.duration || '', // 영상길이                metadata.subscribers || '0', // 구독자수                metadata.channelVideos || '0', // 채널동영상수                metadata.monetized || 'N', // 수익화여부
                metadata.youtubeCategory || '', // YouTube카테고리
                metadata.license || 'YOUTUBE', // 라이센스
                metadata.definition || 'sd', // 화질
                metadata.language || '', // 언어
                analysis.hashtags?.join(' ') ||
                    metadata.hashtags?.join(' ') ||
                    '', // 태그
                postUrl, // URL
                videoPath ? path.basename(videoPath) : 'YouTube URL', // 파일경로
                (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
                analysis.aiModel || '수동', // 분석상태
                '', // 카테고리일치율 (배치에서는 비워둠)
                '', // 일치유형
                '', // 일치사유
            ];
        } else {
            // Instagram, TikTok
            return [
                rowNumber, // 번호
                uploadDate, // 일시
                platform.toUpperCase(), // 플랫폼
                metadata.channelName || '',
                analysis.mainCategory || '미분류', // 대카테고리
                analysis.middleCategory || '', // 중카테고리
                fullCategoryPath, // 전체카테고리경로
                categoryDepth, // 카테고리깊이
                analysis.keywords?.join(', ') || '', // 키워드
                analysis.content || '', // 분석내용
                metadata.likes || '0', // 좋아요                metadata.commentsCount || '0', // 댓글수                analysis.hashtags?.join(' ') ||
                metadata.hashtags?.join(' ') || '', // 해시태그
                postUrl, // URL
                videoPath ? path.basename(videoPath) : '', // 파일경로
                (analysis.confidence * 100).toFixed(1) + '%', // 신뢰도
                analysis.aiModel || '수동', // 분석상태
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
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
                .toString()
                .padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    async updateStatistics() {
        try {
            // 모든 플랫폼 시트에서 데이터 조회
            const platforms = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'];
            let allData = [];

            for (const platform of platforms) {
                try {
                    // 통계용으로는 시트 이름만 가져오기 (시트 생성 시도 안함)
                    const sheetNames = {
                        instagram: 'Instagram',
                        tiktok: 'TikTok',
                        youtube: 'YouTube',
                    };
                    const sheetName = sheetNames[platform] || 'Instagram';

                    const response = await this.sheets.spreadsheets.values.get({
                        spreadsheetId: this.spreadsheetId,
                        range: `${sheetName}!A2:S`, // 헤더 제외 (S까지 확장)
                    });

                    const platformData = response.data.values || [];
                    allData = allData.concat(platformData);
                } catch (error) {
                    ServerLogger.warn(
                        `${platform} 시트 데이터 조회 실패 (시트가 없을 수 있음)`,
                        error.message,
                        'SHEETS',
                    );
                }
            }

            const data = allData;
            if (data.length === 0) return;

            // 카테고리별 통계 계산
            const categoryStats = {};
            const platformStats = {};

            data.forEach((row) => {
                const platform = row[2] || '미분류';
                const category = row[5] || '미분류';

                categoryStats[category] = (categoryStats[category] || 0) + 1;
                platformStats[platform] = (platformStats[platform] || 0) + 1;
            });

            // 통계 시트 업데이트
            const statsData = [
                ['카테고리별 통계', '개수', '비율'],
                ...Object.entries(categoryStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => [
                        category,
                        count,
                        `${((count / data.length) * 100).toFixed(1)}%`,
                    ]),
                [''],
                ['플랫폼별 통계', '개수', '비율'],
                ...Object.entries(platformStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([platform, count]) => [
                        platform,
                        count,
                        `${((count / data.length) * 100).toFixed(1)}%`,
                    ]),
            ];

            try {
                await this.sheets.spreadsheets.values.clear({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Stats!A:Z',
                });
            } catch (error) {
                ServerLogger.info(
                    '⚠️  Stats 시트가 없거나 접근할 수 없습니다. 통계 업데이트 건너뜀.',
                );
                return;
            }

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: 'Stats!A1',
                valueInputOption: 'RAW',
                resource: {
                    values: statsData,
                },
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

            ServerLogger.info(
                `🔍 캐시 확인: key=${cacheKey}, 캐시존재=${!!cached}, TTL=${
                    this.cacheTTL
                }ms`,
                'SHEETS',
            );

            if (cached) {
                const age = now - cached.timestamp;
                ServerLogger.info(
                    `⏰ 캐시 나이: ${age}ms (TTL: ${this.cacheTTL}ms), 유효=${
                        age < this.cacheTTL
                    }`,
                    'SHEETS',
                );

                if (age < this.cacheTTL) {
                    ServerLogger.info(
                        `✅ 캐시 HIT - 영상 목록 반환 (${cached.data.length}개)`,
                        'SHEETS',
                    );
                    return cached.data;
                } else {
                    ServerLogger.info(
                        `❌ 캐시 EXPIRED - 새로 조회함`,
                        'SHEETS',
                    );
                }
            } else {
                ServerLogger.info(`❌ 캐시 MISS - 첫 번째 조회`, 'SHEETS');
            }

            // 모든 플랫폼 시트에서 최신 데이터 조회 (성능 최적화)
            const platforms = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'];

            // 1단계: 범위 확대 - Instagram 9월 데이터 누락 방지를 위해 더 많이 조회
            const platformLimit = Math.max(50, limit * 5); // 최소 50개, 또는 limit*5 (9월 데이터 포함 위해 확대)
            ServerLogger.info(
                `📊 요청 limit=${limit}, 플랫폼당 조회할 행수=${platformLimit} (Instagram 9월 데이터 포함 위해 확대)`,
                'SHEETS',
            );

            // 2단계: 병렬 처리 - 모든 플랫폼 전체 데이터 조회 후 날짜로 정렬 (수정됨)
            const platformPromises = platforms.map(async (platform, index) => {
                try {
                    const sheetName = await this.getSheetNameByPlatform(
                        platform,
                    );
                    const range = `${sheetName}!A2:S`; // 전체 데이터 조회로 변경

                    ServerLogger.info(
                        `🔍 [${
                            index + 1
                        }/3] ${platform} 시트 전체 조회 시작: ${range}`,
                        'DEBUG',
                    );

                    const response = await this.sheets.spreadsheets.values.get({
                        spreadsheetId: this.spreadsheetId,
                        range: range, // 전체 데이터 조회
                    });

                    let data = response.data.values || [];

                    ServerLogger.info(
                        `📋 [${index + 1}/3] ${platform} 시트에서 ${
                            data.length
                        }개 행 조회 (전체)`,
                        'DEBUG',
                    );

                    if (data.length > 0) {
                        // 🔥 핵심 수정: 각 플랫폼 데이터를 날짜(컬럼 1)로 정렬 후 최신 데이터만 선택
                        data.sort((a, b) => {
                            const dateA = new Date(a[1] || 0); // 일시 컬럼
                            const dateB = new Date(b[1] || 0);
                            return dateB - dateA; // 최신순 정렬
                        });

                        // 각 플랫폼에서 최신 platformLimit개만 선택
                        data = data.slice(0, platformLimit);

                        ServerLogger.info(
                            `🎯 [${
                                index + 1
                            }/3] ${platform} 시트에서 날짜순 정렬 후 최신 ${
                                data.length
                            }개 선택`,
                            'DEBUG',
                        );

                        // 선택된 데이터의 날짜 범위 확인
                        if (data.length > 0) {
                            const oldestDate = data[data.length - 1][1];
                            const newestDate = data[0][1];
                            ServerLogger.info(
                                `📅 [${
                                    index + 1
                                }/3] ${platform} 선택된 기간: ${newestDate} ~ ${oldestDate}`,
                                'DEBUG',
                            );
                        }
                    } else {
                        ServerLogger.info(
                            `⚠️ [${index + 1}/3] ${platform} 시트가 비어있음`,
                            'DEBUG',
                        );
                    }

                    return { platform, sheetName, data, count: data.length };
                } catch (error) {
                    ServerLogger.error(
                        `❌ [${index + 1}/3] ${platform} 시트 데이터 조회 실패`,
                        error.message,
                        'DEBUG',
                    );
                    return {
                        platform,
                        sheetName: 'N/A',
                        data: [],
                        count: 0,
                        error: error.message,
                    };
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
                    ServerLogger.info(
                        `  [${
                            index + 1
                        }] ${platform.toUpperCase()}: ❌ 실패 - ${error}`,
                        'DEBUG',
                    );
                } else {
                    ServerLogger.info(
                        `  [${
                            index + 1
                        }] ${platform.toUpperCase()}: ✅ ${count}개 행 조회됨 (시트명: ${sheetName})`,
                        'DEBUG',
                    );

                    // 각 플랫폼 데이터의 플랫폼 값 분석
                    if (data.length > 0) {
                        const platformValues = data
                            .map((row) => row[2])
                            .filter((p) => p);
                        const uniquePlatforms = [...new Set(platformValues)];
                        ServerLogger.info(
                            `    └─ 플랫폼 값 종류: [${uniquePlatforms.join(
                                ', ',
                            )}] (${platformValues.length}개 중 ${
                                uniquePlatforms.length
                            }개 고유값)`,
                            'DEBUG',
                        );
                    }
                }
            });

            ServerLogger.info(
                `📊 전체 조회 결과: ${totalRowsFromAllPlatforms}개 행`,
                'DEBUG',
            );

            // 결과 합치기 (데이터만 추출)
            for (const result of platformResults) {
                if (result.data && result.data.length > 0) {
                    allVideos = allVideos.concat(result.data);
                    ServerLogger.info(
                        `🔄 ${result.platform} 데이터 ${result.data.length}개 병합 중`,
                        'DEBUG',
                    );
                }
            }

            ServerLogger.info(
                `🎯 최종 병합된 전체 데이터: ${allVideos.length}개 행`,
                'DEBUG',
            );

            // 정렬 전 플랫폼별 분포 확인
            const beforeSortPlatforms = {};
            allVideos.forEach((row) => {
                const platform = row[2] || 'UNKNOWN';
                beforeSortPlatforms[platform] =
                    (beforeSortPlatforms[platform] || 0) + 1;
            });
            ServerLogger.info(
                `📊 정렬 전 플랫폼 분포: ${JSON.stringify(
                    beforeSortPlatforms,
                )}`,
                'DEBUG',
            );

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
                        .replace(
                            /오후 (\d+):/,
                            (match, hour) => ` ${parseInt(hour) + 12}:`,
                        ) // 오후 8: → 20:
                        .replace(/오전 (\d+):/, ' $1:') // 오전 8: → 8:
                        .replace(/오전 12:/, ' 0:') // 오전 12시는 0시
                        .replace(/오후 12:/, ' 12:'); // 오후 12시는 12시 그대로

                    return new Date(normalized);
                };

                const dateA = parseKoreanDate(dateStrA);
                const dateB = parseKoreanDate(dateStrB);

                return dateB - dateA; // 최신순
            });

            // 🔥 정렬 후 상위 데이터 확인 (한국어 날짜 파싱 적용)
            const parseKoreanDate = (dateStr) => {
                let normalized = dateStr
                    .replace(/\. /g, '/')
                    .replace(/\.$/, '')
                    .replace(
                        /오후 (\d+):/,
                        (match, hour) => ` ${parseInt(hour) + 12}:`,
                    )
                    .replace(/오전 (\d+):/, ' $1:')
                    .replace(/오전 12:/, ' 0:')
                    .replace(/오후 12:/, ' 12:');
                return new Date(normalized);
            };

            const topVideos = allVideos.slice(
                0,
                Math.min(10, allVideos.length),
            );
            ServerLogger.info(
                `📅 최종 정렬 후 상위 ${topVideos.length}개 영상 (한국어 날짜 파싱 적용):`,
                'DEBUG',
            );
            topVideos.forEach((row, index) => {
                const dateObj = parseKoreanDate(row[1]);
                const timestamp = dateObj.getTime();
                ServerLogger.info(
                    `  [${index + 1}] ${row[2]} - ${
                        row[1]
                    } (timestamp: ${timestamp})`,
                    'DEBUG',
                );
            });

            // 🔥 한국어 날짜 파싱 테스트
            ServerLogger.info(`🧪 한국어 날짜 파싱 테스트 (수정됨):`, 'DEBUG');
            ServerLogger.info(
                `  "2025. 7. 31." → ${parseKoreanDate(
                    '2025. 7. 31.',
                ).getTime()}`,
                'DEBUG',
            );
            ServerLogger.info(
                `  "2025. 8. 29. 오후 8:17:30" → ${parseKoreanDate(
                    '2025. 8. 29. 오후 8:17:30',
                ).getTime()}`,
                'DEBUG',
            );

            const response = { data: { values: allVideos.slice(0, limit) } };

            const data = response.data.values || [];
            const result = data.map((row) => ({
                id: row[0],
                timestamp: row[1],
                platform: row[2],
                ['channelName']: row[3], // 🚀 자동화
                mainCategory: row[4], // 대카테고리
                middleCategory: row[5], // 중카테고리
                fullCategoryPath: row[6], // 전체카테고리경로
                categoryDepth: row[7], // 카테고리깊이
                keywords: row[8]?.split(', ') || [], // 키워드
                content: row[9], // 분석내용
                likes: row[10], // 좋아요
                comments: row[11], // 댓글수
                views: row[12], // 조회수
                duration: row[13], // 영상길이
                hashtags: row[14]?.split(' ') || [], // 해시태그
                url: row[15], // URL
                filename: row[16], // 파일경로
                confidence: row[17], // 신뢰도
                source: row[18], // 분석상태
            }));

            // 3단계: 캐시에 결과 저장
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
            });

            ServerLogger.info(
                `Sheets API 호출로 영상 목록 조회 완료 (${result.length}개, 캐시에 저장됨)`,
                'SHEETS',
            );
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
                        spreadsheetId: this.spreadsheetId,
                    });

                    // 대소문자 무관 시트 검색
                    sheet = spreadsheet.data.sheets.find(
                        (s) =>
                            s.properties.title?.toLowerCase() ===
                            sheetName.toLowerCase(),
                    );

                    if (sheet) {
                        const actualName = sheet.properties.title;
                        if (actualName !== sheetName) {
                            ServerLogger.info(
                                `📝 시트 이름 대소문자 차이 감지: "${sheetName}" → "${actualName}"`,
                            );
                        }
                        break;
                    }

                    if (retry < 2) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000),
                        ); // 1초 대기
                    }
                } catch (error) {
                    if (retry < 2) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000),
                        );
                    } else {
                        throw error;
                    }
                }
            }

            if (!sheet) {
                ServerLogger.warn(
                    `⚠️ 행 확장용 시트 "${sheetName}" 찾을 수 없음 - 행 확장 건너뜀`,
                );
                return;
            }

            const currentRowCount = sheet.properties.gridProperties.rowCount;
            ServerLogger.info(
                `📏 현재 시트 "${sheetName}" 행 수: ${currentRowCount}, 필요한 행: ${requiredRow}`,
            );

            // 행 수가 부족하면 확장 (여유분 100행 추가)
            if (requiredRow >= currentRowCount) {
                const newRowCount = requiredRow + 100;

                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [
                            {
                                updateSheetProperties: {
                                    properties: {
                                        sheetId: sheet.properties.sheetId,
                                        gridProperties: {
                                            rowCount: newRowCount,
                                            columnCount:
                                                sheet.properties.gridProperties
                                                    .columnCount,
                                        },
                                    },
                                    fields: 'gridProperties.rowCount',
                                },
                            },
                        ],
                    },
                });

                ServerLogger.info(
                    `✅ 시트 "${sheetName}" 행 수를 ${currentRowCount}에서 ${newRowCount}로 확장했습니다.`,
                );
            }
        } catch (error) {
            ServerLogger.error('시트 확장 실패:', error);
            // 확장 실패해도 계속 진행 (기존 로직 유지)
        }
    }

    /**
     * 🔍 URL 중복 검사 - 모든 플랫폼에서 동일 URL이 이미 존재하는지 확인
     * @param {string} videoUrl - 검사할 비디오 URL
     * @returns {Promise<{isDuplicate: boolean, existingPlatform?: string, existingRow?: number}>}
     */
    async checkDuplicateURL(videoUrl) {
        try {
            if (!videoUrl) {
                return { isDuplicate: false };
            }

            // URL 정규화 (쿼리 파라미터 제거, 프로토콜 통일)
            const normalizedUrl = this.normalizeVideoUrl(videoUrl);

            ServerLogger.info(
                `🔍 URL 중복 검사 시작: ${normalizedUrl}`,
                'SHEETS_DUPLICATE',
            );

            // 모든 플랫폼 시트에서 검사
            const platforms = ['INSTAGRAM', 'YOUTUBE', 'TIKTOK'];

            for (const platform of platforms) {
                try {
                    const sheetName = await this.getSheetNameByPlatform(
                        platform,
                    );

                    // URL이 저장되는 컬럼들 확인 (플랫폼별로 다를 수 있음)
                    let urlColumns = [];
                    if (platform === PLATFORMS.YOUTUBE) {
                        urlColumns = ['W']; // YouTube URL은 W컬럼에 저장
                    } else if (platform === 'INSTAGRAM') {
                        urlColumns = ['N']; // Instagram URL은 N컬럼에 저장
                    } else {
                        urlColumns = ['L']; // TikTok URL은 L컬럼에 저장 (확인 필요)
                    }

                    // 각 URL 컬럼에서 검사
                    for (const column of urlColumns) {
                        const range = `${sheetName}!${column}:${column}`;

                        const response =
                            await this.sheets.spreadsheets.values.get({
                                spreadsheetId: this.spreadsheetId,
                                range: range,
                            });

                        const values = response.data.values || [];

                        // 헤더 행 제외하고 검사 (1행은 헤더)
                        for (
                            let rowIndex = 1;
                            rowIndex < values.length;
                            rowIndex++
                        ) {
                            const cellValue = values[rowIndex][0];
                            if (cellValue) {
                                const existingNormalizedUrl =
                                    this.normalizeVideoUrl(cellValue);

                                if (existingNormalizedUrl === normalizedUrl) {
                                    ServerLogger.warn(
                                        `⚠️ 중복 URL 발견: ${platform} 시트 ${column}${
                                            rowIndex + 1
                                        }행`,
                                        'SHEETS_DUPLICATE',
                                    );
                                    return {
                                        isDuplicate: true,
                                        existingPlatform: platform,
                                        existingRow: rowIndex + 1,
                                        existingColumn: column,
                                    };
                                }
                            }
                        }
                    }
                } catch (platformError) {
                    ServerLogger.warn(
                        `${platform} 시트 중복 검사 실패: ${platformError.message}`,
                        'SHEETS_DUPLICATE',
                    );
                    continue; // 다른 플랫폼 계속 검사
                }
            }

            ServerLogger.info(
                `✅ 중복 없음: ${normalizedUrl}`,
                'SHEETS_DUPLICATE',
            );
            return { isDuplicate: false };
        } catch (error) {
            ServerLogger.error(
                'URL 중복 검사 실패',
                error.message,
                'SHEETS_DUPLICATE',
            );
            // 에러 발생시 중복 아닌 것으로 처리하여 시스템이 계속 작동하도록 함
            return { isDuplicate: false, error: error.message };
        }
    }

    /**
     * 🔧 비디오 URL 정규화 - 일관된 비교를 위해 URL을 표준화
     * @param {string} url - 원본 URL
     * @returns {string} 정규화된 URL
     */
    normalizeVideoUrl(url) {
        if (!url) return '';

        try {
            // 기본 정리
            let normalized = url.toString().trim().toLowerCase();

            // 프로토콜 통일 (http → https)
            normalized = normalized.replace(/^http:\/\//, 'https://');

            // 🔧 모든 플랫폼에 대해 www. 제거 (일관성 확보)
            normalized = normalized.replace(/\/\/www\./, '//');

            // 플랫폼별 정규화 처리
            if (
                normalized.includes('youtube.com') ||
                normalized.includes('youtu.be')
            ) {
                // YouTube URL 정규화 - v= 파라미터만 유지
                if (normalized.includes('youtube.com/watch')) {
                    // https://youtube.com/watch?v=VIDEO_ID&other=params → https://youtube.com/watch?v=VIDEO_ID
                    const videoIdMatch = normalized.match(
                        /[?&]v=([a-zA-Z0-9_-]{11})/i,
                    );
                    if (videoIdMatch) {
                        normalized = `https://youtube.com/watch?v=${videoIdMatch[1].toLowerCase()}`;
                    }
                } else if (normalized.includes('youtu.be/')) {
                    // https://youtu.be/VIDEO_ID?params → https://youtube.com/watch?v=VIDEO_ID
                    const videoIdMatch = normalized.match(
                        /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
                    );
                    if (videoIdMatch) {
                        normalized = `https://youtube.com/watch?v=${videoIdMatch[1].toLowerCase()}`;
                    }
                } else if (normalized.includes('/shorts/')) {
                    // https://youtube.com/shorts/VIDEO_ID → https://youtube.com/watch?v=VIDEO_ID
                    const videoIdMatch = normalized.match(
                        /\/shorts\/([a-zA-Z0-9_-]{11})/i,
                    );
                    if (videoIdMatch) {
                        normalized = `https://youtube.com/watch?v=${videoIdMatch[1].toLowerCase()}`;
                    }
                }
            } else if (normalized.includes('instagram.com')) {
                // Instagram URL 정규화 - 쿼리 파라미터 제거, 슬래시 제거
                // https://instagram.com/p/POST_ID/?params → https://instagram.com/p/POST_ID
                // https://instagram.com/reels/POST_ID/?params → https://instagram.com/reels/POST_ID
                normalized = normalized.split('?')[0];
                // 일관성을 위해 마지막 슬래시 제거 (Instagram 특성상 있어도 없어도 같은 페이지)
                normalized = normalized.replace(/\/$/, '');
            } else if (normalized.includes('tiktok.com')) {
                // TikTok URL 정규화 - 쿼리 파라미터 제거
                // https://tiktok.com/@user/video/VIDEO_ID?params → https://tiktok.com/@user/video/VIDEO_ID
                normalized = normalized.split('?')[0];
                // 마지막 슬래시 제거
                normalized = normalized.replace(/\/$/, '');
            } else {
                // 기타 플랫폼 - 기본적인 정리만
                normalized = normalized.split('?')[0].replace(/\/$/, '');
            }

            return normalized;
        } catch (error) {
            ServerLogger.warn(`URL 정규화 실패: ${url}`, 'SHEETS_DUPLICATE');
            return url
                .toString()
                .trim()
                .toLowerCase()
                .replace(/\/\/www\./, '//')
                .split('?')[0]
                .replace(/\/$/, '');
        }
    }

    /**
     * ⚡ MongoDB 기반 초고속 URL 중복 검사 (100-1000배 빠름)
     * @param {string} videoUrl - 검사할 비디오 URL
     * @returns {Promise<{isDuplicate: boolean, existingPlatform?: string, existingRow?: number}>}
     */
    async checkDuplicateURLFast(videoUrl) {
        const startTime = Date.now();

        try {
            if (!videoUrl) {
                return { isDuplicate: false };
            }

            // URL 정규화
            const normalizedUrl = this.normalizeVideoUrl(videoUrl);

            ServerLogger.info(
                `⚡ MongoDB 고속 중복 검사 시작: ${normalizedUrl}`,
                'SHEETS_DUPLICATE_FAST',
            );

            // MongoDB에서 초고속 검색 (인덱스 기반 O(log n))
            const duplicateCheck = await VideoUrl.checkDuplicate(normalizedUrl);

            const duration = Date.now() - startTime;

            if (duplicateCheck.isDuplicate) {
                ServerLogger.warn(
                    `⚠️ 중복 URL 발견 (MongoDB): ${duplicateCheck.existingPlatform} 시트 ${duplicateCheck.existingColumn}${duplicateCheck.existingRow}행 (${duration}ms)`,
                    'SHEETS_DUPLICATE_FAST',
                );

                return {
                    isDuplicate: true,
                    existingPlatform: duplicateCheck.existingPlatform,
                    existingRow: duplicateCheck.existingRow,
                    existingColumn: duplicateCheck.existingColumn,
                    originalUrl: duplicateCheck.originalUrl,
                    searchTime: duration,
                };
            } else {
                ServerLogger.info(
                    `✅ 중복 없음 (MongoDB): ${normalizedUrl} (${duration}ms)`,
                    'SHEETS_DUPLICATE_FAST',
                );

                return {
                    isDuplicate: false,
                    searchTime: duration,
                    error: duplicateCheck.error || null,
                };
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            ServerLogger.error(
                `❌ MongoDB 중복 검사 실패 (${duration}ms)`,
                error.message,
                'SHEETS_DUPLICATE_FAST',
            );

            // MongoDB 실패시 기존 Google Sheets 방식으로 폴백
            ServerLogger.warn(
                '🔄 Google Sheets 방식으로 폴백 중...',
                'SHEETS_DUPLICATE_FAST',
            );
            return await this.checkDuplicateURL(videoUrl);
        }
    }

    /**
     * 📝 새로운 URL을 MongoDB에 등록 (Google Sheets 저장 후 호출)
     * @param {string} videoUrl - 원본 URL
     * @param {string} platform - 플랫폼 (instagram, youtube, tiktok)
     * @param {string} sheetName - 시트명
     * @param {string} column - 컬럼 (W, L 등)
     * @param {number} row - 행 번호
     * @returns {Promise<boolean>} 등록 성공 여부
     */
    async registerUrlInMongoDB(videoUrl, platform, sheetName, column, row) {
        try {
            if (!videoUrl) return false;

            const normalizedUrl = this.normalizeVideoUrl(videoUrl);

            const result = await VideoUrl.registerUrl(
                normalizedUrl,
                videoUrl,
                platform,
                {
                    sheetName,
                    column,
                    row,
                },
            );

            if (result.success) {
                ServerLogger.info(
                    `✅ URL MongoDB 등록 완료: ${platform} ${column}${row}`,
                    'SHEETS_REGISTER',
                );
                return true;
            } else {
                if (result.error === 'DUPLICATE_URL') {
                    ServerLogger.warn(
                        `⚠️ URL 이미 MongoDB에 존재: ${normalizedUrl}`,
                        'SHEETS_REGISTER',
                    );
                } else {
                    ServerLogger.error(
                        `❌ URL MongoDB 등록 실패: ${result.error}`,
                        'SHEETS_REGISTER',
                    );
                }
                return false;
            }
        } catch (error) {
            ServerLogger.error(
                'URL MongoDB 등록 중 에러',
                error.message,
                'SHEETS_REGISTER',
            );
            return false;
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

    // 🎬 YouTube 채널 데이터 저장 메소드
    async saveChannelData(channelData) {
        try {
            // 채널 전용 스프레드시트 ID (메인 스프레드시트를 기본값으로 사용)
            const channelSpreadsheetId =
                process.env.GOOGLE_CHANNEL_SPREADSHEET_ID || this.spreadsheetId;

            if (!channelSpreadsheetId) {
                throw new Error(
                    '채널 전용 스프레드시트 ID가 설정되지 않았습니다 (GOOGLE_CHANNEL_SPREADSHEET_ID)',
                );
            }

            if (!this.sheets) {
                throw new Error('Google Sheets API가 초기화되지 않았습니다');
            }

            ServerLogger.info('📊 채널 데이터 스프레드시트 저장 시작', {
                channelName: channelData.channelName,
                category: channelData.category,
            });

            // 헤더 확인 및 생성
            await this.ensureChannelSheetHeaders(channelSpreadsheetId);

            // 데이터 행 준비
            const rowData = [
                channelData.channelId,
                channelData.channelName,
                channelData.channelUrl,
                channelData.subscriberCount?.toLocaleString() || '0',
                channelData.videoCount?.toLocaleString() || '0',
                channelData.totalViews?.toLocaleString() || '0',
                channelData.category || '기타',
                Array.isArray(channelData.keywords)
                    ? channelData.keywords.join(', ')
                    : channelData.keywords || '',
                channelData.averageViews?.toLocaleString() || '0',
                channelData.uploadFrequency || '0',
                channelData.shortFormRatio || '0',
                channelData.analyzedAt || new Date().toISOString(),
                channelData.analysisLevel || '2',
                channelData.platform || 'YOUTUBE',
            ];

            // 스프레드시트에 데이터 추가
            const range = 'Channels!A:N'; // 채널 데이터 열 (A~N)

            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: channelSpreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [rowData],
                },
            });

            ServerLogger.info('✅ 채널 데이터 스프레드시트 저장 완료', {
                channelName: channelData.channelName,
                updatedRows: response.data.updates.updatedRows,
                updatedRange: response.data.updates.updatedRange,
            });

            return {
                success: true,
                updatedRows: response.data.updates.updatedRows,
                updatedRange: response.data.updates.updatedRange,
            };
        } catch (error) {
            ServerLogger.error('❌ 채널 데이터 스프레드시트 저장 실패:', error);
            throw error;
        }
    }

    // 채널 시트 헤더 확인 및 생성
    async ensureChannelSheetHeaders(spreadsheetId) {
        try {
            // Channels 시트가 없으면 첫 번째 시트 사용 (권한 문제 회피)
            let targetSheet = 'Channels';

            try {
                // Channels 시트 존재 확인
                await this.sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: 'Channels!1:1',
                });
                ServerLogger.info('📝 Channels 시트 사용');
            } catch (error) {
                if (
                    error.message.includes('Unable to parse range') ||
                    error.message.includes('not found')
                ) {
                    ServerLogger.info(
                        '📝 Channels 시트가 없음. 첫 번째 시트에 채널 데이터를 저장합니다',
                    );
                    // 스프레드시트의 첫 번째 시트 이름 가져오기
                    const spreadsheet = await this.sheets.spreadsheets.get({
                        spreadsheetId: spreadsheetId,
                    });
                    targetSheet = spreadsheet.data.sheets[0].properties.title;
                    ServerLogger.info(`📋 대상 시트: ${targetSheet}`);
                } else {
                    throw error;
                }
            }

            // 대상 시트의 첫 번째 행 확인
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${targetSheet}!1:1`,
            });

            const headers = [
                '채널 ID',
                '채널명',
                '채널 URL',
                '구독자 수',
                '영상 수',
                '총 조회수',
                '카테고리',
                '키워드',
                '평균 조회수',
                '업로드 빈도',
                '숏폼 비율(%)',
                '분석일시',
                '분석 레벨',
                '플랫폼',
            ];

            // 헤더가 없거나 불완전한 경우 추가
            if (
                !response.data.values ||
                response.data.values.length === 0 ||
                response.data.values[0].length < headers.length
            ) {
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: 'Channels!A1:N1',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [headers],
                    },
                });

                ServerLogger.info(
                    '📋 채널 스프레드시트 헤더 생성/업데이트 완료',
                );
            }
        } catch (error) {
            ServerLogger.error('❌ 채널 시트 헤더 설정 실패:', error);
            throw error;
        }
    }
}

module.exports = SheetsManager;

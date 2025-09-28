import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { ServerLogger } from '../../../utils/logger';

interface AuthenticationResult {
    success: boolean;
    sheets?: any;
    error?: string;
}

interface ConnectionTestResult {
    status: string;
    spreadsheetTitle?: string;
    spreadsheetUrl?: string;
    error?: string;
}

export class GoogleAuthenticator {
    private sheets: any = null;
    private spreadsheetId: string | null;
    private credentialsPath: string;
    private tokenPath: string;

    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;
        this.credentialsPath = path.join(__dirname, '../../../../config/credentials.json');
        this.tokenPath = path.join(__dirname, '../../../../config/token.json');
    }

    /**
     * Google Sheets API 인증
     */
    async authenticate(): Promise<AuthenticationResult> {
        try {
            // 서비스 계정 방식 우선 시도 (추천)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                return await this.authenticateWithServiceAccount();
            }

            // OAuth 방식 폴백
            if (fs.existsSync(this.credentialsPath)) {
                return await this.authenticateWithOAuth();
            }

            return {
                success: false,
                error: '구글 API 인증 정보가 없습니다. GOOGLE_SERVICE_ACCOUNT_KEY 환경변수 또는 credentials.json 파일이 필요합니다.'
            };

        } catch (error) {
            ServerLogger.error('Google Sheets 인증 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '인증 중 알 수 없는 오류'
            };
        }
    }

    /**
     * 서비스 계정 방식 인증
     */
    private async authenticateWithServiceAccount(): Promise<AuthenticationResult> {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);

            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth });

            ServerLogger.info('Google Sheets 서비스 계정 인증 성공');
            return {
                success: true,
                sheets: this.sheets
            };

        } catch (error) {
            ServerLogger.error('서비스 계정 인증 실패:', error);
            return {
                success: false,
                error: `서비스 계정 인증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    /**
     * OAuth 방식 인증
     */
    private async authenticateWithOAuth(): Promise<AuthenticationResult> {
        try {
            const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            const { client_secret, client_id, redirect_uris } = credentials.installed;

            const oAuth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );

            if (!fs.existsSync(this.tokenPath)) {
                return {
                    success: false,
                    error: 'OAuth 토큰이 필요합니다. 최초 설정을 진행해주세요.'
                };
            }

            const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            oAuth2Client.setCredentials(token);

            this.sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

            ServerLogger.info('Google Sheets OAuth 인증 성공');
            return {
                success: true,
                sheets: this.sheets
            };

        } catch (error) {
            ServerLogger.error('OAuth 인증 실패:', error);
            return {
                success: false,
                error: `OAuth 인증 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    /**
     * 연결 테스트
     */
    async testConnection(): Promise<ConnectionTestResult> {
        try {
            if (!this.sheets) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    return {
                        status: 'failed',
                        error: authResult.error
                    };
                }
            }

            // 스프레드시트 ID가 없으면 생성 필요
            if (!this.spreadsheetId) {
                return {
                    status: 'no_spreadsheet',
                    error: 'GOOGLE_SPREADSHEET_ID 환경변수가 설정되지 않았습니다. 스프레드시트를 생성하거나 기존 ID를 설정해주세요.'
                };
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
            ServerLogger.error('Google Sheets 연결 테스트 실패:', error);

            // 403 에러는 권한 문제
            if ((error as any).code === 403) {
                return {
                    status: 'permission_denied',
                    error: '스프레드시트 접근 권한이 없습니다. 서비스 계정에 편집 권한을 부여해주세요.'
                };
            }

            // 404 에러는 스프레드시트를 찾을 수 없음
            if ((error as any).code === 404) {
                return {
                    status: 'not_found',
                    error: '스프레드시트를 찾을 수 없습니다. GOOGLE_SPREADSHEET_ID를 확인해주세요.'
                };
            }

            return {
                status: 'error',
                error: error instanceof Error ? error.message : '연결 테스트 실패'
            };
        }
    }

    /**
     * 새 스프레드시트 생성
     */
    async createSpreadsheet(title: string = 'InsightReel 비디오 분석'): Promise<{
        success: boolean;
        spreadsheetId?: string;
        spreadsheetUrl?: string;
        error?: string;
    }> {
        try {
            if (!this.sheets) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    return {
                        success: false,
                        error: authResult.error
                    };
                }
            }

            const resource = {
                properties: {
                    title: title
                },
                sheets: [
                    {
                        properties: {
                            title: 'YOUTUBE',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 20
                            }
                        }
                    },
                    {
                        properties: {
                            title: 'INSTAGRAM',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 20
                            }
                        }
                    },
                    {
                        properties: {
                            title: 'TIKTOK',
                            gridProperties: {
                                rowCount: 1000,
                                columnCount: 20
                            }
                        }
                    }
                ]
            };

            const response = await this.sheets.spreadsheets.create({
                resource,
                fields: 'spreadsheetId'
            });

            const spreadsheetId = response.data.spreadsheetId;
            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

            ServerLogger.success(`새 스프레드시트 생성 완료: ${title} (${spreadsheetId})`);

            return {
                success: true,
                spreadsheetId,
                spreadsheetUrl
            };

        } catch (error) {
            ServerLogger.error('스프레드시트 생성 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '스프레드시트 생성 실패'
            };
        }
    }

    /**
     * 인증된 Sheets 객체 반환
     */
    getSheets(): any {
        return this.sheets;
    }

    /**
     * 현재 스프레드시트 ID 반환
     */
    getSpreadsheetId(): string | null {
        return this.spreadsheetId;
    }

    /**
     * 스프레드시트 ID 설정
     */
    setSpreadsheetId(spreadsheetId: string): void {
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * 인증 상태 확인
     */
    isAuthenticated(): boolean {
        return !!this.sheets;
    }

    /**
     * 인증 정보 검증
     */
    async validateCredentials(): Promise<{
        hasServiceAccount: boolean;
        hasOAuthCredentials: boolean;
        hasOAuthToken: boolean;
        hasSpreadsheetId: boolean;
    }> {
        return {
            hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            hasOAuthCredentials: fs.existsSync(this.credentialsPath),
            hasOAuthToken: fs.existsSync(this.tokenPath),
            hasSpreadsheetId: !!this.spreadsheetId
        };
    }

    /**
     * OAuth 토큰 생성 URL 반환 (OAuth 방식 사용 시)
     */
    generateAuthUrl(): string | null {
        try {
            if (!fs.existsSync(this.credentialsPath)) {
                return null;
            }

            const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            const { client_secret, client_id, redirect_uris } = credentials.installed;

            const oAuth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );

            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/spreadsheets']
            });

            return authUrl;

        } catch (error) {
            ServerLogger.error('OAuth URL 생성 실패:', error);
            return null;
        }
    }

    /**
     * OAuth 토큰 저장 (OAuth 방식 사용 시)
     */
    async saveOAuthToken(code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            const { client_secret, client_id, redirect_uris } = credentials.installed;

            const oAuth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );

            const { tokens } = await oAuth2Client.getToken(code);
            fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));

            ServerLogger.success('OAuth 토큰 저장 완료');
            return { success: true };

        } catch (error) {
            ServerLogger.error('OAuth 토큰 저장 실패:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '토큰 저장 실패'
            };
        }
    }
}

export default GoogleAuthenticator;
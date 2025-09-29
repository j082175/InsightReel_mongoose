import { Request, Response } from 'express';
import { BaseController } from './base/BaseController';
import { ServerLogger } from '../utils/logger';
import ErrorHandler from '../middleware/error-handler';
import { SheetsManager } from '../services/sheets/SheetsManager';

/**
 * 관리자 기능 전용 컨트롤러
 * 책임: 시스템 관리, 헤더 업데이트, 관리자 도구
 */
export class AdminController extends BaseController {

    /**
     * 수동 헤더 업데이트
     */
    updateHeaders = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
        try {
            ServerLogger.info('🔄 수동 헤더 업데이트 요청');

            const sheetsManager = new SheetsManager();

            // 모든 플랫폼 시트의 헤더 포맷팅 강제 업데이트
            const platforms = ['Instagram', 'TikTok', 'YouTube'];
            const results: Array<{ platform: string; success: boolean; error?: string }> = [];

            for (const platform of platforms) {
                try {
                    const result = await sheetsManager.setHeadersForSheet(platform);
                    results.push({
                        platform,
                        success: result.success,
                        error: result.error
                    });
                } catch (error) {
                    results.push({
                        platform,
                        success: false,
                        error: error instanceof Error ? error.message : '헤더 업데이트 실패'
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failedPlatforms = results.filter(r => !r.success);

            if (successCount === platforms.length) {
                ServerLogger.info('✅ 모든 플랫폼 헤더 업데이트 완료');
                res.json({
                    success: true,
                    message: '모든 시트의 헤더가 업데이트되었습니다.',
                    timestamp: new Date().toISOString(),
                    details: results
                });
            } else {
                ServerLogger.warn(`⚠️ 일부 플랫폼 헤더 업데이트 실패: ${failedPlatforms.map(p => p.platform).join(', ')}`);
                res.json({
                    success: false,
                    message: `${successCount}/${platforms.length} 플랫폼 헤더 업데이트 완료`,
                    timestamp: new Date().toISOString(),
                    details: results,
                    errors: failedPlatforms
                });
            }
        } catch (error: any) {
            ServerLogger.error('헤더 업데이트 실패', error, 'ADMIN');
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
}
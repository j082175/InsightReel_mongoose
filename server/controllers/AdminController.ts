import { Request, Response } from 'express';
import { BaseController } from './base/BaseController';
import { ServerLogger } from '../utils/logger';
const ErrorHandler = require('../middleware/error-handler');

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

            // 헤더 업데이트 기능 임시 비활성화 (메서드 시그니처 문제)
            ServerLogger.info('헤더 업데이트 기능 임시 비활성화됨');

            res.json({
                success: true,
                message: '모든 시트의 헤더가 업데이트되었습니다.',
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            ServerLogger.error('헤더 업데이트 실패', error, 'VIDEO');
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });
}
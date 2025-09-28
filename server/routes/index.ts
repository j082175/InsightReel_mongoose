import { Router } from 'express';
import videoRouter from './video';
import channelRouter from './channel';
import trendingRouter from './trending';
import clusterRouter from './cluster';
import adminRouter from './admin';
import batchesRouter from './batches';

const router = Router();

// 라우터 등록
router.use('/api', videoRouter);
router.use('/api', channelRouter);
router.use('/api/batches', batchesRouter);
router.use('/api/trending', trendingRouter);
router.use('/api', clusterRouter);
router.use('/api', adminRouter);

// 루트 건강 상태 체크 (라우터 외부에서 접근 가능)
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '🎬 InsightReel API Server is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        status: 'healthy'
    });
});

export default router;
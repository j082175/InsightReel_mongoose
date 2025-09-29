import { ServerLogger } from '../../../utils/logger';
import { VideoProcessor } from '../../video/VideoProcessor';
import type { VideoMetadata, AnalysisType } from '../../../types/controller-types';
import type { Platform } from '../../../types/video-types';

/**
 * 썸네일 처리 서비스
 * 책임: 썸네일 생성, 프레임 추출, 분석용 이미지 준비
 */
export class ThumbnailProcessingService {
    private videoProcessor: VideoProcessor;

    constructor(videoProcessor: VideoProcessor) {
        this.videoProcessor = videoProcessor;
    }

    /**
     * 썸네일 처리 (비디오 다운로드 실패 시 폴백용)
     * 이 메서드는 비디오 다운로드가 실패했을 때만 호출됩니다.
     */
    async processThumbnails(options: {
        videoPath: string | null;
        videoId: string;
        analysisType: AnalysisType;
        metadata: VideoMetadata;
        platform: Platform;
    }): Promise<string | string[] | null> {
        const { videoPath, videoId, analysisType, metadata, platform } = options;

        ServerLogger.info('2️⃣ 썸네일 처리 시작 (비디오 다운로드 실패 폴백)...');
        const startTime = Date.now();

        try {
            const thumbnailUrl = metadata?.thumbnailUrl || '';

            // 분석 타입 정규화 및 디버깅
            const normalizedAnalysisType = this.normalizeAnalysisType(analysisType);
            ServerLogger.info(`🔍 원본 analysisType: "${analysisType}" → 정규화된 값: "${normalizedAnalysisType}"`);

            const processedThumbnailPath = await this.videoProcessor.processThumbnailMultiFrame(
                thumbnailUrl,
                videoPath || '',
                videoId,
                platform,
                normalizedAnalysisType
            );

            const processingTime = Date.now() - startTime;

            if (processedThumbnailPath) {
                ServerLogger.info(`✅ 썸네일 처리 성공: ${processedThumbnailPath} (소요시간: ${processingTime}ms)`);
            } else {
                ServerLogger.warn(`⚠️ 썸네일 처리 실패 또는 경로 없음 (소요시간: ${processingTime}ms)`);
            }

            return processedThumbnailPath || null;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            ServerLogger.error(`❌ 썸네일 처리 중 오류 (소요시간: ${processingTime}ms):`, error);
            throw error;
        }
    }

    /**
     * 분석 타입 정규화
     */
    private normalizeAnalysisType(analysisType: AnalysisType): 'single' | 'multi-frame' | 'full' {
        // VideoProcessor가 받는 타입으로 변환
        if (analysisType === 'full') return 'full';
        if (analysisType === 'single') return 'single';
        // 나머지는 모두 multi-frame으로 변환
        return 'multi-frame';
    }

    /**
     * 단일 썸네일 생성 (백업용)
     */
    async generateSingleThumbnail(videoPath: string): Promise<string | null> {
        try {
            ServerLogger.info('📸 단일 썸네일 생성 중...');
            const startTime = Date.now();

            const thumbnailResult = await this.videoProcessor.generateThumbnail(videoPath);

            // 결과가 배열이면 첫 번째 요소 사용, 문자열이면 그대로 사용
            const thumbnailPath = Array.isArray(thumbnailResult) ? thumbnailResult[0] : thumbnailResult;

            const processingTime = Date.now() - startTime;
            ServerLogger.info(`✅ 단일 썸네일 생성 완료 (소요시간: ${processingTime}ms): ${thumbnailPath}`);

            return thumbnailPath || null;
        } catch (error) {
            ServerLogger.error('❌ 단일 썸네일 생성 실패:', error);
            return null;
        }
    }

    /**
     * 다중 프레임 추출
     */
    async extractMultipleFrames(videoPath: string, frameCount: number = 5): Promise<string[]> {
        try {
            ServerLogger.info(`🎬 ${frameCount}개 프레임 추출 중...`);
            const startTime = Date.now();

            // TODO: VideoProcessor에 다중 프레임 추출 메서드가 있다면 사용
            // 현재는 단일 썸네일만 지원하므로 임시 구현
            const singleFrame = await this.generateSingleThumbnail(videoPath);
            const frames: string[] = singleFrame ? [singleFrame] : [];

            const processingTime = Date.now() - startTime;
            ServerLogger.info(`✅ ${frames.length}개 프레임 추출 완료 (소요시간: ${processingTime}ms)`);

            return frames;
        } catch (error) {
            ServerLogger.error('❌ 다중 프레임 추출 실패:', error);
            return [];
        }
    }
}
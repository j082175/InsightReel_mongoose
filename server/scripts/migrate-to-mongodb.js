const mongoose = require('mongoose');
const SheetsManager = require('../services/SheetsManager');
const Video = require('../models/VideoModel');
const DatabaseManager = require('../config/database');
const { ServerLogger } = require('../utils/logger');
require('dotenv').config({
    path: require('path').join(__dirname, '../../.env'),
});

class DataMigrator {
    constructor() {
        this.sheetsManager = new SheetsManager();
        this.migrationStats = {
            processed: 0,
            successful: 0,
            failed: 0,
            duplicates: 0,
            errors: [],
        };
    }

    // 🔄 한국어 날짜 파싱 함수 (SheetsManager에서 복사)
    parseKoreanDate(dateStr) {
        if (!dateStr) return new Date();

        try {
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

            const parsedDate = new Date(normalized);
            return isNaN(parsedDate) ? new Date() : parsedDate;
        } catch (error) {
            ServerLogger.error('날짜 파싱 실패', error.message, 'MIGRATION');
            return new Date();
        }
    }

    // 📊 Google Sheets 데이터를 MongoDB Video 형식으로 변환
    transformSheetDataToVideo(sheetRow, platform) {
        try {
            const [
                id,
                timestamp,
                platformCol,
                channelName,
                mainCategory,
                middleCategory,
                fullCategoryPath,
                categoryDepth,
                keywords,
                aiDescription,
                likes,
                commentsCount,
                views,
                duration,
                subscribers,
                channelVideos,
                monetization,
                youtubeCategory,
                license,
                quality,
                language,
                tags,
                youtubeUrl, // W열(23번째) = 실제 YouTube URL
            ] = sheetRow;

            // 기본 비디오 객체 생성
            const videoData = {
                // 기본 정보
                platform: (
                    platform ||
                    platformCol ||
                    'unknown'
                ).toLowerCase(),
                uploadDate: this.parseKoreanDate(timestamp),
                channelName: channelName || 'Unknown',
                title:
                    aiDescription ||
                    categoryDepth ||
                    fullCategoryPath ||
                    '제목 없음', // J열(aiDescription)이 실제 분석내용

                // URL 정보 - W열에서 실제 YouTube URL 사용
                url: youtubeUrl || '', // W열 YouTube URL 사용

                // 성과 지표
                likes: this.parseNumber(likes),
                views: this.parseNumber(views),
                shares: 0, // 기본값
                commentsCount:
                    this.parseNumber(commentsCount),

                // AI 분석 결과
                category: mainCategory || '미분류',
                analysisContent:
                    aiDescription || categoryDepth || '', // J열(분석내용)이 실제 AI 분석 결과
                keywords: this.parseKeywords(keywords), // I열(키워드)

                // 추가 메타데이터
                duration: duration || '',
                hashtags: this.parseHashtags(tags),

                // Google Sheets 원본 데이터 보존
                sheetsRowData: {
                    id,
                    mainCategory,
                    middleCategory,
                    fullCategoryPath,
                    categoryDepth,
                    keywords,
                    aiDescription,
                    subscribers,
                    channelVideos,
                    monetization,
                    youtubeCategory,
                    license,
                    quality,
                    language,
                    tags,
                },
            };

            return videoData;
        } catch (error) {
            ServerLogger.error('데이터 변환 실패', error.message, 'MIGRATION');
            throw error;
        }
    }

    // 🔢 숫자 파싱 유틸리티 (수정된 버전)
    parseNumber(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;

        const str = value.toString().trim();

        // 한국어 단위 처리
        if (str.includes('만')) {
            // "16.1만" → 16.1 * 10000 = 161000
            const numberPart = str.replace(/만.*$/, '').replace(/[^\d.]/g, '');
            const base = parseFloat(numberPart);
            return isNaN(base) ? 0 : Math.floor(base * 10000);
        }

        if (str.includes('천')) {
            // "5.2천" → 5.2 * 1000 = 5200
            const numberPart = str.replace(/천.*$/, '').replace(/[^\d.]/g, '');
            const base = parseFloat(numberPart);
            return isNaN(base) ? 0 : Math.floor(base * 1000);
        }

        if (str.includes('억')) {
            // "1.5억" → 1.5 * 100000000 = 150000000
            const numberPart = str.replace(/억.*$/, '').replace(/[^\d.]/g, '');
            const base = parseFloat(numberPart);
            return isNaN(base) ? 0 : Math.floor(base * 100000000);
        }

        // 일반 숫자 (콤마 제거)
        // "5,392,359" → 5392359
        const cleaned = str.replace(/[,\s]/g, '').replace(/[^\d.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : Math.floor(parsed);
    }

    // 🔤 키워드 파싱
    parseKeywords(keywords) {
        if (!keywords) return [];
        if (Array.isArray(keywords)) return keywords;

        return keywords
            .toString()
            .split(/[,#\s]+/)
            .filter((k) => k.trim().length > 0)
            .map((k) => k.trim());
    }

    // 🏷️ 해시태그 파싱
    parseHashtags(hashtags) {
        if (!hashtags) return [];
        if (Array.isArray(hashtags)) return hashtags;

        return hashtags
            .toString()
            .split(/[,\s]+/)
            .filter((h) => h.trim().length > 0)
            .map((h) => (h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`));
    }

    // 🔍 전체 마이그레이션 실행
    async migrate() {
        try {
            ServerLogger.info(
                '🚀 Google Sheets → MongoDB 마이그레이션 시작',
                'MIGRATION',
            );

            // 1. MongoDB 연결 확인
            if (!DatabaseManager.isConnectedStatus().connected) {
                await DatabaseManager.connect();
            }

            // 2. 플랫폼별 데이터 가져오기
            const platforms = ['instagram', 'youtube', 'tiktok'];

            for (const platform of platforms) {
                ServerLogger.info(
                    `📊 ${platform.toUpperCase()} 데이터 처리 시작`,
                    'MIGRATION',
                );
                await this.migratePlatform(platform);
            }

            // 3. 최종 결과 리포트
            this.printMigrationReport();
        } catch (error) {
            ServerLogger.error(
                '❌ 마이그레이션 전체 실패',
                error.message,
                'MIGRATION',
            );
            throw error;
        }
    }

    // 📱 플랫폼별 마이그레이션
    async migratePlatform(platform) {
        try {
            // Google Sheets에서 플랫폼 데이터 가져오기
            const sheetName = await this.sheetsManager.getSheetNameByPlatform(
                platform,
            );
            const range = `${sheetName}!A2:W`; // 헤더 제외, W열까지 (YouTube URL 포함)

            const response =
                await this.sheetsManager.sheets.spreadsheets.values.get({
                    spreadsheetId: this.sheetsManager.spreadsheetId,
                    range: range,
                });

            const platformData = response.data.values || [];
            ServerLogger.info(
                `📋 ${platform} 시트에서 ${platformData.length}개 행 조회`,
                'MIGRATION',
            );

            // 배치 처리 (한 번에 50개씩)
            const batchSize = 50;
            for (let i = 0; i < platformData.length; i += batchSize) {
                const batch = platformData.slice(i, i + batchSize);
                await this.processBatch(batch, platform, i);

                // 진행 상황 로그
                const progress = Math.min(i + batchSize, platformData.length);
                ServerLogger.info(
                    `⏳ ${platform} 처리 진행: ${progress}/${
                        platformData.length
                    } (${Math.round((progress / platformData.length) * 100)}%)`,
                    'MIGRATION',
                );
            }
        } catch (error) {
            ServerLogger.error(
                `❌ ${platform} 플랫폼 마이그레이션 실패`,
                error.message,
                'MIGRATION',
            );
            this.migrationStats.errors.push(`${platform}: ${error.message}`);
        }
    }

    // 📦 배치 처리
    async processBatch(batch, platform, startIndex) {
        const videoDocuments = [];

        for (let i = 0; i < batch.length; i++) {
            try {
                const rowData = batch[i];
                this.migrationStats.processed++;

                // 데이터 변환
                const videoData = this.transformSheetDataToVideo(
                    rowData,
                    platform,
                );

                // 중복 체크 (account + timestamp + title)
                const existing = await Video.findOne({
                    channelName: videoData.channelName,
                    uploadDate: videoData.uploadDate,
                    title: videoData.title,
                });

                if (existing) {
                    this.migrationStats.duplicates++;
                    ServerLogger.info(
                        `⚠️ 중복 데이터 건너뜀: ${
                            videoData.title
                        }`,
                        'MIGRATION',
                    );
                    continue;
                }

                videoDocuments.push(videoData);
            } catch (error) {
                this.migrationStats.failed++;
                ServerLogger.error(
                    `❌ 행 ${startIndex + i + 2} 처리 실패`,
                    error.message,
                    'MIGRATION',
                );
                this.migrationStats.errors.push(
                    `Row ${startIndex + i + 2}: ${error.message}`,
                );
            }
        }

        // MongoDB에 배치 삽입
        if (videoDocuments.length > 0) {
            try {
                await Video.insertMany(videoDocuments, { ordered: false });
                this.migrationStats.successful += videoDocuments.length;
                ServerLogger.info(
                    `✅ ${videoDocuments.length}개 문서 MongoDB에 삽입 완료`,
                    'MIGRATION',
                );
            } catch (error) {
                // 부분 실패도 처리
                if (error.writeErrors) {
                    const insertedCount =
                        videoDocuments.length - error.writeErrors.length;
                    this.migrationStats.successful += insertedCount;
                    this.migrationStats.failed += error.writeErrors.length;
                    ServerLogger.warn(
                        `⚠️ 배치 부분 삽입: ${insertedCount}개 성공, ${error.writeErrors.length}개 실패`,
                        'MIGRATION',
                    );
                } else {
                    this.migrationStats.failed += videoDocuments.length;
                    ServerLogger.error(
                        `❌ 배치 삽입 실패`,
                        error.message,
                        'MIGRATION',
                    );
                }
            }
        }
    }

    // 📊 마이그레이션 리포트 출력
    printMigrationReport() {
        const stats = this.migrationStats;
        const successRate =
            stats.processed > 0
                ? ((stats.successful / stats.processed) * 100).toFixed(1)
                : 0;

        ServerLogger.info(
            `
🎯 Google Sheets → MongoDB 마이그레이션 완료!

📊 통계:
- 총 처리: ${stats.processed}개
- 성공: ${stats.successful}개 (${successRate}%)
- 실패: ${stats.failed}개
- 중복: ${stats.duplicates}개

${
    stats.errors.length > 0
        ? `❌ 주요 에러: ${stats.errors.slice(0, 5).join(', ')}`
        : '✅ 에러 없음'
}
    `,
            'MIGRATION',
        );

        return stats;
    }
}

// 스크립트 실행 (직접 실행 시)
if (require.main === module) {
    const migrator = new DataMigrator();
    migrator
        .migrate()
        .then(() => {
            ServerLogger.info('🎉 마이그레이션 스크립트 완료!', 'MIGRATION');
            process.exit(0);
        })
        .catch((error) => {
            ServerLogger.error(
                '💥 마이그레이션 스크립트 실패',
                error.message,
                'MIGRATION',
            );
            process.exit(1);
        });
}

module.exports = DataMigrator;

const mongoose = require('mongoose');
const Video = require('../models/VideoModel');
const DatabaseManager = require('../config/database');
const { ServerLogger } = require('../utils/logger');
require('dotenv').config({
    path: require('path').join(__dirname, '../../.env'),
});

async function verifyData() {
    try {
        // MongoDB 연결
        if (!DatabaseManager.isConnectedStatus().connected) {
            await DatabaseManager.connect();
        }

        console.log('\n🔍 MongoDB 데이터 검증 시작...\n');

        // 1. 전체 통계
        const totalCount = await Video.countDocuments();
        console.log(`📊 총 비디오 개수: ${totalCount}`);

        // 2. 플랫폼별 통계
        const platformStats = await Video.aggregate([
            {
                $group: {
                    _id: `$platform`,
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        console.log('\n📱 플랫폼별 통계:');
        platformStats.forEach((stat) => {
            console.log(`  ${stat._id}: ${stat.count}개`);
        });

        // 3. 샘플 데이터 조회 (각 플랫폼에서 2개씩)
        console.log('\n📋 샘플 데이터:');

        for (const platform of ['instagram', 'youtube']) {
            const samples = await Video.find({
                platform: platform,
            })
                .limit(2)
                .select('platform channelName title likes views uploadDate')
                .sort({ uploadDate: -1 });

            console.log(`\n${platform.toUpperCase()} 샘플:`);
            samples.forEach((video, index) => {
                console.log(
                    `  ${index + 1}. ${video.title}`,
                );
                console.log(
                    `     채널이름: ${video.channelName}`,
                );
                console.log(
                    `     좋아요: ${video.likes}, 조회수: ${
                        video.views
                    }`,
                );
                console.log(
                    `     날짜: ${video.uploadDate}`,
                );
            });
        }

        // 4. 데이터 품질 체크
        console.log('\n🔍 데이터 품질 체크:');

        const emptyTitles = await Video.countDocuments({
            title: { $in: ['', null] },
        });
        console.log(`  빈 제목: ${emptyTitles}개`);

        const invalidDates = await Video.countDocuments({
            uploadDate: { $lt: new Date('2020-01-01') },
        });
        console.log(`  잘못된 날짜: ${invalidDates}개`);

        const missingAccounts = await Video.countDocuments({
            channelName: { $in: ['', null, 'Unknown'] },
        });
        console.log(`  채널이름 정보 없음: ${missingAccounts}개`);

        // 5. 성능 지표 분포
        console.log('\n📈 성능 지표 분포:');

        const likesStats = await Video.aggregate([
            {
                $group: {
                    _id: null,
                    avgLikes: { $avg: `$likes` },
                    maxLikes: { $max: `$likes` },
                    minLikes: { $min: `$likes` },
                },
            },
        ]);

        if (likesStats.length > 0) {
            const stats = likesStats[0];
            console.log(
                `  좋아요 - 평균: ${Math.round(stats.avgLikes)}, 최대: ${
                    stats.maxLikes
                }, 최소: ${stats.minLikes}`,
            );
        }

        const viewsStats = await Video.aggregate([
            {
                $group: {
                    _id: null,
                    avgViews: { $avg: `$views` },
                    maxViews: { $max: `$views` },
                    minViews: { $min: `$views` },
                },
            },
        ]);

        if (viewsStats.length > 0) {
            const stats = viewsStats[0];
            console.log(
                `  조회수 - 평균: ${Math.round(stats.avgViews)}, 최대: ${
                    stats.maxViews
                }, 최소: ${stats.minViews}`,
            );
        }

        console.log('\n✅ 데이터 검증 완료!');
        return true;
    } catch (error) {
        console.error('❌ 데이터 검증 실패:', error.message);
        return false;
    }
}

// 스크립트 실행
if (require.main === module) {
    verifyData().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = verifyData;

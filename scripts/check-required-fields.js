const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkRequiredFields() {
    try {
        // MongoDB 연결
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB 연결 성공\n');

        const db = mongoose.connection.db;
        const collection = db.collection('channels');

        // 필수 필드 정의 (channel-types.js에서)
        const requiredFields = ['channelId', 'name', 'platform'];

        // 모든 문서 가져오기
        const allDocs = await collection.find({}).toArray();
        console.log(`📊 총 ${allDocs.length}개 문서 검사\n`);

        // 필수 필드 누락 검사
        let missingFieldsCount = 0;
        const missingDetails = {};

        allDocs.forEach((doc, index) => {
            const missing = [];

            requiredFields.forEach(field => {
                if (!doc[field] || doc[field] === '') {
                    missing.push(field);
                }
            });

            if (missing.length > 0) {
                missingFieldsCount++;
                console.log(`❌ 문서 ${index + 1} (ID: ${doc._id}):`);
                console.log(`   누락된 필수 필드: ${missing.join(', ')}`);
                console.log(`   채널명: ${doc.name || 'N/A'}`);
                console.log(`   채널ID: ${doc.channelId || 'N/A'}`);
                console.log(`   플랫폼: ${doc.platform || 'N/A'}\n`);
            }
        });

        // 각 필드별 충족률 계산
        console.log('📈 === 필수 필드 충족률 ===');
        requiredFields.forEach(field => {
            const filledCount = allDocs.filter(doc => doc[field] && doc[field] !== '').length;
            const percentage = ((filledCount / allDocs.length) * 100).toFixed(1);
            console.log(`${field}: ${filledCount}/${allDocs.length} (${percentage}%)`);
        });

        // 선택적 필드 중 중요한 것들 확인
        console.log('\n📋 === 주요 선택적 필드 현황 ===');
        const optionalFields = [
            'subscribers',
            'totalViews',
            'totalVideos',
            'keywords',
            'aiTags',
            'deepInsightTags',
            'categoryInfo',
            'contentType',      // 누락된 필드
            'last7DaysViews',   // 누락된 필드
            'viewsByPeriod'     // 누락된 필드
        ];

        optionalFields.forEach(field => {
            const existsCount = allDocs.filter(doc => {
                const value = doc[field];
                if (field === 'categoryInfo') {
                    return value && Object.keys(value).length > 0;
                }
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                return value !== undefined && value !== null && value !== '';
            }).length;

            const percentage = ((existsCount / allDocs.length) * 100).toFixed(1);
            const status = existsCount === 0 ? '❌' : existsCount < allDocs.length ? '⚠️' : '✅';
            console.log(`${status} ${field}: ${existsCount}/${allDocs.length} (${percentage}%)`);
        });

        // 결과 요약
        console.log('\n📊 === 결과 요약 ===');
        if (missingFieldsCount === 0) {
            console.log('✅ 모든 문서가 필수 필드를 충족합니다!');
        } else {
            console.log(`⚠️ ${missingFieldsCount}/${allDocs.length}개 문서에 필수 필드 누락`);
        }

    } catch (error) {
        console.error('❌ 에러 발생:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB 연결 종료');
    }
}

checkRequiredFields();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkChannelSchema() {
    try {
        // MongoDB 연결
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB 연결 성공');

        const db = mongoose.connection.db;
        const collection = db.collection('channels');

        // 1. 샘플 문서 가져오기
        const sampleDoc = await collection.findOne();

        if (!sampleDoc) {
            console.log('⚠️ channels 컬렉션이 비어있습니다');
            return;
        }

        console.log('\n📊 === MongoDB 실제 문서 구조 ===');
        console.log('문서 ID:', sampleDoc._id);
        console.log('\n🔑 최상위 필드들:');
        const topLevelFields = Object.keys(sampleDoc).sort();
        topLevelFields.forEach(field => {
            const value = sampleDoc[field];
            const type = Array.isArray(value) ? 'Array' : typeof value;
            console.log(`  - ${field}: ${type}`);
        });

        // 2. channel-types.js 스키마와 비교
        const { createChannelSchema } = require('../server/types/channel-types');
        const schemaDefinition = createChannelSchema();
        const schemaFields = Object.keys(schemaDefinition).sort();

        console.log('\n📋 === channel-types.js 스키마 정의 ===');
        console.log('정의된 필드 개수:', schemaFields.length);

        // 3. 불일치 검사
        console.log('\n🔍 === 스키마 매칭 분석 ===');

        // DB에만 있는 필드
        const dbOnlyFields = topLevelFields.filter(field =>
            !schemaFields.includes(field) && !['_id', '__v', 'createdAt', 'updatedAt'].includes(field)
        );

        // 스키마에만 있는 필드
        const schemaOnlyFields = schemaFields.filter(field =>
            !topLevelFields.includes(field)
        );

        if (dbOnlyFields.length > 0) {
            console.log('\n❌ DB에만 존재하는 필드:');
            dbOnlyFields.forEach(field => {
                console.log(`  - ${field}: ${JSON.stringify(sampleDoc[field]).substring(0, 100)}`);
            });
        }

        if (schemaOnlyFields.length > 0) {
            console.log('\n⚠️ 스키마에만 정의된 필드 (DB에 없음):');
            schemaOnlyFields.forEach(field => {
                console.log(`  - ${field}`);
            });
        }

        // 4. categoryInfo 상세 확인
        if (sampleDoc.categoryInfo) {
            console.log('\n📂 categoryInfo 구조:');
            Object.keys(sampleDoc.categoryInfo).forEach(key => {
                console.log(`  - ${key}: ${typeof sampleDoc.categoryInfo[key]}`);
            });
        }

        // 5. AI 분석 관련 필드 확인
        console.log('\n🤖 AI 분석 필드 상태:');
        const aiFields = ['keywords', 'aiTags', 'deepInsightTags', 'allTags'];
        aiFields.forEach(field => {
            if (sampleDoc[field]) {
                console.log(`  ✅ ${field}: ${Array.isArray(sampleDoc[field]) ? sampleDoc[field].length + '개' : '존재'}`);
            } else {
                console.log(`  ❌ ${field}: 없음`);
            }
        });

        // 6. 매칭 결과
        if (dbOnlyFields.length === 0 && schemaOnlyFields.length === 0) {
            console.log('\n✅ 스키마가 완벽하게 매칭됩니다!');
        } else {
            console.log('\n⚠️ 스키마 불일치 발견 - 수정이 필요합니다');
        }

    } catch (error) {
        console.error('❌ 에러 발생:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB 연결 종료');
    }
}

checkChannelSchema();
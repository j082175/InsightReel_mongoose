const mongoose = require('mongoose');
const VideoUrl = require('../models/VideoUrl');
const { FieldMapper } = require('../types/field-mapper');

/**
 * MongoDB 중복 데이터 검사 스크립트
 */
async function checkDuplicates() {
  try {
    console.log('🔍 MongoDB 중복 데이터 검사 시작...\n');

    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://j082175:z1fBAVVFkNq5QF3X@InsightReel.3htjgex.mongodb.net/?retryWrites=true&w=majority&appName=InsightReel';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공\n');

    // 1. 전체 통계
    const totalCount = await VideoUrl.countDocuments();
    console.log('📊 전체 레코드 수:', totalCount);

    // 2. normalizedUrl별 중복 검사
    const duplicateUrls = await VideoUrl.aggregate([
      {
        $group: {
          _id: '$normalizedUrl',
          count: { $sum: 1 },
          documents: { $push: { id: '$_id', originalUrl: '$originalUrl', status: '$status', createdAt: '$createdAt' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n🔍 중복된 URL 분석:');
    if (duplicateUrls.length === 0) {
      console.log('✅ 중복된 URL 없음 - 데이터 정합성 OK');
    } else {
      console.log(`❌ 중복된 URL 발견: ${duplicateUrls.length}개`);
      
      duplicateUrls.forEach((duplicate, index) => {
        console.log(`\n${index + 1}. 중복 URL: ${duplicate._id}`);
        console.log(`   중복 개수: ${duplicate.count}개`);
        duplicate.documents.forEach((doc, idx) => {
          console.log(`   - [${idx + 1}] ID: ${doc.id}, 상태: ${doc.status}, 생성: ${new Date(doc.createdAt).toLocaleString()}`);
          console.log(`     원본 URL: ${doc.originalUrl}`);
        });
      });
    }

    // 3. 플랫폼별 통계
    const platformStats = await VideoUrl.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 플랫폼별 통계:');
    platformStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}개 (최신: ${new Date(stat.latest).toLocaleString()})`);
    });

    // 4. 상태별 통계
    const statusStats = await VideoUrl.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 상태별 통계:');
    statusStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}개 (최신: ${new Date(stat.latest).toLocaleString()})`);
    });

    // 5. 오래된 processing 상태 체크 (10분 이상)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const staleProcessing = await VideoUrl.find({
      status: 'processing',
      createdAt: { $lt: tenMinutesAgo }
    }).lean();

    console.log('\n⏰ 오래된 processing 상태:');
    if (staleProcessing.length === 0) {
      console.log('✅ 오래된 processing 레코드 없음');
    } else {
      console.log(`⚠️ 10분 이상된 processing 레코드: ${staleProcessing.length}개`);
      staleProcessing.forEach((record, index) => {
        const elapsed = Math.floor((Date.now() - new Date(record.createdAt)) / 1000 / 60);
        console.log(`   ${index + 1}. ${record.originalUrl} (${elapsed}분 전)`);
      });
    }

    // 6. 인덱스 상태 확인
    const indexes = await VideoUrl.collection.getIndexes();
    console.log('\n🗂️ 인덱스 상태:');
    Object.keys(indexes).forEach(indexName => {
      const indexSpec = indexes[indexName];
      console.log(`   ${indexName}:`, JSON.stringify(indexSpec));
    });

    console.log('\n✅ MongoDB 중복 데이터 검사 완료');

  } catch (error) {
    console.error('❌ 검사 실패:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
checkDuplicates();
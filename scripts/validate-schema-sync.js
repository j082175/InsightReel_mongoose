/**
 * 백엔드 스키마 ↔ 프론트엔드 타입 동기화 검증 스크립트
 * publishedAt 누락 같은 문제를 사전에 방지
 */

const fs = require('fs');
const path = require('path');

// 색상 출력을 위한 간단한 유틸리티
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

/**
 * 백엔드 스키마에서 필드 추출
 */
function extractBackendFields() {
  try {
    // channel-types.js에서 스키마 정의 읽기
    const { createChannelSchema } = require('../server/types/channel-types');
    const schema = createChannelSchema();

    const fields = new Set();

    // 스키마 객체를 순회하며 필드 추출
    function extractFields(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object') {
          // 중첩 객체인 경우
          if (value.type || value.required !== undefined) {
            // Mongoose 스키마 필드 정의
            fields.add(fieldPath);
          } else if (Array.isArray(value)) {
            // 배열인 경우 스킵 (복잡도 때문에)
            fields.add(fieldPath);
          } else {
            // 중첩 객체 계속 탐색
            extractFields(value, fieldPath);
          }
        }
      }
    }

    extractFields(schema);


    return Array.from(fields).sort();
  } catch (error) {
    console.error(colors.red('❌ 백엔드 스키마 읽기 실패:'), error.message);
    return [];
  }
}

/**
 * 프론트엔드 타입에서 필드 추출 (extends 구조 처리)
 */
function extractFrontendFields() {
  try {
    const channelTypePath = path.join(__dirname, '../frontend/src/shared/types/channel.ts');
    const content = fs.readFileSync(channelTypePath, 'utf8');

    const fields = new Set();

    // 중첩 객체 내부까지 파싱하는 함수
    function parseInterfaceContent(content, prefix = '') {
      // 단순 필드 매칭 (nested object 제외)
      const simpleFieldMatches = content.match(/^\s*(\w+)\??\s*:\s*(?!{)[^;{]+;/gm);
      if (simpleFieldMatches) {
        simpleFieldMatches.forEach(fieldMatch => {
          const fieldName = fieldMatch.trim().split(/[?:]/)[0].trim();
          if (fieldName && !['export', 'interface', 'extends'].includes(fieldName)) {
            const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
            fields.add(fullFieldName);
          }
        });
      }

      // 중첩 객체 필드 매칭
      const nestedObjectMatches = content.match(/^\s*(\w+)\??\s*:\s*{([^}]*)}/gm);
      if (nestedObjectMatches) {
        nestedObjectMatches.forEach(match => {
          const objName = match.match(/^\s*(\w+)\??/)[1];
          const objContent = match.match(/{([^}]*)}/s)[1];
          parseInterfaceContent(objContent, prefix ? `${prefix}.${objName}` : objName);
        });
      }
    }

    // 전체 파일에서 필드 파싱 (인터페이스 구분 없이)
    parseInterfaceContent(content);


    return Array.from(fields).sort();
  } catch (error) {
    console.error(colors.red('❌ 프론트엔드 타입 읽기 실패:'), error.message);
    return [];
  }
}

/**
 * 핵심 필드들 정의 (반드시 양쪽에 있어야 하는 필드들)
 * 백엔드 스키마 기준으로 정의 (id는 MongoDB에서 자동 변환)
 */
const CRITICAL_FIELDS = [
  'name',
  'url',
  'platform',
  'subscribers',
  'totalViews',
  'totalVideos',
  'publishedAt',  // 오늘 문제가 된 필드!
  'createdAt',
  'updatedAt'
];

// 프론트엔드에만 있어야 하는 특별한 필드들
const FRONTEND_ONLY_FIELDS = [
  'id'  // MongoDB _id가 변환됨
];

/**
 * 필드 비교 및 검증
 */
function validateFields() {
  console.log(colors.blue('🔍 스키마 동기화 검증 시작...\n'));

  const backendFields = extractBackendFields();
  const frontendFields = extractFrontendFields();

  console.log(`📋 백엔드 스키마 필드: ${backendFields.length}개`);
  console.log(`📋 프론트엔드 타입 필드: ${frontendFields.length}개\n`);

  // 핵심 필드들 검증
  const missingInBackend = [];
  const missingInFrontend = [];

  CRITICAL_FIELDS.forEach(field => {
    if (!backendFields.includes(field)) {
      missingInBackend.push(field);
    }
    if (!frontendFields.includes(field)) {
      missingInFrontend.push(field);
    }
  });

  // 프론트엔드 전용 필드 검증
  FRONTEND_ONLY_FIELDS.forEach(field => {
    if (!frontendFields.includes(field)) {
      missingInFrontend.push(field + ' (프론트엔드 전용)');
    }
  });

  // 결과 출력
  let hasErrors = false;

  if (missingInBackend.length > 0) {
    hasErrors = true;
    console.error(colors.red('❌ 백엔드 스키마에서 누락된 핵심 필드들:'));
    missingInBackend.forEach(field => {
      console.error(`   - ${field}`);
    });
    console.log();
  }

  if (missingInFrontend.length > 0) {
    hasErrors = true;
    console.error(colors.red('❌ 프론트엔드 타입에서 누락된 핵심 필드들:'));
    missingInFrontend.forEach(field => {
      console.error(`   - ${field}`);
    });
    console.log();
  }

  if (!hasErrors) {
    console.log(colors.green('✅ 모든 핵심 필드가 동기화되어 있습니다!'));

    // 상세 정보 출력 (옵션)
    if (process.argv.includes('--verbose')) {
      console.log('\n📝 백엔드 필드 목록:');
      backendFields.forEach(field => console.log(`   - ${field}`));

      console.log('\n📝 프론트엔드 필드 목록:');
      frontendFields.forEach(field => console.log(`   - ${field}`));
    }
  } else {
    // 에러 발생 시에도 상세 정보 출력
    console.log('\n📝 백엔드 필드 목록:');
    backendFields.forEach(field => console.log(`   - ${field}`));

    console.log('\n📝 프론트엔드 필드 목록:');
    frontendFields.forEach(field => console.log(`   - ${field}`));
    console.error(colors.red('\n💥 스키마 동기화 문제 발견!'));
    console.log(colors.yellow('🔧 해결 방법:'));
    console.log('   1. 누락된 필드를 해당 파일에 추가하세요');
    console.log('   2. server/types/channel-types.js (백엔드)');
    console.log('   3. frontend/src/shared/types/channel.ts (프론트엔드)');

    process.exit(1);
  }
}

/**
 * 메인 실행
 */
if (require.main === module) {
  try {
    validateFields();
  } catch (error) {
    console.error(colors.red('💥 검증 스크립트 실행 실패:'), error.message);
    process.exit(1);
  }
}

module.exports = { validateFields, extractBackendFields, extractFrontendFields };
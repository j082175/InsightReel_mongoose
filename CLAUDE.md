# CLAUDE.md - InsightReel 프로젝트 가이드

## 🚨 **CRITICAL: FieldMapper 표준화 필수 규칙**

### **❗ 절대 규칙 (위반 시 시스템 오류 발생)**
1. **항상 FieldMapper 사용할 것**: 모든 데이터베이스 필드 접근은 `FieldMapper.get('FIELD_NAME')` 사용 필수
2. **레거시 호환성 하지 말 것**: `|| metadata.channelName` 같은 fallback 패턴 절대 사용 금지
3. **절대 하드코딩 하지 말 것**: `channelName:`, `subscribers:`, `views:` 등 직접 필드명 사용 금지 (매직넘버도 포함됨)
4. **중간 인터페이스 금지**: LocalChannel, TransformedVideo 등 중간 변환 인터페이스 생성 금지

### **✅ 올바른 패턴:**

**백엔드 (server/):**
```javascript
// ✅ 항상 이렇게
[FieldMapper.get('CHANNEL_NAME')]: value
metadata[FieldMapper.get('LIKES')] || 0

// ❌ 절대 이렇게 하지 말 것
channelName: value
metadata[FieldMapper.get('LIKES')] || metadata.likes || 0
```

**프론트엔드 (frontend/):**
```typescript
// ✅ 항상 이렇게 (TypeScript 타입 안전)
const channelName = FieldMapper.getTypedField<string>(video, 'CHANNEL_NAME');
const views = FieldMapper.getTypedField<number>(video, 'VIEWS') || 0;

// ✅ 객체 설정 시
FieldMapper.setTypedField(videoData, 'TITLE', titleValue);

// ✅ UI에서 직접 사용 (중간 변환 없이)
{FieldMapper.getTypedField<string>(channel, 'CHANNEL_NAME')}
{FieldMapper.getTypedField<string>(video, 'PLATFORM')}

// ❌ 절대 이렇게 하지 말 것
video.channelName
video.views || 0
videoData.title = titleValue

// ❌ 중간 인터페이스 생성 금지
interface LocalChannel { name: string; platform: string; }
const transformedChannel: LocalChannel = { name: ch.name, platform: ch.platform };
transformedChannel.name // 이후 직접 접근
```

### **🎉 표준화 완료 현황:**
- ✅ **백엔드 (server/)**: 100% FieldMapper 표준화 완료
- ✅ **프론트엔드 (frontend/)**: 100% FieldMapper 표준화 완료 (2025-01-14)
- ✅ **Chrome 확장 (extension/)**: FieldMapper 적용 완료

---

## 🎯 프로젝트 개요
이 프로젝트는 소셜미디어(Instagram, TikTok 등) 비디오를 자동으로 다운로드하고, AI를 통해 분석한 후 Google Sheets에 저장하는 시스템입니다.

## 🏗️ 프로젝트 구조
```
InsightReel/
├── server/               # 백엔드 서버 (Express)
├── extension/            # Chrome 확장 프로그램
├── prototype/            # 대시보드 (HTML & React)
├── scripts/              # 유틸리티 스크립트
├── tests/                # 테스트 코드
└── downloads/            # 비디오 저장소
```

## 💻 주요 명령어
```bash
# 개발 서버 실행 (nodemon - 자동 재시작)
npm run dev

# 프로덕션 서버 실행
npm start

# 테스트 실행
npm test               # 모든 테스트
npm run test:unit      # 단위 테스트만
npm run test:watch     # 파일 변경 감지 모드
npm run test:coverage  # 코드 커버리지 포함
```

## 🔧 개발 시 주의사항

### 1. 외부 의존성
- **Gemini API**: Google API 키 필요
- **FFmpeg**: 시스템에 설치되어 있어야 함
- **Google Sheets API**: 인증 토큰 또는 서비스 계정 키 필요

### 2. 환경 변수 (.env)
```bash
# AI 설정 (Gemini)
USE_GEMINI=true
GOOGLE_API_KEY=your-gemini-key
USE_GEMINI_FLASH_LITE=true  # Gemini 2.5 Flash Lite 모델 사용

# 동적 카테고리 시스템
USE_DYNAMIC_CATEGORIES=true

# 자가 학습 카테고리 시스템 (일관성 개선)
USE_SELF_LEARNING_CATEGORIES=true

# Google Sheets
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# MongoDB
MONGODB_URI=mongodb://localhost:27017/InsightReel

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# 서버 설정
PORT=3000
```

### 3. 플랫폼별 설정
- **YouTube**: 15개 카테고리 체계
- **TikTok/Instagram**: 12개 카테고리 체계
- **한글 처리**: 형태소 분석 지원

## 📝 코딩 컨벤션

### 1. 일반 규칙
- **주석**: 한글 사용 권장
- **에러 처리**: try-catch 블록 일관되게 사용
- **로깅**: ServerLogger 사용 (console.log 직접 사용 금지)
- **성능 측정**: PerformanceLogger 클래스 활용
- **비동기**: async/await 패턴 사용

### 🚨 **TypeScript 필수 준수 규칙 (절대 금지 사항)**

#### **❌ 절대 사용 금지**
0. as 패턴 사용하지 말 것! (꼭 보고 실천하거라 클로드코드야)

1. **`any` 타입 사용**: 타입 안전성 완전 포기
   ```typescript
   // ❌ 절대 금지
   const data: any = fetchData();
   
   // ✅ 구체적 타입 정의
   interface ApiData { id: number; name: string; }
   const data: ApiData = fetchData();
   ```

2. **`@ts-ignore` 사용**: 타입 에러 숨기기
   ```typescript
   // ❌ 절대 금지
   // @ts-ignore
   const result = someFunction();
   
   // ✅ 타입 단언 또는 가드 사용
   const result = someFunction() as ExpectedType;
   ```

3. **Non-null assertion (`!`) 남용**: undefined/null 에러 위험
   ```typescript
   // ❌ 위험한 사용
   const user = getUser()!.name!;
   
   // ✅ 안전한 체크
   const user = getUser();
   const name = user?.name ?? 'Unknown';
   ```

4. **빈 인터페이스나 `Function` 타입**: 너무 광범위한 타입
   ```typescript
   // ❌ 의미 없는 타입
   interface EmptyInterface {}
   const callback: Function = () => {};
   
   // ✅ 구체적 타입
   interface UserData { id: number; name: string; }
   const callback: (id: number) => string = (id) => `User ${id}`;
   ```

#### **✅ 필수 사용 패턴**
1. **구체적 타입 정의**: 모든 데이터에 명확한 타입
2. **타입 가드 활용**: Union 타입 안전 처리
3. **적절한 타입 단언**: `as unknown as TargetType` 패턴
4. **제네릭 활용**: 재사용 가능한 타입 안전 코드

#### **🎯 프로젝트 특수 사항**
- **우리 프로젝트는 예외 없음**: 새 프로젝트 + 명확한 도메인
- **FieldMapper와 연계**: 타입 안전한 필드 접근 필수
- **API 응답 타입 정의**: 백엔드 응답 구조 명시적 타입화
- **직접 FieldMapper 사용**: 중간 변환층 없이 UI에서 바로 FieldMapper 호출

#### **💡 아키텍처 원칙**
```typescript
// ✅ 권장: 단일 레이어 아키텍처
API Data → FieldMapper → UI 직접 사용

// ❌ 금지: 다중 레이어 아키텍처  
API Data → FieldMapper → LocalInterface → 직접 접근 → UI
```

**이유**: 
- 일관성 유지 (모든 필드 접근이 FieldMapper를 통함)
- 유지보수성 향상 (필드명 변경 시 FieldMapper만 수정)
- 타입 안전성 보장 (컴파일 타임 체크)

### 2. TypeScript 컴파일러 설정
```json
// tsconfig.json 필수 설정
{
  "compilerOptions": {
    "strict": true,              // 모든 strict 검사 활성화
    "noImplicitAny": true,      // any 추론 금지
    "strictNullChecks": true,   // null/undefined 엄격 체크
    "noImplicitReturns": true,  // 모든 경로에서 return 필수
    "noUnusedLocals": true,     // 사용하지 않는 변수 금지
    "noUnusedParameters": true  // 사용하지 않는 매개변수 경고
  }
}
```

### 3. 필수 구현 패턴

#### **에러 처리 표준**
```javascript
// ✅ 올바른 에러 처리
try {
    await processVideo(videoData);
} catch (error) {
    ServerLogger.error('비디오 처리 실패', {
        videoId: videoData.id,
        platform: videoData.platform,
        error: error.message
    });
    throw new Error(`비디오 처리 실패: ${error.message}`);
}
```

#### **성능 측정 필수**
```javascript
// ✅ 핵심 작업 시 성능 측정
const startTime = performance.now();
const result = await heavyOperation();
PerformanceLogger.log('operation_name', performance.now() - startTime);
```

#### **보안 검증 필수**
```javascript
// ✅ 파일 업로드 시
const allowedTypes = ['video/mp4', 'image/jpeg'];
if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('허용되지 않은 파일 형식');
}

// ✅ URL 검증 시  
const allowedHosts = ['youtube.com', 'instagram.com', 'tiktok.com'];
if (!allowedHosts.some(host => url.includes(host))) {
    throw new Error('허용되지 않은 도메인');
}
```

### 3. 테스트 작성
- 새 기능 추가 시 반드시 테스트 작성
- Mock을 활용한 외부 의존성 격리
- 테스트 설명은 한글로 작성
- `tests/` 폴더 사용, `*.test.js` 형식

### 4. 파일 명명
- 서비스 클래스: PascalCase (예: AIAnalyzer.js)
- 유틸리티: camelCase (예: logger.js)
- 테스트: [대상파일명].test.js

## 📡 API 엔드포인트

### 헬스 체크
- `GET /health` - 서버 상태 확인
- `GET /api/stats` - 통계 정보 조회
- `GET /api/config/health` - 설정 상태 확인

### YouTube 트렌딩 시스템
- `POST /api/collect-trending` - 채널별 트렌딩 영상 수집
- `GET /api/trending-stats` - 트렌딩 수집 통계 조회
- `GET /api/quota-status` - YouTube API 할당량 현황

### 외부 서비스 테스트
- `GET /api/test-sheets` - Google Sheets 연결 테스트

### 비디오 처리
- `POST /api/process-video` - URL로 비디오 처리
- `POST /api/process-video-blob` - Blob 파일로 비디오 처리
- `POST /api/upload` - 파일 업로드

### 데이터 조회
- `GET /api/videos` - 저장된 비디오 목록 조회
- `GET /api/self-learning/stats` - 자가 학습 카테고리 시스템 통계 조회

## 🚀 자주 사용하는 작업

### 대시보드 실행
```bash
cd prototype
npx http-server . -p 8081 --cors
# http://localhost:8081/dashboard.html
```

### 비디오 처리 흐름
1. URL 수신 → 2. 비디오 다운로드 → 3. 썸네일 생성 → 4. AI 분석 → 5. Google Sheets 저장

## 🚀 배포 및 운영 가이드

### 배포 전 필수 체크리스트
- [ ] `npm test` 모든 테스트 통과
- [ ] 환경 변수(.env) 설정 확인
- [ ] Google Sheets API 연결 테스트
- [ ] MongoDB 연결 상태 확인
- [ ] FFmpeg 설치 및 경로 확인

### 모니터링 대시보드
```bash
# 시스템 상태 실시간 확인
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/config/health
```

### 문제 해결 가이드
- **비디오 다운로드 실패**: FFmpeg 경로 및 권한 확인
- **AI 분석 오류**: Gemini API 키 및 할당량 확인  
- **Sheets 저장 실패**: 서비스 계정 권한 확인
- **메모리 부족**: 대용량 파일 스트림 처리 확인

---
**Last Updated**: 2025-09-10 (FieldMapper 표준화 + 운영 가이드 완료)
**Maintainer**: JUNSOOCHO
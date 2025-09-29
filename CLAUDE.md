# CLAUDE.md - InsightReel 프로젝트 가이드

---

## 🚨 **Claude Code 필독 요약 (코딩 전 필수 확인!)**

### **절대 지켜야 할 핵심 규칙들** ⚠️

1. **필드명 중복 절대 금지** 🚫
   - `videoId`, `viewCount`, `thumbnail` 같은 중복 필드 생성 금지
   - 오직 `_id`, `views`, `thumbnailUrl` 표준 필드만 사용
   - MongoDB `_id` 필드 모든 계층에서 유지 (변환 없음)

2. **상수 시스템 필수 사용** 📝
   ```bash
   server/config/api-messages.js     # HTTP 상태, 에러 코드, 플랫폼 상수
   server/config/constants.js        # 서버 설정 상수
   frontend/src/shared/config/       # 프론트엔드 상수
   ```

3. **파일 크기 제한** 📏
   - 새 파일 생성 시: 최대 500줄

4. **VideoStore 패턴 필수 사용** 🎯
   - 비디오 관련 상태 관리를 중앙화
   - 개별 useState 남발 금지

5. **추측 금지 - 반드시 코드 확인 먼저** ⚠️
   - 기술적 질문에 대해서는 **추측으로 답변 절대 금지**
   - 반드시 Read/Grep/Glob 도구로 실제 코드 확인 후 답변
   - "확실해?" 질문 받기 전에 미리 코드 검증 완료할 것
   - 불확실한 내용은 "코드 확인 후 답변드리겠습니다" 명시

### **💡 코딩 전 체크리스트**
- [ ] 중복 필드 생성하지 않았나?
- [ ] 상수 대신 하드코딩 하지 않았나?
- [ ] **FSD 구조**를 따르고 있나?
- [ ] **VideoStore 패턴** 사용했나?
- [ ] **방어적 프로그래밍** 적용했나?
- [ ] **추측 없이 코드 확인**했나?

---

## 🎯 프로젝트 개요
YouTube/Instagram/TikTok 비디오를 자동으로 다운로드하고 AI(Gemini)로 분석 후 Google Sheets에 저장하는 시스템

### 🏗️ **기술 스택**
**Backend:**
- Node.js/Express 서버
- Mongoose 8.18.0 (MongoDB ORM)
- MongoDB Atlas 클라우드 DB

**Frontend:**
- Vite 5.0.8 (빌드 도구)
- React + TypeScript 5.2.2
- TailwindCSS + Framer Motion

**개발 도구:**
- Jest + React Testing Library
- ESLint + Prettier
- Storybook 문서화

### 🚀 **개발 서버**
```bash
# Backend (포트 3000)
npm run dev

# Frontend (포트 8000)
cd frontend && npm run dev

# Storybook (포트 6006)
cd frontend && npm run storybook
```

### ⚠️ **현재 알려진 이슈**
1. **TypeScript**: 일부 타입 에러 존재 (빌드 가능하지만 개선 필요)
2. **Jest 테스트**: ESM 호환성 문제로 실행 불가
3. **성능 최적화**: react-window 가상화 시스템 적용됨

---

## 📝 코딩 규칙

### **필드명 완전 통일 규칙** 🎯
```javascript
// ✅ 올바른 Video 엔티티 구조
{
  _id: "video123",         // MongoDB _id 필드 유지
  title: "영상 제목",
  views: 1000,            // 단일 조회수 필드
  thumbnailUrl: "url",    // 단일 썸네일 필드
  uploadDate: "2024-01-01"
}

// ❌ 중복 필드 생성 금지
{
  id: "123", videoId: "123",        // 중복!
  views: 1000, viewCount: 1000,     // 중복!
  thumbnailUrl: "url", thumbnail: "url"  // 중복!
}
```

### **FSD 아키텍처** 🏗️
```
frontend/src/
├── app/           # 앱 설정 (providers, routing)
├── pages/         # 페이지 컴포넌트
├── features/      # 기능별 모듈
│   ├── video-management/
│   ├── channel-management/
│   └── trending-collection/
└── shared/        # 공통 요소
    ├── components/
    ├── hooks/
    └── utils/
```

## 🚀 **주요 기능**

### **채널 그룹 기반 트렌딩 수집**
- 채널들을 그룹으로 묶어 관리
- 조건별 트렌딩 수집 (최근 n일, n만 조회수 이상)
- SHORT/MID/LONG 영상 길이 분류

### **클러스터 분석 시스템**
- 채널 유사도 분석
- 키워드 자동 추출
- 카테고리 분류

### **API 엔드포인트**
```bash
# 비디오 처리
POST /api/process-video       # URL로 비디오 처리
GET /api/videos              # 비디오 목록

# 채널 관리
POST /api/channel-groups     # 그룹 생성
GET /api/channel-groups      # 그룹 목록

# 트렌딩 수집
POST /api/collect-trending   # 트렌딩 수집
GET /api/trending/videos     # 수집된 영상

# 클러스터 분석
POST /api/cluster/analyze    # 클러스터 분석
GET /api/cluster/channels    # 클러스터 결과
```

### **공통 유틸리티**
```typescript
// 포맷팅 함수
import { formatViews, formatDate } from '../shared/utils/formatters';
formatViews(1000) // "1천"
formatDate("2024-01-01") // "1월 1일"

// 플랫폼 스타일
import { getPlatformStyle } from '../shared/utils/platformStyles';
getPlatformStyle("YOUTUBE") // 빨간색 그라데이션
```

## ⚠️ **외부 의존성**
- **Gemini API**: Google API 키 필요
- **MongoDB Atlas**: 클라우드 데이터베이스
- **Google Sheets API**: 서비스 계정 키 필요

## 🔑 **API 키 관리**
- **ApiKeyManager**: 중앙집중식 API 키 관리 시스템
- **파일 위치**: `data/api-keys.json`
- **자동 로드밸런싱**: 3개 활성 Gemini API 키 관리
- **사용량 추적**: 키별 할당량 모니터링

```javascript
// ✅ 올바른 사용법
const apiKeyManager = require('./services/ApiKeyManager');
const activeKeys = await apiKeyManager.getActiveApiKeys();
```

## 📊 **데이터베이스 스키마**

### **Video 스키마**
```javascript
{
  _id: ObjectId,           // MongoDB 문서 ID
  title: String,           // 영상 제목
  views: Number,           // 조회수
  thumbnailUrl: String,    // 썸네일 URL
  platform: String,       // YOUTUBE/INSTAGRAM/TIKTOK
  channelName: String,     // 채널명
  uploadDate: String       // 업로드 날짜
}
```

### **Channel 스키마**
```javascript
{
  _id: ObjectId,           // MongoDB 문서 ID
  channelId: String,       // 플랫폼별 채널 ID (UC123abc)
  name: String,            // 채널명
  subscribers: Number,     // 구독자 수
  platform: String,       // 플랫폼
  categoryInfo: {          // AI 분석 카테고리
    majorCategory: String,
    middleCategory: String,
    subCategory: String
  }
}
```

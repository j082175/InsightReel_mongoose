# CLAUDE.md - 영상자동저장분석기 프로젝트 가이드

## 🎯 프로젝트 개요
이 프로젝트는 소셜미디어(Instagram, TikTok 등) 비디오를 자동으로 다운로드하고, AI를 통해 분석한 후 Google Sheets에 저장하는 시스템입니다.

## 🏗️ 프로젝트 구조
```
영상자동저장분석기/
├── server/                    # 백엔드 서버
│   ├── index.js              # Express 서버 메인 파일
│   ├── config/               # 설정 관리
│   │   └── config-validator.js # 환경 설정 검증
│   ├── controllers/          # API 컨트롤러
│   ├── middleware/           # Express 미들웨어
│   ├── services/             # 핵심 서비스 로직
│   │   ├── AIAnalyzer.js    # AI 분석 (Ollama/Gemini)
│   │   ├── VideoProcessor.js # 비디오 다운로드 및 썸네일 생성
│   │   └── SheetsManager.js  # Google Sheets 연동
│   └── utils/
│       └── logger.js         # 로깅 유틸리티
├── extension/                # Chrome 확장 프로그램
│   ├── background/          # 백그라운드 스크립트
│   ├── content/             # 컨텐츠 스크립트
│   ├── popup/               # 팝업 UI
│   ├── icons/               # 확장 프로그램 아이콘
│   └── manifest.json        # 확장 프로그램 설정
├── tests/                    # 테스트 코드
│   ├── unit/                # 단위 테스트
│   ├── integration/         # 통합 테스트
│   └── setup.js             # 테스트 환경 설정
├── downloads/               # 다운로드된 비디오 저장
└── coverage/                # 테스트 커버리지 리포트
```

## 💻 주요 명령어
```bash
# 개발 서버 실행
npm run dev

# 테스트 실행
npm test               # 모든 테스트
npm run test:unit      # 단위 테스트만
npm run test:watch     # 파일 변경 감지 모드
npm run test:coverage  # 코드 커버리지 포함

# 프로덕션 실행
node server/index.js
```

## 🔧 개발 시 주의사항

### 1. 외부 의존성
- **Ollama**: 로컬에서 실행 중이어야 함 (http://localhost:11434)
- **FFmpeg**: 시스템에 설치되어 있어야 함
- **Google Sheets API**: 인증 토큰 또는 서비스 계정 키 필요

### 2. 환경 변수 (.env)
```bash
# AI 설정
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llava:latest
USE_GEMINI=false
GOOGLE_API_KEY=your-gemini-key

# Google Sheets
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 서버 설정
PORT=3000
```

### 3. 한국어 처리
- **카테고리 분류**: 한국어 카테고리 체계 사용 (게임, 라이프·블로그 등)
- **키워드 추출**: 한글 형태소 분석 포함
- **에러 메시지**: 한글로 작성

## 📝 코딩 컨벤션

### 1. 일반 규칙
- **주석**: 한글 사용 권장
- **에러 처리**: try-catch 블록 일관되게 사용
- **로깅**: ServerLogger 사용 (console.log 직접 사용 금지)
- **비동기**: async/await 패턴 사용

### 2. 테스트 작성
- 새 기능 추가 시 반드시 테스트 작성
- Mock을 활용한 외부 의존성 격리
- 테스트 설명은 한글로 작성

### 3. 파일 명명
- 서비스 클래스: PascalCase (예: AIAnalyzer.js)
- 유틸리티: camelCase (예: logger.js)
- 테스트: [대상파일명].test.js

## 📡 API 엔드포인트

### 헬스 체크
- `GET /health` - 서버 상태 확인
- `GET /api/stats` - 통계 정보 조회
- `GET /api/config/health` - 설정 상태 확인

### 외부 서비스 테스트
- `GET /api/test-ollama` - Ollama 연결 테스트
- `GET /api/test-sheets` - Google Sheets 연결 테스트

### 비디오 처리
- `POST /api/process-video` - URL로 비디오 처리
- `POST /api/process-video-blob` - Blob 파일로 비디오 처리
- `POST /api/upload` - 파일 업로드

### 데이터 조회
- `GET /api/videos` - 저장된 비디오 목록 조회

## 🚀 자주 사용하는 작업

### 1. 새로운 비디오 처리 흐름
1. 클라이언트에서 URL 전송
2. VideoProcessor가 비디오 다운로드
3. 썸네일 생성 (FFmpeg)
4. AIAnalyzer가 이미지 분석
5. 카테고리 및 키워드 추출
6. SheetsManager가 Google Sheets에 저장

### 2. 에러 디버깅
```bash
# Ollama 상태 확인
curl http://localhost:11434/api/tags

# API 헬스 체크
curl http://localhost:3000/health

# Google Sheets 연결 테스트
curl http://localhost:3000/api/test-sheets

# Ollama 연결 테스트
curl http://localhost:3000/api/test-ollama
```

### 3. 테스트 실패 시
- Mock 설정 확인 (특히 외부 API)
- 환경 변수 설정 확인
- 비동기 처리 타이밍 문제 체크

## 🎨 Chrome 확장 프로그램 가이드라인

### 1. 구성 요소
- **Background Script**: 백그라운드에서 API 통신 처리
- **Content Script**: Instagram/TikTok 페이지에 주입되어 동작
- **Popup UI**: 확장 프로그램 아이콘 클릭 시 표시되는 UI

### 2. 주요 기능
- Instagram/TikTok 페이지에서만 활성화
- 원클릭 다운로드 지원
- 진행 상태 실시간 표시

## 📊 성능 최적화 포인트

### 1. 비디오 처리
- 대용량 파일 스트림 처리
- 동시 다운로드 제한 (최대 3개)
- 썸네일 생성 시 해상도 최적화

### 2. AI 분석
- 이미지 압축 후 전송
- 캐싱 활용 (동일 URL)
- 배치 처리 고려

### 3. Google Sheets
- 배치 업데이트 사용
- 필요한 범위만 조회
- 통계는 별도 시트에 캐싱

## 🐛 알려진 이슈 및 해결법

### 1. Blob URL 처리
- 문제: 브라우저 메모리의 Blob URL은 서버에서 직접 접근 불가
- 해결: 클라이언트에서 파일로 변환 후 전송

### 2. FFmpeg 프로세스 에러
- 문제: Windows에서 FFmpeg 경로 문제
- 해결: 환경 변수 PATH에 FFmpeg 추가 또는 절대 경로 사용

### 3. Google Sheets API 할당량
- 문제: 분당 요청 제한 초과
- 해결: 요청 간 딜레이 추가, 배치 처리 활용

## 🔄 향후 개선 사항
1. **테스트 커버리지 확대** (현재 27.6% → 목표 70%)
2. **에러 복구 메커니즘** 강화
3. **실시간 진행 상황** WebSocket 구현
4. **멀티 플랫폼 지원** 확대 (YouTube, Facebook 등)
5. **AI 모델 최적화** (속도 및 정확도 개선)
6. **대시보드 UI** 개선

## 💡 개발 팁

### Claude와 작업 시
- 테스트 실행 후 작업: `npm test` 먼저 실행
- 한글 주석과 에러 메시지 유지
- 기존 코드 스타일 따르기
- 외부 API Mock 처리 철저히

### 디버깅 시
- ServerLogger의 로그 레벨 활용
- 브라우저 개발자 도구 네트워크 탭 확인
- Ollama 로그 모니터링

### 성능 문제 시
- 프로파일링 먼저 수행
- 병목 지점 식별 후 최적화
- 캐싱 적극 활용

## 📚 참고 문서
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Jest Testing](https://jestjs.io/docs/getting-started)

---

**Last Updated**: 2024-09-01
**Maintainer**: JUNSOOCHO
**License**: MIT
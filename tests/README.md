# 테스트 가이드

이 프로젝트는 Jest를 사용하여 단위 테스트와 통합 테스트를 제공합니다.

## 테스트 실행

### 기본 테스트 실행
```bash
npm test
```

### 개발 모드 (파일 변경 감지)
```bash
npm run test:watch
```

### 커버리지 포함 테스트
```bash
npm run test:coverage
```

### 단위 테스트만 실행
```bash
npm run test:unit
```

### 통합 테스트만 실행
```bash
npm run test:integration
```

### CI 환경용 테스트
```bash
npm run test:ci
```

## 테스트 구조

```
tests/
├── unit/                    # 단위 테스트
│   ├── AIAnalyzer.test.js  # AI 분석 서비스 테스트
│   ├── VideoProcessor.test.js  # 비디오 처리 서비스 테스트
│   └── SheetsManager.test.js   # 구글 시트 관리 테스트
├── integration/             # 통합 테스트
│   └── api.test.js         # API 엔드포인트 테스트
├── setup.js                # Jest 설정 파일
└── README.md               # 이 파일
```

## 테스트 작성 가이드

### Mock 사용
- 외부 API 호출은 반드시 Mock 처리
- axios, fs, child_process 등은 jest.mock() 사용
- 환경 변수는 테스트별로 독립적으로 설정

### 테스트 환경
- 테스트용 환경 변수는 `.env.test` 파일 사용
- 실제 서비스(Gemini API, Google Sheets)는 Mock으로 대체
- 파일 시스템 접근은 메모리 기반으로 처리

### 커버리지 목표
- 단위 테스트: 80% 이상
- 통합 테스트: 주요 API 엔드포인트 100%
- 전체 코드 커버리지: 70% 이상

## 주요 테스트 케이스

### AIAnalyzer 테스트
- 카테고리 추론 및 검증
- AI API 호출 및 응답 파싱
- 오류 처리 및 폴백 로직

### VideoProcessor 테스트
- 비디오 다운로드 및 썸네일 생성
- 파일 타입 감지 및 처리
- FFmpeg 프로세스 관리

### SheetsManager 테스트
- Google Sheets API 인증
- 데이터 저장 및 조회
- 스프레드시트 생성 및 관리

### API 통합 테스트
- 모든 엔드포인트 기본 동작
- 에러 처리 및 상태 코드
- CORS 및 미들웨어 동작

## 문제 해결

### 테스트 실패 시
1. Mock 설정이 올바른지 확인
2. 환경 변수가 제대로 설정되었는지 확인
3. 테스트 격리가 잘 되어있는지 확인 (beforeEach 사용)

### 성능 이슈
- Jest는 병렬로 실행되므로 shared resource 주의
- AI 분석 테스트는 타임아웃 시간을 충분히 설정
- Mock을 활용하여 실제 네트워크 호출 방지

## CI/CD 연동

### GitHub Actions 예시
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### 테스트 결과 보고
- 커버리지 보고서는 `coverage/` 폴더에 생성
- HTML 보고서는 `coverage/lcov-report/index.html`에서 확인
- CI 환경에서는 커버리지 임계값 미달 시 빌드 실패
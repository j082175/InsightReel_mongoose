# 📊 채널 수집 버튼 테스트 가이드

## ✅ 현재 상태
- 서버 실행 중: `http://localhost:3000`
- Chrome 확장 프로그램: 로드됨
- 버튼 표시: ✅ 확인됨 ("오 잘보임")

## 🔧 테스트 단계

### 1단계: YouTube 채널 페이지 이동
1. 아무 YouTube 채널 페이지로 이동 (예: https://www.youtube.com/@3cushionpattern)
2. 구독 버튼 옆에 **"📊 채널 수집"** 버튼이 보이는지 확인

### 2단계: 버튼 클릭 테스트
1. **"📊 채널 수집"** 버튼 클릭
2. 다음 중 하나가 나타나는지 확인:
   - **키워드 입력 프롬프트**: "채널과 관련된 키워드를 입력하세요 (쉼표로 구분):"
   - **모달 창**: 키워드 입력 폼이 있는 팝업

### 3단계: 키워드 입력 및 전송
1. 키워드 입력 (예: "당구, 3쿠션, 패턴")
2. 확인/전송 버튼 클릭
3. 다음 응답 확인:
   - **성공**: "채널 수집이 완료되었습니다!"
   - **에러**: 콘솔 에러 메시지 또는 알림

### 4단계: 콘솔 로그 확인
브라우저 개발자 도구 (F12) → Console 탭에서 확인:

**정상 로그 예시:**
```
📊 채널 수집 버튼 클릭됨
🎯 채널 정보 수집: {channelName: "...", subscriberCount: "..."}
📡 서버 요청 전송: POST /api/cluster/collect-channel
✅ 서버 응답 성공: {success: true, ...}
```

**에러 로그 예시:**
```
❌ DOM 요소를 찾을 수 없음
❌ 서버 연결 실패: fetch failed
❌ API 응답 오류: {error: "..."}
```

## 🐛 문제 해결

### 버튼이 보이지 않는 경우
1. **페이지 새로고침**: F5 또는 Ctrl+R
2. **확장 상태 확인**: `chrome://extensions/` → "InsightReel" 활성화 확인
3. **디버그 스크립트 실행**: 콘솔에서
   ```javascript
   // scripts/debug-extension.js 내용 붙여넣기
   debugExtension.runFullDebug();
   ```

### 버튼 클릭이 안 되는 경우
1. **강제 버튼 생성**: 콘솔에서
   ```javascript
   // scripts/force-test-button.js 내용 붙여넣기
   ```
2. **DOM 선택자 확인**: F12 → Elements 탭에서 구독 버튼 구조 확인

### 서버 연결 실패
1. **서버 상태 확인**: 
   - `http://localhost:3000/health` 접속
   - 터미널에서 서버 로그 확인
2. **CORS 에러**: 브라우저 콘솔에서 CORS 관련 에러 메시지 확인
3. **API 키 설정**: `.env` 파일의 `YOUTUBE_API_KEY` 확인

## 📊 예상 동작 흐름

### 성공적인 워크플로우:
1. **버튼 클릭** → 키워드 입력 프롬프트 표시
2. **키워드 입력** → "당구, 3쿠션, 패턴"
3. **서버 전송** → `POST /api/cluster/collect-channel`
4. **AI 태그 추출** → Gemini API 호출로 관련 태그 생성
5. **클러스터 분석** → 유사한 채널 찾기 및 그룹화
6. **데이터 저장** → JSON 파일에 채널 정보 저장
7. **응답 표시** → "채널 수집 완료" 메시지

### 서버 측 로그 (성공 시):
```
📊 채널 수집 시작 { name: '패턴당구채널' }
🤖 AI 태그 추출 시작 { channel: '패턴당구채널' }
✅ 태그 추출 완료 { tagCount: 10, tags: '당구, 3쿠션, 패턴, 스포츠, 게임' }
✅ 채널 수집 완료 { channelId: 'pattern123', keywords: 3, suggestions: 2 }
```

## 🎯 테스트 체크리스트

- [ ] 1단계: YouTube 채널 페이지에서 버튼 확인됨
- [ ] 2단계: 버튼 클릭 시 프롬프트/모달 표시됨
- [ ] 3단계: 키워드 입력 및 전송 성공
- [ ] 4단계: 콘솔 로그에서 정상 처리 확인
- [ ] 5단계: 서버 로그에서 데이터 저장 확인
- [ ] 6단계: 성공 메시지 표시됨

## 🔧 추가 디버깅 도구

### 1. 확장 상태 체크 페이지
`scripts/test-extension.html` 파일을 브라우저에서 열어 전체 상태 확인

### 2. 강제 테스트 버튼
콘솔에서 `scripts/force-test-button.js` 실행으로 강제 버튼 생성

### 3. API 직접 테스트
```bash
curl -X POST http://localhost:3000/api/cluster/collect-channel \
  -H "Content-Type: application/json" \
  -d '{"channelData": {"channelName": "테스트"}, "keywords": ["테스트"]}'
```

---

**다음 테스트 결과를 보고해 주세요:**
1. 버튼 클릭 시 어떤 일이 발생하는지
2. 브라우저 콘솔에 나타나는 모든 로그
3. 에러가 있다면 정확한 에러 메시지
4. 서버 터미널에 나타나는 추가 로그
# 📋 Instagram 쿠키 추출 - 가장 쉬운 방법

## 🚀 방법 1: 브라우저 확장프로그램 (추천)

### Chrome 확장프로그램 설치
1. **Chrome 웹스토어**에서 "Get cookies.txt LOCALLY" 검색
2. 확장프로그램 설치 (무료)
3. Instagram.com에 로그인
4. 확장프로그램 클릭 → **"Export"** 버튼
5. 다운로드된 `cookies.txt` 파일을 `data/instagram_cookies.txt`로 이름 변경

**장점**: 클릭 한 번으로 완료! ⚡

---

## 🔧 방법 2: 수동 복사 (확실함)

### Chrome 개발자 도구 사용
```bash
1. Chrome에서 Instagram.com 로그인
2. F12 → Application 탭
3. Storage → Cookies → https://instagram.com
4. 아래 쿠키들을 찾아서 Value 복사:
```

| 쿠키명 | 설명 | 필수도 |
|--------|------|--------|
| **sessionid** | 로그인 세션 | ⭐⭐⭐ 필수 |
| **csrftoken** | CSRF 보안 | ⭐⭐⭐ 필수 |
| **mid** | 머신 ID | ⭐⭐ 권장 |
| **ig_did** | 디바이스 ID | ⭐⭐ 권장 |

### 수동 쿠키 생성 도구 실행
```bash
node create-manual-cookies.js
```
- 단계별 안내에 따라 쿠키 값 입력
- 자동으로 올바른 형식으로 저장됨

---

## ✅ 방법 3: 기존 세션 활용 (이미 작동 중)

**현재 Instaloader 세션이 이미 잘 작동하고 있습니다:**
- `scripts/instagram/instagram_session` 파일 존재
- Instagram 메타데이터 추출 성공 (17초, 693,430 조회수)
- 추가 쿠키 설정 불필요할 수도 있음

### 테스트 방법
```bash
node test-processVideo-instagram.js
```

---

## 🎯 권장 순서

### 1️⃣ **먼저 테스트**
```bash
node test-processVideo-instagram.js
```
- 이미 작동하면 추가 설정 불필요!

### 2️⃣ **실패하면 브라우저 확장프로그램**
- Chrome 웹스토어 → "Get cookies.txt LOCALLY"
- 클릭 한 번으로 완료

### 3️⃣ **그래도 안되면 수동 복사**
```bash
node create-manual-cookies.js
```

---

## 🔒 보안 주의사항

- 쿠키는 **비밀번호와 같은 수준**의 중요한 정보입니다
- `data/instagram_cookies.txt` 파일을 절대 공유하지 마세요
- 정기적으로 갱신하세요 (1-2주마다)
- Git에 커밋하지 마세요 (.gitignore 확인)

---

## 🧪 최종 테스트

쿠키 설정 완료 후:
```bash
# 1. Instagram 메타데이터 추출 테스트
node test-processVideo-instagram.js

# 2. 비디오 다운로드 테스트 (제한된 콘텐츠 아닌 URL로)
# 브라우저에서 직접 테스트
```

---

**💡 결론**: 대부분의 경우 **브라우저 확장프로그램이 가장 쉽고 확실합니다!**
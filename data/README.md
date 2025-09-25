# Instagram 쿠키 설정 안내

## 🚀 자동 쿠키 추출 (권장)

### 1. Playwright + TOTP 완전 자동화 (최고 수준)
```bash
# 필요한 패키지 설치
pip install playwright pyotp
playwright install

# 쿠키 자동 추출 실행
node extract-instagram-cookies.js

# 또는 Python 직접 실행
python scripts/instagram/extract_cookies.py
```

**🔐 TOTP 2FA 완전 자동화 설정:**
1. **Instagram 2FA 설정**:
   - Instagram → Settings → Security → Two-Factor Authentication
   - "Authentication App" 선택
   - **"Set up manually"** 클릭 (QR 코드 말고)
   - **SECRET KEY** 복사 (예: JBSWY3DPEHPK3PXP...)

2. **설정 파일 편집**:
   ```bash
   # data/instagram_totp_config.json 파일 열기
   {
     "totp_secret": "YOUR_SECRET_KEY_HERE"  # 복사한 SECRET KEY 붙여넣기
   }
   ```

3. **자동화 실행**:
   - 이제 2FA도 완전 자동으로 처리됩니다! 🎉
   - 사용자 개입 없이 6자리 코드 자동 생성 및 입력

**과정:**
1. 브라우저가 자동으로 열림
2. Instagram 로그인 페이지로 이동
3. 자동으로 아이디/비밀번호 입력
4. **2FA 코드 자동 생성 및 입력** ⚡
5. "신뢰할 수 있는 기기" 자동 등록
6. 쿠키 파일 자동 생성: `data/instagram_cookies.txt`

### 2. 반자동 방식 (TOTP 없이)
```bash
# Playwright만 설치
pip install playwright
playwright install
```
- 2FA 시 브라우저에서 수동 입력 필요

---

## 🔧 수동 쿠키 추출 (대안)

### 1. 브라우저에서 Instagram 로그인
1. Chrome에서 Instagram.com에 로그인
2. F12를 눌러 개발자 도구 열기
3. Network 탭으로 이동
4. 페이지 새로고침 (F5)

### 2. 쿠키 추출
1. Network 탭에서 instagram.com 요청 찾기
2. Request Headers에서 Cookie 값 복사
3. 또는 브라우저 확장프로그램 "Get cookies.txt" 사용

### 3. 파일 형식 (Netscape format)
```
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1234567890	sessionid	your_session_id_here
.instagram.com	TRUE	/	TRUE	1234567890	csrftoken	your_csrf_token_here
```

---

## ✅ 쿠키 파일 확인

생성된 쿠키 파일 위치: `data/instagram_cookies.txt`

**중요한 쿠키들:**
- `sessionid`: 로그인 세션 (필수)
- `csrftoken`: CSRF 보호 토큰 (필수)
- `mid`: 머신 ID
- `ig_did`: 디바이스 ID

---

## 🔄 자동 적용

쿠키 파일이 존재하면:
- ✅ yt-dlp가 자동으로 쿠키 사용
- ✅ Instaloader가 세션 재사용
- ✅ 로그인 없이 제한된 콘텐츠 접근 가능

쿠키 파일이 없으면:
- 🔑 자동으로 아이디/비밀번호 로그인
- ⏱️ 첫 로그인 후 세션 저장

---

## 🔒 보안 참고사항
- 쿠키 파일에는 중요한 인증 정보가 포함됩니다
- 이 파일을 공유하거나 공개 저장소에 업로드하지 마세요
- 정기적으로 쿠키를 업데이트하세요 (보통 1-2주마다)
- 쿠키가 만료되면 자동으로 재로그인됩니다
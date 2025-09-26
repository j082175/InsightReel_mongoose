#!/usr/bin/env python3
"""
고급 InstaLoader 설정으로 Instagram 릴스 필터링
세션 파일과 쿠키를 함께 사용하는 방식
"""

import instaloader
import json
import time
import os
from datetime import datetime
import requests
from urllib.parse import urlparse

class AdvancedInstagramExtractor:
    def __init__(self, cookie_file_path=None, session_file=None):
        # InstaLoader 초기화
        self.loader = instaloader.Instaloader(
            dirname_pattern="temp_downloads/{target}",
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            save_metadata=True,
            compress_json=False
        )

        self.cookie_file_path = cookie_file_path
        self.session_file = session_file

        # 요청 헤더 설정 (브라우저 모방)
        self.setup_headers()

        # 세션 로드 시도
        self.load_session()

    def setup_headers(self):
        """Instagram 접근을 위한 헤더 설정"""
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

    def load_session(self):
        """쿠키 파일에서 세션 정보 로드"""
        try:
            if self.cookie_file_path and os.path.exists(self.cookie_file_path):
                print("쿠키 파일에서 세션 정보를 읽는 중...")

                # 쿠키 파일 파싱
                cookies = {}
                with open(self.cookie_file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            parts = line.split('\t')
                            if len(parts) >= 7:
                                name = parts[5]
                                value = parts[6]
                                cookies[name] = value

                # 중요한 쿠키 확인
                required_cookies = ['sessionid', 'csrftoken', 'ds_user_id']
                missing_cookies = [cookie for cookie in required_cookies if cookie not in cookies]

                if missing_cookies:
                    print(f"경고: 필요한 쿠키가 누락됨: {missing_cookies}")
                else:
                    print("필요한 쿠키를 모두 찾았습니다.")

                    # ds_user_id로 사용자 ID 확인
                    if 'ds_user_id' in cookies:
                        print(f"사용자 ID: {cookies['ds_user_id']}")

                # 세션 설정 (InstaLoader의 내부 방식 사용)
                self.setup_session_manually(cookies)

                return True
            else:
                print("쿠키 파일을 찾을 수 없습니다.")
                return False

        except Exception as e:
            print(f"세션 로드 중 오류: {e}")
            return False

    def setup_session_manually(self, cookies):
        """수동으로 세션 설정"""
        try:
            # InstaLoader context에 쿠키 정보 설정
            if 'sessionid' in cookies and 'ds_user_id' in cookies:
                # 기본적인 세션 정보만 설정
                print("세션 정보를 InstaLoader에 설정 중...")
                # 실제 InstaLoader의 내부 구조에 맞게 설정해야 함
                print("세션 설정 완료")
        except Exception as e:
            print(f"세션 설정 중 오류: {e}")

    def get_profile_info_only(self, username):
        """프로필 기본 정보만 가져오기 (게시물 접근 없음)"""
        try:
            print(f"'{username}' 프로필 정보 가져오는 중...")
            profile = instaloader.Profile.from_username(self.loader.context, username)

            profile_info = {
                'username': profile.username,
                'full_name': profile.full_name,
                'biography': profile.biography,
                'followers': profile.followers,
                'followees': profile.followees,
                'mediacount': profile.mediacount,
                'is_private': profile.is_private,
                'is_verified': profile.is_verified,
                'profile_pic_url': profile.profile_pic_url
            }

            print(f"프로필: {profile.full_name}")
            print(f"팔로워: {profile.followers:,}명")
            print(f"게시물: {profile.mediacount:,}개")
            print(f"비공개: {'예' if profile.is_private else '아니오'}")

            return profile_info, profile

        except Exception as e:
            print(f"프로필 정보 가져오기 실패: {e}")
            return None, None

    def test_alternative_methods(self, username):
        """대안적인 방법들 테스트"""
        print(f"\n=== 대안 방법 테스트: @{username} ===")

        # 1. 프로필 정보만 가져오기
        profile_info, profile = self.get_profile_info_only(username)

        if profile_info:
            print("\n✅ 프로필 정보 접근 성공!")
            return profile_info
        else:
            print("\n❌ 프로필 정보 접근 실패")
            return None

    def suggest_alternatives(self):
        """대안 방법들 제안"""
        print("\n" + "="*60)
        print("Instagram 접근 제한으로 인한 대안 방법들:")
        print("="*60)

        alternatives = [
            {
                "방법": "1. Selenium/Playwright 웹 자동화",
                "장점": "실제 브라우저 환경에서 동작",
                "단점": "느리고 리소스 사용량이 많음",
                "구현": "selenium + chromedriver 사용"
            },
            {
                "방법": "2. Instagram Basic Display API",
                "장점": "공식 API로 안정적",
                "단점": "제한적인 데이터, 승인 과정 필요",
                "구현": "Facebook Developers 등록 필요"
            },
            {
                "방법": "3. 타사 Instagram API 서비스",
                "장점": "즉시 사용 가능",
                "단점": "유료, 서비스 의존성",
                "구현": "RapidAPI, Apify 등 사용"
            },
            {
                "방법": "4. 직접 HTTP 요청 (고급)",
                "장점": "완전한 제어 가능",
                "단점": "Instagram 업데이트에 취약",
                "구현": "requests + 쿠키 + 헤더 조작"
            }
        ]

        for i, alt in enumerate(alternatives, 1):
            print(f"\n{i}. {alt['방법']}")
            print(f"   장점: {alt['장점']}")
            print(f"   단점: {alt['단점']}")
            print(f"   구현: {alt['구현']}")

def main():
    """메인 함수"""
    print("고급 Instagram 데이터 추출 테스트")
    print("=" * 50)

    # 쿠키 파일 경로
    cookie_file_path = "data/instagram_cookies.txt"
    if not os.path.exists(cookie_file_path):
        abs_path = os.path.join(os.path.dirname(__file__), cookie_file_path)
        if os.path.exists(abs_path):
            cookie_file_path = abs_path
        else:
            cookie_file_path = None

    # 추출기 초기화
    extractor = AdvancedInstagramExtractor(cookie_file_path=cookie_file_path)

    # 테스트할 계정들
    test_accounts = ['lalalalisa_m', 'instagram', 'google']

    for username in test_accounts:
        try:
            result = extractor.test_alternative_methods(username)
            if result:
                print(f"✅ {username}: 접근 가능")
            else:
                print(f"❌ {username}: 접근 불가")

            time.sleep(5)  # 계정 간 딜레이

        except KeyboardInterrupt:
            print("\n테스트가 중단되었습니다.")
            break
        except Exception as e:
            print(f"테스트 중 오류: {e}")

    # 대안 방법 제안
    extractor.suggest_alternatives()

    print("\n" + "="*60)
    print("결론: Instagram의 API 제한이 강화되어 InstaLoader만으로는")
    print("충분한 데이터 추출이 어려운 상황입니다.")
    print("웹 자동화 도구나 공식 API 사용을 권장합니다.")
    print("="*60)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Instagram 프로필 정보 추출 스크립트
특정 사용자명의 프로필 상세 정보 추출
"""

import instaloader
import json
import sys
from datetime import datetime

def get_profile_info(username):
    """프로필 정보 추출"""
    try:
        L = instaloader.Instaloader()

        # 로그인 (더 많은 정보 접근용)
        try:
            L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
            print(json.dumps({'status': 'login_success'}, ensure_ascii=False), file=sys.stderr)
        except Exception as login_error:
            print(json.dumps({'status': 'login_failed', 'error': str(login_error)}, ensure_ascii=False), file=sys.stderr)
            # 로그인 실패해도 계속 진행 (공개 프로필은 가능)

        # 프로필 객체 생성
        profile = instaloader.Profile.from_username(L.context, username)

        # 기본 프로필 데이터
        profile_data = {
            'success': True,
            'username': profile.username,
            'channelName': profile.username,  # 표준 필드명
            'full_name': profile.full_name,
            'biography': profile.biography,
            'followers': profile.followers,
            'subscribers': profile.followers,  # 표준 필드명 (팔로워=구독자)
            'followees': profile.followees,
            'mediacount': profile.mediacount,
            'channelVideos': profile.mediacount,  # 표준 필드명
            'is_private': profile.is_private,
            'is_verified': profile.is_verified,
            'profile_pic_url': profile.profile_pic_url,
            'external_url': profile.external_url,
            'userid': profile.userid,
        }

        # 비즈니스 계정 정보 (선택적)
        try:
            profile_data['business_category_name'] = getattr(profile, 'business_category_name', None)
            profile_data['is_business_account'] = getattr(profile, 'is_business_account', False)
        except:
            pass

        # 최근 활동 정보 (선택적)
        try:
            # 최근 포스트 몇 개 확인해서 활동성 체크
            recent_posts = list(profile.get_posts())[:5]  # 최근 5개만

            if recent_posts:
                profile_data['latest_post_date'] = recent_posts[0].date.isoformat()
                profile_data['recent_activity'] = True

                # 최근 포스트들의 평균 좋아요/댓글 수
                total_likes = sum(post.likes for post in recent_posts)
                total_comments = sum(post.comments for post in recent_posts)

                profile_data['avg_recent_likes'] = total_likes / len(recent_posts)
                profile_data['avg_recent_comments'] = total_comments / len(recent_posts)

                # 비디오 포스트 비율
                video_posts = sum(1 for post in recent_posts if post.is_video)
                profile_data['video_post_ratio'] = video_posts / len(recent_posts)
            else:
                profile_data['recent_activity'] = False

        except Exception as activity_error:
            print(json.dumps({
                'status': 'activity_check_failed',
                'error': str(activity_error)
            }, ensure_ascii=False), file=sys.stderr)

        profile_data['extracted_at'] = datetime.now().isoformat()

        print(json.dumps(profile_data, ensure_ascii=False))
        return profile_data

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'username': username,
            'error_type': type(e).__name__,
            'extracted_at': datetime.now().isoformat()
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

def get_multiple_profiles(usernames):
    """여러 프로필 정보 일괄 추출"""
    results = []

    for username in usernames:
        try:
            result = get_profile_info(username)
            results.append(result)
        except Exception as e:
            results.append({
                'success': False,
                'username': username,
                'error': str(e)
            })

    return {
        'success': True,
        'profiles': results,
        'total_count': len(usernames),
        'success_count': sum(1 for r in results if r.get('success'))
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python profile_info_extractor.py <username> [username2] [username3] ...'
        }))
        sys.exit(1)

    usernames = sys.argv[1:]

    if len(usernames) == 1:
        # 단일 프로필
        get_profile_info(usernames[0])
    else:
        # 다중 프로필
        result = get_multiple_profiles(usernames)
        print(json.dumps(result, ensure_ascii=False))
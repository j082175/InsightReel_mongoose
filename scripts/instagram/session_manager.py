#!/usr/bin/env python3
"""
Instagram 로그인 세션 관리 스크립트
세션 생성, 저장, 로드, 검증 기능
"""

import instaloader
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# 세션 저장 디렉토리
SESSION_DIR = Path(__file__).parent / "sessions"
SESSION_DIR.mkdir(exist_ok=True)

def create_session(username, password):
    """새로운 세션 생성 및 저장"""
    try:
        L = instaloader.Instaloader()

        # 로그인 시도
        L.login(username, password)

        # 세션 파일 저장
        session_file = SESSION_DIR / f"{username}_session"
        L.save_session_to_file(str(session_file))

        result = {
            'success': True,
            'action': 'create_session',
            'username': username,
            'session_file': str(session_file),
            'created_at': datetime.now().isoformat()
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'action': 'create_session',
            'username': username,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

def load_session(username):
    """기존 세션 로드 및 검증"""
    try:
        L = instaloader.Instaloader()

        # 세션 파일 경로
        session_file = SESSION_DIR / f"{username}_session"

        if not session_file.exists():
            raise FileNotFoundError(f"Session file not found for {username}")

        # 세션 로드
        L.load_session_from_file(username, str(session_file))

        # 세션 유효성 검증 (자신의 프로필 정보로 테스트)
        try:
            profile = instaloader.Profile.from_username(L.context, username)
            test_followers = profile.followers  # 접근 테스트
        except Exception as validation_error:
            raise Exception(f"Session validation failed: {str(validation_error)}")

        result = {
            'success': True,
            'action': 'load_session',
            'username': username,
            'session_file': str(session_file),
            'session_valid': True,
            'loaded_at': datetime.now().isoformat()
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'action': 'load_session',
            'username': username,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

def check_session_status(username):
    """세션 파일 존재 여부 및 상태 체크"""
    try:
        session_file = SESSION_DIR / f"{username}_session"

        if not session_file.exists():
            result = {
                'success': True,
                'action': 'check_session',
                'username': username,
                'session_exists': False,
                'session_file': str(session_file)
            }
        else:
            # 파일 정보
            stat = session_file.stat()
            result = {
                'success': True,
                'action': 'check_session',
                'username': username,
                'session_exists': True,
                'session_file': str(session_file),
                'file_size': stat.st_size,
                'created_time': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat()
            }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'action': 'check_session',
            'username': username,
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

def delete_session(username):
    """세션 파일 삭제"""
    try:
        session_file = SESSION_DIR / f"{username}_session"

        if session_file.exists():
            session_file.unlink()
            deleted = True
        else:
            deleted = False

        result = {
            'success': True,
            'action': 'delete_session',
            'username': username,
            'session_deleted': deleted,
            'session_file': str(session_file)
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'action': 'delete_session',
            'username': username,
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

def list_sessions():
    """모든 세션 파일 목록 조회"""
    try:
        sessions = []

        for session_file in SESSION_DIR.glob("*_session"):
            username = session_file.stem.replace("_session", "")
            stat = session_file.stat()

            sessions.append({
                'username': username,
                'session_file': str(session_file),
                'file_size': stat.st_size,
                'created_time': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_time': datetime.fromtimestamp(stat.st_mtime).isoformat()
            })

        result = {
            'success': True,
            'action': 'list_sessions',
            'sessions': sessions,
            'session_count': len(sessions)
        }

        print(json.dumps(result, ensure_ascii=False))
        return result

    except Exception as e:
        error_result = {
            'success': False,
            'action': 'list_sessions',
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python session_manager.py <action> [arguments]',
            'actions': {
                'create': 'create <username> <password>',
                'load': 'load <username>',
                'check': 'check <username>',
                'delete': 'delete <username>',
                'list': 'list'
            }
        }))
        sys.exit(1)

    action = sys.argv[1].lower()

    if action == 'create':
        if len(sys.argv) != 4:
            print(json.dumps({'success': False, 'error': 'create requires username and password'}))
            sys.exit(1)
        create_session(sys.argv[2], sys.argv[3])

    elif action == 'load':
        if len(sys.argv) != 3:
            print(json.dumps({'success': False, 'error': 'load requires username'}))
            sys.exit(1)
        load_session(sys.argv[2])

    elif action == 'check':
        if len(sys.argv) != 3:
            print(json.dumps({'success': False, 'error': 'check requires username'}))
            sys.exit(1)
        check_session_status(sys.argv[2])

    elif action == 'delete':
        if len(sys.argv) != 3:
            print(json.dumps({'success': False, 'error': 'delete requires username'}))
            sys.exit(1)
        delete_session(sys.argv[2])

    elif action == 'list':
        list_sessions()

    else:
        print(json.dumps({
            'success': False,
            'error': f'Unknown action: {action}',
            'valid_actions': ['create', 'load', 'check', 'delete', 'list']
        }))
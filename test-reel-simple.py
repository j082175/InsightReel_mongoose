#!/usr/bin/env python3

import instaloader
import json
import re

def test_reel_simple():
    try:
        print("Testing Instagram Reel")

        # Extract shortcode
        reel_url = "https://www.instagram.com/reels/DOf5jTKjC4t/"
        shortcode = "DOf5jTKjC4t"  # Direct extraction
        print(f"Testing shortcode: {shortcode}")

        # Create and login
        L = instaloader.Instaloader()
        L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
        print("Login successful!")

        # Get the post
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        print("Post loaded!")

        # Extract data
        data = {
            'shortcode': post.shortcode,
            'typename': post.typename,
            'is_video': post.is_video,
            'likes': post.likes,
            'comments': post.comments,
            'owner_username': post.owner_username
        }

        # Video specific data
        if hasattr(post, 'video_view_count'):
            data['video_view_count'] = post.video_view_count
            print(f"VIDEO VIEW COUNT: {post.video_view_count}")
        else:
            data['video_view_count'] = None
            print("No video view count attribute")

        if hasattr(post, 'video_duration'):
            data['video_duration'] = post.video_duration
            print(f"VIDEO DURATION: {post.video_duration}")

        print("\nDATA EXTRACTED:")
        print(json.dumps(data, indent=2, default=str))

        # Profile data
        owner = post.owner_profile
        profile = {
            'username': owner.username,
            'followers': owner.followers,
            'mediacount': owner.mediacount
        }
        print("\nPROFILE DATA:")
        print(json.dumps(profile, indent=2))

        return data

    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    test_reel_simple()
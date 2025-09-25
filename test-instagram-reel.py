#!/usr/bin/env python3

import instaloader
import json
import re

def test_instagram_reel():
    try:
        print("Testing Instagram Reel for view count")

        # Reel URL
        reel_url = "https://www.instagram.com/reels/DOf5jTKjC4t/"
        print(f"Testing URL: {reel_url}")

        # Extract shortcode from reel URL
        shortcode_match = re.search(r'/reels/([A-Za-z0-9_-]+)', reel_url)
        if shortcode_match:
            shortcode = shortcode_match.group(1)
            print(f"Extracted shortcode: {shortcode}")
        else:
            print("Could not extract shortcode from URL")
            return

        # Create Instaloader instance
        L = instaloader.Instaloader()

        # Login
        print("Attempting Instagram login...")
        L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
        print("Login successful!")

        # Get the reel post
        print(f"Loading reel post: {shortcode}")
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        print("Reel post loaded successfully!")

        # Extract all reel data
        reel_data = {
            'shortcode': post.shortcode,
            'url': reel_url,
            'typename': post.typename,
            'is_video': post.is_video,
            'likes': post.likes,
            'comments': post.comments,
            'owner_username': post.owner_username,
            'date': post.date.isoformat(),
        }

        # Get caption safely
        try:
            reel_data['caption'] = post.caption[:200] + '...' if post.caption and len(post.caption) > 200 else post.caption
        except:
            reel_data['caption'] = None

        # Try to get video-specific data
        video_attrs = ['video_view_count', 'video_url', 'video_duration']
        for attr in video_attrs:
            try:
                value = getattr(post, attr)
                reel_data[attr] = value
                print(f"✅ {attr}: {value}")
            except Exception as e:
                reel_data[attr] = None
                print(f"❌ {attr}: {e}")

        print("\n🎬 REEL DATA EXTRACTED:")
        print("=" * 50)
        print(json.dumps(reel_data, indent=2, default=str))

        # Also get owner profile data
        try:
            print("\n👤 OWNER PROFILE DATA:")
            owner_profile = post.owner_profile
            profile_data = {
                'username': owner_profile.username,
                'followers': owner_profile.followers,
                'mediacount': owner_profile.mediacount,
                'is_verified': owner_profile.is_verified
            }
            print(json.dumps(profile_data, indent=2))
        except Exception as profile_error:
            print(f"Profile extraction failed: {profile_error}")

        # Check if this is actually a video
        if post.is_video:
            print("\n🎉 SUCCESS! This is a video post!")
            if reel_data.get('video_view_count'):
                print(f"📊 VIEW COUNT FOUND: {reel_data['video_view_count']}")
            else:
                print("⚠️ Video confirmed but view count not available")
        else:
            print(f"\n⚠️ This post is not a video (type: {post.typename})")

        return reel_data

    except Exception as main_error:
        print(f"Main error: {main_error}")
        return None

if __name__ == "__main__":
    result = test_instagram_reel()
    if result:
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed!")
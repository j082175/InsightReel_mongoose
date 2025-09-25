#!/usr/bin/env python3

import instaloader
import json

def test_specific_video():
    try:
        print("Testing specific Instagram video shortcodes")

        # Create Instaloader instance
        L = instaloader.Instaloader()

        # Login
        L.login('j082175j082172@gmail.com', '!@tkadnjsth3')
        print("Login successful!")

        # Test various shortcodes that are likely to be videos
        # These are common Instagram shortcode patterns for videos/reels
        potential_video_shortcodes = [
            'C_ABCDEFGHI',  # Example pattern
            'DCvqpNFykEz',  # From our previous test
            'C123456789A',  # Another pattern
        ]

        # Let's also try to create a simple video post from a known public account
        # Instead, let's try a different approach: test the current successful post
        # but check all available attributes

        shortcode = 'CXkbh11p7ZH'  # Our working example
        print(f"Deep analysis of working post: {shortcode}")

        post = instaloader.Post.from_shortcode(L.context, shortcode)
        print("Post loaded successfully!")

        # Get ALL available attributes
        print("\n=== ALL POST ATTRIBUTES ===")
        for attr in dir(post):
            if not attr.startswith('_'):
                try:
                    value = getattr(post, attr)
                    if not callable(value):
                        print(f"{attr}: {value}")
                except:
                    print(f"{attr}: <could not access>")

        print("\n=== VIDEO-RELATED ATTRIBUTES ===")
        video_attrs = ['is_video', 'video_view_count', 'video_url', 'video_duration', 'typename']
        for attr in video_attrs:
            try:
                if hasattr(post, attr):
                    value = getattr(post, attr)
                    print(f"{attr}: {value}")
                else:
                    print(f"{attr}: <attribute not found>")
            except Exception as e:
                print(f"{attr}: <error: {e}>")

        # Check if this is actually a carousel/sidecar that might contain videos
        print(f"\nPost typename: {post.typename}")

        if hasattr(post, 'get_sidecar_nodes'):
            try:
                sidecar = list(post.get_sidecar_nodes())
                print(f"Sidecar nodes count: {len(sidecar)}")
                for i, node in enumerate(sidecar):
                    print(f"  Node {i}: is_video={getattr(node, 'is_video', 'unknown')}")
            except:
                print("Could not access sidecar nodes")

    except Exception as main_error:
        print(f"Main error: {main_error}")

if __name__ == "__main__":
    test_specific_video()
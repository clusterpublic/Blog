#!/usr/bin/env python3
"""
Test script to demonstrate URL parsing and blog content fetching
"""

def test_url_parsing():
    """Test the URL parsing logic"""
    
    # Test URLs
    test_urls = [
        "https://example.com/blog/my-awesome-blog-post",
        "https://example.com/blog/another-blog?param=value",
        "https://example.com/blog/blog-with-hash#section",
        "https://example.com/blog/complex-blog?param=value&other=test#section",
        "https://example.com/",  # Not a blog page
        "https://example.com/about",  # Not a blog page
        "https://example.com/blog/",  # Edge case
    ]
    
    print("=== URL Parsing Test ===")
    
    for url in test_urls:
        print(f"\nTesting URL: {url}")
        
        # Simulate the URL parsing logic from the Flask app
        blog_id = None
        is_blog_page = False
        
        if url and '/blog/' in url:
            try:
                # Extract blog ID from URL path
                url_parts = url.split('/blog/')
                if len(url_parts) > 1:
                    blog_id = url_parts[1].split('?')[0].split('#')[0]  # Remove query params and fragments
                    is_blog_page = True
            except Exception as e:
                print(f"Error extracting blog ID: {e}")
        
        print(f"  Is blog page: {is_blog_page}")
        print(f"  Extracted blog ID: {blog_id}")
        
        if is_blog_page and blog_id:
            print(f"  Would fetch blog with ID: '{blog_id}'")
        elif is_blog_page:
            print(f"  Blog page detected but no valid blog ID extracted")
        else:
            print(f"  Not a blog page - would use standard FAQ/Career data")

if __name__ == "__main__":
    test_url_parsing()

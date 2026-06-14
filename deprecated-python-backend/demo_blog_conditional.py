#!/usr/bin/env python3
"""
Demonstration script showing when blog content is included in the dataset
"""

def demonstrate_blog_conditional_logic():
    """Show the conditional logic for blog content inclusion"""
    
    print("=== Blog Content Conditional Logic Demo ===\n")
    
    # Test scenarios
    scenarios = [
        {
            "name": "Blog Page with Valid Blog ID",
            "page_url": "https://example.com/blog/my-awesome-blog",
            "blog_found": True,
            "blog_title": "My Awesome Blog",
            "blog_content": "This is the content of my awesome blog..."
        },
        {
            "name": "Blog Page with Invalid Blog ID",
            "page_url": "https://example.com/blog/non-existent-blog",
            "blog_found": False,
            "blog_title": "",
            "blog_content": ""
        },
        {
            "name": "Homepage",
            "page_url": "https://example.com/",
            "blog_found": False,
            "blog_title": "",
            "blog_content": ""
        },
        {
            "name": "About Page",
            "page_url": "https://example.com/about",
            "blog_found": False,
            "blog_title": "",
            "blog_content": ""
        },
        {
            "name": "Blog Page with Query Parameters",
            "page_url": "https://example.com/blog/my-blog?utm_source=google",
            "blog_found": True,
            "blog_title": "My Blog",
            "blog_content": "Blog content here..."
        }
    ]
    
    for scenario in scenarios:
        print(f"Scenario: {scenario['name']}")
        print(f"URL: {scenario['page_url']}")
        
        # Simulate the logic from the Flask app
        is_blog_page = '/blog/' in scenario['page_url']
        blog_text = ""
        
        if is_blog_page and scenario['blog_found'] and scenario['blog_content']:
            blog_text = f"#BLOG CONTENT\nTitle: {scenario['blog_title']}\nContent: {scenario['blog_content']}\n\n"
            print("✅ Blog content WILL be included in dataset")
        else:
            print("❌ Blog content will NOT be included in dataset")
            if not is_blog_page:
                print("   Reason: Not a blog page")
            elif not scenario['blog_found']:
                print("   Reason: Blog not found in database")
            elif not scenario['blog_content']:
                print("   Reason: No blog content")
        
        print(f"Dataset will contain: FAQs + Careers + {'Blog Content' if blog_text else 'No Blog Content'}")
        print("-" * 60)

if __name__ == "__main__":
    demonstrate_blog_conditional_logic()

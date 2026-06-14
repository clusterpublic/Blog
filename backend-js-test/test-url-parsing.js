const testUrls = [
  'https://example.com/blog/my-awesome-blog-post',
  'https://example.com/blog/another-blog?param=value',
  'https://example.com/blog/blog-with-hash#section',
  'https://example.com/blog/complex-blog?param=value&other=test#section',
  'https://example.com/',
  'https://example.com/about',
  'https://example.com/blog/',
];

console.log('=== URL Parsing Test (JS port) ===\n');

for (const url of testUrls) {
  console.log(`Testing URL: ${url}`);

  let blogId = null;
  let isBlogPage = false;

  if (url && url.includes('/blog/')) {
    try {
      const urlParts = url.split('/blog/');
      if (urlParts.length > 1) {
        blogId = urlParts[1].split('?')[0].split('#')[0];
        isBlogPage = true;
      }
    } catch (e) {
      console.log(`  Error extracting blog ID: ${e.message}`);
    }
  }

  console.log(`  Is blog page: ${isBlogPage}`);
  console.log(`  Extracted blog ID: ${blogId}`);

  if (isBlogPage && blogId) {
    console.log(`  Would fetch blog with ID: '${blogId}'`);
  } else if (isBlogPage) {
    console.log('  Blog page detected but no valid blog ID extracted');
  } else {
    console.log('  Not a blog page - would use standard FAQ/Career data');
  }
  console.log('');
}

console.log('All URL parsing tests completed.');

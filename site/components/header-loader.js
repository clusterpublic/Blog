// Header Loader - Loads the modular header component
async function loadHeader() {
    try {
        console.log('Loading header from /components/header.html');
        const response = await fetch('/components/header.html');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const headerHTML = await response.text();
        console.log('Header loaded successfully');
        
        // Find the body tag and insert header at the beginning
        const body = document.body;
        body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // Remove any existing header elements
        const existingHeaders = document.querySelectorAll('header:not(#main-header)');
        existingHeaders.forEach(header => header.remove());
        
        console.log('Header injected successfully');
        
    } catch (error) {
        console.error('Error loading header:', error);
        console.log('Using fallback header');
        
        // Fallback: create a simple header if loading fails
        const fallbackHeader = `
            <header class="header" id="main-header">
                <div class="header-content">
                    <a href="/" class="logo">Cluster Protocol</a>
                    <nav class="nav-links">
                        <a href="/" class="nav-link">Home</a>
                        <a href="/manager" class="nav-link">Blog Manager</a>
                        <a href="/faq-manager" class="nav-link">FAQ Manager</a>
                        <a href="/job-manager" class="nav-link">Job Manager</a>
                        <a href="/creator_showcase" class="nav-link">Creator Showcase</a>
                        <a href="/tweets" class="nav-link">Tweets</a>
                    </nav>
                </div>
            </header>
            <style>
                .header {
                    background: rgba(20, 20, 20, 0.4);
                    padding: 2rem 2rem 1.5rem 2rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(20px);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .header-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .logo {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #ffffff;
                    text-decoration: none;
                    letter-spacing: -0.02em;
                }
                .nav-links {
                    display: flex;
                    gap: 2rem;
                    align-items: center;
                }
                .nav-link {
                    color: #a3a3a3;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 0.95rem;
                    transition: color 0.3s ease;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                }
                .nav-link:hover, .nav-link.active {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.05);
                }
            </style>
        `;
        document.body.insertAdjacentHTML('afterbegin', fallbackHeader);
        
        // Set active state for fallback header
        setTimeout(() => {
            const currentPath = window.location.pathname;
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => link.classList.remove('active'));
            
            if (currentPath === '/' || currentPath === '/index.html') {
                const homeLink = document.querySelector('[href="/"]');
                if (homeLink) homeLink.classList.add('active');
            } else if (currentPath.includes('/manager')) {
                const blogLink = document.querySelector('[href="/manager"]');
                if (blogLink) blogLink.classList.add('active');
            } else if (currentPath.includes('/faq-manager')) {
                const faqLink = document.querySelector('[href="/faq-manager"]');
                if (faqLink) faqLink.classList.add('active');
            } else if (currentPath.includes('/job-manager')) {
                const jobLink = document.querySelector('[href="/job-manager"]');
                if (jobLink) jobLink.classList.add('active');
            } else if (currentPath.includes('/creator_showcase')) {
                const creatorLink = document.querySelector('[href="/creator_showcase"]');
                if (creatorLink) creatorLink.classList.add('active');
            } else if (currentPath.includes('/tweets')) {
                const tweetsLink = document.querySelector('[href="/tweets"]');
                if (tweetsLink) tweetsLink.classList.add('active');
            }
        }, 100);
    }
}

// Load header when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
} else {
    loadHeader();
}

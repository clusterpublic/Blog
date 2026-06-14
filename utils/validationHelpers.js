export function validateInstagramUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/,
    /^https?:\/\/(?:www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+\/?$/,
    /^https?:\/\/(?:www\.)?instagram\.com\/tv\/[A-Za-z0-9_-]+\/?$/,
  ];
  return patterns.some((p) => p.test(url));
}

export function validateTwitterUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?twitter\.com\/\w+\/status\/\d+$/,
    /^https?:\/\/(?:www\.)?x\.com\/\w+\/status\/\d+$/,
    /^https?:\/\/twitter\.com\/\w+\/status\/\d+$/,
    /^https?:\/\/x\.com\/\w+\/status\/\d+$/,
  ];
  return patterns.some((p) => p.test(url));
}

export function validateYoutubeUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]+$/,
    /^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+$/,
    /^https?:\/\/youtube\.com\/watch\?v=[A-Za-z0-9_-]+$/,
    /^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+$/,
    /^https?:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+$/,
    /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]+$/,
  ];
  return patterns.some((p) => p.test(url));
}

export function generateEmbedUrl(postUrl, platform) {
  if (platform === 'instagram') {
    if (postUrl.includes('/p/')) {
      const postId = postUrl.split('/p/')[1].split('/')[0].split('?')[0];
      return `https://www.instagram.com/p/${postId}/embed/`;
    }
    if (postUrl.includes('/reel/')) {
      const postId = postUrl.split('/reel/')[1].split('/')[0].split('?')[0];
      return `https://www.instagram.com/reel/${postId}/embed/`;
    }
    if (postUrl.includes('/tv/')) {
      const postId = postUrl.split('/tv/')[1].split('/')[0].split('?')[0];
      return `https://www.instagram.com/tv/${postId}/embed/`;
    }
    return postUrl;
  }
  if (platform === 'twitter') {
    const tweetId = extractTweetId(postUrl);
    return tweetId ? `https://twitter.com/i/status/${tweetId}` : postUrl;
  }
  if (platform === 'youtube') {
    let videoId = null;
    if (postUrl.includes('youtube.com/watch?v=')) {
      videoId = postUrl.split('v=')[1].split('&')[0];
    } else if (postUrl.includes('youtu.be/')) {
      videoId = postUrl.split('youtu.be/')[1].split('?')[0];
    } else if (postUrl.includes('youtube.com/shorts/')) {
      videoId = postUrl.split('shorts/')[1].split('?')[0];
    } else if (postUrl.includes('youtube.com/embed/')) {
      videoId = postUrl.split('embed/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : postUrl;
  }
  return postUrl;
}

export function extractTweetId(tweetUrl) {
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
    /twitter\.com\/\w+\/statuses\/(\d+)/,
    /x\.com\/\w+\/statuses\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = tweetUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractSpaceId(spaceUrl) {
  const patterns = [
    /twitter\.com\/i\/spaces\/([A-Za-z0-9_-]+)/,
    /x\.com\/i\/spaces\/([A-Za-z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = spaceUrl.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isSpaceUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?twitter\.com\/i\/spaces\/[A-Za-z0-9_-]+$/,
    /^https?:\/\/(?:www\.)?x\.com\/i\/spaces\/[A-Za-z0-9_-]+$/,
  ];
  return patterns.some((p) => p.test(url));
}

export function validateApplicationFormData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['No data received or invalid data format'], warnings: [] };
  }

  const requiredFields = ['fullName', 'email', 'educationLevel', 'yearsExperience', 'resumeUrl', 'jobId'];
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      errors.push(`${field} is required and cannot be empty`);
    }
  }

  if (data.fullName && typeof data.fullName === 'string') {
    const trimmed = data.fullName.trim();
    if (trimmed.length < 2) errors.push('Full name must be at least 2 characters long');
    if (trimmed.length > 100) errors.push('Full name cannot exceed 100 characters');
    if (!/^[a-zA-Z\s\-'.]+$/.test(trimmed)) errors.push('Full name contains invalid characters');
  }

  if (data.email && typeof data.email === 'string') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.push('Invalid email format');
    if (data.email.length > 254) errors.push('Email address is too long');
  }

  const validEducation = ['high-school', 'associate', 'bachelor', 'master', 'phd', 'other'];
  if (data.educationLevel && !validEducation.includes(data.educationLevel)) {
    errors.push('Invalid education level selected');
  }

  const validExperience = ['0-1', '1-2', '2-3', '3-5', '5-7', '7-10', '10+'];
  if (data.yearsExperience && !validExperience.includes(data.yearsExperience)) {
    errors.push('Invalid years of experience selected');
  }

  if (data.resumeUrl && typeof data.resumeUrl === 'string') {
    try {
      const parsed = new URL(data.resumeUrl.trim());
      if (!parsed.hostname.includes('drive.google.com')) errors.push('Resume URL must be a Google Drive link');
      if (parsed.protocol !== 'https:') errors.push('Resume URL must use HTTPS protocol');
    } catch {
      errors.push('Invalid resume URL format');
    }
  }

  if (data.linkedinUrl && data.linkedinUrl.trim()) {
    try {
      const parsed = new URL(data.linkedinUrl.trim());
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();
      if (!['www.linkedin.com', 'linkedin.com'].includes(hostname) || !pathname.startsWith('/in/') || pathname.split('/').length < 3) {
        warnings.push('LinkedIn URL format appears invalid');
      }
    } catch {
      warnings.push('Invalid LinkedIn URL format');
    }
  }

  if (data.twitterUrl && data.twitterUrl.trim()) {
    try {
      const parsed = new URL(data.twitterUrl.trim());
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;
      const validHostnames = ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'];
      if (!validHostnames.includes(hostname) || pathname.length <= 1 || pathname.endsWith('/')) {
        warnings.push('Twitter/X URL format appears invalid');
      }
    } catch {
      warnings.push('Invalid Twitter/X URL format');
    }
  }

  if (data.fullName && data.fullName.length > 500) errors.push('Full name is suspiciously long');

  const suspiciousPatterns = [
    /<script/i, /javascript:/i, /on\w+\s*=/i, /union\s+select/i, /drop\s+table/i, /delete\s+from/i,
  ];
  const textFields = [data.fullName, data.email, data.resumeUrl, data.linkedinUrl, data.twitterUrl];
  for (const field of textFields) {
    if (field && typeof field === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(field)) {
          errors.push('Suspicious content detected in form data');
          break;
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function sanitizeApplicationData(data) {
  return {
    fullName: (data.fullName || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    educationLevel: data.educationLevel || '',
    yearsExperience: data.yearsExperience || '',
    resumeUrl: (data.resumeUrl || '').trim(),
    linkedinUrl: (data.linkedinUrl || '').trim(),
    twitterUrl: (data.twitterUrl || '').trim(),
    jobId: (data.jobId || '').trim(),
  };
}

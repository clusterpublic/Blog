/**
 * Converts between Cluster blog markdown and HTML for Quill.
 * Preserves the format used by the live site (BlogPageClient parseContent).
 */
(function (global) {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function inlineMarkdownToHtml(line) {
    let t = escapeHtml(line);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/__(.+?)__/g, '<u>$1</u>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return t;
  }

  function markdownToHtml(markdown) {
    if (!markdown || !markdown.trim()) return '<p><br></p>';

    const lines = markdown.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('!{') && line.includes('}(') && line.endsWith(')')) {
        const alt = line.slice(2, line.indexOf('}('));
        const url = line.slice(line.indexOf('}(') + 2, -1);
        blocks.push(`<p><img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}"></p>`);
        i += 1;
        continue;
      }

      if (line.startsWith('##') && line.endsWith('##') && line.length > 4) {
        blocks.push(`<h2>${escapeHtml(line.slice(2, -2))}</h2>`);
        i += 1;
        continue;
      }

      if (line.startsWith('````') && line.endsWith('````') && line.length > 8) {
        blocks.push(`<blockquote>${escapeHtml(line.slice(4, -4))}</blockquote>`);
        i += 1;
        continue;
      }

      if (line.startsWith('```') && line.endsWith('```') && line.length > 6) {
        blocks.push(`<pre>${escapeHtml(line.slice(3, -3))}</pre>`);
        i += 1;
        continue;
      }

      if (line.startsWith('~')) {
        const items = [];
        while (i < lines.length && lines[i].startsWith('~')) {
          items.push(`<li>${inlineMarkdownToHtml(lines[i].slice(1).trim())}</li>`);
          i += 1;
        }
        blocks.push(`<ul>${items.join('')}</ul>`);
        continue;
      }

      if (!line.trim()) {
        blocks.push('<p><br></p>');
        i += 1;
        continue;
      }

      blocks.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
      i += 1;
    }

    return blocks.join('') || '<p><br></p>';
  }

  function inlineHtmlToMarkdown(html) {
    if (!html) return '';
    let t = html;
    t = t.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    t = t.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    t = t.replace(/<u>(.*?)<\/u>/gi, '__$1__');
    t = t.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    t = t.replace(/<i>(.*?)<\/i>/gi, '*$1*');
    t = t.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    t = t.replace(/<br\s*\/?>/gi, '');
    t = t.replace(/<\/?span[^>]*>/gi, '');
    return t.trim();
  }

  function getCleanBlockText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.ql-ui, [contenteditable="false"]').forEach((el) => el.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function htmlToMarkdown(html) {
    if (!html || !html.trim()) return '';

    const container = document.createElement('div');
    container.innerHTML = html;
    const lines = [];

    container.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) lines.push(text);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.nodeName.toLowerCase();

      if (tag === 'p') {
        const text = node.textContent.trim();
        const img = node.querySelector('img');
        if (img) {
          lines.push(`!{${img.getAttribute('alt') || ''}}(${img.getAttribute('src') || ''})`);
          return;
        }
        if (!text) {
          lines.push('');
          return;
        }
        lines.push(inlineHtmlToMarkdown(node.innerHTML));
        return;
      }

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        lines.push(`##${getCleanBlockText(node)}##`);
        return;
      }

      if (tag === 'blockquote') {
        lines.push('````' + getCleanBlockText(node) + '````');
        return;
      }

      if (tag === 'pre') {
        lines.push('```' + getCleanBlockText(node) + '```');
        return;
      }

      if (tag === 'ul' || tag === 'ol') {
        node.querySelectorAll('li').forEach((li) => {
          lines.push('~' + inlineHtmlToMarkdown(li.innerHTML));
        });
        return;
      }

      if (tag === 'img') {
        lines.push(`!{${node.getAttribute('alt') || ''}}(${node.getAttribute('src') || ''})`);
        return;
      }

      const fallback = node.textContent.trim();
      if (fallback) lines.push(fallback);
    });

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  global.BlogContentFormat = {
    markdownToHtml,
    htmlToMarkdown,
  };
})(window);

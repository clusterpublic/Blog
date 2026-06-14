/**
 * Quill rich-text editor with custom Lucide toolbar (same core as React Quill).
 */
(function (global) {
  let quillInstance = null;
  let isSyncing = false;
  let isProgrammaticLoad = false;

  const PASTE_IMAGE_MESSAGE =
    'We only accept image URLs. Use the image button in the toolbar and paste a link instead.';

  function registerUnderline() {
    if (!global.Quill) return;
    const Inline = Quill.import('blots/inline');
    class UnderlineBlot extends Inline {
      static create(value) {
        return super.create(value);
      }
      static formats() {
        return true;
      }
    }
    UnderlineBlot.blotName = 'underline';
    UnderlineBlot.tagName = 'u';
    Quill.register(UnderlineBlot, true);
  }

  function syncToTextarea() {
    if (!quillInstance) return;
    const textarea = document.getElementById('blogContent');
    if (!textarea) return;
    isSyncing = true;
    textarea.value = global.BlogContentFormat.htmlToMarkdown(quillInstance.root.innerHTML);
    isSyncing = false;
  }

  function getLinkTooltip() {
    return quillInstance && quillInstance.theme && quillInstance.theme.tooltip;
  }

  function openDefaultLinkEditor(range) {
    const tooltip = getLinkTooltip();
    if (!tooltip || !range) return false;

    let preview = quillInstance.getText(range);
    if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf('mailto:') !== 0) {
      preview = 'mailto:' + preview;
    }
    const current = quillInstance.getFormat(range).link;
    quillInstance.setSelection(range.index, range.length, 'user');
    tooltip.linkRange = range;
    tooltip.edit('link', current || preview);
    return true;
  }

  function setupLinkClickHandler() {
    quillInstance.root.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !quillInstance.root.contains(anchor)) return;

      e.preventDefault();

      const linkBlot = Quill.find(anchor);
      if (!linkBlot) return;

      const index = quillInstance.getIndex(linkBlot);
      quillInstance.setSelection(index, 0, 'user');
    });
  }

  function setupCustomToolbar() {
    const toolbar = document.getElementById('editorToolbar');
    const headerSelect = document.getElementById('headerFormat');
    if (!toolbar || !quillInstance) return;

    toolbar.querySelectorAll('[data-format]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const format = btn.getAttribute('data-format');
        const range = quillInstance.getSelection(true);
        if (!range) return;

        if (format === 'bold' || format === 'italic' || format === 'underline') {
          const current = quillInstance.getFormat(range)[format];
          quillInstance.format(format, !current);
        } else if (format === 'blockquote' || format === 'code-block') {
          const current = quillInstance.getFormat(range)[format];
          quillInstance.format(format, !current);
        } else if (format === 'list') {
          const current = quillInstance.getFormat(range).list;
          quillInstance.format('list', current === 'bullet' ? false : 'bullet');
        } else if (format === 'clean') {
          quillInstance.removeFormat(range.index, range.length);
        } else if (format === 'link') {
          openDefaultLinkEditor(range);
        } else if (format === 'image') {
          const url = prompt('Enter image URL:');
          if (!url) return;
          const alt = prompt('Enter alt text:', '') || '';
          quillInstance.insertEmbed(range.index, 'image', url, 'user');
          quillInstance.insertText(range.index + 1, '\n', 'user');
          const imgs = quillInstance.root.querySelectorAll('img');
          const img = imgs[imgs.length - 1];
          if (img) img.setAttribute('alt', alt);
        }
      });
    });

    if (headerSelect) {
      headerSelect.addEventListener('change', () => {
        const value = headerSelect.value;
        quillInstance.format('header', value === '2' ? 2 : false);
        quillInstance.focus();
      });
    }

    quillInstance.on('selection-change', (range) => {
      if (!range || !headerSelect) return;
      const header = quillInstance.getFormat(range).header;
      headerSelect.value = header === 2 ? '2' : '';
    });
  }

  function setupPasteImageBlock() {
    const root = quillInstance.root;
    const Delta = Quill.import('delta');

    root.addEventListener('paste', (e) => {
      if (isProgrammaticLoad) return;

      const clipboard = e.clipboardData;
      if (!clipboard) return;

      const hasImageFile = Array.from(clipboard.items || []).some((item) =>
        item.type.startsWith('image/')
      );
      const html = clipboard.getData('text/html') || '';
      const hasPastedImageTag = /<img[\s>]/i.test(html);

      if (hasImageFile || hasPastedImageTag) {
        e.preventDefault();
        e.stopImmediatePropagation();
        alert(PASTE_IMAGE_MESSAGE);
      }
    }, true);

    root.addEventListener('drop', (e) => {
      const hasImageFile = Array.from(e.dataTransfer?.files || []).some((file) =>
        file.type.startsWith('image/')
      );
      if (hasImageFile) {
        e.preventDefault();
        e.stopPropagation();
        alert(PASTE_IMAGE_MESSAGE);
      }
    });

    quillInstance.clipboard.addMatcher('IMG', (node, delta) => {
      if (isProgrammaticLoad) return delta;
      alert(PASTE_IMAGE_MESSAGE);
      return new Delta();
    });
  }

  function initQuillEditor() {
    if (quillInstance || !global.Quill || !global.BlogContentFormat) return quillInstance;

    registerUnderline();

    quillInstance = new Quill('#quillEditor', {
      theme: 'snow',
      placeholder: 'Write your blog content here...',
      formats: [
        'header', 'bold', 'italic', 'underline', 'link', 'image',
        'blockquote', 'code-block', 'list', 'bullet',
      ],
      modules: {
        // Hidden toolbar bootstraps Quill's default Snow link popover
        toolbar: { container: '#quillLinkToolbarHost' },
      },
    });

    setupCustomToolbar();
    setupPasteImageBlock();
    setupLinkClickHandler();

    quillInstance.on('text-change', () => {
      if (isSyncing) return;
      syncToTextarea();
    });

    return quillInstance;
  }

  function setQuillFromMarkdown(markdown) {
    if (!quillInstance || !global.BlogContentFormat) return;
    isSyncing = true;
    isProgrammaticLoad = true;
    const html = global.BlogContentFormat.markdownToHtml(markdown || '');
    quillInstance.setContents([]);
    quillInstance.clipboard.dangerouslyPasteHTML(html);
    syncToTextarea();
    isProgrammaticLoad = false;
    isSyncing = false;
    const headerSelect = document.getElementById('headerFormat');
    if (headerSelect) headerSelect.value = '';
  }

  function getMarkdownFromQuill() {
    syncToTextarea();
    const textarea = document.getElementById('blogContent');
    return textarea ? textarea.value : '';
  }

  global.BlogQuillEditor = {
    init: initQuillEditor,
    setFromMarkdown: setQuillFromMarkdown,
    getMarkdown: getMarkdownFromQuill,
    getInstance: () => quillInstance,
  };
})(window);

/**
 * Styled confirm dialog for admin actions (replaces silent deletes when password is stored).
 */
(function (global) {
  let modalEl = null;
  let resolveFn = null;

  function finish(result) {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    const resolve = resolveFn;
    resolveFn = null;
    if (resolve) resolve(result);
  }

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'adminConfirmModal';
    modalEl.className = 'modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML = `
      <div class="modal-content confirm-dialog">
        <div class="modal-header">
          <h2 class="modal-title" id="adminConfirmTitle">Confirm</h2>
          <button type="button" class="modal-close" id="adminConfirmClose" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="confirm-dialog-message" id="adminConfirmMessage"></p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary btn-small" id="adminConfirmCancel">Cancel</button>
          <button type="button" class="btn btn-primary btn-small" id="adminConfirmOk">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) finish(false);
    });
    modalEl.querySelector('#adminConfirmClose').addEventListener('click', () => finish(false));
    modalEl.querySelector('#adminConfirmCancel').addEventListener('click', () => finish(false));
    modalEl.querySelector('#adminConfirmOk').addEventListener('click', () => finish(true));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) finish(false);
    });

    return modalEl;
  }

  function ask(options) {
    const opts =
      typeof options === 'string'
        ? { message: options }
        : options || {};

    const {
      title = 'Confirm',
      message = 'Are you sure?',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      destructive = false,
    } = opts;

    ensureModal();
    modalEl.querySelector('#adminConfirmTitle').textContent = title;
    modalEl.querySelector('#adminConfirmMessage').innerHTML = message;

    const okBtn = modalEl.querySelector('#adminConfirmOk');
    okBtn.textContent = confirmLabel;
    okBtn.className = destructive
      ? 'btn btn-danger btn-small'
      : 'btn btn-primary btn-small';

    modalEl.querySelector('#adminConfirmCancel').textContent = cancelLabel;

    return new Promise((resolve) => {
      resolveFn = resolve;
      modalEl.classList.add('open');
      window.refreshIcons?.();
      okBtn.focus();
    });
  }

  global.AdminConfirm = { ask };
})(window);

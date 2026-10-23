/*
 * Progressive enhancement for the server-rendered pages.
 *
 * Every page works without JavaScript (plain forms that POST and redirect).
 * When this script runs it adds, driven only by data attributes:
 *   [data-open="dialogId"]  opens a <dialog>; data-record (JSON) pre-fills it
 *   [data-close]            closes the surrounding dialog
 *   form[data-endpoint]     submits as JSON to the REST API instead of the form action
 *   [data-filter]           live search / select filtering of [data-item] rows
 *   form[data-confirm]      asks for confirmation before a plain form submit
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- toasts
  function toast(message, type) {
    let host = document.querySelector('.toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = 'toast toast--' + (type || 'success');
    item.textContent = message;
    host.appendChild(item);
    setTimeout(function () { item.classList.add('is-leaving'); }, 3500);
    setTimeout(function () { item.remove(); }, 3900);
  }

  // --------------------------------------------------------------- dialogs
  function fillDialog(dialog, opener) {
    const form = dialog.querySelector('form');
    const record = opener.dataset.record ? JSON.parse(opener.dataset.record) : null;
    const isEdit = opener.dataset.mode === 'edit';

    if (form) {
      if (!form.dataset.defaultAction) {
        form.dataset.defaultAction = form.getAttribute('action');
        form.dataset.defaultEndpoint = form.dataset.endpoint;
        form.dataset.defaultMethod = form.dataset.method;
        form.dataset.defaultSuccess = form.dataset.success;
      }
      form.reset();
      hideError(form);
      form.setAttribute('action', opener.dataset.action || form.dataset.defaultAction);
      form.dataset.endpoint = opener.dataset.endpoint || form.dataset.defaultEndpoint;
      form.dataset.method = isEdit ? form.dataset.editMethod : form.dataset.defaultMethod;
      form.dataset.success = isEdit ? form.dataset.editSuccess : form.dataset.defaultSuccess;

      if (record) {
        Object.keys(record).forEach(function (key) {
          const field = form.elements.namedItem(key);
          if (field && record[key] !== null && record[key] !== undefined) field.value = record[key];
        });
      }
      // opener can preset single fields, e.g. data-preset='{"jobId":"..."}'
      if (opener.dataset.preset) {
        const preset = JSON.parse(opener.dataset.preset);
        Object.keys(preset).forEach(function (key) {
          const field = form.elements.namedItem(key);
          if (field) field.value = preset[key];
        });
      }
    }

    const title = dialog.querySelector('[data-title-create]');
    if (title) title.textContent = isEdit ? title.dataset.titleEdit : title.dataset.titleCreate;

    dialog.querySelectorAll('[data-field]').forEach(function (el) {
      const value = record ? record[el.dataset.field] : '';
      el.textContent = value === null || value === undefined || value === '' ? '—' : value;
    });
  }

  document.addEventListener('click', function (event) {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.open);
      if (dialog && typeof dialog.showModal === 'function') {
        event.preventDefault();
        fillDialog(dialog, opener);
        dialog.showModal();
        const first = dialog.querySelector('input:not([type=hidden]), select, textarea');
        if (first) first.focus();
      }
      return;
    }

    const closer = event.target.closest('[data-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog) dialog.close();
      return;
    }

    const dismiss = event.target.closest('[data-dismiss]');
    if (dismiss) dismiss.parentElement.remove();
  });

  // clicking the dark backdrop closes a dialog
  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  // ----------------------------------------------------------- API submits
  function hideError(form) {
    const box = form.querySelector('.form-error');
    if (box) { box.hidden = true; box.textContent = ''; }
  }

  function showError(form, message) {
    const box = form.querySelector('.form-error');
    if (box) { box.textContent = message; box.hidden = false; }
  }

  function serialize(form) {
    const data = {};
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name || field.disabled || field.type === 'submit') return;
      if (field.type === 'number') data[field.name] = field.value === '' ? null : Number(field.value);
      else data[field.name] = field.value;
    });
    return data;
  }

  // API errors look like { error, message, details?: [{ field, message }] }
  function describeError(payload, status) {
    if (payload && Array.isArray(payload.details) && payload.details.length) {
      return payload.details.map(function (d) { return d.message; }).join(', ');
    }
    if (payload && payload.message) return payload.message;
    return 'Request failed (HTTP ' + status + ')';
  }

  document.addEventListener('submit', function (event) {
    const form = event.target;

    if (form.dataset.confirm && !form.dataset.endpoint) {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
      return;
    }
    if (!form.dataset.endpoint) return;

    event.preventDefault();
    hideError(form);
    const method = (form.dataset.method || 'POST').toUpperCase();
    const submit = form.querySelector('[type=submit]');
    if (submit) submit.disabled = true;

    fetch(form.dataset.endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(serialize(form)),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (payload) {
          if (!res.ok) throw new Error(describeError(payload, res.status));
          const target = form.dataset.redirect || window.location.pathname;
          window.location.assign(target + '?status=' + encodeURIComponent(form.dataset.success || 'updated'));
        });
      })
      .catch(function (err) {
        showError(form, err.message);
        toast(err.message, 'error');
      })
      .finally(function () {
        if (submit) submit.disabled = false;
      });
  });

  // -------------------------------------------------------------- filters
  function applyFilters(target) {
    const container = document.querySelector(target);
    if (!container) return;
    const controls = document.querySelectorAll('[data-filter="' + target + '"]');
    let visible = 0;

    container.querySelectorAll('[data-item]').forEach(function (item) {
      const match = Array.prototype.every.call(controls, function (control) {
        const value = control.value.trim().toLowerCase();
        if (!value) return true;
        const key = control.dataset.key;
        if (key === 'search') return (item.dataset.search || '').indexOf(value) !== -1;
        return (item.dataset[key] || '') === value;
      });
      item.hidden = !match;
      if (match) visible += 1;
    });

    const empty = document.querySelector('[data-empty-for="' + target + '"]');
    if (empty) empty.hidden = visible > 0;
  }

  document.querySelectorAll('[data-filter]').forEach(function (control) {
    control.addEventListener('input', function () { applyFilters(control.dataset.filter); });
  });

  // ----------------------------------------------------------- flash/query
  // the flash banner is rendered by the server; drop ?status / ?error from
  // the URL so a page refresh does not show it again
  if (document.querySelector('[data-flash]') && window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }
})();

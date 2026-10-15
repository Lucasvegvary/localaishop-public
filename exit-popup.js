/* exit-popup.js: the "before you go" email offer on /book and /examples.
   Loaded with `defer` after carry.js. One copy of the logic for both pages.

   The email form is a GoHighLevel form shown inside this pop-up in an iframe. Its heading, wording,
   fields, button and thank-you message are written in GoHighLevel, not here. This file only opens and
   closes the pop-up and passes the letter's tags to the form.

   LAS_POPUP_GHL_FORM_ID: the id of that form (the part after /widget/form/ in its embed code).
   While it is empty, the pop-up never appears on the live site, and on localhost it opens a preview
   placeholder that loads nothing from GoHighLevel.
   Setup notes live in the private workshop repo (LAUNCH.md), not in this public file. */
var LAS_POPUP_GHL_FORM_ID = '';
var LAS_POPUP_GHL_BASE = 'https://api.leadconnectorhq.com/widget/form/';
var LAS_POPUP_GHL_EMBED = 'https://link.msgsndr.com/js/form_embed.js';

(function () {
  'use strict';
  var FORM_ID = LAS_POPUP_GHL_FORM_ID;
  var PREVIEW_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  var LIVE = /^[A-Za-z0-9]{6,64}$/.test(FORM_ID);
  var PREVIEW = !LIVE && PREVIEW_HOSTS.test(window.location.hostname);
  var ARM_MS = 20000;            // phones: the scroll-up trigger waits this long on the page
  var KEY_SHOWN = 'las_exit_popup_shown';
  var KEY_BOOKED = 'las_booked';
  var mem = {};

  function get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function set(k) { try { window.sessionStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } mem[k] = '1'; }

  // Same rules as carry.js: only utm_* and code, only plain values.
  var TAG_KEY = /^(utm_(source|medium|campaign|content|term|id)|code)$/;
  var TAG_VALUE = /^[A-Za-z0-9._~-]{1,100}$/;
  function tags() {
    var out = {};
    if (!window.URLSearchParams) { return out; }
    new URLSearchParams(window.location.search).forEach(function (v, k) {
      if (TAG_KEY.test(k) && TAG_VALUE.test(v) && !(k in out)) { out[k] = v; }
    });
    return out;
  }

  // Anyone who clicks a booking link never sees the pop-up afterwards.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-book]') : null;
    if (a) { set(KEY_BOOKED); }
  }, true);

  var api = { live: LIVE, preview: PREVIEW, armMs: ARM_MS, start: Date.now() };
  window.lasExitPopup = api;
  if (!LIVE && !PREVIEW) { return; }

  var CSS =
    '.xp{border:0;padding:0;margin:auto;border-radius:14px;max-width:420px;width:calc(100% - 32px);max-height:calc(100% - 32px);overflow:auto;background:#faf9f6;color:#111418;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
    '.xp::backdrop{background:rgba(17,20,24,.55)}' +
    '.xp-shell{padding:44px 12px 14px;position:relative}' +
    '.xp-x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;background:transparent;font-size:28px;line-height:1;color:#5d6570;cursor:pointer;border-radius:8px;z-index:2}' +
    '.xp-x:hover,.xp-x:focus-visible{background:#ece8e1;color:#111418}' +
    '.xp-frame{display:block;width:100%;height:420px;min-height:320px;border:0;background:transparent}' +
    '.xp-preview{margin:0 12px 8px;padding:20px 16px;border:1px dashed #cfc9bf;border-radius:10px;font-size:15px;line-height:1.5;color:#2e343b}' +
    '.xp-no{display:block;margin:6px auto 0;border:0;background:transparent;color:#5d6570;font-size:14px;text-decoration:underline;cursor:pointer;padding:8px}';

  var dlg, shell, lastFocus, closedOnce = false;

  // The GoHighLevel form's address, with the letter's tags (and where the visit came from) on the end,
  // so hidden fields of the same names in the form can record them.
  function formSrc() {
    var t = tags(), q = [];
    Object.keys(t).forEach(function (k) { q.push(encodeURIComponent(k) + '=' + encodeURIComponent(t[k])); });
    q.push('source=exit-popup');
    if (t.utm_content) { q.push('letter_id=' + encodeURIComponent(t.utm_content)); }
    q.push('page=' + encodeURIComponent(window.location.pathname));
    return LAS_POPUP_GHL_BASE + encodeURIComponent(FORM_ID) + '?' + q.join('&');
  }

  // GoHighLevel's own script resizes the iframe to fit the form. Loaded once, and only when the pop-up opens.
  function loadEmbed() {
    if (document.querySelector('script[data-las-ghl-embed]')) { return; }
    var s = document.createElement('script');
    s.src = LAS_POPUP_GHL_EMBED;
    s.async = true;
    s.setAttribute('data-las-ghl-embed', '1');
    document.body.appendChild(s);
  }

  function addFrame() {
    var id = 'inline-' + FORM_ID;
    var f = document.createElement('iframe');
    f.className = 'xp-frame';
    f.id = id;
    f.title = 'Email sign-up form';
    f.setAttribute('data-layout', "{'id':'INLINE'}");
    f.setAttribute('data-trigger-type', 'alwaysShow');
    f.setAttribute('data-trigger-value', '');
    f.setAttribute('data-activation-type', 'alwaysActivated');
    f.setAttribute('data-activation-value', '');
    f.setAttribute('data-deactivation-type', 'neverDeactivate');
    f.setAttribute('data-deactivation-value', '');
    f.setAttribute('data-form-name', 'Email sign-up');
    f.setAttribute('data-height', '420');
    f.setAttribute('data-layout-iframe-id', id);
    f.setAttribute('data-form-id', FORM_ID);
    f.src = formSrc();
    shell.insertBefore(f, shell.querySelector('.xp-no'));
    loadEmbed();
  }

  function addPreview() {
    var d = document.createElement('p');
    d.className = 'xp-preview';
    d.setAttribute('role', 'status');
    d.textContent = 'Preview only: the email form is not connected yet, so nothing loads here.';
    shell.insertBefore(d, shell.querySelector('.xp-no'));
  }

  function build() {
    if (dlg) { return dlg; }
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    dlg = document.createElement('dialog');
    dlg.className = 'xp';
    dlg.id = 'exit-popup';
    dlg.setAttribute('aria-label', 'Email sign-up');
    dlg.innerHTML =
      '<div class="xp-shell">' +
        '<button type="button" class="xp-x" aria-label="Close">&times;</button>' +
        '<button type="button" class="xp-no">No thanks</button>' +
      '</div>';
    document.body.appendChild(dlg);
    shell = dlg.querySelector('.xp-shell');
    dlg.querySelector('.xp-x').addEventListener('click', close);
    dlg.querySelector('.xp-no').addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { close(); } });  // tap outside the card
    if (LIVE) { addFrame(); } else { addPreview(); }
    return dlg;
  }

  function canShow() {
    return !closedOnce && !get(KEY_SHOWN) && !get(KEY_BOOKED) &&
      typeof document.createElement('dialog').showModal === 'function';
  }

  function open() {
    if (!canShow() || (dlg && dlg.open)) { return false; }
    build();
    set(KEY_SHOWN);
    lastFocus = document.activeElement;
    dlg.showModal();
    dlg.querySelector('.xp-x').focus();
    return true;
  }

  function close() {
    if (!dlg || !dlg.open) { return; }
    closedOnce = true;
    dlg.close();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
  }

  // Desktop: the pointer leaves through the top of the window (toward the tabs or the back button).
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && e.clientY <= 0) { open(); }
  });

  // Phones: a quick scroll back up, after at least ARM_MS on the page.
  var up = null, lastY = null, maxY = 0;
  function scrollSample(y, t) {
    if (y > maxY) { maxY = y; }
    if (lastY !== null && y < lastY) {
      if (!up) { up = { y: lastY, t: t }; }
      var dist = up.y - y, ms = t - up.t;
      var far = Math.max(150, (window.innerHeight || 600) * 0.3);
      if (t - api.start >= ARM_MS && maxY > (window.innerHeight || 600) * 0.5 && dist >= far && ms <= 400) {
        up = null;
        lastY = y;
        return open();
      }
      if (ms > 400) { up = { y: lastY, t: t }; }
    } else {
      up = null;
    }
    lastY = y;
    return false;
  }
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (touch) {
    window.addEventListener('scroll', function () { scrollSample(window.scrollY || window.pageYOffset || 0, Date.now()); }, { passive: true });
  }
  // The back button is left alone on purpose: catching it means faking a history entry, which traps the visitor.

  api.open = open;
  api.close = close;
  api.isOpen = function () { return !!(dlg && dlg.open); };
  api.scrollSample = scrollSample;
})();

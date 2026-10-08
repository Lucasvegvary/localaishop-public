/* exit-popup.js: the "before you go" email offer on /book and /examples.
   Loaded with `defer` after carry.js. One copy of the wording and logic for both pages.

   LAS_POPUP_ENDPOINT: where the form posts. While it is empty, the pop-up never appears
   on the live site, and on localhost it opens in preview mode and sends nothing.
   Setup notes live in the private workshop repo (LAUNCH.md), not in this public file. */
var LAS_POPUP_ENDPOINT = '';

(function () {
  'use strict';
  var ENDPOINT = LAS_POPUP_ENDPOINT;
  var PREVIEW_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  var LIVE = /^https?:\/\//i.test(ENDPOINT);
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

  var HTML =
    '<form class="xp-form" method="dialog" novalidate>' +
      '<button type="button" class="xp-x" aria-label="Close">&times;</button>' +
      '<h2 class="xp-h" id="xp-title">Not ready to talk yet?</h2>' +
      '<p class="xp-p">Get practical ways AI can help a business like yours run on jet fuel. Short emails from me, Lucas, here in Napa. Unsubscribe anytime.</p>' +
      '<div class="xp-fields">' +
        '<label>Your name<input name="name" type="text" autocomplete="name" required maxlength="80"></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" required maxlength="120"></label>' +
        '<label>Business name <span class="xp-opt">(optional)</span><input name="business_name" type="text" autocomplete="organization" maxlength="120"></label>' +
        '<label class="xp-hp" aria-hidden="true">Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label>' +
        '<button type="submit" class="xp-btn">Send me the short emails</button>' +
        '<p class="xp-small">Email only, nothing by text. <a href="privacy.html">How I handle your details</a>.</p>' +
      '</div>' +
      '<p class="xp-msg" role="status" aria-live="polite"></p>' +
      '<button type="button" class="xp-no">No thanks</button>' +
    '</form>';

  var CSS =
    '.xp{border:0;padding:0;margin:auto;border-radius:14px;max-width:420px;width:calc(100% - 32px);max-height:calc(100% - 32px);overflow:auto;background:#faf9f6;color:#111418;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
    '.xp::backdrop{background:rgba(17,20,24,.55)}' +
    '.xp-form{padding:28px 24px 18px;position:relative}' +
    '.xp-x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;background:transparent;font-size:28px;line-height:1;color:#5d6570;cursor:pointer;border-radius:8px}' +
    '.xp-x:hover,.xp-x:focus-visible{background:#ece8e1;color:#111418}' +
    '.xp-h{font-family:Georgia,"Times New Roman",serif;font-size:23px;line-height:1.2;margin:0 36px 10px 0}' +
    '.xp-p{font-size:15.5px;line-height:1.55;color:#2e343b;margin:0 0 16px}' +
    '.xp-fields label{display:block;font-size:14px;font-weight:700;margin-bottom:12px}' +
    '.xp-fields input{display:block;width:100%;margin-top:5px;padding:12px;font-size:16px;border:1px solid #cfc9bf;border-radius:8px;background:#fff;color:#111418}' +
    '.xp-fields input:focus{outline:2px solid #c94f00;outline-offset:1px;border-color:#c94f00}' +
    '.xp-opt{font-weight:400;color:#5d6570}' +
    '.xp-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}' +
    '.xp-btn{display:block;width:100%;border:0;background:#c94f00;color:#fff;font-weight:700;font-size:16px;padding:15px 20px;border-radius:10px;cursor:pointer;margin-top:4px}' +
    '.xp-btn:hover{background:#a84200}' +
    '.xp-btn[disabled]{opacity:.6;cursor:default}' +
    '.xp-small{font-size:12.5px;color:#5d6570;margin:10px 0 0}' +
    '.xp-small a{color:#a84200}' +
    '.xp-msg{font-size:15px;font-weight:600;margin:12px 0 0;color:#0d8a4f}' +
    '.xp-msg:empty{display:none}' +
    '.xp-msg.err{color:#a84200}' +
    '.xp-no{display:block;margin:10px auto 0;border:0;background:transparent;color:#5d6570;font-size:14px;text-decoration:underline;cursor:pointer;padding:8px}';

  var dlg, form, msg, lastFocus, closedOnce = false;

  function build() {
    if (dlg) { return dlg; }
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    dlg = document.createElement('dialog');
    dlg.className = 'xp';
    dlg.id = 'exit-popup';
    dlg.setAttribute('aria-labelledby', 'xp-title');
    dlg.innerHTML = HTML;
    document.body.appendChild(dlg);
    form = dlg.querySelector('form');
    msg = dlg.querySelector('.xp-msg');
    dlg.querySelector('.xp-x').addEventListener('click', close);
    dlg.querySelector('.xp-no').addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) { close(); } });  // tap outside the card
    form.addEventListener('submit', submit);
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

  function say(text, isErr) { msg.textContent = text; msg.className = 'xp-msg' + (isErr ? ' err' : ''); }

  function submit(e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say('Please add your name and a working email.', true);
      (name ? form.elements.email : form.elements.name).focus();
      return;
    }
    var t = tags();
    var body = new URLSearchParams();
    body.append('name', name);
    body.append('email', email);
    body.append('business_name', form.elements.business_name.value.trim());
    body.append('source', 'exit-popup');
    body.append('letter_id', t.utm_content || '');
    Object.keys(t).forEach(function (k) { body.append(k, t[k]); });
    body.append('tags', ['exit-popup', t.utm_content].filter(Boolean).join(','));
    body.append('page', window.location.pathname);
    api.lastPayload = body.toString();
    var btn = form.querySelector('.xp-btn');
    function done() {
      dlg.querySelector('.xp-fields').style.display = 'none';
      say('Thanks, ' + name + '. Watch for an email from lucas@localaishop.com.');
      dlg.querySelector('.xp-no').textContent = 'Close';
    }
    if (form.elements.website.value) { done(); return; }              // a bot filled the hidden field
    if (!LIVE) { say('Preview only: this form is not connected to GoHighLevel yet, so nothing was sent.', true); return; }
    btn.disabled = true;
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: body })
      .then(done)
      .catch(function () {
        btn.disabled = false;
        say('That did not go through. You can email me at lucas@localaishop.com instead.', true);
      });
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

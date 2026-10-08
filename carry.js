/* carry.js: keeps a letter's tracking tag on the booking links.
   A letter's QR code opens localaishop.com/?utm_source=letter&utm_medium=mail&utm_content=<business>.
   This copies the utm_* values (and an optional short "code") from the page address onto every
   booking link and every link to another page of this site, so the booking calendar still sees
   which letter the visit came from after the click. It sets no cookies, stores nothing, and sends
   nothing anywhere: it only rewrites links on the page. Values that aren't plain letters, digits,
   dots, dashes, underscores or tildes (100 characters max) are ignored.
   Booking links are marked with the data-book attribute. */
(function () {
  'use strict';
  var KEY = /^(utm_(source|medium|campaign|content|term|id)|code)$/;
  var VALUE = /^[A-Za-z0-9._~-]{1,100}$/;

  function tags() {
    var out = [];
    if (!window.URLSearchParams || !window.URL) { return out; }
    new URLSearchParams(window.location.search).forEach(function (v, k) {
      if (KEY.test(k) && VALUE.test(v)) { out.push([k, v]); }
    });
    return out;
  }

  function carry(href, pairs) {
    if (!href || !pairs.length) { return href; }
    try {
      var u = new URL(href, window.location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'file:') { return href; }
      pairs.forEach(function (p) { if (!u.searchParams.has(p[0])) { u.searchParams.append(p[0], p[1]); } });
      return u.href;
    } catch (e) { return href; }
  }

  function isOwnPage(a) {
    var raw = a.getAttribute('href') || '';
    if (raw.charAt(0) === '#') { return false; }
    try {
      var u = new URL(raw, window.location.href);
      if (u.origin !== window.location.origin) { return false; }
      return /(\/|\.html)$/.test(u.pathname);
    } catch (e) { return false; }
  }

  window.lasCarry = function (href) { return carry(href, tags()); };

  function run() {
    var pairs = tags();
    if (!pairs.length) { return; }
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var raw = a.getAttribute('href');
      if (a.hasAttribute('data-book')) {
        if (/^https?:\/\//i.test(raw)) { a.setAttribute('href', carry(raw, pairs)); }
      } else if (isOwnPage(a)) {
        a.setAttribute('href', carry(raw, pairs));
      }
    }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', run); } else { run(); }
})();

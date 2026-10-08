/* Shared language switcher for the legal pages (privacy.html / terms.html).
   Mirrors the data-ar / data-en behaviour of index.html. */
(function () {
  'use strict';

  var langLabel = document.getElementById('lang-label');

  function currentLang() { return document.documentElement.getAttribute('lang'); }

  function applyStrings(lang) {
    document.querySelectorAll('[data-ar][data-en]').forEach(function (el) {
      var val = el.getAttribute('data-' + lang);
      if (el.tagName === 'META') { el.setAttribute('content', val); return; }
      el.textContent = val;
    });
    document.querySelectorAll('[data-ar-ph][data-en-ph]').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-' + lang + '-ph'));
    });
    var desc = document.querySelector('meta[name="description"]');
    if (desc && desc.getAttribute('data-' + lang)) {
      desc.setAttribute('content', desc.getAttribute('data-' + lang));
    }
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function switchLang(lang) {
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    applyStrings(lang);
    if (langLabel) langLabel.textContent = lang === 'ar' ? 'EN' : '\u0639';
    try { localStorage.setItem('ifiia-lang', lang); } catch (e) {}
  }

  var toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      switchLang(currentLang() === 'ar' ? 'en' : 'ar');
    });
  }

  try {
    var qLang = new URLSearchParams(location.search).get('lang');
    if (qLang === 'en' || qLang === 'ar') { switchLang(qLang); }
    else if (localStorage.getItem('ifiia-lang') === 'en') { switchLang('en'); }
    else { applyStrings(currentLang()); }
  } catch (e) { applyStrings(currentLang()); }
})();

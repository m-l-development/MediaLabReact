/* Media Lab – footer: reveal animation for static footers, and an optional link on «Design by Kristen Utvikling». */
(function () {
  if (window.MLFooter) return; window.MLFooter = 1;

  /* ▼ Lenke for «Design by Kristen Utvikling». La stå tom ('') for ingen lenke. Må starte med https:// */
  var FOOTER_URL = '';
  /* ▲ */

  var url = /^https:\/\/[^\s"'<>]+$/i.test(FOOTER_URL) ? FOOTER_URL : '';
  function linkify(span) {
    if (!url || span.getAttribute('data-ml-link')) return;
    span.setAttribute('data-ml-link', '1'); span.setAttribute('role', 'link'); span.setAttribute('tabindex', '0'); span.title = url.replace(/^https:\/\//, '').replace(/\/$/, '');
    span.style.cursor = 'pointer'; span.style.pointerEvents = 'auto';
    var go = function () { window.open(url, '_blank', 'noopener,noreferrer'); };
    span.addEventListener('click', go);
    span.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    span.addEventListener('mouseenter', function () { span.style.textDecoration = 'underline'; span.style.textUnderlineOffset = '4px'; });
    span.addEventListener('mouseleave', function () { span.style.textDecoration = 'none'; });
  }
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, seen = new WeakSet();
  function hook(f) {
    if (seen.has(f)) return; seen.add(f);
    var span = f.querySelector('span') || f; linkify(span);
    if (getComputedStyle(f).position === 'fixed') return;
    span.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1), letter-spacing .8s cubic-bezier(.2,.7,.2,1)';
    var ls = getComputedStyle(span).letterSpacing;
    var hide = function () { span.style.opacity = '0'; if (!still) { span.style.transform = 'translateY(14px)'; span.style.letterSpacing = 'calc(' + ls + ' + 0.18em)'; } };
    var show = function () { span.style.opacity = '1'; span.style.transform = 'none'; span.style.letterSpacing = ls; };
    hide();
    if (!('IntersectionObserver' in window)) { show(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) show(); else hide(); }); }, { threshold: 0.6 }).observe(f);
  }
  function scan() { var fs = document.querySelectorAll('footer'); for (var i = 0; i < fs.length; i++) hook(fs[i]); }
  function start() { scan(); new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

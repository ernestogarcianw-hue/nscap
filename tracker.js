/**
 * North Star Capital — GA4 Custom Event Tracker
 * Fires on top of the base GA4 snippet to capture:
 *  - CTA / button clicks
 *  - Scenario form submissions
 *  - Time on page (sent on tab close / navigate away)
 */
(function () {
  var startTime = Date.now();

  function ga(eventName, params) {
    if (typeof gtag === 'function') gtag('event', eventName, params);
  }

  // 1. CTA / button / link clicks
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a.cta-btn, button, [data-track]');
    if (!el) return;
    var label = (el.getAttribute('data-track') || el.innerText || el.getAttribute('href') || '').trim().slice(0, 100);
    if (!label) return;
    ga('cta_click', {
      event_category: 'engagement',
      event_label: label,
      page_path: window.location.pathname,
    });
  });

  // 2. Form submissions
  document.addEventListener('submit', function (e) {
    var form = e.target;
    var label = form.id || form.getAttribute('name') || 'form';
    ga('form_submit', {
      event_category: 'lead',
      event_label: label,
      page_path: window.location.pathname,
      time_to_submit: Math.round((Date.now() - startTime) / 1000),
    });
  });

  // 3. Time on page — fires when user leaves
  function sendTimeOnPage() {
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds < 2) return;
    ga('time_on_page', {
      event_category: 'engagement',
      value: seconds,
      page_path: window.location.pathname,
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTimeOnPage();
  });
  window.addEventListener('pagehide', sendTimeOnPage);
})();

/**
 * North Star Capital — Client Analytics Snippet
 * Included on every page. Tracks:
 *  - Page views
 *  - Button / CTA clicks
 *  - Scenario form submissions
 *  - Time on page (sent on tab close / navigate away)
 */
(function () {
  var ENDPOINT = '/track';
  var startTime = Date.now();

  function send(payload) {
    var data = JSON.stringify(payload);
    // Use sendBeacon for exit events so they fire reliably on unload
    if (navigator.sendBeacon) {
      var blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(function () {});
    }
  }

  function getPage() {
    return window.location.pathname || '/';
  }

  // 1. Page view
  send({
    event: 'pageview',
    page: getPage(),
    referrer: document.referrer || '',
    label: document.title || '',
    duration: 0,
  });

  // 2. CTA / button clicks — track any <a> or <button> with meaningful text
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button, .cta-btn, .ideal-tag, [data-track]');
    if (!el) return;
    var label = (el.getAttribute('data-track') || el.innerText || el.getAttribute('href') || '').trim().slice(0, 100);
    if (!label) return;
    send({
      event: 'click',
      page: getPage(),
      referrer: document.referrer || '',
      label: label,
      duration: 0,
    });
  });

  // 3. Form submissions — track the scenario form and any other form
  document.addEventListener('submit', function (e) {
    var form = e.target;
    var label = form.id || form.getAttribute('name') || form.getAttribute('action') || 'form';
    send({
      event: 'form_submit',
      page: getPage(),
      referrer: document.referrer || '',
      label: label,
      duration: Math.round((Date.now() - startTime) / 1000),
    });
  });

  // 4. Time on page — fires when user leaves (tab close, navigate away)
  function sendTimeOnPage() {
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds < 2) return; // ignore bounces under 2s
    send({
      event: 'time_on_page',
      page: getPage(),
      referrer: document.referrer || '',
      label: '',
      duration: seconds,
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTimeOnPage();
  });

  window.addEventListener('pagehide', sendTimeOnPage);
})();

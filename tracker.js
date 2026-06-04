/**
 * North Star Capital — Analytics Tracker
 * GA4 custom events + Meta Conversions API (browser pixel + server-side relay)
 */
(function () {
  var startTime = Date.now();

  // ─── GA4 ─────────────────────────────────────────────────────────────────
  function ga(eventName, params) {
    if (typeof gtag === 'function') gtag('event', eventName, params);
  }

  // ─── Meta helpers ─────────────────────────────────────────────────────────
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // Read a cookie by name
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? match[1] : null;
  }

  // Build fbc from URL ?fbclid= param; persist in cookie for 90 days
  function getFbc() {
    var params = new URLSearchParams(window.location.search);
    var fbclid = params.get('fbclid');
    if (fbclid) {
      var fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      document.cookie = '_fbc=' + fbc + ';path=/;max-age=7776000;SameSite=Lax';
      return fbc;
    }
    return getCookie('_fbc') || null;
  }

  // Get or create fbp browser ID cookie (fallback if pixel blocked)
  function getFbp() {
    var fbp = getCookie('_fbp');
    if (!fbp) {
      fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 2147483647);
      document.cookie = '_fbp=' + fbp + ';path=/;max-age=7776000;SameSite=Lax';
    }
    return fbp;
  }

  // Get or create a persistent anonymous External ID (stored in localStorage)
  // This lets Meta match the same visitor across multiple sessions/events
  function getExternalId() {
    try {
      var key = 'nscap_eid';
      var eid = localStorage.getItem(key);
      if (!eid) {
        // Generate a UUID v4-like identifier
        eid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        localStorage.setItem(key, eid);
      }
      return eid;
    } catch (e) {
      return null; // localStorage blocked (private browsing, etc.)
    }
  }

  var fbc = getFbc();
  var fbp = getFbp();
  var externalId = getExternalId();

  // ─── Meta CAPI ───────────────────────────────────────────────────────────
  function metaSend(eventName, userData, customData) {
    var eventId = genId();
    if (typeof fbq === 'function') {
      fbq('track', eventName, customData || {}, { eventID: eventId });
    }
    var ud = Object.assign({}, userData || {});
    if (fbc) ud.fbc = fbc;
    if (fbp) ud.fbp = fbp;
    if (externalId) ud.external_id = externalId;
    fetch('/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: ud,
        custom_data: customData || {},
      }),
      keepalive: true,
    }).catch(function () {});
  }

  // ─── ViewContent on every page load ──────────────────────────────────────
  metaSend('ViewContent', {}, {
    content_name: document.title,
    content_category: window.location.pathname,
  });

  // ─── Click handler — Contact + GA4 CTA clicks ────────────────────────────
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0 || href.indexOf('mailto:') === 0) {
        metaSend('Contact', {}, { content_name: href });
      }
    }
    var cta = e.target.closest('a.cta-btn, button, [data-track]');
    if (cta) {
      var label = (cta.getAttribute('data-track') || cta.innerText || cta.getAttribute('href') || '').trim().slice(0, 100);
      if (label) ga('cta_click', { event_category: 'engagement', event_label: label, page_path: window.location.pathname });
    }
  });

  // ─── Form submissions ─────────────────────────────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target;
    var formId = form.id || form.getAttribute('name') || 'form';

    var emailEl = form.querySelector('[name="email"]');
    var phoneEl = form.querySelector('[name="phone"]');
    var nameEl  = form.querySelector('[name="name"]');
    var userData = {};
    if (emailEl && emailEl.value) userData.em = emailEl.value.trim();
    if (phoneEl && phoneEl.value) userData.ph = phoneEl.value.trim();
    if (nameEl  && nameEl.value)  {
      var parts = nameEl.value.trim().split(/\s+/);
      userData.fn = parts[0] || '';
      userData.ln = parts.slice(1).join(' ') || '';
    }

    // CompleteRegistration — contact form (has name + email + phone)
    if (userData.em && userData.ph && userData.fn) {
      metaSend('CompleteRegistration', userData, {});
    }

    // SubmitApplication — scenario / loan request form
    if (form.querySelector('[name="property_type"]') || form.querySelector('[name="loan_type"]')) {
      metaSend('SubmitApplication', userData, { content_name: formId });
    }

    // Lead — all form submissions
    metaSend('Lead', userData, { content_name: formId });

    ga('form_submit', {
      event_category: 'lead',
      event_label: formId,
      page_path: window.location.pathname,
      time_to_submit: Math.round((Date.now() - startTime) / 1000),
    });
  });

  // ─── Time on page (GA4) ───────────────────────────────────────────────────
  function sendTimeOnPage() {
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds < 2) return;
    ga('time_on_page', { event_category: 'engagement', value: seconds, page_path: window.location.pathname });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTimeOnPage();
  });
  window.addEventListener('pagehide', sendTimeOnPage);
})();

(() => {
  const $ = (selector) => document.querySelector(selector);
  const status = $('#download-status');
  const download = $('#download-button');
  const localeButton = $('.language-switch');
  let locale = 'ro';
  const copy = {
    ro: {
      ready: 'Pachet pregătit · verificare SHA-256 disponibilă.',
      pending: 'Pachetul va fi disponibil după publicarea site-ului.',
      catalogPending: 'Catalogul de versiuni nu este disponibil momentan.',
      latest: (version) => `VERSIUNE NEXUS DISPONIBILĂ ÎN LAUNCHER · v${version}`,
      empty: 'ÎNCĂ NU EXISTĂ VERSIUNI NEXUS PUBLICATE'
    },
    en: {
      ready: 'Package ready · SHA-256 verification available.',
      pending: 'The package will be available when the site is published.',
      catalogPending: 'The release catalog is not available right now.',
      latest: (version) => `NEXUS VERSION AVAILABLE IN LAUNCHER · v${version}`,
      empty: 'NO NEXUS RELEASES PUBLISHED YET'
    }
  };
  let ready = false;
  let latestVersion = null;

  function setLocale(next) {
    locale = next;
    document.documentElement.lang = next;
    document.querySelectorAll('[data-ro][data-en]').forEach((node) => {
      node.textContent = node.dataset[next];
    });
    localeButton.textContent = next === 'ro' ? 'EN' : 'RO';
    localeButton.setAttribute('aria-label', next === 'ro' ? 'Switch to English' : 'Schimbă limba în română');
    status.textContent = ready ? copy[next].ready : copy[next].pending;
    if (latestVersion) $('#client-release').textContent = copy[next].latest(latestVersion);
  }

  function bytes(value) {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return '';
    return size < 1048576 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1048576).toFixed(1)} MB`;
  }

  async function initialize() {
    try {
      const saved = localStorage.getItem('nexus-site-locale');
      setLocale(saved === 'en' ? 'en' : 'ro');
    } catch (_) { setLocale('ro'); }
    localeButton.addEventListener('click', () => {
      const next = locale === 'ro' ? 'en' : 'ro';
      try { localStorage.setItem('nexus-site-locale', next); } catch (_) { /* optional preference */ }
      setLocale(next);
    });

    try {
      const response = await fetch(new URL('site-config.json', document.baseURI), { cache: 'no-store' });
      if (!response.ok) throw new Error('Site configuration unavailable');
      const config = await response.json();
      $('#launcher-version').textContent = `NEXUS Launcher v${config.launcherVersion || '—'}`;
      const size = bytes(config.launcherSize);
      if (size) $('#launcher-size').textContent = size;
      if (typeof config.launcherSha256 === 'string' && /^[a-f0-9]{64}$/i.test(config.launcherSha256)) {
        $('#download-fingerprint').textContent = `SHA-256 · ${config.launcherSha256}`;
      }
      if (config.published === true && typeof config.launcherDownloadUrl === 'string' && config.launcherDownloadUrl) {
        const target = new URL(config.launcherDownloadUrl, document.baseURI);
        const localPreview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        if (target.protocol === 'https:' || (localPreview && target.origin === window.location.origin)) {
          download.href = target.href;
          download.removeAttribute('aria-disabled');
          download.removeAttribute('tabindex');
          download.classList.remove('disabled');
          download.setAttribute('download', '');
          ready = true;
          status.textContent = copy[locale].ready;
        }
      }
      const catalogUrl = new URL(config.releasesUrl || 'updates/releases.json', document.baseURI);
      const catalogResponse = await fetch(catalogUrl, { cache: 'no-store' });
      if (!catalogResponse.ok) throw new Error('Release catalog unavailable');
      const catalog = await catalogResponse.json();
      if (catalog.schema !== 1 || !Array.isArray(catalog.versions)) throw new Error('Invalid release catalog');
      if (typeof catalog.latest === 'string' && catalog.versions.some((item) => item.version === catalog.latest)) {
        latestVersion = catalog.latest;
        $('#client-release').textContent = copy[locale].latest(latestVersion);
      } else {
        $('#client-release').textContent = catalog.versions.length ? copy[locale].catalogPending : copy[locale].empty;
      }
    } catch (_) {
      $('#client-release').textContent = copy[locale].catalogPending;
    }
  }
  initialize();
})();

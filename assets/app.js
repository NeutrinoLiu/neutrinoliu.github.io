/* Random favicon from FontAwesome Free "weather" category (no temperature glyphs).
   Runs in parallel with the main render. Falls back to the static assets/icon.svg
   in <link rel="icon"> on any failure. */
(function rollFavicon() {
  const ICONS = [
    'bolt', 'bolt-lightning', 'cloud', 'cloud-bolt', 'cloud-meatball',
    'cloud-moon', 'cloud-moon-rain', 'cloud-rain', 'cloud-showers-heavy',
    'cloud-showers-water', 'cloud-sun', 'cloud-sun-rain', 'droplet',
    'icicles', 'meteor', 'moon', 'poo-storm', 'rainbow', 'smog',
    'snowflake', 'sun', 'tornado', 'umbrella', 'water', 'wind',
  ];
  const pick = ICONS[Math.floor(Math.random() * ICONS.length)];
  const url = `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/svgs/solid/${pick}.svg`;
  fetch(url)
    .then((r) => (r.ok ? r.text() : null))
    .then((svg) => {
      if (!svg) return;
      const colored = svg.replace('<svg ', '<svg fill="#595959" ');
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(colored);
      let link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/svg+xml';
      link.href = dataUrl;
    })
    .catch(() => {});
})();

/* Renders the page from cv.json. Edit cv.json to update content. */
(async function () {
  const main = document.querySelector('main');

  let data;
  let lastModified = null;
  try {
    const res = await fetch('assets/cv.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.statusText);
    lastModified = res.headers.get('Last-Modified');
    data = await res.json();
  } catch (err) {
    main.innerHTML =
      '<section><p>Failed to load <code>cv.json</code>. ' +
      'If you opened this file directly, please serve it via a local web server ' +
      '(e.g. <code>python3 -m http.server</code>) and reload.</p></section>';
    console.error(err);
    return;
  }

  /* ────── helpers ────── */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  // tiny markdown-style link pass: [text](url) → <a href="url">text</a>
  const linkify = (s) => esc(s).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`
  );

  const linkLabel = {
    paper: 'paper',
    project_page: 'project',
    demo: 'demo',
    code: 'code',
    dataset: 'dataset',
  };

  const renderLinkRow = (links, sep = '') => {
    const entries = Object.entries(links || {});
    if (!entries.length) return '';
    return entries
      .map(([k, v]) =>
        `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(linkLabel[k] || k)}</a>`)
      .join(sep);
  };

  const renderAuthors = (authors) =>
    (authors || [])
      .map((a) => {
        let n = esc(a.name);
        if (a.equal_contribution) n += '<span class="mark">†</span>';
        if (a.corresponding) n += '<span class="mark">*</span>';
        if (a.is_me) n = `<span class="me">${n}</span>`;
        return n;
      })
      .join(', ');

  const renderPubMeta = (p) => {
    const parts = [];
    const hasAuthors = (p.authors || []).length;
    if (p.venue) parts.push(esc(p.venue));
    else if (p.status === 'in_submission') parts.push('In submission');
    else if (p.status === 'ongoing') parts.push('Ongoing');
    else if (hasAuthors) parts.push('arXiv');
    if (p.year) parts.push(esc(String(p.year)));
    return parts.join(' · ');
  };

  /* ────── about ────── */
  const profile = data.profile;
  document.title = `${profile.name} — ${profile.alias || 'Research'}`;

  const renderPosition = (p) => {
    const org = p.url
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.org)}</a>`
      : esc(p.org);
    return `<span class="hero__position"><b>${esc(p.role)}</b>, ${org}</span>`;
  };
  const positionRows = (profile.current_positions || []).length
    ? `<div class="hero__positions">${(profile.current_positions || []).map(renderPosition).join('')}</div>`
    : '';

  const L = profile.links || {};
  const iconLinks = [
    L.email_primary  && { href: `mailto:${L.email_primary}`,  icon: 'fa-regular fa-envelope',     label: 'Email' },
    L.google_scholar && { href: L.google_scholar,              icon: 'fa-brands fa-google-scholar', label: 'Google Scholar' },
    L.github         && { href: L.github,                      icon: 'fa-brands fa-github',         label: 'GitHub' },
    L.linkedin       && { href: L.linkedin,                    icon: 'fa-brands fa-linkedin',       label: 'LinkedIn' },
    L.cv_pdf         && { href: L.cv_pdf,                      icon: 'fa-regular fa-file-lines',    label: 'CV' },
  ].filter(Boolean);

  document.getElementById('about').innerHTML = `
    <div class="hero__top">
      ${profile.photo
      ? `<img class="hero__photo" src="${esc(profile.photo)}" alt="${esc(profile.name)}">`
      : ''}
      <div class="hero__id">
        <h1 class="hero__name">${esc(profile.name)}</h1>
        <p class="hero__alt">
          ${profile.name_zh ? esc(profile.name_zh) : ''}${profile.name_zh && profile.alias ? ' · ' : ''}${profile.alias ? esc(profile.alias) : ''}
        </p>
      </div>
      ${iconLinks.length ? `
        <div class="hero__icons">
          ${iconLinks.map((l) => `
            <a href="${esc(l.href)}" target="_blank" rel="noopener" aria-label="${esc(l.label)}" title="${esc(l.label)}">
              <i class="${l.icon}" aria-hidden="true"></i>
            </a>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="hero__title">${positionRows}</div>
    ${(profile.research_interests || []).length ? `
      <div class="hero__interests">
        ${profile.research_interests.map((i) => `<span class="tag">${esc(i)}</span>`).join('')}
      </div>
    ` : ''}
    <div class="hero__bio">
      ${(profile.bio || []).map((p) => `<p>${linkify(p)}</p>`).join('')}
    </div>
  `;

  /* ────── experience ────── */
  const monthMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const parseDate = (s) => {
    if (!s) return -Infinity;
    if (/present|now|current/i.test(s)) return Number.MAX_SAFE_INTEGER;
    const m = String(s).trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const mo = monthMap[m[1].toLowerCase()] || 0;
      return parseInt(m[2], 10) * 12 + mo;
    }
    const y = String(s).trim().match(/^(\d{4})$/);
    if (y) return parseInt(y[1], 10) * 12 + 12;
    return 0;
  };

  const expSorted = (data.experience || [])
    .slice()
    .sort((a, b) => parseDate(b.end) - parseDate(a.end) || parseDate(b.start) - parseDate(a.start));

  const renderExpRow = (e) => `
    <div class="exp">
      <div class="exp__when">${esc(e.start || '')}${e.end ? ` – ${esc(e.end)}` : ''}</div>
      <div class="exp__main">
        <div class="exp__role">${esc(e.role || '')}</div>
        <div class="exp__org">${e.url
          ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.org || '')}</a>`
          : esc(e.org || '')}</div>
        ${e.detail ? `<div class="exp__detail">${esc(e.detail)}</div>` : ''}
      </div>
      ${e.location ? `<div class="exp__where">${esc(e.location)}</div>` : ''}
    </div>
  `;

  document.getElementById('experience').innerHTML = `
    <h2 class="section-title">Experience</h2>
    ${expSorted.map(renderExpRow).join('')}
  `;

  /* ────── projects ────── */
  const highlightSet = new Set(data.highlights || []);
  document.getElementById('projects').innerHTML = `
    <h2 class="section-title">Projects</h2>
    ${(data.projects || []).map((p) => {
      const meta = renderPubMeta(p);
      const aff = p.affiliation ? esc(p.affiliation) : '';
      const links = renderLinkRow(p.links, ' · ');
      const head = [meta, aff, links].filter(Boolean).join(' · ');
      const hasAuthors = (p.authors || []).length;
      const star = highlightSet.has(p.id)
        ? '<i class="fa-solid fa-star pub__star" aria-label="Highlight" title="Highlight"></i>'
        : '';
      const video = p.media && p.media.video ? esc(p.media.video) : '';
      const image = p.media && p.media.image ? esc(p.media.image) : '';
      const hasMedia = !!(video || image);
      const mediaHref = p.links?.project_page || p.links?.demo || p.links?.paper || video || image;
      const mediaInner = video
        ? `<video src="${video}" autoplay muted loop playsinline preload="metadata"></video>`
        : image
          ? `<img src="${image}" alt="${esc(p.title)}" loading="lazy" />`
          : '';
      const mediaBlock = hasMedia ? `
        <a class="pub__media"
           href="${esc(mediaHref)}"
           target="_blank" rel="noopener"
           aria-label="${esc(p.title)} — open project page">
          ${mediaInner}
        </a>` : '';
      const body = `
        <div class="pub__body">
          ${head || star ? `<p class="pub__meta">${star}${head}</p>` : ''}
          <h3 class="pub__title">${esc(p.title)}</h3>
          ${hasAuthors ? `<p class="pub__authors">${renderAuthors(p.authors)}</p>` : ''}
          ${p.description ? `<p class="pub__desc">${esc(p.description)}</p>` : ''}
          ${(p.tags || []).length
            ? `<div class="pub__tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
            : ''}
        </div>`;
      const cls = ['pub'];
      if (star) cls.push('is-highlight');
      if (hasMedia) cls.push('has-media');
      return `<article class="${cls.join(' ')}">${mediaBlock}${body}</article>`;
    }).join('')}
  `;

  /* ────── honors ────── */
  document.getElementById('honors').innerHTML = `
    <h2 class="section-title">Honors</h2>
    ${(data.honors || []).map((h) => `
      <div class="honor">
        <div class="honor__when">${esc(h.year || '—')}</div>
        <div class="honor__main">
          <div class="honor__title">${esc(h.title || '')}</div>
          ${h.venue ? `<div class="honor__venue">${esc(h.venue)}</div>` : ''}
          ${h.detail ? `<div class="honor__detail">${esc(h.detail)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  `;

  /* ────── footer ────── */
  const updated = (() => {
    if (!lastModified) return '';
    const d = new Date(lastModified);
    return isNaN(d) ? '' : d.toISOString().slice(0, 10);
  })();
  document.getElementById('footer-copy').innerHTML =
    `Designed by <a href="https://neutrinoliu.github.io/" target="_blank" rel="noopener">${esc(profile.name)}</a> and Claude with ` +
    `<i class="fa-solid fa-heart footer__heart" aria-label="love"></i>` +
    (updated ? `&nbsp; Last updated ${updated}` : '');

  /* ────── active section highlight ────── */
  const navLinks = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
  const map = new Map();
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) map.set(id, a);
  });

  if ('IntersectionObserver' in window && map.size) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            navLinks.forEach((a) => a.classList.remove('is-active'));
            const a = map.get(e.target.id);
            if (a) a.classList.add('is-active');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    map.forEach((_, id) => io.observe(document.getElementById(id)));
  }
})();

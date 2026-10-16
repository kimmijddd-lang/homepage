// 업무 안내 페이지 템플릿. 내용은 _src/content/services/*.json, 공통 요소는 _src/partials 와 site-config 에서 온다.
// build.mjs 가 이 모듈로 services/**/index.html 을 만들고, 이어서 gen 영역과 data-cfg-* 를 채운다.

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lines = (s) => esc(s).replace(/\n/g, '<br>');

const ICONS = {
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.2A8.4 8.4 0 1 1 21 11.5z"></path>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"></path>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"></path><path d="M9 8h6M9 12h6"></path>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path>',
  users: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.6a6.5 6.5 0 0 1 3 5.4"></path>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M3 20h18"></path>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"></path>',
};

const svg = (inner, size, stroke = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ARROW = '<path d="M5 12h14M13 6l6 6-6 6"></path>';
const CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"></path>';

const head = ({ cfg, title, description, ogDescription, path, ld }) => `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${cfg.siteUrl}${path}">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(cfg.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(ogDescription || description)}">
  <meta property="og:url" content="${cfg.siteUrl}${path}">
  <meta property="og:image" content="${cfg.siteUrl}/assets/images/og-share.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <!-- gen:head-assets -->
  <!-- /gen:head-assets -->
  <link rel="stylesheet" href="/assets/css/service.css">
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/^/gm, '    ')}
  </script>
</head>`;

const shell = (bodyAttr, main) => `<body data-page="${bodyAttr}">
  <a class="skip-link" href="#content">본문으로 건너뛰기</a>
  <!-- gen:header -->
  <!-- /gen:header -->
  <main id="content">
${main}
  </main>
  <!-- gen:footer -->
  <!-- /gen:footer -->
  <!-- gen:mobile-bar -->
  <!-- /gen:mobile-bar -->
  <script src="/assets/js/site.js" defer></script>
</body>
</html>
`;

const breadcrumb = (crumbs) => `    <nav class="container svc-breadcrumb" aria-label="현재 위치">
      ${crumbs
        .map((c, i) => {
          const last = i === crumbs.length - 1;
          const item = last ? `<span aria-current="page">${esc(c.text)}</span>` : `<a href="${c.href}">${esc(c.text)}</a>`;
          return last ? item : `${item}<span aria-hidden="true">/</span>`;
        })
        .join('')}
    </nav>`;

const ctaBand = ({ cfg, h2, p }) => `    <section class="svc-cta">
      <div class="container">
        <div class="svc-cta-copy">
          <h2>${esc(h2)}</h2>
          <p>${esc(p)}</p>
        </div>
        <div class="svc-cta-actions">
          <a class="svc-cta-main" href="/contact" data-event="consult_click">상담 신청하기</a>
          <a class="svc-cta-tel" href="${cfg.phone.href}" data-cfg-href="phone_href" data-event="phone_click"><span data-cfg-text="phone_display">${esc(cfg.phone.display)}</span></a>
        </div>
      </div>
    </section>`;

const sectionHead = (num, title) =>
  `<div class="svc-head"><span class="svc-num">${String(num).padStart(2, '0')}</span><h2>${esc(title)}</h2></div>`;

export function renderService(s, { cfg }) {
  const path = `/services/${s.slug}`;
  let n = 0;
  const next = () => (n += 1);

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: s.ld.name,
      serviceType: s.ld.serviceType,
      description: s.ld.description,
      provider: { '@type': 'AccountingService', '@id': `${cfg.siteUrl}/#accountingservice`, name: cfg.name, url: `${cfg.siteUrl}/` },
      areaServed: 'KR',
      url: `${cfg.siteUrl}${path}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${cfg.siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: '업무 안내', item: `${cfg.siteUrl}/services` },
        { '@type': 'ListItem', position: 3, name: s.navLabel, item: `${cfg.siteUrl}${path}` },
      ],
    },
  ];

  const fitNum = next();
  const helpNum = next();
  const benefitsNum = next();
  const stepsNum = next();
  const materialsNum = next();
  const costNum = s.cost ? next() : null;
  const faqNum = next();

  const materialRows = s.materials
    .map((m) =>
      typeof m === 'string'
        ? `<li>${svg(CHECK, 18, 2.2)}<span>${esc(m)}</span></li>`
        : `<div class="svc-row"><dt>${esc(m.dt)}</dt><dd>${esc(m.dd)}</dd></div>`,
    )
    .join('\n              ');
  const labeled = s.materials.some((m) => typeof m !== 'string');

  const main = `${breadcrumb([
    { href: '/', text: '홈' },
    { href: '/services', text: '업무 안내' },
    { text: s.navLabel },
  ])}

    <div class="container svc-hero">
      <div class="svc-hero-copy">
        <p class="svc-eyebrow">${esc(s.eyebrow)}</p>
        <h1>${lines(s.h1)}</h1>
        <p class="svc-lead">${esc(s.lead)}</p>
        <p class="svc-meta">작성·검토 ${esc(cfg.representative)} 세무사 · 수정일 ${esc(s.updated)}</p>
      </div>
      <aside class="svc-glance" aria-label="한눈에 보기">
        <p class="svc-glance-title">한눈에 보기</p>
        <dl class="svc-glance-list">
          ${s.glance.map((g) => `<div><dt>${esc(g.dt)}</dt><dd>${esc(g.dd)}</dd></div>`).join('\n          ')}
        </dl>
        <a class="svc-btn svc-btn-primary" href="/contact" data-event="consult_click">${esc(s.ctaLabel)}</a>
        <a class="svc-btn svc-btn-outline" href="${cfg.phone.href}" data-cfg-href="phone_href" data-event="phone_click">전화 <span data-cfg-text="phone_display">${esc(cfg.phone.display)}</span></a>
      </aside>
    </div>

    <section class="svc-band">
      <div class="container svc-split">
        <div class="svc-split-head"><span class="svc-num">${String(fitNum).padStart(2, '0')}</span><h2>${esc(s.fitTitle)}</h2></div>
        <ul class="svc-checklist">
          ${s.fit.map((t) => `<li>${svg(CHECK, 20, 2.2)}<span>${esc(t)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </section>

    <section class="svc-section">
      <div class="container">
        ${sectionHead(helpNum, '도와드리는 내용')}
        <div class="svc-help">
          ${s.help
            .map(
              (h) => `<div class="svc-help-card">
            ${svg(ICONS[h.icon], 28)}
            <h3>${esc(h.h)}</h3>
            <p>${esc(h.p)}</p>
          </div>`,
            )
            .join('\n          ')}
        </div>
      </div>
    </section>

    <section class="svc-section">
      <div class="container svc-split">
        <div class="svc-split-head"><span class="svc-num">${String(benefitsNum).padStart(2, '0')}</span><h2>${esc(s.benefitsTitle)}</h2></div>
        <ul class="svc-checklist">
          ${s.benefits.map((t) => `<li>${svg(CHECK, 20, 2.2)}<span>${esc(t)}</span></li>`).join('\n          ')}
        </ul>
      </div>
    </section>

    <section class="svc-section">
      <div class="container">
        ${sectionHead(stepsNum, s.stepsTitle)}
        <ol class="svc-steps">
          ${s.steps
            .map(
              (st, i) => `<li>
            <span class="svc-step-num">${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(st.h)}</h3>
            <p>${esc(st.p)}</p>
          </li>`,
            )
            .join('\n          ')}
        </ol>
      </div>
    </section>

    <section class="svc-section">
      <div class="container svc-two">
        <div class="svc-two-main">
          ${sectionHead(materialsNum, s.materialsTitle)}
          ${labeled ? `<dl class="svc-rows">\n              ${materialRows}\n          </dl>` : `<ul class="svc-checklist svc-checklist-compact">\n              ${materialRows}\n          </ul>`}
        </div>${
          s.cost
            ? `
        <div class="svc-two-side">
          ${sectionHead(costNum, '비용 기준')}
          <div class="svc-cost">
            <p>${esc(s.cost.text)}</p>
            <a class="svc-cost-link" href="${s.cost.guide.href}">${esc(s.cost.guide.text)}${svg(ARROW, 16, 2)}</a>
          </div>
        </div>`
            : ''
        }
      </div>
    </section>

    <section class="svc-section svc-section-last">
      <div class="container">
        ${sectionHead(faqNum, '자주 묻는 질문')}
        <div class="svc-faq">
          ${s.faq
            .map(
              (f) => `<div>
            <h3>${esc(f.q)}</h3>
            <p>${esc(f.a)}</p>
          </div>`,
            )
            .join('\n          ')}
        </div>
      </div>
    </section>

${ctaBand({ cfg, h2: s.closingH2, p: s.closingP })}
${
  s.related && s.related.length
    ? `
    <section class="svc-related">
      <div class="container">
        <p class="svc-related-title">함께 보면 좋은 글</p>
        <div class="svc-related-list">
          ${s.related.map((r) => `<a href="${r.href}">${esc(r.text)}${svg(ARROW, 16, 2)}</a>`).join('\n          ')}
        </div>
      </div>
    </section>`
    : ''
}`;

  return `${head({ cfg, title: s.title, description: s.description, ogDescription: s.ogDescription, path, ld })}\n${shell(`service-${s.slug}`, main)}`;
}

export function renderServicesIndex(list, { cfg }) {
  const title = '업무 안내 | 대윤세무회계';
  const description =
    '개인사업자 기장, 법인 기장대리, 세무사 변경, 급여·4대보험, 크리에이터·이커머스 세무까지 대윤세무회계가 운영하는 세무 업무를 한눈에 안내합니다.';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: `${cfg.siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: '업무 안내', item: `${cfg.siteUrl}/services` },
    ],
  };
  const main = `${breadcrumb([{ href: '/', text: '홈' }, { text: '업무 안내' }])}

    <div class="container svc-index-hero">
      <p class="svc-eyebrow">업종 제한 없이, 개인사업자와 법인 모두 상담합니다</p>
      <h1>업무 안내</h1>
      <p class="svc-lead">${esc(cfg.name)}가 운영하는 세무 업무를 목적별로 정리했습니다. 필요한 업무의 범위와 진행 방식은 각 페이지에서 자세히 확인하실 수 있습니다.</p>
    </div>

    <section class="svc-section svc-section-last">
      <div class="container">
        <div class="svc-cards">
          ${list
            .map(
              (s) => `<a class="svc-card" href="/services/${s.slug}">
            <span class="svc-card-tag">${esc(s.card.tag)}</span>
            <h2>${esc(s.navLabel)}</h2>
            <p>${esc(s.card.text)}</p>
            <span class="svc-card-more">자세히 보기${svg(ARROW, 16, 2)}</span>
          </a>`,
            )
            .join('\n          ')}
        </div>
      </div>
    </section>

${ctaBand({ cfg, h2: '어떤 업무가 맞는지 모르겠다면 먼저 상담하세요', p: '현재 상황을 남겨주시면 어떤 서비스가 맞는지 먼저 정리해 드립니다.' })}`;

  return `${head({ cfg, title, description, path: '/services', ld })}\n${shell('services', main)}`;
}

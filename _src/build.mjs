// 사이트 공통 요소와 연락처·주소 값을 _src/site-config.json 한 곳에서 관리하고 각 HTML에 반영한다.
//
//   node _src/build.mjs          반영 (바뀐 파일만 씀)
//   node _src/build.mjs --check  변경 없이 점검. 반영이 안 된 파일이나 config 밖에 박힌 값이 있으면 종료코드 1
//
// 반영 방식 (결과는 그대로 커밋하며, Vercel 빌드 설정은 필요 없다)
//   1. 영역:  <!-- gen:이름 --> ... <!-- /gen:이름 -->  사이를 _src/partials/이름.html 로 통째로 교체
//   2. 속성:  data-cfg-href="키"  → 해당 <a>의 href 를 config 값으로 교체
//   3. 텍스트: data-cfg-text="키"  → 해당 요소(자식 태그 없는 요소)의 글자를 config 값으로 교체
// 영역과 data-cfg-* 안의 내용은 직접 고치지 말고 config/partials 를 고친 뒤 다시 실행한다.
//   4. 통째 생성: services/**/index.html 은 _src/content/services/*.json + _src/templates/pages.mjs 로 만든다.
//      업무 문구는 JSON 을 고치고 다시 실행한다 (생성된 HTML 을 직접 고치면 다음 실행에서 덮어쓴다).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderService, renderServicesIndex } from './templates/pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const cfg = JSON.parse(read(join(root, '_src', 'site-config.json')));

const values = {
  siteUrl: cfg.siteUrl,
  name: cfg.name,
  representative: cfg.representative,
  phone_display: cfg.phone.display,
  phone_href: cfg.phone.href,
  phone_e164: cfg.phone.e164,
  email: cfg.email,
  email_href: `mailto:${cfg.email}`,
  kakao_url: cfg.kakao.url,
  hours: cfg.hours,
  address_street: cfg.address.street,
  address_locality: cfg.address.locality,
  address_region: cfg.address.region,
  address_city: cfg.address.city,
  address_line: cfg.address.line,
  address_full: cfg.address.full,
  transit: cfg.transit,
  transit_detail: cfg.transitDetail,
  map_naver: cfg.maps.naver,
  map_kakao: cfg.maps.kakao,
  instagram: cfg.social.instagram,
  instagram_dm: cfg.social.instagramDm,
  blog: cfg.social.blog,
  form_endpoint: cfg.form.endpoint,
  form_subject: cfg.form.subject,
  thanks_url: `${cfg.siteUrl}/contact/thanks`,
  opening_hours: cfg.openingHours,
  instagram_handle: cfg.social.instagramHandle,
};

// 위치가 바뀌면 달라지는 문구는 config 값에서 조합한다 (사무실 이전 때 한 번에 바뀌도록).
values.office_area = `${cfg.address.locality} ${cfg.address.neighborhood}, ${cfg.transit}`;
values.office_area_short = `${cfg.address.locality} ${cfg.station}`;
values.home_title = `${cfg.station} 세무사 | ${cfg.name} ${cfg.representative} 세무사`;
values.home_description = `${values.office_area} ${cfg.representative} 세무사 사무실. 개인·법인사업자 기장과 세금 신고, 급여·4대보험, 세무사 변경 상담.`;

const escHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escJson = (s) => JSON.stringify(s).slice(1, -1);

const valueOf = (key) => {
  if (!(key in values)) throw new Error(`site-config 에 없는 키: ${key}`);
  return values[key];
};

const fill = (template, esc) => template.replace(/\{\{(\w+)\}\}/g, (_, key) => esc(valueOf(key)));

const REGION = /^([ \t]*)<!-- gen:([\w-]+) -->[\s\S]*?<!-- \/gen:\2 -->/gm;

function applyRegions(html) {
  return html.replace(REGION, (_, indent, name) => {
    const partial = read(join(root, '_src', 'partials', `${name}.html`)).trimEnd();
    const body = fill(partial, name.startsWith('jsonld') ? escJson : escHtml);
    return `${indent}<!-- gen:${name} -->\n${body}\n${indent}<!-- /gen:${name} -->`;
  });
}

function applyAttributes(html) {
  html = html.replace(/<a\b[^>]*\sdata-cfg-href="(\w+)"[^>]*>/g, (tag, key) => {
    if (!/\shref="[^"]*"/.test(tag)) throw new Error(`data-cfg-href 요소에 href 가 없음: ${tag}`);
    return tag.replace(/(\shref=")[^"]*(")/, (_, a, b) => `${a}${escHtml(valueOf(key))}${b}`);
  });
  html = html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*\sdata-cfg-text="(\w+)"[^>]*>)[^<]*(<\/\2>)/g,
    (_, open, _tag, key, close) => `${open}${escHtml(valueOf(key))}${close}`,
  );
  html = html.replace(/<meta\b[^>]*\sdata-cfg-content="(\w+)"[^>]*>/g, (tag, key) => {
    if (!/\scontent="[^"]*"/.test(tag)) throw new Error(`data-cfg-content 요소에 content 가 없음: ${tag}`);
    return tag.replace(/(\scontent=")[^"]*(")/, (_, a, b) => `${a}${escHtml(valueOf(key))}${b}`);
  });
  html = html.replace(/<form\b[^>]*\sdata-cfg-action="(\w+)"[^>]*>/g, (tag, key) => {
    if (!/\saction="[^"]*"/.test(tag)) throw new Error(`data-cfg-action 요소에 action 이 없음: ${tag}`);
    return tag.replace(/(\saction=")[^"]*(")/, (_, a, b) => `${a}${escHtml(valueOf(key))}${b}`);
  });
  html = html.replace(/<input\b[^>]*\sdata-cfg-value="(\w+)"[^>]*>/g, (tag, key) => {
    if (!/\svalue="[^"]*"/.test(tag)) throw new Error(`data-cfg-value 요소에 value 가 없음: ${tag}`);
    return tag.replace(/(\svalue=")[^"]*(")/, (_, a, b) => `${a}${escHtml(valueOf(key))}${b}`);
  });
  return html;
}

const SKIP_DIRS = new Set(['.git', '.claude', '_src', '_docs', 'node_modules', 'assets', 'scripts']);

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* htmlFiles(join(dir, entry.name));
    } else if (entry.name.endsWith('.html')) {
      yield join(dir, entry.name);
    }
  }
}

const REQUIRED_REGIONS = ['head-assets', 'header', 'footer', 'mobile-bar'];
const HARD_CODED = [
  cfg.phone.display,
  cfg.phone.href,
  cfg.email,
  cfg.kakao.url,
  cfg.address.street,
  cfg.maps.naver,
  cfg.maps.kakao,
  cfg.hours,
  cfg.form.endpoint,
  cfg.social.instagramDm,
  cfg.station,
];

// 아직 새 레이아웃으로 바뀌지 않은 페이지 (현재 없음).
const LEGACY_PAGES = new Set([]);

// 데이터(_src/content)와 템플릿(_src/templates)으로 통째로 만드는 페이지. 이 파일들은 직접 고치지 않는다.
function generatedPages() {
  const dir = join(root, '_src', 'content', 'services');
  const services = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(read(join(dir, f))))
    .sort((a, b) => a.order - b.order);
  const pages = new Map();
  for (const s of services) pages.set(join('services', s.slug, 'index.html'), renderService(s, { cfg }));
  pages.set(join('services', 'index.html'), renderServicesIndex(services, { cfg }));
  return pages;
}

const generated = generatedPages();
const targets = new Set([...htmlFiles(root)].map((f) => relative(root, f)));
generated.forEach((_, rel) => targets.add(rel));

const changed = [];
const problems = [];
const outputs = new Map(); // 반영 후의 각 페이지 내용 (검색용 점검에 쓴다)

for (const rel of [...targets].sort()) {
  const file = join(root, rel);
  if (LEGACY_PAGES.has(rel)) continue;
  const before = existsSync(file) ? read(file) : '';
  const source = generated.get(rel) ?? before;
  const after = applyAttributes(applyRegions(source));
  outputs.set(rel, after);

  for (const name of REQUIRED_REGIONS) {
    // mobile-bar 는 상담 폼 전용 변형(mobile-bar-form)도 허용한다.
    if (!after.includes(`<!-- gen:${name}`)) problems.push(`${rel}: gen:${name} 영역 없음`);
  }

  const outside = after.replace(REGION, '').split('\n');
  outside.forEach((line, i) => {
    if (!line.includes('data-cfg-') && HARD_CODED.some((v) => line.includes(v))) {
      problems.push(`${rel}: config 값이 직접 적혀 있음 → ${line.trim().slice(0, 90)}`);
    }
  });

  if (after !== before) {
    changed.push(rel);
    if (!checkOnly) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, after);
    }
  }
}

// 검색용 점검: 제목·설명·canonical·h1·이미지 alt, 사이트맵과 페이지 목록의 일치, 어디서도 연결되지 않는 페이지
function seoLint() {
  const urlOf = (rel) => {
    const p = `/${rel.split(sep).join('/').replace(/index\.html$/, '').replace(/\/$/, '')}`;
    return cfg.siteUrl + (p === '/' ? '/' : p);
  };
  const pick = (html, re) => (html.match(re) || [])[1];
  const titles = new Map();
  const descs = new Map();
  const indexable = new Map();
  const linked = new Set();

  for (const [rel, html] of outputs) {
    const url = urlOf(rel);
    const title = pick(html, /<title[^>]*>([^<]*)<\/title>/);
    const desc = pick(html, /<meta name="description" content="([^"]*)"/);
    const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/);
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);

    if (!title) problems.push(`SEO ${rel}: title 없음`);
    else if ([...title].length > 60) problems.push(`SEO ${rel}: title 이 60자를 넘음 (${[...title].length}자)`);
    if (!desc) problems.push(`SEO ${rel}: description 없음`);
    else if ([...desc].length < 30 || [...desc].length > 130) problems.push(`SEO ${rel}: description 길이 ${[...desc].length}자 (30~130자 권장)`);
    // 색인 대상은 canonical 이 자기 주소여야 하고, noindex 페이지(404 등)는 없어도 된다.
    if ((!noindex || canonical) && canonical !== url) problems.push(`SEO ${rel}: canonical 이 ${url} 과 다름 (${canonical})`);
    if ((html.match(/<h1\b/g) || []).length !== 1) problems.push(`SEO ${rel}: h1 이 하나가 아님`);
    if (/<img\b(?![^>]*\balt=)[^>]*>/.test(html)) problems.push(`SEO ${rel}: alt 없는 이미지`);

    // 구조화 데이터: 읽을 수 있는 JSON 이어야 하고, 전화·메일·주소는 config 와 같아야 한다
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let data;
      try {
        data = JSON.parse(m[1]);
      } catch (e) {
        problems.push(`SEO ${rel}: JSON-LD 를 읽을 수 없음 (${e.message})`);
        continue;
      }
      for (const node of Array.isArray(data) ? data : [data]) {
        if (node.telephone && node.telephone !== cfg.phone.e164) problems.push(`SEO ${rel}: JSON-LD 전화번호가 config 와 다름`);
        if (node.email && node.email !== cfg.email) problems.push(`SEO ${rel}: JSON-LD 이메일이 config 와 다름`);
        const a = node.address;
        if (a && typeof a === 'object' && a.streetAddress && a.streetAddress !== cfg.address.street) {
          problems.push(`SEO ${rel}: JSON-LD 주소가 config 와 다름`);
        }
      }
    }
    if (title) titles.set(title, [...(titles.get(title) ?? []), rel]);
    if (desc) descs.set(desc, [...(descs.get(desc) ?? []), rel]);
    if (!noindex) indexable.set(url, rel);

    for (const m of html.matchAll(/\bhref="(\/[^"#?]*)/g)) {
      const target = cfg.siteUrl + (m[1] === '/' ? '/' : m[1].replace(/\/$/, ''));
      if (target !== url) linked.add(target);
    }
  }
  titles.forEach((rels, t) => rels.length > 1 && problems.push(`SEO title 중복: ${t} → ${rels.join(', ')}`));
  descs.forEach((rels, d) => rels.length > 1 && problems.push(`SEO description 중복: ${d.slice(0, 40)}… → ${rels.join(', ')}`));

  const sitemapFile = join(root, 'sitemap.xml');
  if (!existsSync(sitemapFile)) {
    problems.push('SEO sitemap.xml 없음');
  } else {
    const inMap = new Set([...read(sitemapFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    indexable.forEach((rel, url) => !inMap.has(url) && problems.push(`SEO sitemap.xml 에 없음: ${url}`));
    inMap.forEach((url) => !indexable.has(url) && problems.push(`SEO sitemap.xml 에 있지만 색인 대상 페이지가 아님: ${url}`));
  }
  indexable.forEach((rel, url) => url !== `${cfg.siteUrl}/` && !linked.has(url) && problems.push(`SEO 다른 페이지에서 링크되지 않음: ${url}`));
}
seoLint();

if (checkOnly) {
  changed.forEach((rel) => console.log(`반영 필요: ${rel}`));
} else {
  console.log(changed.length ? `반영한 파일 ${changed.length}개` : '바뀐 파일 없음');
  changed.forEach((rel) => console.log(`  ${rel}`));
}
problems.forEach((p) => console.log(`확인 필요: ${p}`));
cfg.todo?.forEach((t) => console.log(`[확인필요] ${t}`));

if (checkOnly && (changed.length || problems.length)) process.exit(1);

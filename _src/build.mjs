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

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  address_line: cfg.address.line,
  address_full: cfg.address.full,
  transit: cfg.transit,
  map_naver: cfg.maps.naver,
  map_kakao: cfg.maps.kakao,
  instagram: cfg.social.instagram,
  instagram_dm: cfg.social.instagramDm,
  blog: cfg.social.blog,
  form_endpoint: cfg.form.endpoint,
  form_subject: cfg.form.subject,
  thanks_url: `${cfg.siteUrl}/contact/thanks`,
  opening_hours: cfg.openingHours,
};

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
];

// 아직 새 레이아웃으로 바뀌지 않은 페이지. 새 홈(4단계)으로 교체되면 이 목록에서 뺀다.
const LEGACY_PAGES = new Set(['index.html']);

const changed = [];
const problems = [];

for (const file of htmlFiles(root)) {
  const rel = relative(root, file);
  if (LEGACY_PAGES.has(rel)) continue;
  const before = read(file);
  const after = applyAttributes(applyRegions(before));

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
    if (!checkOnly) writeFileSync(file, after);
  }
}

if (checkOnly) {
  changed.forEach((rel) => console.log(`반영 필요: ${rel}`));
} else {
  console.log(changed.length ? `반영한 파일 ${changed.length}개` : '바뀐 파일 없음');
  changed.forEach((rel) => console.log(`  ${rel}`));
}
problems.forEach((p) => console.log(`확인 필요: ${p}`));
cfg.todo?.forEach((t) => console.log(`[확인필요] ${t}`));

if (checkOnly && (changed.length || problems.length)) process.exit(1);

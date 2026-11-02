# _src — 사이트 값·공통 요소 관리

배포되는 HTML은 저장소 루트에 그대로 커밋한다. Vercel 빌드 설정은 없고, 이 폴더의 스크립트는 로컬에서만 실행한다.

| 파일 | 하는 일 |
| --- | --- |
| `site-config.json` | 연락처·주소·영업시간·지도·SNS·폼 주소. **사실 정보는 여기 한 곳만 고친다.** |
| `build.mjs` | config 와 partials 를 모든 HTML에 반영, `services/**` 생성, 점검 |
| `partials/*.html` | 헤더·푸터·모바일 하단 바·head(GA4 태그 포함)·JSON-LD 공통 조각, /insta 전용 조각 |
| `content/services/*.json` | 업무 안내 페이지 문구 (페이지마다 하나) |
| `templates/pages.mjs` | 업무 안내 페이지 틀 |
| `dev-server.mjs` | 로컬 확인용 서버 (`http://localhost:4173`) |

## 자주 쓰는 명령

```bash
node _src/build.mjs            # 반영 (바뀐 파일만 씀)
node _src/build.mjs --check    # 점검만. 문제가 있으면 종료코드 1
node _src/dev-server.mjs       # 로컬 서버
```

`<!-- gen:이름 -->` 영역, `data-cfg-*` 속성이 붙은 값, `services/**` 의 HTML 은 직접 고치지 않는다. 다음 실행 때 덮어쓴다.

## 인스타 전용 페이지 (/insta)

인스타그램 프로필 링크로만 들어오는 한 장짜리 페이지. 검색 제외(`noindex` 메타 + `X-Robots-Tag`), sitemap·상단 메뉴에 넣지 않는다.
머리글·바닥글·하단 바는 전용 조각(`header-insta`, `footer-insta`, `mobile-bar-insta`)을 쓴다.

- 인스타 프로필에 거는 주소: `https://www.taxdy.co.kr/insta?` + `insta.utm`
- 페이지 안 신청서 버튼: `/contact?` + `insta.utm` (같은 UTM 이라 신청서로 넘어갈 때 값이 섞이지 않는다)
- 문의 경로는 카카오톡 채널(`kakao.channelChat`)·신청서·전화 세 가지만. `build.mjs` 가 금지 링크(크리에이터·이커머스·세무사 변경)와 금지 문구(서비스·후기·DM)를 점검한다.

## 방문 분석 (GA4)

`head-assets` 조각에 GA4 태그가 있고 측정 ID 는 `analytics.ga4` 한 곳에서 관리한다.

| 주소 | 동작 |
| --- | --- |
| `analytics.productionHost` (www.taxdy.co.kr) | 실제 집계 |
| `*.vercel.app` 미리보기, localhost | `debug_mode` 로만 보냄 → GA4 관리 > DebugView 에서 확인 |
| 그 밖의 주소 | 보내지 않음 |

`site.js` 가 링크 주소를 보고 이벤트를 보낸다: 카톡 채널 `click_kakao`, 전화 `click_call`, 신청서(`/contact`) `click_form`.
값: `page_path`(누른 페이지), `button_location`(가장 가까운 `data-loc`: hero·sticky_bar·footer_cta·header·footer, 없으면 구역 id).
`generate_lead` 는 신청서를 보낼 때 남긴 표시가 있을 때만 완료 화면에서 한 번 보낸다(직접 접속·새로고침은 세지 않음). `origin_path`·`origin_location` 은 신청서 버튼을 누른 곳.
네이버 애널리틱스는 `analytics.naver` 에 사이트 ID 를 넣으면 운영 주소에서만 켜진다.

## 사무실 이전 (2026-10-27, 선릉역)

새 주소는 `_src/relocation-next.json` 에 대기값으로 들어 있다. 이 파일은 `.gitignore` 대상이라 작업 PC에만 있고, 공개 저장소와 사이트에는 이전일 전까지 나오지 않는다. 이전 예정 안내 문구는 게시하지 않는다(대표 결정 2026-10-15).

1. `_src/relocation-next.json` 의 `[확인필요]` 를 채운다: 출구·도보 시간(`transitDetail`), 새 사무실 네이버 플레이스·카카오맵 링크(`maps`).
2. 이전일에 실행한다.

   ```bash
   node _src/build.mjs --move
   ```

   `[확인필요]` 가 하나라도 남아 있으면 아무것도 바꾸지 않고 멈춘다.
3. `node _src/build.mjs --check` 통과를 확인하고 커밋·배포한다.

`--move` 는 `address`·`station`·`transit`·`transitDetail`·`maps` 를 바꾸고, 아래가 함께 바뀐다.

| 바뀌는 곳 | 쓰는 값 |
| --- | --- |
| 홈 `<title>`·og:title ("○○역 세무사 \| 대윤세무회계 김민준 세무사") | `station` |
| 홈 description·og:description, 푸터 소개 문구 ("서울 강남구 ○○동, ○○역 인근 …") | `address.locality`·`address.neighborhood`·`transit` |
| 홈 오시는 길 (주소·교통·지도 버튼) | `address.full`·`transitDetail`·`maps` |
| 모든 페이지 푸터 하단 주소, /contact 주소 | `address.line`·`address.street` |
| 홈 JSON-LD (streetAddress·hasMap·sameAs) | `address.*`·`maps` |

세무사 소개·업무 안내·가이드의 JSON-LD 는 홈의 사무실 정보를 `@id` 로 가리키므로 따로 고칠 것이 없다.

사이트 밖에서 직접 바꿀 곳: 네이버 플레이스, 카카오맵, 구글 비즈니스 프로필, 인스타그램 프로필 주소.

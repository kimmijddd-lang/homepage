# _src — 사이트 값·공통 요소 관리

배포되는 HTML은 저장소 루트에 그대로 커밋한다. Vercel 빌드 설정은 없고, 이 폴더의 스크립트는 로컬에서만 실행한다.

| 파일 | 하는 일 |
| --- | --- |
| `site-config.json` | 연락처·주소·영업시간·지도·SNS·폼 주소. **사실 정보는 여기 한 곳만 고친다.** |
| `build.mjs` | config 와 partials 를 모든 HTML에 반영, `services/**` 생성, 점검 |
| `partials/*.html` | 헤더·푸터·모바일 하단 바·head·JSON-LD 공통 조각 |
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

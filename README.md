# URLUV Christmas Market template

크리스마스 템플릿 전용 프런트엔드입니다. 빼빼로 템플릿 저장소와 분리되어 있습니다.

## Concept and interaction

- 픽셀 아트 크리스마스 마켓을 바탕화면으로 사용합니다.
- WASD, 방향키, 바닥 클릭, 모바일 방향 패드로 캐릭터를 움직입니다.
- 사진관, 편지 우체국, 캐럴 무대, 선물 가판대, 크리스마스 트리가 기존 바탕화면 아이콘을 대신합니다.
- 가판대를 누르면 기존 Windows 스타일 콘텐츠 창이 열립니다.
- 선물 가판대 또는 작업표시줄의 `선물 남기기`를 누른 다음 맵을 클릭하면 방문자 메시지를 선물 카드로 남깁니다.
- 같은 고객 사이트에 로그인한 방문자는 마켓에서 서로의 캐릭터를 실시간으로 볼 수 있습니다. 위치는 접속 중에만 유지됩니다.
- 고객 사이트는 기존 주문 API의 사진·캡션·편지·음악·특별한 날/장소 데이터와 사이트별 메모 API를 사용합니다.

캐릭터 위치와 데모 선물 카드는 브라우저 로컬 저장소를 사용합니다. 주문 사이트에서 전달한 `siteKey`로 접속하면 선물 카드는 백엔드에 저장되어 다른 기기에서도 보입니다. 운영자 미리보기 토큰은 읽기 전용입니다.

## Local preview

이 폴더에서 정적 서버를 실행한 뒤 `http://localhost:8000`에 접속합니다.

```bash
python3 -m http.server 8000
```

데모 로그인 화면의 `비밀번호 없이 둘러보기` 버튼으로 마켓을 열 수 있습니다. 고객 사이트 API를 로컬에서 확인하려면 `http://localhost:8000/?site=<12자리 siteKey>`로 접속하고, 백엔드 개발 서버와 CORS 설정을 준비합니다.

### 주문서 제작 모드

주문 사이트는 크리스마스 템플릿을 `?orderEditor=1`로 iframe에 열고, `postMessage`로 현재 주문 초안과 진행 단계를 전달합니다. 로그인 화면, INFORMATION, LETTER, 사진·영상 폴더, 음악 창, 마켓 안내판을 실제 마켓 UI 안에서 편집합니다. 제작 모드는 `urluv.shop`, `staging.urluv.shop`, `urluv-order.vercel.app`, `edit.urluv.shop` 또는 로컬 개발 주문 사이트가 부모 창일 때만 메시지를 받으며, 고객 사이트의 비밀번호 인증이나 공개 사이트 데이터는 사용하지 않습니다. 화면의 예시 문구는 입력 전에는 저장되지 않습니다.

로컬에서 두 저장소를 함께 확인할 때는 주문 프론트엔드의 Vite 개발 서버를 실행하면 됩니다. 이 저장소가 같은 작업 공간에 있으면 `/christmas-editor/` 경로에서 자동 제공됩니다. 별도 서버를 사용할 때만 주문 프론트엔드의 `VITE_CHRISTMAS_EDITOR_URL`을 설정합니다. 운영에서는 크리스마스 템플릿과 주문 사이트를 모두 배포해야 제작 모드가 동작합니다.

테스트 배포는 이 저장소의 Vercel Preview 브랜치로 진행합니다. 주문 프론트의 `develop` 배포인 `staging.urluv.shop`에서 해당 Preview URL을 불러옵니다. 필요하면 `VITE_CHRISTMAS_EDITOR_URL`로 주소를 지정할 수 있습니다. 테스트 주문도 운영 백엔드·DB를 사용하므로 백엔드 `FRONTEND_ORIGIN`에 `https://staging.urluv.shop`을 추가합니다. 확인 후 이 저장소의 운영 브랜치에 반영해 `santa.urluv.shop`에 배포합니다.

## Deployment

Vercel의 SPA rewrite는 12자리 사이트 키 주소를 `index.html`로 보냅니다. 이 템플릿은 `https://santa.urluv.shop`에 배포되어 있고, 고객 사이트 주소는 `https://santa.urluv.shop/{siteKey}`입니다. API 서버는 `SITE_URL_TEMPLATE_3=https://santa.urluv.shop`로 설정합니다.

`urluv-site.js`의 API 주소는 개발에서 `localhost:8080`, 운영에서 현재 URLUV API CloudFront 주소를 사용합니다.

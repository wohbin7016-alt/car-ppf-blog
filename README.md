# car-ppf-blog

자동차 PPF·카랩핑 블로그 포스트 자동 작성기 (시너지 아우토살롱 기본 설정).

## 동작 방식

- 단일 HTML + JS (서버 없음)
- Gemini BYOK (사용자 본인 API 키)
- 클라이언트에서 이미지 리사이징 (1200px)
- 결과: 제목 / 본문 / 해시태그 → 복사해서 네이버 블로그 붙여넣기

## 로컬 실행

```bash
cd ~/projects/car-ppf-blog
python3 -m http.server 8080
# → http://localhost:8080
```

## GitHub Pages 배포

```bash
gh repo create car-ppf-blog --public --source=. --remote=origin --push
# Settings → Pages → Source: main branch → /
```

## 사용 순서

1. Gemini API 키 입력 (최초 1회, 브라우저 localStorage에 저장)
2. 차종·작업·필름·방문배경 선택
3. BEFORE/AFTER 사진 업로드
4. 생성 버튼 → 15~30초 후 결과
5. 복사해서 네이버 블로그에 붙여넣기
6. 사진은 네이버 에디터에서 별도 업로드

## 업체 변경

`config/synergy.json` 을 복사해 다른 업체용 설정 만들기.
`app.js` 의 `CONFIG_URL` 수정.

## 향후 로드맵

- v1: 네이버 블로그 자동 발행 (Playwright or 브라우저 확장)
- v1: 여러 업체 멀티테넌트
- v1: Cloudflare Worker + 라이선스 키 (판매용)

# 배포 가이드 (PM 검수용)

## 저장소

https://github.com/bbororo5/whalebell

## 추천: Vercel + Neon (서버리스)

### 1. Neon Postgres (무료)

1. https://console.neon.tech 가입/로그인
2. **New Project** → 이름 `whalebell`
3. **Connection string** 복사 (`postgresql://...`)

### 2. Vercel 배포

1. https://vercel.com/new/import?s=https://github.com/bbororo5/whalebell
2. GitHub 연동 후 `whalebell` 저장소 Import
3. **Environment Variables** 추가:
   - `DATABASE_URL` = Neon connection string
4. **Deploy** (빌드 시 `prisma migrate deploy` 자동 실행 — `vercel.json` 참고)
5. 배포 URL 예: `https://whalebell-xxx.vercel.app`

### 3. PM에게 전달할 URL

- **랜딩**: `/`
- **HOME(관제실)**: `/dashboard` (번호 입력 후)
- **데모 인증번호**: `123456`

---

## 대안: Render (Web 1대 + Postgres 1대)

1. https://dashboard.render.com → **New Blueprint**
2. `bbororo5/whalebell` 연결 → `render.yaml` 자동 인식
3. Web 서비스 1개 + Postgres 1개가 생성됨 (고정 2 서비스)

---

## 인스턴스 구조 (Vercel 기준)

| 구분 | 설명 |
|---|---|
| **고정 서버 N대** | ❌ 없음 (서버리스) |
| **배포 URL** | 1개 |
| **실행 리전** | `icn1` (서울) — `vercel.json` |
| **API 라우트** | 요청마다 서버리스 함수 spin-up (~8개 엔드포인트) |
| **정적 페이지** | CDN Edge (전 세계, 관리형) |
| **DB** | Neon Postgres 1 클러스터 (compute는 Neon이 autoscale) |

평소 트래픽 적으면 **함수 인스턴스 0~소수**, PM 검수·데모 시 **동시 접속 수만큼** 자동 확장.

Render 사용 시: **Web 인스턴스 1대**(free) + **Postgres 1대**(free) = 물리적으로 2 서비스.

---

## 로컬 DB (개발용 Docker)

```bash
docker run -d --name whalebell-pg \
  -e POSTGRES_PASSWORD=whalebell \
  -e POSTGRES_USER=whalebell \
  -e POSTGRES_DB=whalebell \
  -p 5433:5432 postgres:16
```

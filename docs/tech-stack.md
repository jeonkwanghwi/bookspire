# Bookspire — 기술 스택

## 방향

"아주 간단하게"가 최우선. 프로젝트 하나, 서버 관리 없음, 무료로 배포까지.

- 프론트/백엔드를 별도 프로젝트로 나누지 않는다.
- 직접 운영하는 서버·인프라 없이 시작한다.
- DB는 관리형 무료 티어(Supabase)를 쓴다 — 배포 시점에 DB를 갈아탈 일이 없도록.

## 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Next.js** (App Router, TypeScript) | 프론트 + API를 한 프로젝트로. 별도 백엔드 서버 불필요. |
| DB | **Supabase** (Postgres) | 무료 티어, 서버 관리 없음, 그냥 SQL. Vercel 배포와 궁합 좋음. |
| DB 접근 | **@supabase/supabase-js** | Next.js API 라우트에서 호출. ORM 없이 이 클라이언트만 사용. |
| 스타일링 | **Tailwind CSS** | create-next-app 기본 포함. 단일 화면이라 이 정도면 충분. |
| 배포 | **Vercel** | Next.js 무료 배포의 기본값. push하면 끝. |

## 구조 (예상)

```
bookspire/
├── app/
│   ├── page.tsx          # 메인 화면 (피드 + 입력 폼, 탭/테마/토스트 포함)
│   ├── layout.tsx        # 폰트, 메타데이터(OG), Analytics
│   ├── icon.png          # 파비콘 / opengraph-image.png  # 공유 미리보기
│   └── api/
│       ├── notes/route.ts            # GET(목록), POST(작성, 길이 검증)
│       ├── notes/[id]/route.ts       # DELETE(관리자, x-admin-key 검증)
│       ├── notes/[id]/like/route.ts  # POST(추천 ±1)
│       └── visit/route.ts            # POST(방문 카운트)
├── lib/
│   └── supabase.ts       # Supabase 클라이언트 생성
├── .env.local            # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY (gitignore)
└── docs/
```

## DB 스키마 (Supabase SQL Editor에서 1회 실행)

```sql
CREATE TABLE notes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quote      TEXT NOT NULL,
  book_title TEXT NOT NULL,
  nickname   TEXT NOT NULL,
  likes      INTEGER NOT NULL DEFAULT 0,
  category   TEXT NOT NULL DEFAULT 'book' CHECK (category IN ('book', 'movie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 추천 수 증감 (동시 요청에도 안전한 원자적 업데이트)
CREATE FUNCTION change_likes(note_id BIGINT, delta INTEGER)
RETURNS void AS $$
  UPDATE notes SET likes = GREATEST(0, likes + delta) WHERE id = note_id;
$$ LANGUAGE sql;

-- 방문 카운터 (일별, 중복 접속 포함 — KST 기준)
CREATE TABLE visits (
  day   DATE PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION add_visit()
RETURNS integer AS $$
  INSERT INTO visits (day, count) VALUES ((now() AT TIME ZONE 'Asia/Seoul')::date, 1)
  ON CONFLICT (day) DO UPDATE SET count = visits.count + 1
  RETURNING count;
$$ LANGUAGE sql;

-- 서버(secret key = service_role)에 권한 부여 — 최근 프로젝트는 자동 GRANT가 없음
GRANT ALL ON TABLE public.notes TO service_role;
GRANT ALL ON TABLE public.visits TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.change_likes(BIGINT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_visit() TO service_role;
```

- DB 접근은 전부 Next.js API 라우트(서버)를 거친다. 브라우저에서 Supabase에 직접 붙지 않으므로 RLS 정책 설계 없이 시작 가능 (테이블 RLS는 켜두고, 서버는 service role key 사용).

## 배포

1. Supabase 프로젝트 생성 → 위 스키마 실행 → URL/key 발급
2. Vercel에 GitHub 레포 연결 → 환경변수(URL/key) 등록 → 끝

둘 다 무료 티어로 충분. 이 규모(테이블 1개, 텍스트 데이터)에서는 과금 걱정 없음.

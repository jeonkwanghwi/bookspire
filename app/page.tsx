"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: number;
  quote: string;
  book_title: string;
  nickname: string;
  likes: number;
  created_at: string;
};

type Sort = "popular" | "recent";
type Category = "book" | "movie";

const COPY = {
  book: {
    headline: "완독을 해야만 영감을 얻는 건 아니잖아요?",
    subtitle: "한줄에서 오는 영감, 비로소 시작되는 정독",
    quotePh: "마음에 남은 한 구절",
    titlePh: "책 제목",
    empty: "아직 기록이 없어요. 첫 구절을 남겨보세요.",
    wrap: ["『", "』"],
  },
  movie: {
    headline: "엔딩 크레딧까지 봐야만 영감을 얻는 건 아니잖아요?",
    subtitle: "한마디에서 오는 영감, 비로소 시작되는 정주행",
    quotePh: "마음에 남은 한마디",
    titlePh: "영화 제목",
    empty: "아직 기록이 없어요. 첫 한마디를 남겨보세요.",
    wrap: ["《", "》"],
  },
} as const;

const BRAND = {
  book: { name: "Book", nameCls: "text-[#23392C]", spireCls: "text-[#2F5D45]" },
  movie: { name: "Cine", nameCls: "text-[#203A54]", spireCls: "text-[#1E4E8C]" },
} as const;

const NICK_ADJ = [
  "조용한", "느린", "한밤의", "새벽의", "창가의", "오후의", "골목의", "심야의",
  "일요일의", "흐린날의", "비오는날의", "다정한", "무심한", "게으른", "낯선", "방랑하는",
];

const NICK_NOUN = [
  "독자", "관객", "문장수집가", "산책자", "기록자", "몽상가", "여행자", "낭독자",
  "필사가", "사서", "시인", "편집자", "목격자", "밑줄", "페이지", "서재", "상영관", "이야기꾼",
];

function myNickname() {
  let name = localStorage.getItem("bookspire:nickname");
  if (!name) {
    name =
      NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)] +
      NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)] +
      Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("bookspire:nickname", name);
  }
  return name;
}

function likedSet(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem("bookspire:liked") ?? "[]"));
  } catch {
    return new Set();
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function Home() {
  const [cat, setCat] = useState<Category>("book");
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [sort, setSort] = useState<Sort>("popular");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [draftQuote, setDraftQuote] = useState("");
  const [draftBook, setDraftBook] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = quoteRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draftQuote]);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "error" } | null>(null);

  const showToast = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast((t) => (t?.msg === msg ? null : t)), 2000);
  }, []);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("admin");
    if (param === "off") localStorage.removeItem("bookspire:adminKey");
    else if (param) localStorage.setItem("bookspire:adminKey", param);
    if (param) window.history.replaceState(null, "", window.location.pathname);
    setAdminKey(localStorage.getItem("bookspire:adminKey"));
  }, []);

  const load = useCallback(async (c: Category) => {
    try {
      const res = await fetch(`/api/notes?sort=recent&category=${c}`);
      if (!res.ok) throw new Error((await res.json()).error);
      setNotes(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다");
    }
  }, []);

  useEffect(() => {
    setLiked(likedSet());
    load(cat);
  }, [cat, load]);

  const displayed = useMemo(() => {
    if (!notes) return null;
    const arr = [...notes];
    if (sort === "popular") arr.sort((a, b) => b.likes - a.likes || +new Date(b.created_at) - +new Date(a.created_at));
    else arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return arr;
  }, [notes, sort]);

  const switchCat = (c: Category) => {
    if (c === cat) return;
    setCat(c);
    setNotes(null);
  };

  const toggleLike = async (id: number) => {
    const on = !liked.has(id);
    const next = new Set(liked);
    if (on) next.add(id);
    else next.delete(id);
    setLiked(next);
    localStorage.setItem("bookspire:liked", JSON.stringify([...next]));
    setNotes((ns) => ns?.map((n) => (n.id === id ? { ...n, likes: n.likes + (on ? 1 : -1) } : n)) ?? null);
    await fetch(`/api/notes/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on }),
    });
  };

  const removeNote = async (id: number) => {
    if (!confirm("이 글을 삭제할까요?")) return;
    if (!confirm("정말로 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey ?? "" },
    });
    if (res.ok) setNotes((ns) => ns?.filter((n) => n.id !== id) ?? null);
    else alert((await res.json()).error ?? "삭제하지 못했습니다");
  };

  const save = async () => {
    const quote = draftQuote.trim();
    const bookTitle = draftBook.trim();
    if (!quote || !bookTitle || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, bookTitle, nickname: myNickname(), category: cat }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created: Note = await res.json();
      setNotes((ns) => [created, ...(ns ?? [])]);
      setSort("recent");
      setFreshId(created.id);
      setDraftQuote("");
      setDraftBook("");
      showToast("기록했어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장하지 못했습니다", "error");
    } finally {
      setSaving(false);
    }
  };

  const copy = COPY[cat];
  const canSave = draftQuote.trim() && draftBook.trim() && !saving;
  const tabBase = "cursor-pointer text-[13.5px] py-1 tracking-[0.01em] border-b-[1.5px]";
  const tabActive = `${tabBase} text-[var(--accent-deep)] font-semibold border-[var(--accent)]`;
  const tabIdle = `${tabBase} text-[var(--muted3)] border-transparent`;
  const catBase = "cursor-pointer text-[13px] px-4 py-1.5 rounded-full transition-all";
  const catActive = `${catBase} bg-[var(--accent)] text-[var(--save-on-text)] font-semibold`;
  const catIdle = `${catBase} text-[var(--muted3)]`;

  return (
    <div className={`theme-${cat} min-h-dvh flex justify-center`}>
      <div
        aria-hidden
        className={`fixed inset-0 -z-10 [background:linear-gradient(to_bottom,#f8f4ec,#ebe1cd)] transition-opacity duration-500 ${cat === "book" ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`fixed inset-0 -z-10 [background:linear-gradient(to_bottom,#f4f9fc,#dfecf6)] transition-opacity duration-500 ${cat === "movie" ? "opacity-100" : "opacity-0"}`}
      />
      <div className="w-full max-w-[620px] flex flex-col min-h-dvh relative">
        <header className="pt-[54px] pb-[30px] px-7 text-center">
          <div key={cat} className="fade-in flex items-center justify-center gap-2">
            {cat === "book" ? (
              <svg width="30" height="30" viewBox="0 0 150 150" fill="none" aria-label="Bookspire 로고">
                <g stroke="#2F5D45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M75 118 C 60 106, 40 104, 24 108 L 24 62 C 40 58, 60 60, 75 72 Z" fill="#EDE4CE" />
                  <path d="M75 118 C 90 106, 110 104, 126 108 L 126 62 C 110 58, 90 60, 75 72 Z" fill="#EDE4CE" />
                  <path d="M75 72 L 75 118" />
                  <path d="M86 80 L 116 84" strokeWidth="3" opacity="0.55" />
                  <path d="M86 90 L 112 93.5" strokeWidth="3" opacity="0.55" />
                </g>
                <path d="M75 58 C 71 46, 76 40, 74 28 C 82 38, 84 48, 79 58 Z" fill="#C9843E" />
                <circle cx="88" cy="34" r="3.2" fill="#C9843E" />
                <circle cx="63" cy="42" r="2.4" fill="#C9843E" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 150 150" fill="none" aria-label="Cinespire 로고">
                <g stroke="#1E4E8C" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M27 68 L 118 52 L 122 70 L 31 86 Z" fill="#1E4E8C" />
                  <g stroke="#EAF4FC" strokeWidth="4.5">
                    <path d="M45 65.5 L 52 78.5" />
                    <path d="M63 62.5 L 70 75.5" />
                    <path d="M81 59.5 L 88 72.5" />
                    <path d="M99 56.5 L 106 69.5" />
                  </g>
                </g>
                <g stroke="#1E4E8C" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round">
                  <rect x="30" y="88" width="90" height="40" rx="6" fill="#EAF4FC" />
                  <path d="M42 102 L 108 102" strokeWidth="3.4" opacity="0.5" />
                  <path d="M42 114 L 92 114" strokeWidth="3.4" opacity="0.5" />
                </g>
                <path d="M76 44 C 72 32, 77 26, 75 14 C 83 24, 85 34, 80 44 Z" fill="#2E8BD6" />
                <circle cx="90" cy="22" r="3.2" fill="#2E8BD6" />
                <circle cx="64" cy="28" r="2.4" fill="#2E8BD6" />
              </svg>
            )}
            <span className={`font-[family-name:var(--font-brand)] font-semibold text-[26px] tracking-[0.5px] ${BRAND[cat].nameCls}`}>
              {BRAND[cat].name}<span className={BRAND[cat].spireCls}>spire</span>
            </span>
          </div>
          <div className="mt-6 inline-flex rounded-full border border-[var(--chip-border)] bg-[var(--composer-bg)] p-[3px]">
            <button onClick={() => switchCat("book")} className={cat === "book" ? catActive : catIdle}>
              책
            </button>
            <button onClick={() => switchCat("movie")} className={cat === "movie" ? catActive : catIdle}>
              영화
            </button>
          </div>
          <div key={`copy-${cat}`} className="fade-in">
            <h1 className="mt-6 font-serif text-[25px] leading-[1.5] tracking-[-0.01em] text-[var(--ink)] text-balance">
              {copy.headline}
            </h1>
            <p className="mt-3 text-[13.5px] text-[var(--muted)] tracking-[0.01em]">{copy.subtitle}</p>
          </div>
          <div className="w-[26px] h-px bg-[var(--accent)] mx-auto mt-6 opacity-60" />
        </header>

        <div className="flex items-center gap-[18px] px-[30px] pb-2">
          <button onClick={() => setSort("popular")} className={sort === "popular" ? tabActive : tabIdle}>
            인기순
          </button>
          <button onClick={() => setSort("recent")} className={sort === "recent" ? tabActive : tabIdle}>
            최신순
          </button>
          <div className="flex-1" />
          <span className="text-xs text-[var(--muted3)]">{notes ? `${notes.length}개의 기록` : ""}</span>
        </div>

        <main className="flex-1 pt-3 px-5 pb-[150px] flex flex-col gap-3.5">
          {error && (
            <p className="text-center text-[13px] text-[#A05B4C] py-8">{error}</p>
          )}
          {!error &&
            !displayed &&
            [0, 1, 2].map((i) => (
              <div
                key={`skel-${i}`}
                className="fade-in animate-pulse bg-[var(--card-bg)] border border-[var(--card-border)] rounded px-[26px] pt-[26px] pb-5"
              >
                <div className="h-[18px] w-3/4 rounded bg-[var(--card-border)] opacity-60 mb-3" />
                <div className="h-[18px] w-1/2 rounded bg-[var(--card-border)] opacity-60 mb-7" />
                <div className="h-[11px] w-28 rounded bg-[var(--card-border)] opacity-50" />
              </div>
            ))}
          {!error && displayed?.length === 0 && (
            <p className="text-center text-[13px] text-[var(--muted2)] py-8">{copy.empty}</p>
          )}
          {displayed?.map((n) => {
            const on = liked.has(n.id);
            return (
              <article
                key={n.id}
                className={`${n.id === freshId ? "card-fresh" : "rise-in"} bg-[var(--card-bg)] border border-[var(--card-border)] rounded px-[26px] pt-[26px] pb-5 shadow-[0_1px_2px_rgba(58,46,36,0.03)]`}
              >
                <p className="font-serif text-[22px] leading-normal text-[var(--ink)] mb-[18px] text-pretty whitespace-pre-line">
                  {n.quote}
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-serif italic text-sm text-[var(--title-ink)]">
                      {copy.wrap[0]}{n.book_title}{copy.wrap[1]}
                    </div>
                    <div className="mt-1.5 text-[11.5px] text-[var(--muted2)] tracking-[0.02em]">
                      {n.nickname} · {formatDate(n.created_at)}
                      {adminKey && (
                        <button
                          onClick={() => removeNote(n.id)}
                          className="ml-2 cursor-pointer text-[11.5px] text-[#A05B4C] underline underline-offset-2"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLike(n.id)}
                    className={`flex items-center gap-[5px] border rounded-full px-[11px] py-[5px] cursor-pointer transition-all ${
                      on
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                        : "border-[var(--chip-border)] bg-transparent text-[var(--muted2)]"
                    }`}
                  >
                    <span key={on ? "on" : "off"} className={`text-[13px] ${on ? "heart-pop" : ""}`}>
                      {on ? "♥" : "♡"}
                    </span>
                    <span className="text-[12.5px] font-semibold">{n.likes}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </main>

        {toast && (
          <div
            className={`rise-in fixed bottom-[130px] left-1/2 -translate-x-1/2 z-50 text-[13px] font-medium px-5 py-2.5 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.12)] ${
              toast.kind === "error"
                ? "bg-[#A05B4C] text-[#FDF6F3]"
                : "bg-[var(--accent-deep)] text-[var(--save-on-text)]"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="sticky bottom-0 px-4 pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom))]">
          <div
            aria-hidden
            className={`absolute inset-0 [background:linear-gradient(to_top,#ece3d2_72%,transparent)] transition-opacity duration-500 ${cat === "book" ? "opacity-100" : "opacity-0"}`}
          />
          <div
            aria-hidden
            className={`absolute inset-0 [background:linear-gradient(to_top,#e2eef6_72%,transparent)] transition-opacity duration-500 ${cat === "movie" ? "opacity-100" : "opacity-0"}`}
          />
          <div className="relative bg-[var(--composer-bg)] border border-[var(--chip-border)] rounded-lg py-3 pr-3 pl-4 shadow-[0_4px_18px_rgba(58,46,36,0.07)] flex flex-col gap-2.5">
            <textarea
              ref={quoteRef}
              value={draftQuote}
              onChange={(e) => setDraftQuote(e.target.value)}
              placeholder={copy.quotePh}
              maxLength={200}
              rows={1}
              className="border-none outline-none bg-transparent font-serif text-lg text-[var(--ink)] w-full resize-none overflow-hidden leading-relaxed"
            />
            <div className="flex items-center gap-2.5 border-t border-[var(--composer-divider)] pt-2.5">
              <input
                value={draftBook}
                onChange={(e) => setDraftBook(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder={copy.titlePh}
                maxLength={100}
                className="border-none outline-none bg-transparent text-[13.5px] text-[var(--title-ink)] flex-1 min-w-0"
              />
              {draftQuote.length >= 180 && (
                <span className="text-[11px] text-[var(--muted2)] whitespace-nowrap">{draftQuote.length}/200</span>
              )}
              <button
                onClick={save}
                className={`text-[13px] font-semibold px-5 py-[9px] rounded-md whitespace-nowrap transition-all ${
                  canSave
                    ? "bg-[var(--accent)] text-[var(--save-on-text)] cursor-pointer"
                    : "bg-[var(--save-off-bg)] text-[var(--save-off-text)] cursor-default"
                }`}
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

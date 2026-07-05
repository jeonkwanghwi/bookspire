"use client";

import { useCallback, useEffect, useState } from "react";

type Note = {
  id: number;
  quote: string;
  book_title: string;
  nickname: string;
  likes: number;
  created_at: string;
};

type Sort = "popular" | "recent";

const NICKNAMES = [
  "한밤의독자", "책장넘기는소리", "조용한오후", "문장수집가",
  "여백을읽다", "오늘의밑줄", "창밖을보며", "느린페이지",
];

function myNickname() {
  let name = localStorage.getItem("bookspire:nickname");
  if (!name) {
    name = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + Math.floor(Math.random() * 900 + 100);
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
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [sort, setSort] = useState<Sort>("popular");
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [draftQuote, setDraftQuote] = useState("");
  const [draftBook, setDraftBook] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: Sort) => {
    try {
      const res = await fetch(`/api/notes?sort=${s}`);
      if (!res.ok) throw new Error((await res.json()).error);
      setNotes(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했습니다");
    }
  }, []);

  useEffect(() => {
    setLiked(likedSet());
    load(sort);
  }, [sort, load]);

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

  const save = async () => {
    const quote = draftQuote.trim();
    const bookTitle = draftBook.trim();
    if (!quote || !bookTitle || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, bookTitle, nickname: myNickname() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDraftQuote("");
      setDraftBook("");
      if (sort === "recent") await load("recent");
      else setSort("recent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  };

  const canSave = draftQuote.trim() && draftBook.trim() && !saving;
  const tabBase = "cursor-pointer text-[13.5px] py-1 tracking-[0.01em] border-b-[1.5px]";
  const tabActive = `${tabBase} text-[#4A5940] font-semibold border-[#8A9A7B]`;
  const tabIdle = `${tabBase} text-[#B0A28E] border-transparent`;

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[620px] flex flex-col min-h-screen relative">
        <header className="pt-[54px] pb-[30px] px-7 text-center">
          <div className="font-serif font-medium text-[17px] tracking-[0.08em] text-[#3A2E24]">Bookspire</div>
          <h1 className="mt-7 font-serif text-[24px] leading-[1.4] text-[#33291F] text-balance">
            완독을 해야만 영감을 얻는 건 아니잖아요?
          </h1>
          <p className="mt-3 text-[13.5px] text-[#9C8E7C] tracking-[0.01em]">
            한줄에서 오는 영감, 비로소 시작되는 정독
          </p>
          <div className="w-[26px] h-px bg-[#8A9A7B] mx-auto mt-6 opacity-60" />
        </header>

        <div className="flex items-center gap-[18px] px-[30px] pb-2">
          <button onClick={() => setSort("popular")} className={sort === "popular" ? tabActive : tabIdle}>
            인기순
          </button>
          <button onClick={() => setSort("recent")} className={sort === "recent" ? tabActive : tabIdle}>
            최신순
          </button>
          <div className="flex-1" />
          <span className="text-xs text-[#B0A28E]">{notes ? `${notes.length}개의 기록` : ""}</span>
        </div>

        <main className="flex-1 pt-3 px-5 pb-[150px] flex flex-col gap-3.5">
          {error && (
            <p className="text-center text-[13px] text-[#A05B4C] py-8">{error}</p>
          )}
          {!error && notes?.length === 0 && (
            <p className="text-center text-[13px] text-[#A99C88] py-8">
              아직 기록이 없어요. 첫 구절을 남겨보세요.
            </p>
          )}
          {notes?.map((n) => {
            const on = liked.has(n.id);
            return (
              <article
                key={n.id}
                className="rise-in bg-[#FBF8F1] border border-[#EAE2D2] rounded px-[26px] pt-[26px] pb-5 shadow-[0_1px_2px_rgba(58,46,36,0.03)]"
              >
                <p className="font-serif text-[22px] leading-normal text-[#33291F] mb-[18px] text-pretty">
                  {n.quote}
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-serif italic text-sm text-[#6E6151]">『{n.book_title}』</div>
                    <div className="mt-1.5 text-[11.5px] text-[#A99C88] tracking-[0.02em]">
                      {n.nickname} · {formatDate(n.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleLike(n.id)}
                    className={`flex items-center gap-[5px] border rounded-full px-[11px] py-[5px] cursor-pointer transition-all ${
                      on
                        ? "border-[#8A9A7B] bg-[#EDF1E5] text-[#4A5940]"
                        : "border-[#E3DAC8] bg-transparent text-[#A99C88]"
                    }`}
                  >
                    <span className="text-[13px]">{on ? "♥" : "♡"}</span>
                    <span className="text-[12.5px] font-semibold">{n.likes}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </main>

        <div className="sticky bottom-0 px-4 pt-3.5 pb-[18px] bg-gradient-to-t from-[#F5F1E8] from-72% to-transparent">
          <div className="bg-[#FFFDF8] border border-[#E3DAC8] rounded-lg py-3 pr-3 pl-4 shadow-[0_4px_18px_rgba(58,46,36,0.07)] flex flex-col gap-2.5">
            <input
              value={draftQuote}
              onChange={(e) => setDraftQuote(e.target.value)}
              placeholder="마음에 남은 한 구절"
              className="border-none outline-none bg-transparent font-serif text-lg text-[#33291F] w-full"
            />
            <div className="flex items-center gap-2.5 border-t border-[#F0E9DA] pt-2.5">
              <input
                value={draftBook}
                onChange={(e) => setDraftBook(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="책 제목"
                className="border-none outline-none bg-transparent text-[13.5px] text-[#6E6151] flex-1 min-w-0"
              />
              <button
                onClick={save}
                className={`text-[13px] font-semibold px-5 py-[9px] rounded-md whitespace-nowrap transition-all ${
                  canSave
                    ? "bg-[#8A9A7B] text-[#FDFCF8] cursor-pointer"
                    : "bg-[#EDE6D8] text-[#C3B7A3] cursor-default"
                }`}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

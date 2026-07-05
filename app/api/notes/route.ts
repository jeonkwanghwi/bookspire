import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const sort = req.nextUrl.searchParams.get("sort") ?? "popular";
    const category = req.nextUrl.searchParams.get("category") === "movie" ? "movie" : "book";
    const supabase = getSupabase();
    const query = supabase.from("notes").select("*").eq("category", category);
    const { data, error } =
      sort === "recent"
        ? await query.order("created_at", { ascending: false })
        : await query.order("likes", { ascending: false }).order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quote = String(body.quote ?? "").trim();
    const bookTitle = String(body.bookTitle ?? "").trim();
    const nickname = String(body.nickname ?? "").trim();
    const category = body.category === "movie" ? "movie" : "book";
    if (!quote || !bookTitle || !nickname) {
      return NextResponse.json({ error: "quote, bookTitle, nickname은 필수입니다" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("notes")
      .insert({ quote, book_title: bookTitle, nickname, category })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

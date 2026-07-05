import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/notes/[id]">) {
  try {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey || req.headers.get("x-admin-key") !== adminKey) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const supabase = getSupabase();
    const { error } = await supabase.from("notes").delete().eq("id", Number(id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

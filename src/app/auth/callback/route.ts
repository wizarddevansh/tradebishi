import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=Authentication%20failed`
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie setting can be ignored in some server contexts.
          }
        },
      },
    }
  );

  // Exchange Google's authorization code for a Supabase session
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("OAuth callback error:", exchangeError);

    return NextResponse.redirect(
      `${origin}/login?error=Authentication%20failed`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=Authentication%20failed`
    );
  }

  // 1. Check MEMBER
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    console.error("Member lookup error:", memberError);

    await supabase.auth.signOut();

    return NextResponse.redirect(
      `${origin}/login?error=Unable%20to%20verify%20your%20member%20account`
    );
  }

  if (member) {
    if (member.status !== "active") {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        `${origin}/login?error=Your%20member%20account%20is%20not%20active`
      );
    }

    return NextResponse.redirect(`${origin}/member`);
  }

  // 2. Check ADMIN / TRADER / MEMBER profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);

    await supabase.auth.signOut();

    return NextResponse.redirect(
      `${origin}/login?error=Unable%20to%20verify%20your%20account%20role`
    );
  }

  if (profile?.role === "admin") {
    return NextResponse.redirect(`${origin}/admin`);
  }

  if (profile?.role === "trader") {
    return NextResponse.redirect(`${origin}/trader`);
  }

  if (profile?.role === "member") {
    return NextResponse.redirect(`${origin}/member`);
  }

  // Unknown Google account
  await supabase.auth.signOut();

  return NextResponse.redirect(
    `${origin}/login?error=Your%20Google%20account%20is%20not%20registered%20with%20TradeBishi`
  );
}
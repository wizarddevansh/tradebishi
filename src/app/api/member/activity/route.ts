import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type Transaction = {
  id: string;
  member_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
};

type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
};

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireMember() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
    };
  }

  const adminSupabase = getAdminSupabase();

  const { data: member, error: memberError } = await adminSupabase
    .from("members")
    .select("id, user_id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    console.error("Member verification error:", memberError);

    return {
      user: null,
      response: NextResponse.json(
        {
          error: memberError.message,
        },
        { status: 500 }
      ),
    };
  }

  if (!member) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Member account not found.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    member,
    response: null,
  };
}

export async function GET() {
  try {
    const auth = await requireMember();

    if (!auth.user) {
      return auth.response;
    }

    const supabase = getAdminSupabase();

    const [transactionsResult, membersResult] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, member_id, type, amount, description, status, created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("members")
        .select("id, user_id, full_name")
        .order("full_name", { ascending: true }),
    ]);

    if (transactionsResult.error) {
      console.error(
        "Member activity transactions error:",
        transactionsResult.error
      );

      return NextResponse.json(
        {
          error: transactionsResult.error.message,
        },
        { status: 500 }
      );
    }

    if (membersResult.error) {
      console.error(
        "Member activity members error:",
        membersResult.error
      );

      return NextResponse.json(
        {
          error: membersResult.error.message,
        },
        { status: 500 }
      );
    }

    const members = (membersResult.data || []) as Member[];

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        member.full_name,
      ])
    );

    const transactions =
      (transactionsResult.data || []) as Transaction[];

    const activity = transactions.map((transaction) => ({
      ...transaction,

      member_name: transaction.member_id
        ? memberMap.get(transaction.member_id) || "Unknown Member"
        : "Cooperative",
    }));

    return NextResponse.json(
      {
        activity,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Member activity API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load cooperative activity.",
      },
      { status: 500 }
    );
  }
}
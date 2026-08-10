import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MEMBER_SELECT =
  "id, user_id, full_name, phone, email, investment_amount, profit_share, status, created_at";

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const;

type MemberInput = {
  id?: string;
  full_name?: string;
  phone?: string | null;
  email?: string;
  password?: string;
  investment_amount?: number | string;
  profit_share?: number | string;
  status?: string;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Forbidden. Admin access required.",
      },
      { status: 403 }
    );
  }

  return null;
}

async function getBody(
  request: NextRequest
): Promise<MemberInput | null> {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as MemberInput;
  } catch {
    return null;
  }
}

function validate(input: MemberInput) {
  const full_name =
    typeof input.full_name === "string"
      ? input.full_name.trim()
      : "";

  const email =
    typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";

  const phone =
    typeof input.phone === "string"
      ? input.phone.trim()
      : null;

  const investment_amount = Number(
    input.investment_amount ?? 0
  );

  const profit_share = Number(
    input.profit_share ?? 0
  );

  const status =
    typeof input.status === "string"
      ? input.status.toLowerCase()
      : "active";

  if (!full_name) {
    return {
      error: "Full name is required.",
    };
  }

  if (!email || !email.includes("@")) {
    return {
      error: "A valid email is required.",
    };
  }

  if (
    !Number.isFinite(investment_amount) ||
    investment_amount < 0
  ) {
    return {
      error:
        "Investment amount must be 0 or greater.",
    };
  }

  if (
    !Number.isFinite(profit_share) ||
    profit_share < 0 ||
    profit_share > 100
  ) {
    return {
      error:
        "Profit share must be between 0 and 100.",
    };
  }

  if (
    !ALLOWED_STATUSES.includes(
      status as (typeof ALLOWED_STATUSES)[number]
    )
  ) {
    return {
      error: "Invalid member status.",
    };
  }

  return {
    full_name,
    email,
    phone: phone || null,
    investment_amount,
    profit_share,
    status,
  };
}

/* =====================================================
   GET
===================================================== */

export async function GET() {
  try {
    const denied = await checkAdmin();

    if (denied) {
      return denied;
    }

    const supabase = adminClient();

    const { data, error } = await supabase
      .from("members")
      .select(MEMBER_SELECT)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Members GET error:", error);

      return NextResponse.json(
        {
          error: "Failed to load members.",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      members: data ?? [],
    });
  } catch (error) {
    console.error("Members GET:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const denied = await checkAdmin();

    if (denied) {
      return denied;
    }

    const body = await getBody(request);

    if (!body) {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const validation = validate(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const supabase = adminClient();

    /*
     * Create Supabase Auth account.
     */
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: validation.email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error(
        "Auth user creation error:",
        authError
      );

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Failed to create member account.",
        },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    /*
     * Create member record.
     *
     * Password is NOT stored in members.
     */
    const { data: member, error: memberError } =
      await supabase
        .from("members")
        .insert({
          user_id: userId,
          full_name: validation.full_name,
          phone: validation.phone,
          email: validation.email,
          investment_amount:
            validation.investment_amount,
          profit_share:
            validation.profit_share,
          status: validation.status,
        })
        .select(MEMBER_SELECT)
        .single();

    if (memberError) {
      console.error(
        "Member insert error:",
        memberError
      );

      /*
       * Roll back Auth account.
       */
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error:
            "Failed to create member record.",
          details:
            process.env.NODE_ENV === "development"
              ? memberError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { member },
      { status: 201 }
    );
  } catch (error) {
    console.error("Members POST:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   PATCH
===================================================== */

export async function PATCH(
  request: NextRequest
) {
  try {
    const denied = await checkAdmin();

    if (denied) {
      return denied;
    }

    const body = await getBody(request);

    if (!body) {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (!body.id) {
      return NextResponse.json(
        {
          error: "Member ID is required.",
        },
        { status: 400 }
      );
    }

    const validation = validate(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const supabase = adminClient();

    /*
     * Find existing member.
     */
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("members")
      .select("id, user_id")
      .eq("id", body.id)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);

      return NextResponse.json(
        {
          error: "Failed to find member.",
        },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Update Auth email/password.
     */
    if (existing.user_id) {
      const authUpdate: {
        email?: string;
        password?: string;
      } = {
        email: validation.email,
      };

      if (
        typeof body.password === "string" &&
        body.password.length > 0
      ) {
        if (body.password.length < 6) {
          return NextResponse.json(
            {
              error:
                "Password must be at least 6 characters.",
            },
            { status: 400 }
          );
        }

        authUpdate.password = body.password;
      }

      const { error: authError } =
        await supabase.auth.admin.updateUserById(
          existing.user_id,
          authUpdate
        );

      if (authError) {
        console.error(authError);

        return NextResponse.json(
          {
            error:
              authError.message ||
              "Failed to update account.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Update member database record.
     */
    const { data: member, error } =
      await supabase
        .from("members")
        .update({
          full_name: validation.full_name,
          phone: validation.phone,
          email: validation.email,
          investment_amount:
            validation.investment_amount,
          profit_share:
            validation.profit_share,
          status: validation.status,
        })
        .eq("id", body.id)
        .select(MEMBER_SELECT)
        .maybeSingle();

    if (error) {
      console.error(
        "Member update error:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to update member.",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : undefined,
        },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      member,
    });
  } catch (error) {
    console.error("Members PATCH:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   DELETE
===================================================== */

export async function DELETE(
  request: NextRequest
) {
  try {
    const denied = await checkAdmin();

    if (denied) {
      return denied;
    }

    const id =
      request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Member ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase = adminClient();

    /*
     * Get linked Auth user.
     */
    const {
      data: member,
      error: findError,
    } = await supabase
      .from("members")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        {
          error: "Failed to find member.",
        },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Delete Auth account.
     */
    if (member.user_id) {
      const { error: authError } =
        await supabase.auth.admin.deleteUser(
          member.user_id
        );

      if (authError) {
        console.error(authError);

        return NextResponse.json(
          {
            error:
              "Failed to delete member account.",
          },
          { status: 500 }
        );
      }
    }

    /*
     * Delete member record.
     */
    const { error: deleteError } =
      await supabase
        .from("members")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(deleteError);

      return NextResponse.json(
        {
          error:
            "Failed to delete member record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Members DELETE:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      { status: 500 }
    );
  }
}
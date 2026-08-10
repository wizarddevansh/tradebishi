import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type MemberPayload = {
  id?: unknown;
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  investment_amount?: unknown;
  profit_share?: unknown;
  status?: unknown;
};

const MEMBER_SELECT =
  "id, user_id, full_name, phone, investment_amount, profit_share, status, created_at";

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const;

type ValidatedMember = {
  full_name: string;
  email: string;
  password: string;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: (typeof ALLOWED_STATUSES)[number];
};

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment variables are missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    return NextResponse.json(
      {
        error:
          "Forbidden. Admin access required.",
      },
      {
        status: 403,
      }
    );
  }

  return null;
}

async function getBody(
  request: NextRequest
): Promise<MemberPayload | null> {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as MemberPayload;
  } catch {
    return null;
  }
}

function validateMember(
  body: MemberPayload,
  passwordRequired: boolean
):
  | {
      ok: true;
      data: ValidatedMember;
    }
  | {
      ok: false;
      error: string;
    } {
  const full_name =
    typeof body.full_name === "string"
      ? body.full_name.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : null;

  const investment_amount = Number(
    body.investment_amount
  );

  const profit_share = Number(
    body.profit_share
  );

  const rawStatus =
    typeof body.status === "string"
      ? body.status.trim().toLowerCase()
      : "active";

  if (!full_name) {
    return {
      ok: false,
      error: "Full name is required.",
    };
  }

  if (!email) {
    return {
      ok: false,
      error: "Email is required.",
    };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return {
      ok: false,
      error:
        "Please enter a valid email address.",
    };
  }

  if (passwordRequired && !password) {
    return {
      ok: false,
      error: "Password is required.",
    };
  }

  if (password && password.length < 6) {
    return {
      ok: false,
      error:
        "Password must be at least 6 characters.",
    };
  }

  if (
    !Number.isFinite(investment_amount) ||
    investment_amount < 0
  ) {
    return {
      ok: false,
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
      ok: false,
      error:
        "Profit share must be between 0 and 100.",
    };
  }

  if (
    !ALLOWED_STATUSES.includes(
      rawStatus as (typeof ALLOWED_STATUSES)[number]
    )
  ) {
    return {
      ok: false,
      error: "Invalid member status.",
    };
  }

  return {
    ok: true,
    data: {
      full_name,
      email,
      password,
      phone: phone || null,
      investment_amount,
      profit_share,
      status:
        rawStatus as (typeof ALLOWED_STATUSES)[number],
    },
  };
}

/* =========================
   GET MEMBERS
========================= */

export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const supabase = getAdminSupabase();

    const {
      data: members,
      error,
    } = await supabase
      .from("members")
      .select(MEMBER_SELECT)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Members GET error:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to load members.",
          details: error.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Email is stored in Supabase Auth,
     * not in members.email.
     */
    const membersWithEmail =
      await Promise.all(
        (members ?? []).map(
          async (member) => {
            if (!member.user_id) {
              return {
                ...member,
                email: null,
              };
            }

            const {
              data,
              error: authLookupError,
            } =
              await supabase.auth.admin.getUserById(
                member.user_id
              );

            if (authLookupError) {
              console.error(
                "Auth lookup error:",
                authLookupError
              );
            }

            return {
              ...member,
              email:
                data.user?.email ?? null,
            };
          }
        )
      );

    return NextResponse.json({
      members: membersWithEmail,
    });
  } catch (error) {
    console.error(
      "Members GET unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================
   POST - CREATE MEMBER
========================= */

export async function POST(
  request: NextRequest
) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = await getBody(request);

    if (!body) {
      return NextResponse.json(
        {
          error:
            "Request body must be valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const validation = validateMember(
      body,
      true
    );

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        {
          status: 400,
        }
      );
    }

    const memberData = validation.data;

    const supabase = getAdminSupabase();

    /*
     * Create Supabase Auth account.
     *
     * Email and password are stored by
     * Supabase Auth, NOT members table.
     */
    const {
      data: authData,
      error: authCreateError,
    } =
      await supabase.auth.admin.createUser({
        email: memberData.email,
        password: memberData.password,
        email_confirm: true,
      });

    if (
      authCreateError ||
      !authData.user
    ) {
      console.error(
        "Member Auth creation error:",
        authCreateError
      );

      return NextResponse.json(
        {
          error:
            authCreateError?.message ||
            "Failed to create member login account.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = authData.user.id;

    /*
     * Insert ONLY columns that actually
     * exist in members table.
     */
    const {
      data: member,
      error: insertError,
    } = await supabase
      .from("members")
      .insert({
        user_id: userId,
        full_name: memberData.full_name,
        phone: memberData.phone,
        investment_amount:
          memberData.investment_amount,
        profit_share:
          memberData.profit_share,
        status: memberData.status,
      })
      .select(MEMBER_SELECT)
      .single();

    /*
     * If members insert fails,
     * remove the Auth account as rollback.
     */
    if (insertError || !member) {
      console.error(
        "Member insert error:",
        insertError
      );

      await supabase.auth.admin.deleteUser(
        userId
      );

      return NextResponse.json(
        {
          error:
            "Failed to create member.",
          details:
            insertError?.message ||
            "Member record was not created.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        member: {
          ...member,
          email: memberData.email,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Members POST unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================
   PATCH - UPDATE MEMBER
========================= */

export async function PATCH(
  request: NextRequest
) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = await getBody(request);

    if (!body) {
      return NextResponse.json(
        {
          error:
            "Request body must be valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          error: "Member ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const validation = validateMember(
      body,
      false
    );

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.error,
        },
        {
          status: 400,
        }
      );
    }

    const memberData = validation.data;

    const supabase = getAdminSupabase();

    /*
     * Find existing member.
     */
    const {
      data: existingMember,
      error: lookupError,
    } = await supabase
      .from("members")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Member lookup error:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            "Failed to find member.",
          details:
            lookupError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!existingMember) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Update Supabase Auth email/password.
     */
    if (existingMember.user_id) {
      const authUpdate: {
        email?: string;
        password?: string;
      } = {
        email: memberData.email,
      };

      if (memberData.password) {
        authUpdate.password =
          memberData.password;
      }

      const {
        error: authUpdateError,
      } =
        await supabase.auth.admin.updateUserById(
          existingMember.user_id,
          authUpdate
        );

      if (authUpdateError) {
        console.error(
          "Auth update error:",
          authUpdateError
        );

        return NextResponse.json(
          {
            error:
              authUpdateError.message,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Update ONLY actual members columns.
     */
    const {
      data: member,
      error: updateError,
    } = await supabase
      .from("members")
      .update({
        full_name: memberData.full_name,
        phone: memberData.phone,
        investment_amount:
          memberData.investment_amount,
        profit_share:
          memberData.profit_share,
        status: memberData.status,
      })
      .eq("id", id)
      .select(MEMBER_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error(
        "Member update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update member.",
          details:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      member: {
        ...member,
        email: memberData.email,
      },
    });
  } catch (error) {
    console.error(
      "Members PATCH unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================
   DELETE MEMBER
========================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const id =
      request.nextUrl.searchParams
        .get("id")
        ?.trim();

    if (!id) {
      return NextResponse.json(
        {
          error: "Member ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getAdminSupabase();

    /*
     * Get linked Auth user before
     * deleting the member record.
     */
    const {
      data: member,
      error: lookupError,
    } = await supabase
      .from("members")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Member lookup error:",
        lookupError
      );

      return NextResponse.json(
        {
          error:
            "Failed to find member.",
          details:
            lookupError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Delete member database record.
     */
    const {
      error: deleteError,
    } = await supabase
      .from("members")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Member delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete member.",
          details:
            deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Delete linked Supabase Auth account.
     */
    if (member.user_id) {
      const {
        error: authDeleteError,
      } =
        await supabase.auth.admin.deleteUser(
          member.user_id
        );

      if (authDeleteError) {
        console.error(
          "Auth user delete error:",
          authDeleteError
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Members DELETE unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { getOrCreateUser } from "@/lib/database";
import pool from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(
      session.user.sub,
      session.user.email,
      session.user.name
    );

    // Delete all bullet points for this user
    const result = await pool.query(
      "DELETE FROM bullet_points WHERE user_id = $1",
      [user.id]
    );

    return NextResponse.json({
      success: true,
      deleted: result.rowCount || 0,
    });
  } catch (error) {
    console.error("Error deleting all bullet points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

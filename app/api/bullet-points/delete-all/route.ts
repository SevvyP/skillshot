import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { getOrCreateUser } from "@/lib/database";
import { db } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    // Delete all bullet points for this user
    const result = await db.delete("bullet_points", { user_id: user.id });

    if (result.error) throw result.error;

    return NextResponse.json({
      success: true,
      deleted: result.data.count,
    });
  } catch (error) {
    console.error("Error deleting all bullet points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { getSkillsByUserId, getOrCreateUser } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const skills = await getSkillsByUserId(user.id);
    return NextResponse.json({ skills });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  getBulletPointsByUserId,
  createBulletPoint,
  getOrCreateUser,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const bulletPoints = await getBulletPointsByUserId(user.id);
    return NextResponse.json({ bulletPoints });
  } catch (error) {
    console.error("Error fetching bullet points:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const body = await request.json();
    const { text, tags = [] } = body;

    // Security: Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Security: Enforce reasonable limits
    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Bullet point text too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Security: Validate tags array
    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 }
      );
    }

    // Security: Validate each tag and enforce limits
    const validatedTags = tags
      .filter((tag): tag is string => typeof tag === "string")
      .slice(0, 20) // Max 20 tags
      .map((tag) => tag.substring(0, 50)); // Max 50 chars per tag

    const bulletPoint = await createBulletPoint(user.id, text, validatedTags);
    return NextResponse.json({ bulletPoint }, { status: 201 });
  } catch (error) {
    console.error("Error creating bullet point:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

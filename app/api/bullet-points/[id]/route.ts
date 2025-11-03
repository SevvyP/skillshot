import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  updateBulletPoint,
  deleteBulletPoint,
  getBulletPointById,
  getOrCreateUser,
} from "@/lib/database";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const bulletPointId = parseInt(params.id);
    if (isNaN(bulletPointId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if bullet point exists and belongs to user
    const existing = await getBulletPointById(bulletPointId, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Bullet point not found" },
        { status: 404 }
      );
    }

    const bulletPoint = await updateBulletPoint(
      bulletPointId,
      user.id,
      text,
      validatedTags
    );
    return NextResponse.json({ bulletPoint });
  } catch (error) {
    console.error("Error updating bullet point:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const bulletPointId = parseInt(params.id);
    if (isNaN(bulletPointId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const success = await deleteBulletPoint(bulletPointId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Bullet point not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bullet point:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

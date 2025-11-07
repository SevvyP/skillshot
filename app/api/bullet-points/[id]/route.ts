import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  updateBulletPoint,
  deleteBulletPoint,
  getBulletPointById,
  getOrCreateUser,
  getOrCreateSkill,
  linkBulletPointToSkill,
  unlinkBulletPointFromSkill,
  getSkillsForBulletPoint,
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
    const { content, skills = [] } = body;

    // Security: Validate input
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Security: Enforce reasonable limits
    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Bullet point content too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Security: Validate skills array
    if (!Array.isArray(skills)) {
      return NextResponse.json(
        { error: "Skills must be an array" },
        { status: 400 }
      );
    }

    // Security: Validate each skill and enforce limits
    const validatedSkills = skills
      .filter((skill): skill is string => typeof skill === "string")
      .slice(0, 20) // Max 20 skills
      .map((skill) => skill.substring(0, 50)); // Max 50 chars per skill

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

    // Update bullet point
    const bulletPoint = await updateBulletPoint(
      bulletPointId,
      user.id,
      content
    );

    // Update skills associations
    // First, get current skills
    const currentSkills = await getSkillsForBulletPoint(bulletPointId);
    const currentSkillNames = new Set(
      currentSkills.map((s) => s.name.toLowerCase())
    );
    const newSkillNames = new Set(
      validatedSkills.map((s) => s.toLowerCase())
    );

    // Remove skills that are no longer associated
    for (const skill of currentSkills) {
      if (!newSkillNames.has(skill.name.toLowerCase())) {
        await unlinkBulletPointFromSkill(bulletPointId, skill.id);
      }
    }

    // Add new skills
    for (const skillName of validatedSkills) {
      if (skillName.trim() && !currentSkillNames.has(skillName.toLowerCase())) {
        const skill = await getOrCreateSkill(user.id, skillName.trim());
        await linkBulletPointToSkill(bulletPointId, skill.id);
      }
    }

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

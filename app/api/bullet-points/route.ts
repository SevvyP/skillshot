import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  getBulletPointsByUserId,
  createBulletPoint,
  getOrCreateUser,
  getJobById,
  getOrCreateSkill,
  linkBulletPointToSkill,
  getSkillsForBulletPoint,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const bulletPoints = await getBulletPointsByUserId(user.id);
    
    // Fetch skills for each bullet point
    const bulletPointsWithSkills = await Promise.all(
      bulletPoints.map(async (bp) => {
        const skills = bp.id ? await getSkillsForBulletPoint(bp.id) : [];
        return { ...bp, skills };
      })
    );
    
    return NextResponse.json({ bulletPoints: bulletPointsWithSkills });
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
    const { content, job_id, skills = [] } = body;

    // Security: Validate input
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!job_id || typeof job_id !== "number") {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Verify job belongs to user
    const job = await getJobById(job_id, user.id);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or does not belong to user" },
        { status: 404 }
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

    // Create bullet point
    const bulletPoint = await createBulletPoint(user.id, job_id, content);

    // Link to skills table
    for (const skillName of validatedSkills) {
      if (skillName.trim()) {
        const skill = await getOrCreateSkill(user.id, skillName.trim());
        if (bulletPoint.id) {
          await linkBulletPointToSkill(bulletPoint.id, skill.id);
        }
      }
    }

    return NextResponse.json({ bulletPoint }, { status: 201 });
  } catch (error) {
    console.error("Error creating bullet point:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

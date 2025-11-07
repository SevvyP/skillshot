import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  getOrCreateUser,
  createCompany,
  createJob,
  createBulletPoint,
  getOrCreateSkill,
  linkBulletPointToSkill,
} from "@/lib/database";
import {
  extractTextFromPDF,
  extractTextFromWord,
  parseResumeContent,
} from "@/lib/resume-parser";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Security: Enforce file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Check file type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (
      !fileType.includes("pdf") &&
      !fileType.includes("word") &&
      !fileType.includes("document") &&
      !fileName.endsWith(".pdf") &&
      !fileName.endsWith(".doc") &&
      !fileName.endsWith(".docx")
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or Word document." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text based on file type
    let text: string;
    if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      text = await extractTextFromPDF(buffer);
    } else {
      text = await extractTextFromWord(buffer);
    }

    // Parse resume to extract structured data
    const parsedResume = await parseResumeContent(text);

    if (parsedResume.jobs.length === 0) {
      return NextResponse.json(
        { error: "No work experience found in the document." },
        { status: 400 }
      );
    }

    // Create all skills first
    const skillMap = new Map<string, number>();
    for (const skillName of parsedResume.skills) {
      if (skillName && skillName.trim()) {
        const skill = await getOrCreateSkill(user.id, skillName.trim());
        skillMap.set(skillName.trim().toLowerCase(), skill.id);
      }
    }

    // Create companies, jobs, and bullet points
    let totalBulletPoints = 0;
    const createdJobs = [];

    for (const jobData of parsedResume.jobs) {
      // Create company
      const company = await createCompany(
        user.id,
        jobData.company,
        jobData.city,
        jobData.state,
        jobData.is_remote
      );

      // Create job
      const job = await createJob(
        user.id,
        company.id,
        jobData.title,
        new Date(jobData.start_date),
        jobData.end_date ? new Date(jobData.end_date) : null,
        jobData.is_current
      );

      // Create bullet points for this job
      for (const bpData of jobData.bullet_points) {
        const bulletPoint = await createBulletPoint(
          user.id,
          job.id,
          bpData.text
        );

        // Link bullet point to skills
        for (const skillName of bpData.skills) {
          const skillId = skillMap.get(skillName.toLowerCase());
          if (skillId && bulletPoint.id) {
            await linkBulletPointToSkill(bulletPoint.id, skillId);
          }
        }

        totalBulletPoints++;
      }

      createdJobs.push({
        company: company.name,
        title: job.title,
        bulletPointCount: jobData.bullet_points.length,
      });
    }

    return NextResponse.json({
      success: true,
      jobCount: parsedResume.jobs.length,
      bulletPointCount: totalBulletPoints,
      skillCount: skillMap.size,
      jobs: createdJobs,
    });
  } catch (error) {
    console.error("Error parsing resume:", error);

    // Provide specific error message if available
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to parse resume. Please try again.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

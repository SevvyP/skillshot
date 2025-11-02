import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { getOrCreateUser, createBulletPoint } from "@/lib/database";
import {
  extractTextFromPDF,
  extractTextFromWord,
  extractBulletPointsFromText,
  parseBulletPointTags,
} from "@/lib/resume-parser";

export async function POST(request: NextRequest) {
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

    // Extract bullet points from text
    const bulletPointTexts = await extractBulletPointsFromText(text);

    if (bulletPointTexts.length === 0) {
      return NextResponse.json(
        { error: "No bullet points found in the document." },
        { status: 400 }
      );
    }

    // Create bullet points with tags
    const createdBulletPoints = [];
    for (const bulletText of bulletPointTexts) {
      const tags = await parseBulletPointTags(bulletText);
      const bulletPoint = await createBulletPoint(user.id, bulletText, tags);
      createdBulletPoints.push(bulletPoint);
    }

    return NextResponse.json({
      success: true,
      count: createdBulletPoints.length,
      bulletPoints: createdBulletPoints,
    });
  } catch (error) {
    console.error("Error parsing resume:", error);
    return NextResponse.json(
      { error: "Failed to parse resume. Please try again." },
      { status: 500 }
    );
  }
}

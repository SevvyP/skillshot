import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  updateJob,
  deleteJob,
  getJobById,
  getOrCreateUser,
  getCompanyById,
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
    const { title, start_date, end_date = null, is_current = false } = body;

    // Security: Validate input
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      );
    }

    if (!start_date) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: "Job title too long (max 255 characters)" },
        { status: 400 }
      );
    }

    const jobId = parseInt(params.id);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if job exists and belongs to user
    const existing = await getJobById(jobId, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = await updateJob(
      jobId,
      user.id,
      title.trim(),
      new Date(start_date),
      end_date ? new Date(end_date) : null,
      is_current
    );
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error updating job:", error);
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

    const jobId = parseInt(params.id);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const success = await deleteJob(jobId, user.id);
    if (!success) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  getJobsByUserId,
  createJob,
  getOrCreateUser,
  getCompanyById,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const jobs = await getJobsByUserId(user.id);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
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
    const {
      company_id,
      title,
      start_date,
      end_date = null,
      is_current = false,
    } = body;

    // Security: Validate input
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      );
    }

    if (!company_id || typeof company_id !== "number") {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    if (!start_date) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }

    // Verify company belongs to user
    const company = await getCompanyById(company_id, user.id);
    if (!company) {
      return NextResponse.json(
        { error: "Company not found or does not belong to user" },
        { status: 404 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        { error: "Job title too long (max 255 characters)" },
        { status: 400 }
      );
    }

    const job = await createJob(
      user.id,
      company_id,
      title.trim(),
      new Date(start_date),
      end_date ? new Date(end_date) : null,
      is_current
    );
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

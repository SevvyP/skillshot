import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  getCompaniesByUserId,
  createCompany,
  getOrCreateUser,
} from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser(session.user.sub);

    const companies = await getCompaniesByUserId(user.id);
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
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
    const { name, city = null, state = null, is_remote = false } = body;

    // Security: Validate input
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Company name too long (max 255 characters)" },
        { status: 400 }
      );
    }

    const company = await createCompany(
      user.id,
      name.trim(),
      city,
      state,
      is_remote
    );
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

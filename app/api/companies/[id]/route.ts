import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import {
  updateCompany,
  deleteCompany,
  getCompanyById,
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

    const companyId = parseInt(params.id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if company exists and belongs to user
    const existing = await getCompanyById(companyId, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const company = await updateCompany(
      companyId,
      user.id,
      name.trim(),
      city,
      state,
      is_remote
    );
    return NextResponse.json({ company });
  } catch (error) {
    console.error("Error updating company:", error);
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

    const companyId = parseInt(params.id);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const success = await deleteCompany(companyId, user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role");

  const query: Record<string, any> = {};

  if (roleParam) {
    // API is called with `Doctor`, but roles in the schema are lowercase.
    query.role = roleParam.toLowerCase();
  }

  const users = await User.find(query);

  return NextResponse.json({ users });
}


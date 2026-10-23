import { NextResponse } from "next/server";
import { ensureCurrentUser } from "@/lib/auth";
import { MembershipError } from "@/lib/membership";
import { removeGroupMember } from "@/lib/repository";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await ensureCurrentUser();
  const { id, memberId } = await context.params;

  try {
    const result = await removeGroupMember(user, id, memberId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MembershipError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

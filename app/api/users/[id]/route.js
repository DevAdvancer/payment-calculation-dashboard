import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { updateUser, deleteUser } from "../../../../lib/dashboard-store";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateUser(id, body);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const deletedId = await deleteUser(id);
    if (!deletedId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: deletedId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

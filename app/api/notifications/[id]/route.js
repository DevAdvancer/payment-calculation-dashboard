import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { markNotificationRead, deleteNotification, updateNotificationNoc } from "../../../../lib/dashboard-store.js";

/* PATCH /api/notifications/[id]
   - No body  → mark as read
   - Body { noc: true } → mark NOC generated */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    let body = {};
    try { body = await request.json(); } catch (_) {}

    if (body?.noc === true) {
      const updated = await updateNotificationNoc(id);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ notification: updated });
    }

    // Default: mark as read
    const updated = await markNotificationRead(id);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ notification: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* DELETE /api/notifications/[id] — delete a single notification */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteNotification(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

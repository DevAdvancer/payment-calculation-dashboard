import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import {
  listNotifications,
  createNotification,
  deleteAllNotifications,
} from "../../../lib/dashboard-store.js";

/* GET /api/notifications — fetch all notifications, newest first */
export async function GET() {
  try {
    const notifications = await listNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* POST /api/notifications — create a new notification
   Body: { id, candidate, message, type } */
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const notif = await createNotification({
      id: body.id || (String(Date.now()) + Math.random().toString(16).slice(2)),
      candidate: body.candidate || null,
      message: body.message,
      type: body.type || "payment-complete",
    });
    return NextResponse.json({ notification: notif }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* DELETE /api/notifications — delete ALL notifications */
export async function DELETE() {
  try {
    await deleteAllNotifications();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSettings, setSettings } from "../../../../lib/admin-store";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Expected object" }, { status: 400 });
    }
    await setSettings(body);
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

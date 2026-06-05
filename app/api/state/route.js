import { NextResponse } from "next/server";
import { getDashboardState, setDashboardState } from "../../../lib/dashboard-store";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "default";
    const state = await getDashboardState(key);

    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const state = await setDashboardState(body.key || "default", body.payload ?? {});

    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

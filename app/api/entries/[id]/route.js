import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { updateEntry, deleteEntry, getHistory } from "../../../../lib/dashboard-store";
import { EntryPatchSchema, formatValidationErrors } from "../../../../lib/schemas";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = EntryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationErrors(parsed.error) },
        { status: 400 }
      );
    }

    // EntryPatchSchema reuses EntrySchema, which has defaults for some fields.
    // For PATCH, persist only keys that were explicitly sent by the client.
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([key]) => Object.prototype.hasOwnProperty.call(body, key))
    );

    const entry = await updateEntry(id, patch);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  try {
    const deleted = await deleteEntry(id);
    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(_request, { params }) {
  const { id } = await params;
  try {
    const history = await getHistory(id);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

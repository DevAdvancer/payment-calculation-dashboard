import { NextResponse } from "next/server";
import { updateEntry, deleteEntry, getHistory } from "../../../../lib/dashboard-store";
import { EntryPatchSchema, formatValidationErrors } from "../../../../lib/schemas";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const parsed = EntryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationErrors(parsed.error.errors) },
        { status: 400 }
      );
    }
    const entry = await updateEntry(params.id, parsed.data);
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const deleted = await deleteEntry(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(_request, { params }) {
  try {
    const history = await getHistory(params.id);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

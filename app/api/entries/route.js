import { NextResponse } from "next/server";
import { listEntries, createEntry, bulkUpsert, bulkDelete } from "../../../lib/dashboard-store";
import { EntrySchema, BulkEntrySchema, formatValidationErrors } from "../../../lib/schemas";

export async function GET() {
  try {
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const parsed = BulkEntrySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: formatValidationErrors(parsed.error) },
          { status: 400 }
        );
      }
      const entries = await bulkUpsert(parsed.data);
      return NextResponse.json({ entries }, { status: 201 });
    }

    const parsed = EntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationErrors(parsed.error) },
        { status: 400 }
      );
    }
    const entry = await createEntry(parsed.data);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* Bulk delete — body: { ids: ["id1", "id2", ...] }
   Always 200 with { deleted: [...ids] } on success.
   Caller (the store) treats 2xx as success and updates local state once. */
export async function DELETE(request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    const ids = body.ids.map(String);
    const deleted = await bulkDelete(ids);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

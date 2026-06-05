import { NextResponse } from "next/server";
import { updateExpense, deleteExpense } from "../../../../lib/expense-store";
import { ExpensePatchSchema, formatValidationErrors } from "../../../../lib/schemas";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const parsed = ExpensePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationErrors(parsed.error.errors) },
        { status: 400 }
      );
    }
    const expense = await updateExpense(params.id, parsed.data);
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const deleted = await deleteExpense(params.id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

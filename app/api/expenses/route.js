import { NextResponse } from "next/server";
import { listExpenses, createExpense, bulkUpsertExpenses, bulkDeleteExpenses } from "../../../lib/expense-store";
import { ExpenseSchema, BulkExpenseSchema, formatValidationErrors } from "../../../lib/schemas";

export async function GET() {
  try {
    const expenses = await listExpenses();
    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      const parsed = BulkExpenseSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: formatValidationErrors(parsed.error) },
          { status: 400 }
        );
      }
      const expenses = await bulkUpsertExpenses(parsed.data);
      return NextResponse.json({ expenses }, { status: 201 });
    }
    const parsed = ExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationErrors(parsed.error) },
        { status: 400 }
      );
    }
    const expense = await createExpense(parsed.data);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    const deleted = await bulkDeleteExpenses(body.ids);
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

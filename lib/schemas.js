import { z } from "zod";

const MM_DD_YYYY = /^\d{2}-\d{2}-\d{4}$/;
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateToMMDDYYYY(val) {
  if (!val) return val;
  const s = String(val).trim();
  if (MM_DD_YYYY.test(s)) return s;
  if (YYYY_MM_DD.test(s)) {
    const [y, m, d] = s.split("-");
    return `${m}-${d}-${y}`;
  }
  // Try to parse any other format
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    const y = String(parsed.getFullYear());
    return `${m}-${d}-${y}`;
  }
  return s;
}

const dateField = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? normalizeDateToMMDDYYYY(v) : null));

const STATUS_VALUES = [
  "Paid",
  "Pending",
  "Laid Off",
  "Offer Revoke",
  "No Offer",
  "Resigned",
  "Default",
];

const INSTANCE_VALUES = ["First Half", "Second Half"];

export const EntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  poNum: z.string().nullable().optional(),
  candidate: z.string().min(1, "Candidate name is required"),
  client: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  poDate: dateField,
  dueDate: dateField,
  month: z.string().nullable().optional(),
  year: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((v) => (v ? String(v) : null)),
  instance: z
    .string()
    .nullable()
    .optional()
    .refine((v) => !v || INSTANCE_VALUES.includes(v), {
      message: `Instance must be one of: ${INSTANCE_VALUES.join(", ")}`,
    }),
  amount: z.union([z.string(), z.number()]).optional().default(0).transform((v) => parseFloat(String(v)) || 0),
  paid: z.union([z.string(), z.number()]).optional().default(0).transform((v) => parseFloat(String(v)) || 0),
  due: z.union([z.string(), z.number()]).optional().default(0).transform((v) => parseFloat(String(v)) || 0),
  serviceType: z.string().nullable().optional(),
  status: z
    .string()
    .default("Pending")
    .refine((v) => STATUS_VALUES.includes(v), {
      message: `Status must be one of: ${STATUS_VALUES.join(", ")}`,
    }),
  type: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  signupDate: dateField,
  placedDate: dateField,
  closedBy: z.string().nullable().optional(),
  placedBy: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  currency: z
    .string()
    .nullable()
    .optional()
    .refine((v) => !v || ["USD", "GBP"].includes(v), {
      message: "Currency must be USD or GBP",
    }),
});

export const EntryPatchSchema = EntrySchema.partial().omit({ id: true });

export const BulkEntrySchema = z.array(EntrySchema).min(1, "At least one entry required");

/* ───────── Expense schemas ───────── */
const EXPENSE_STATUS = ["Pending", "Paid", "Reimbursed", "Cancelled"];

export const ExpenseSchema = z.object({
  id:             z.union([z.string(), z.number()]).transform(String),
  expenseDate:    dateField,
  month:          z.string().nullable().optional(),
  year:           z.union([z.string(), z.number()]).nullable().optional().transform(v => v ? String(v) : null),
  category:       z.string().nullable().optional(),
  vendor:         z.string().nullable().optional(),
  description:    z.string().nullable().optional(),
  amount:         z.union([z.string(), z.number()]).optional().default(0).transform(v => parseFloat(String(v)) || 0),
  paid:           z.union([z.string(), z.number()]).optional().default(0).transform(v => parseFloat(String(v)) || 0),
  due:            z.union([z.string(), z.number()]).optional().default(0).transform(v => parseFloat(String(v)) || 0),
  currency:       z.string().nullable().optional().default("USD"),
  status:         z.string().default("Pending").refine(v => EXPENSE_STATUS.includes(v), {
                    message: `Status must be one of: ${EXPENSE_STATUS.join(", ")}`,
                  }),
  paymentMethod:  z.string().nullable().optional(),
  reference:      z.string().nullable().optional(),
  notes:          z.string().nullable().optional(),
});
export const ExpensePatchSchema = ExpenseSchema.partial().omit({ id: true });
export const BulkExpenseSchema  = z.array(ExpenseSchema).min(1);

export function formatValidationErrors(errors) {
  return errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
}

import { ExpenseForm } from "@/features/expenses/expense-form";

export const metadata = {
  title: "Edit Expense",
};

export default async function ExpenseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpenseForm id={id} />;
}

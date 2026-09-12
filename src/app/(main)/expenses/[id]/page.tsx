import { ExpenseDetailView } from "@/features/expenses/expense-detail-view";

export const metadata = {
  title: "Expense Details",
};

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpenseDetailView id={id} />;
}

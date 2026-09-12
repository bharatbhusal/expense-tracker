import { CategoryDetailView } from "@/features/categories/category-detail-view";

export const metadata = {
  title: "Category Details",
};

export default async function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryDetailView id={id} />;
}

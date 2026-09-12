import { BucketDetailView } from "@/features/buckets/bucket-detail-view";

export const metadata = {
  title: "Bucket Details",
};

export default async function BucketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BucketDetailView id={id} />;
}

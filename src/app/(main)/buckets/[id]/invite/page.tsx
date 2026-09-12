import { InviteView } from "@/features/buckets/invite-view";

export const metadata = {
  title: "Join Bucket",
};

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InviteView id={id} />;
}

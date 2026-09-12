import { AuthForm } from "@/features/auth/auth-form";

export const metadata = {
  title: "Sign Up",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <AuthForm mode="signup" nextPath={next} />;
}

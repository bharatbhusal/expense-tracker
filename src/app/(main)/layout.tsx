import { BottomNav } from "@/components/layout/bottom-nav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-dvh grid grid-rows-[1fr_auto]">
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{
          height: "calc(env(safe-area-inset-top, 0px) + 1rem)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          maskImage: "linear-gradient(to bottom, black 60%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent)",
        }}
      />
      <div
        className="h-full min-h-0 overflow-y-auto overflow-x-hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        }}
      >
        <div className="h-full mx-auto max-w-5xl safe-area-px">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen justify-center bg-background p-4">
      <div className="my-auto w-full max-w-md">{children}</div>
    </div>
  );
}

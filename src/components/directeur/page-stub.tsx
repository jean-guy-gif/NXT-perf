import { Construction } from "lucide-react";

interface PageStubProps {
  title: string;
  subPr: string;
}

export function PageStub({ title, subPr }: PageStubProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <Construction className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subPr} à venir</p>
    </div>
  );
}

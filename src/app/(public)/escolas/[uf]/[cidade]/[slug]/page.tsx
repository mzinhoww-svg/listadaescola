import { ScaffoldNotice } from "@/components/dev/scaffold-notice";

interface SchoolPageProps {
  params: Promise<{ uf: string; cidade: string; slug: string }>;
}

export default async function SchoolPage({ params }: SchoolPageProps) {
  const { uf, cidade, slug } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ScaffoldNotice promptRef="Prompt 07 — escola, série e lista" />
      <p className="text-sm text-neutral-500">
        /escolas/{uf}/{cidade}/{slug}
      </p>
    </div>
  );
}

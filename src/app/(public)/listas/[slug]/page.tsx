import { ScaffoldNotice } from "@/components/dev/scaffold-notice";

interface ListPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ListPage({ params }: ListPageProps) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ScaffoldNotice promptRef="Prompt 07 — escola, série e lista" />
      <p className="text-sm text-neutral-500">/listas/{slug}</p>
    </div>
  );
}

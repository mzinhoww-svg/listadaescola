import { Badge } from "@/components/ui/badge";

/**
 * Marcador visual para páginas-placeholder desta etapa (fundação/design
 * system). Remover quando o prompt correspondente implementar a página de
 * verdade — nunca deixar isto em uma página com lógica de negócio real.
 */
export function ScaffoldNotice({ promptRef }: { promptRef: string }) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
      <Badge variant="info">placeholder</Badge>
      <span>
        Estrutura/layout desta área — conteúdo real entra em{" "}
        <code className="font-mono text-xs">{promptRef}</code>.
      </span>
    </div>
  );
}

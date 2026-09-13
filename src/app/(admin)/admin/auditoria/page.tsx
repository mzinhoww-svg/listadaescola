import type { Metadata } from "next";

import { getAuditLogEntries, MAX_ROWS } from "@/lib/admin/audit-log";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Auditoria" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-neutral-400">—</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-medium text-primary-700 hover:underline">{label}</summary>
      <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-neutral-100 p-2 text-neutral-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default async function AdminAuditoriaPage() {
  const entries = await getAuditLogEntries();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Auditoria</h1>
        <p className="text-sm text-neutral-500">
          Toda ação administrativa que muda dados de outra pessoa (moderação, patrocínio, publicação de lista, papéis
          de usuário) fica registrada aqui, com quem fez e o estado antes/depois.
        </p>
        {entries.length === MAX_ROWS && (
          <p className="mt-1 text-sm text-warning-700">
            Mostrando os {MAX_ROWS} registros mais recentes -- pode haver eventos mais antigos não exibidos aqui.
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhum evento registrado ainda"
          description="Ações administrativas (moderação, publicação, papéis de usuário) aparecerão aqui assim que acontecerem."
        />
      ) : (
        <Table>
          <TableCaption>Últimos eventos de auditoria</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Antes</TableHead>
              <TableHead>Depois</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm text-neutral-500 whitespace-nowrap">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-neutral-700">{entry.actorName ?? "(sistema)"}</TableCell>
                <TableCell className="font-mono text-xs text-neutral-700">{entry.action}</TableCell>
                <TableCell className="text-sm text-neutral-500">
                  {entry.entityType}
                  {entry.entityId && <span className="block truncate text-xs text-neutral-400">{entry.entityId}</span>}
                </TableCell>
                <TableCell>
                  <JsonDetails label="Ver" value={entry.before} />
                </TableCell>
                <TableCell>
                  <JsonDetails label="Ver" value={entry.after} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

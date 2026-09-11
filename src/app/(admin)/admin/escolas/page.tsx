import type { Metadata } from "next";
import Link from "next/link";

import { getAdminSchools } from "@/lib/admin/schools";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Escolas" };

export default async function AdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; municipio?: string; status?: string; pagina?: string }>;
}) {
  const { q, municipio, status, pagina } = await searchParams;
  const page = Number(pagina) > 0 ? Number(pagina) : 1;
  const statusFilter: "active" | "inactive" | undefined =
    status === "active" ? "active" : status === "inactive" ? "inactive" : undefined;
  const filters = {
    query: q,
    municipality: municipio,
    status: statusFilter,
    page,
  };
  const { items, total, pageSize } = await getAdminSchools(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Escolas</h1>
        <p className="text-sm text-neutral-500">
          Dados INEP são só leitura aqui -- importação roda via script (Prompt 04). Edição cobre perfil editorial,
          verificação e ativar/inativar.
        </p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" action="/admin/escolas">
        <Input label="Buscar por nome" name="q" defaultValue={q} placeholder="Ex.: Escola Municipal..." hideLabel />
        <Input label="Município" name="municipio" defaultValue={municipio} placeholder="Município" hideLabel className="sm:w-48" />
        <Select label="Status" name="status" defaultValue={status ?? ""} hideLabel className="sm:w-40">
          <option value="">Todas</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma escola encontrada" description="Ajuste os filtros de busca." />
      ) : (
        <>
          <Table>
            <TableCaption>{total} escola(s) encontrada(s)</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>INEP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <Link href={`/admin/escolas/${school.id}`} className="font-medium text-primary-700 hover:underline">
                      {school.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {school.municipality}/{school.uf}
                  </TableCell>
                  <TableCell>{school.inepCode}</TableCell>
                  <TableCell className="flex gap-1.5">
                    <Badge variant={school.isActive ? "success" : "neutral"}>{school.isActive ? "Ativa" : "Inativa"}</Badge>
                    {school.isVerified && <Badge variant="info">Verificada</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={{ pathname: "/admin/escolas", query: { q, municipio, status, pagina: page - 1 } }}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
                  >
                    Anterior
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={{ pathname: "/admin/escolas", query: { q, municipio, status, pagina: page + 1 } }}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
                  >
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

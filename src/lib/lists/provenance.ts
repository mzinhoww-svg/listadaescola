import { createPublicClient } from "@/lib/supabase/public";

/**
 * COMMUNITY  contribuição de terceiro aprovada na fila de moderação
 * TEAM       publicada direto pela equipe do Listada (admin_publish_list)
 * SCHOOL     publicada pelo gestor verificado da própria escola (Onda 7)
 */
export type ListProvenance = "COMMUNITY" | "TEAM" | "SCHOOL";

const PROVENANCES: ListProvenance[] = ["COMMUNITY", "TEAM", "SCHOOL"];

export interface ListProvenanceCopy {
  /** Rótulo curto, para o chip. */
  label: string;
  /** O que aquilo garante e o que não garante -- em linguagem de família. */
  description: string;
}

export const LIST_PROVENANCE_COPY: Record<ListProvenance, ListProvenanceCopy> = {
  SCHOOL: {
    label: "Publicada pela escola",
    description:
      "Um responsável pela escola pediu acesso ao perfil, a nossa equipe aprovou o pedido, e foi ele quem publicou esta lista.",
  },
  TEAM: {
    label: "Publicada pela equipe do Listada",
    description: "Nossa equipe transcreveu esta lista a partir do material divulgado pela escola.",
  },
  COMMUNITY: {
    label: "Enviada por uma família",
    description:
      "Esta lista foi enviada por alguém da comunidade e revisada pela moderação antes de ser publicada. Vale conferir com a escola antes de comprar.",
  },
};

/**
 * Onda 9. Procedência da versão pública de uma lista.
 *
 * A RPC (20260913090000_list_provenance.sql) lê o audit log com SECURITY
 * DEFINER e devolve só o rótulo -- nunca quem publicou. Ver o cabeçalho da
 * migration para por que audit log e não um join ao vivo em
 * `school_managers`.
 *
 * Devolve `null` para "não sei", que é o estado de qualquer versão sem linha
 * de auditoria (a fixture de QA, por exemplo, entrou por SQL direto). A UI
 * não mostra rótulo nenhum nesse caso -- inventar "publicada pela equipe"
 * como padrão seria fabricar procedência.
 *
 * Falha de rede/RPC também vira `null` em vez de estourar: procedência é
 * informação adicional sobre a lista, não pode derrubar a página que mostra
 * a lista.
 */
export async function getListProvenance(versionId: string): Promise<ListProvenance | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("list_version_provenance", { p_version_id: versionId });

  if (error) return null;
  return PROVENANCES.includes(data as ListProvenance) ? (data as ListProvenance) : null;
}

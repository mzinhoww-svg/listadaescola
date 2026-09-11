/**
 * Reproducible INEP import: CSV -> staging -> merge_inep_staging(), for any state.
 *
 * Usage:
 *   node --env-file=.env.local -r tsx scripts/import-inep.ts \
 *     --csv path/to/dataset.csv --state MT \
 *     --lat-min -19.0 --lat-max -6.5 --lon-min -62.5 --lon-max -49.0
 *
 *   # or, with env vars already exported:
 *   npm run import:inep -- --csv path/to/dataset.csv --state MT
 *
 * The bounding box flags are optional; merge_inep_staging() falls back to a
 * Brazil-wide box when omitted. Pass state-specific bounds for tighter
 * validation of reconstructed (corrupted) lat/long values.
 *
 * Requires in the environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * inep_import_staging has RLS enabled with zero policies, so only the
 * service role can write to it -- never run this with the anon key.
 */

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

interface Args {
  csvPath: string;
  state: string;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const csvPath = get("--csv");
  const state = get("--state");
  if (!csvPath || !state) {
    throw new Error(
      "Usage: import-inep.ts --csv <path> --state <UF> [--lat-min N --lat-max N --lon-min N --lon-max N]",
    );
  }
  const num = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  return {
    csvPath,
    state: state.toUpperCase(),
    latMin: num(get("--lat-min")),
    latMax: num(get("--lat-max")),
    lonMin: num(get("--lon-min")),
    lonMax: num(get("--lon-max")),
  };
}

type StagingInsert = Database["public"]["Tables"]["inep_import_staging"]["Insert"];

const blankToNull = (v: string | undefined): string | null => {
  const trimmed = (v ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

// Column mapping per docs/architecture/inep-import.md.
function toStagingRow(record: Record<string, string>): StagingInsert {
  return {
    raw_inep_code: blankToNull(record["código_inep"]),
    raw_name: blankToNull(record["escola"]),
    raw_uf: (record["uf"] ?? "").trim(),
    raw_municipality: blankToNull(record["município"]),
    raw_location_type: blankToNull(record["localização"]),
    raw_differentiated_location: blankToNull(record["localidade_diferenciada"]),
    raw_school_type: blankToNull(record["categoria_administrativa"]),
    raw_address: blankToNull(record["endereço"]),
    raw_phone: blankToNull(record["telefone"]),
    raw_administrative_dependency: blankToNull(record["dependência_administrativa"]),
    raw_private_school_category: blankToNull(record["categoria_escola_privada"]),
    raw_public_power_agreement: blankToNull(record["conveniada_poder_público"]),
    raw_education_council_regulation: blankToNull(
      record["regulamentação_pelo_conselho_de_educação"],
    ),
    raw_school_size: blankToNull(record["porte_da_escola"]),
    raw_education_offerings: blankToNull(record["etapas_e_modalidade_de_ensino_oferecidas"]),
    raw_other_education_offerings: blankToNull(record["outras_ofertas_educacionais"]),
    raw_attendance_restriction: blankToNull(record["restrição_de_atendimento"]),
    raw_latitude: blankToNull(record["latitude"]),
    raw_longitude: blankToNull(record["longitude"]),
    raw_cep: blankToNull(record["cep"]),
    raw_cep_source: blankToNull(record["fonte_cep"]),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment. " +
        "Run with e.g. `node --env-file=.env.local -r tsx scripts/import-inep.ts ...`.",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Reading ${args.csvPath}...`);
  const csvContent = readFileSync(args.csvPath, "utf-8");
  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const rows = records
    .filter((r) => (r["uf"] ?? "").trim().toUpperCase() === args.state)
    .map(toStagingRow);

  if (rows.length === 0) {
    throw new Error(`No rows found for uf=${args.state} in ${args.csvPath}. Refusing to proceed.`);
  }
  console.log(`Filtered ${rows.length} rows for uf=${args.state}.`);

  console.log(`Clearing existing staging rows for uf=${args.state}...`);
  const { error: deleteError } = await supabase
    .from("inep_import_staging")
    .delete()
    .eq("raw_uf", args.state);
  if (deleteError) throw new Error(`Failed to clear staging: ${deleteError.message}`);

  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    console.log(`Inserting rows ${i + 1}-${i + chunk.length} of ${rows.length}...`);
    const { error: insertError } = await supabase.from("inep_import_staging").insert(chunk);
    if (insertError) {
      throw new Error(`Failed to insert staging batch at offset ${i}: ${insertError.message}`);
    }
  }

  console.log(`Calling merge_inep_staging('${args.state}', ...)...`);
  const { data, error: rpcError } = await supabase.rpc("merge_inep_staging", {
    p_state_code: args.state,
    ...(args.latMin !== undefined && { p_lat_min: args.latMin }),
    ...(args.latMax !== undefined && { p_lat_max: args.latMax }),
    ...(args.lonMin !== undefined && { p_lon_min: args.lonMin }),
    ...(args.lonMax !== undefined && { p_lon_max: args.lonMax }),
  });
  if (rpcError) throw new Error(`merge_inep_staging failed: ${rpcError.message}`);

  console.log("Merge result:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

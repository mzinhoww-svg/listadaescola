import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StoreSaleStatus = Database["public"]["Enums"]["store_sale_status"];

export interface AdminStoreOption {
  id: string;
  name: string;
}

export interface AdminPartnerOption {
  id: string;
  name: string;
}

export interface AdminStoreSaleReport {
  id: string;
  storeId: string;
  storeName: string;
  schoolId: string | null;
  schoolName: string | null;
  status: StoreSaleStatus;
  quotedValue: number | null;
  saleValue: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Prompt 18 (performance audit): unbounded before -- see admin/lists.ts's
// MAX_ROWS comment for the reasoning (same fix, same follow-up note). Sale
// reports specifically accumulate forever with real usage, no archival --
// the highest-growth-risk case in this batch.
const MAX_ROWS = 200;

export interface AdminPartnerSaleReport {
  id: string;
  partnerId: string;
  partnerName: string;
  schoolId: string | null;
  schoolName: string | null;
  grossValue: number;
  commissionValue: number;
  notes: string | null;
  createdAt: string;
}

export async function getStoreOptions(): Promise<AdminStoreOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stores").select("id, name").order("name", { ascending: true });
  if (error) throw new Error(`getStoreOptions failed: ${error.message}`);
  return data ?? [];
}

export async function getPartnerOptions(): Promise<AdminPartnerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ecommerce_partners").select("id, name").order("name", { ascending: true });
  if (error) throw new Error(`getPartnerOptions failed: ${error.message}`);
  return data ?? [];
}

/** store_id/school_id are real FKs (unlike campaigns.entity_id), so a
 * plain Postgrest embed resolves the names directly -- no batched
 * lookup needed here the way getAdminCampaigns() needs one. */
export async function getStoreSaleReports(): Promise<AdminStoreSaleReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_sale_reports")
    .select(
      "id, store_id, school_id, status, quoted_value, sale_value, notes, created_at, updated_at, stores(name), schools(name)"
    )
    .order("created_at", { ascending: false })
    .range(0, MAX_ROWS - 1);
  if (error) throw new Error(`getStoreSaleReports failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    storeName: row.stores?.name ?? "(papelaria removida)",
    schoolId: row.school_id,
    schoolName: row.schools?.name ?? null,
    status: row.status,
    quotedValue: row.quoted_value === null ? null : Number(row.quoted_value),
    saleValue: row.sale_value === null ? null : Number(row.sale_value),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPartnerSaleReports(): Promise<AdminPartnerSaleReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_sale_reports")
    .select("id, partner_id, school_id, gross_value, commission_value, notes, created_at, ecommerce_partners(name), schools(name)")
    .order("created_at", { ascending: false })
    .range(0, MAX_ROWS - 1);
  if (error) throw new Error(`getPartnerSaleReports failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    partnerId: row.partner_id,
    partnerName: row.ecommerce_partners?.name ?? "(parceiro removido)",
    schoolId: row.school_id,
    schoolName: row.schools?.name ?? null,
    grossValue: Number(row.gross_value),
    commissionValue: Number(row.commission_value),
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export interface StoreSalesSummary {
  totalReports: number;
  converted: number;
  conversionRate: number | null;
  averageTicket: number | null;
}

/** "Ticket" (ticket médio) and "conversão" are both derived here from the
 * raw rows on every read, never stored -- same principle already applied
 * to distance/rating/organic_score elsewhere in this codebase: a number
 * that can be recomputed from real data is never worth the risk of
 * drifting out of sync as a redundant stored column. */
export function summarizeStoreSaleReports(reports: AdminStoreSaleReport[]): StoreSalesSummary {
  const totalReports = reports.length;
  const convertedReports = reports.filter((report) => report.status === "CONVERTED");
  const converted = convertedReports.length;
  const conversionRate = totalReports > 0 ? converted / totalReports : null;
  const saleValues = convertedReports
    .map((report) => report.saleValue)
    .filter((value): value is number => value !== null);
  const averageTicket = saleValues.length > 0 ? saleValues.reduce((sum, value) => sum + value, 0) / saleValues.length : null;

  return { totalReports, converted, conversionRate, averageTicket };
}

export interface PartnerSalesSummary {
  totalReports: number;
  totalGrossValue: number;
  totalCommission: number;
}

export function summarizePartnerSaleReports(reports: AdminPartnerSaleReport[]): PartnerSalesSummary {
  return {
    totalReports: reports.length,
    totalGrossValue: reports.reduce((sum, report) => sum + report.grossValue, 0),
    totalCommission: reports.reduce((sum, report) => sum + report.commissionValue, 0),
  };
}

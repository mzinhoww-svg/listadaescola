/**
 * Supabase's generated RPC `Args` types mark every plain (no SQL
 * `DEFAULT`) parameter as required and non-null, even though Postgres
 * itself accepts NULL for any parameter without a NOT NULL-style
 * constraint. The admin upsert/update RPCs in this module intentionally
 * take nullable params (optional text fields, "id or null means create")
 * -- this narrows a `T | null` value back to `T` only at the `.rpc()`
 * call boundary, where the mismatch is against the generated type, not
 * against what the database actually accepts.
 */
export function nullableArg<T>(value: T | null): T {
  return value as T;
}

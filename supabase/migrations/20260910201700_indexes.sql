-- Indexes -- PRD section 13 (GIST on geography, btree on status/state/
-- city/school_id, trigram text search) plus the FK columns that get
-- joined/filtered constantly. Postgres does not auto-index plain FK
-- columns (only PK and unique-constrained columns), so those need to be
-- explicit.

-- Proximity queries (PostGIS)
create index schools_location_gix on public.schools using gist (location);
create index stores_location_gix on public.stores using gist (location);

-- Text search (trigram)
create index schools_name_trgm on public.schools using gin (name extensions.gin_trgm_ops);
create index stores_name_trgm on public.stores using gin (name extensions.gin_trgm_ops);

-- Geographic/status filters called out explicitly in the PRD
create index schools_uf_municipality_idx on public.schools (uf, municipality);
create index schools_is_active_idx on public.schools (is_active) where is_active;
create index stores_uf_municipality_idx on public.stores (uf, municipality);
create index stores_is_active_idx on public.stores (is_active) where is_active;
create index list_submissions_status_idx on public.list_submissions (status);
create index school_lists_school_id_idx on public.school_lists (school_id);

-- FK join columns (school -> * fan-out is the hottest path: escola -> series -> listas)
create index school_profiles_school_id_idx on public.school_profiles (school_id);
create index school_contacts_school_id_idx on public.school_contacts (school_id);
create index school_images_school_id_idx on public.school_images (school_id);
create index school_education_levels_school_id_idx on public.school_education_levels (school_id);
create index school_series_school_id_idx on public.school_series (school_id);
create index school_managers_school_id_idx on public.school_managers (school_id);
create index school_managers_profile_id_idx on public.school_managers (profile_id);

create index store_contacts_store_id_idx on public.store_contacts (store_id);
create index store_services_store_id_idx on public.store_services (store_id);
create index store_managers_store_id_idx on public.store_managers (store_id);
create index store_managers_profile_id_idx on public.store_managers (profile_id);

create index school_list_versions_school_list_id_idx on public.school_list_versions (school_list_id);
create index school_list_versions_status_idx on public.school_list_versions (status);
create index school_list_items_version_id_idx on public.school_list_items (school_list_version_id);
create index school_list_items_product_id_idx on public.school_list_items (product_id) where product_id is not null;

create index list_submissions_school_id_idx on public.list_submissions (school_id);
create index list_submissions_submitted_by_idx on public.list_submissions (submitted_by);
create index submission_items_submission_id_idx on public.submission_items (submission_id);
create index submission_attachments_submission_id_idx on public.submission_attachments (submission_id);

create index ecommerce_products_partner_id_idx on public.ecommerce_products (partner_id);
create index ecommerce_products_product_id_idx on public.ecommerce_products (product_id);
create index list_product_mappings_item_id_idx on public.list_product_mappings (school_list_item_id);

create index favorites_profile_id_idx on public.favorites (profile_id);
create index reviews_school_id_idx on public.reviews (school_id);
create index reviews_status_idx on public.reviews (status);
create index reports_status_idx on public.reports (status);

create index campaigns_entity_idx on public.campaigns (entity_type, entity_id);
create index campaigns_status_idx on public.campaigns (status);

-- Analytics/audit -- always filtered by type/entity and a time range.
create index analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);
create index analytics_events_school_id_idx on public.analytics_events (school_id) where school_id is not null;
create index analytics_events_store_id_idx on public.analytics_events (store_id) where store_id is not null;
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

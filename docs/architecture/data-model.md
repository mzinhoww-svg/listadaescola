# Listada Escola — Data Model

## Domínios

1. Auth / profiles
2. Geography / INEP
3. Schools / editorial
4. Lists / contributions
5. Catalog / commerce
6. Stores
7. Community
8. Monetization
9. Analytics
10. Security / moderation

## Princípio de ownership

Objetos criados por usuário possuem `created_by`, `submitted_by` ou `user_id` e nunca são protegidos somente por um ID vindo do cliente.

## Princípio de fonte

Dados importados do INEP são diferenciados de dados editoriais e contribuições comunitárias.

## Principais relações

```text
profiles → school_managers
profiles → store_managers
profiles → list_submissions
profiles → reviews
profiles → favorites

schools → school_profiles
schools → school_contacts
schools → school_images
schools → school_education_levels
schools → school_series
schools → school_lists

school_lists → school_list_versions → school_list_items
list_submissions → submission_items
list_submissions → submission_attachments

ecommerce_partners → ecommerce_products
school_list_items → products
products → ecommerce_products
```

## Identificadores

- `schools.id`: UUID interno.
- `schools.inep_code`: identificador externo oficial único.
- Slugs são únicos para URLs públicas.

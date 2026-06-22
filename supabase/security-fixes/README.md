# supabase/security-fixes

Migraciones de la auditoría de RLS — ver [`../../SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

> ✅ **APLICADAS a producción el 2026-06-21** (vía `apply_migration`). Estos
> archivos quedan como registro/fuente de las migraciones.

| Archivo | Hallazgo | Migración aplicada |
|---|---|---|
| `01_harden_my_couple_id.sql` | H1 — search_path fijo | `20260621215104_harden_my_couple_id_search_path` ✅ |
| `02_revoke_securitydefiner_execute.sql` | H2 — RPC de funciones SECURITY DEFINER | `20260621215111_revoke_securitydefiner_rpc_execute` ✅ |
| `03_scope_policies_authenticated.sql` | H3 — políticas a rol `authenticated` | `20260621215124_scope_policies_to_authenticated` ✅ |
| `04_profiles_insert_hardening.sql` | H4 — INSERT de profiles (Opción A) | `20260621215147_harden_profiles_insert_own_new_couple` ✅ |

Pendiente del dueño (config en Dashboard de Auth, **no** SQL):
- H5: activar *leaked password protection*.
- H6: verificar el ajuste *Allow new users to sign up*.

Opcional (no aplicado): mover `my_couple_id`/`couple_has_members` a un schema no
expuesto (p. ej. `private`) para silenciar los lints de RPC restantes. Son
funciones que solo devuelven el `couple_id` propio / un booleano de pertenencia,
así que el riesgo es bajo y se dejó como mejora futura.

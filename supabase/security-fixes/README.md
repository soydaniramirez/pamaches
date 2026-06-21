# supabase/security-fixes

Migraciones **propuestas** de la auditoría de RLS — ver [`../../SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

> ⚠️ **Ninguna se ha aplicado a producción.** Revísalas antes de ejecutar.

| Archivo | Hallazgo | ¿Seguro de aplicar? |
|---|---|---|
| `01_harden_my_couple_id.sql` | H1 — search_path fijo | ✅ Sí, sin impacto |
| `02_revoke_securitydefiner_execute.sql` | H2 — RPC de funciones SECURITY DEFINER | ✅ Sí |
| `03_scope_policies_authenticated.sql` | H3 — políticas a rol `authenticated` | ✅ Sí (recrea políticas; revisar) |
| `04_profiles_insert_hardening.sql` | H4 — INSERT de profiles | ⛔ DRAFT, decidir onboarding primero |

Config (no SQL), en el Dashboard de Auth:
- H5: activar *leaked password protection*.
- H6: verificar el ajuste *Allow new users to sign up* (afecta la severidad de H4).

Para aplicar tras revisar: SQL Editor del Dashboard, `supabase db push`, o pídeme
que las aplique con `apply_migration`.

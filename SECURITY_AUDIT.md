# SECURITY_AUDIT.md — Auditoría RLS de Supabase (pamaches)

- **Proyecto:** `pamachesapp` (`aucsrppzwniltecwatuu`), org `ibmirltqpwbvofuqtgti`
- **Fecha:** 2026-06-21
- **Tipo:** auditoría de **solo lectura** (no se aplicó ningún cambio)
- **Método:** herramientas MCP de Supabase (`get_advisors`, `execute_sql`)

> **TL;DR:** La base está **bien protegida**. Las 28 tablas tienen RLS activo y
> **todas** filtran por pareja (`couple_id = my_couple_id()`). Con solo la URL + el
> `anon key` (sin iniciar sesión) **no se puede leer ni escribir nada**. Los
> riesgos que quedan son menores/de endurecimiento y **requieren una cuenta
> autenticada**. No hay que romper la app HTML para arreglarlos.

> ## ✅ ESTADO: FIXES APLICADOS (2026-06-21)
> Se aplicaron las migraciones 01→02→03 y la 04 (Opción A) vía `apply_migration`:
> - `20260621215104_harden_my_couple_id_search_path`
> - `20260621215111_revoke_securitydefiner_rpc_execute`
> - `20260621215124_scope_policies_to_authenticated`
> - `20260621215147_harden_profiles_insert_own_new_couple`
>
> **Resultado del re-advisor:** H1, H2 y H3 resueltos. Quedan solo los lints
> "by design" de `my_couple_id()` / `couple_has_members()` (las invocan las
> políticas RLS, no se pueden revocar) y H5 (leaked password, lo activa el dueño).
>
> **Verificación funcional (post-fix):**
> - Sesión `anon`: **0 filas** en notitas/expenses/profiles/couples/spicy_deseos. ✅
> - Sesión `authenticated` (usuario real): ve **solo su pareja** (notitas=14,
>   expenses=19, profiles=2), coincidiendo exactamente con los totales reales. ✅
> - H4: insert de perfil sobre **pareja existente** → rechazado por RLS (`42501`). ✅
> - H4: insert de perfil sobre **pareja nueva/vacía** → pasa RLS (solo falla luego
>   por el FK a `auth.users` con un uid de prueba ficticio). ✅

---

## 1. Identidad / Auth

| Pregunta | Respuesta |
|---|---|
| ¿Usa Supabase Auth real o solo anon key? | **Auth real** (email/password): `signInWithPassword`, `getUser`, `getSession`, `signOut`. |
| Usuarios en `auth.users` | **2** (los dos confirmados, los dos han iniciado sesión). |
| Perfiles / parejas | `profiles` = 2, `couples` = 1, `profiles` huérfanos = 0. |
| ¿RLS puede filtrar por `auth.uid()`? | **Sí.** Cada `profile` mapea a un `auth.users.id` y tiene `couple_id`. No hay que montar auth: ya existe. |

La función central de scoping:

```sql
create or replace function public.my_couple_id()
returns uuid language sql stable security definer
as $$ select couple_id from profiles where id = auth.uid(); $$;
```

Para un usuario **anónimo**, `auth.uid()` es `NULL` ⇒ la función devuelve `NULL` ⇒
toda política `couple_id = my_couple_id()` evalúa a `NULL` (falso) ⇒ **0 filas**.
Es `SECURITY DEFINER` a propósito: lee `profiles` saltándose el RLS de esa tabla
para **evitar recursión infinita** (el RLS de `profiles` también llama a esta
función).

---

## 2. Estado de RLS por tabla

### Resumen

- **Tablas en `public`:** 28
- **Con RLS habilitado:** **28 / 28** ✅
- **Sin RLS (abiertas al anon key):** **0** ✅
- **Con `USING(true)` / `WITH CHECK(true)`:** **0** ✅
- **Event trigger `rls_auto_enable`:** activa RLS automáticamente en cualquier
  tabla nueva del schema `public` (buena práctica de defensa en profundidad). ✅

### Detalle (tabla | RLS | políticas | riesgo)

26 tablas siguen exactamente el mismo patrón: **una** política `FOR ALL` con
`USING (couple_id = my_couple_id())` **y** `WITH CHECK (couple_id = my_couple_id())`.
Esto cubre SELECT/INSERT/UPDATE/DELETE correctamente y, además, impide *mover* una
fila a otra pareja.

| Tabla | RLS | Políticas | Riesgo |
|---|---|---|---|
| agenda | ✅ | ALL: couple_id = my_couple_id() | OK |
| answers | ✅ | ALL: couple_id = my_couple_id() | OK |
| aporte_config | ✅ | ALL ("aporte pareja"): couple_id = my_couple_id() | OK |
| categorias | ✅ | ALL: couple_id = my_couple_id() | OK |
| compras_meses | ✅ | ALL: couple_id = my_couple_id() | OK |
| expenses | ✅ | ALL: couple_id = my_couple_id() | OK |
| fechas | ✅ | ALL: couple_id = my_couple_id() | OK |
| future | ✅ | ALL: couple_id = my_couple_id() | OK |
| meals | ✅ | ALL: couple_id = my_couple_id() | OK |
| meta_abonos | ✅ | ALL: couple_id = my_couple_id() | OK |
| moods | ✅ | ALL: couple_id = my_couple_id() | OK |
| nonnegotiables | ✅ | ALL ("nn pareja"): couple_id = my_couple_id() | OK |
| notita_reacciones | ✅ | ALL: couple_id = my_couple_id() | OK |
| notitas | ✅ | ALL: couple_id = my_couple_id() | OK |
| novedades | ✅ | ALL: couple_id = my_couple_id() | OK (ver nota) |
| plans | ✅ | ALL: couple_id = my_couple_id() | OK |
| questions | ✅ | ALL: couple_id = my_couple_id() | OK |
| settlements | ✅ | ALL: couple_id = my_couple_id() | OK |
| spicy_cartas | ✅ | ALL: couple_id = my_couple_id() | OK |
| spicy_deseos | ✅ | ALL: couple_id = my_couple_id() | OK |
| spicy_retos | ✅ | ALL: couple_id = my_couple_id() | OK |
| spicy_termometro | ✅ | ALL: couple_id = my_couple_id() | OK |
| subcategorias | ✅ | ALL: couple_id = my_couple_id() | OK |
| super | ✅ | ALL: couple_id = my_couple_id() | OK |
| tasks | ✅ | ALL: couple_id = my_couple_id() | OK |
| timecapsule | ✅ | ALL: couple_id = my_couple_id() | OK |
| **couples** | ✅ | SELECT `id = my_couple_id()`; UPDATE `id = my_couple_id()` | Sin INSERT/DELETE → solo se crean/borran con service role (restrictivo, correcto) |
| **profiles** | ✅ | SELECT `couple_id = my_couple_id()`; INSERT `WITH CHECK (id = auth.uid())`; UPDATE `id = auth.uid()` | ⚠️ Ver Hallazgo H4 |

**Notas de cobertura de operaciones:**
- Ninguna tabla queda sin política para una operación que se use (las `FOR ALL`
  cubren las 4; `couples`/`profiles` tienen las que la app necesita).
- `couples` y `profiles` **no permiten DELETE** a usuarios → correcto.
- Todas las políticas aplican al rol **`public`** (que incluye `anon`). Funciona
  porque `my_couple_id()` corta a `anon`, pero lo correcto es acotarlas a
  `authenticated` (Hallazgo H3).

---

## 3. Hallazgos y fixes propuestos

| # | Severidad | Hallazgo | Fix | Migración |
|---|---|---|---|---|
| H1 | 🟡 Baja | `my_couple_id()` tiene `search_path` mutable (advisor `0011`). Una función `SECURITY DEFINER` sin `search_path` fijo es endurecible. | Fijar `set search_path = ''` y calificar `public.profiles` / `auth.uid()`. **No** cambia comportamiento. | `01_harden_my_couple_id.sql` |
| H2 | 🟡 Baja | Funciones `SECURITY DEFINER` ejecutables por `anon`/`authenticated` vía RPC (advisor `0028/0029`): `my_couple_id`, `rls_auto_enable`. | `rls_auto_enable` (event trigger): **revocar EXECUTE** a `public` (no afecta al trigger). `my_couple_id`: se **mantiene** EXECUTE para `authenticated` (lo necesitan las políticas); se documenta como riesgo aceptado (solo devuelve el `couple_id` propio; `NULL` para anon). | `02_revoke_securitydefiner_execute.sql` |
| H3 | 🟢 Buenas prácticas | Todas las políticas apuntan al rol `public` (incluye `anon`). | Re-scopear a `authenticated`. Seguro: los usuarios reales son `authenticated`. Bloquea a `anon` a nivel de política, no solo por la función. | `03_scope_policies_authenticated.sql` |
| H4 | 🟠 Media (condicional) | `profiles` INSERT solo valida `id = auth.uid()`, **no** el `couple_id`. Un usuario autenticado podría crear su perfil con el `couple_id` de OTRA pareja y leer todos sus datos. | Requiere **decisión de onboarding** (ver abajo). Dos opciones; no aplicar sin decidir. | `04_profiles_insert_hardening.sql` (DRAFT, no aplicar) |
| H5 | 🟡 Baja | "Leaked password protection" desactivada (advisor auth). | Activar en Dashboard → Auth → Passwords (no es migración SQL). | — (config) |
| H6 | ℹ️ Verificar | El impacto real de H4 depende de si **el registro público de usuarios está habilitado**. | Revisar Dashboard → Auth → "Allow new users to sign up". Si está desactivado, H4 baja a 🟢. | — (config) |

### Detalle H4 (el único hallazgo con sustancia)

La política de INSERT en `profiles`:

```sql
-- actual: permite insertar tu perfil con CUALQUIER couple_id
with check (id = auth.uid())
```

**Para explotarlo hacen falta dos condiciones a la vez:**
1. Que el **registro público esté habilitado** (o tener ya una cuenta), y
2. **Conocer el UUID `couple_id`** de la pareja víctima (un UUID v4 no se adivina
   y solo aparece en el cliente de los usuarios legítimos).

Por eso es **media-condicional**, no crítica. Aun así conviene endurecerlo.
Como la pareja ya tiene sus 2 perfiles, **ninguna de las opciones rompe la app
actual** (no se vuelven a insertar perfiles para esta pareja). El onboarding de
parejas/perfiles nuevas se hace hoy con **service role** (que ignora RLS), así que
acotar la política de `authenticated` tampoco afecta ese flujo administrativo.

- **Opción A (recomendada, conservadora):** solo permitir auto-insertarse en una
  pareja que **aún no tiene miembros** (bootstrap). Impide unirse a una pareja
  ocupada.
- **Opción B (estricta):** **prohibir** el auto-insert de `authenticated` y onboardear
  siempre por service role / una función `SECURITY DEFINER` con invitación validada.

Ambas están escritas en `04_profiles_insert_hardening.sql` como DRAFT (comentadas).
**No aplicar hasta decidir el flujo de onboarding.**

---

## 4. ¿Qué tan expuesta está la base HOY?

**Con solo `URL + anon key` y sin iniciar sesión: prácticamente nada.**

- Las 28 tablas tienen RLS y filtran por `couple_id = my_couple_id()`.
- Para `anon`, `my_couple_id()` = `NULL` ⇒ **0 filas** en SELECT/INSERT/UPDATE/DELETE.
- Los GRANTs amplios de `anon` (SELECT/INSERT/UPDATE/DELETE/TRUNCATE en las 28
  tablas) son los **defaults de Supabase** y quedan **neutralizados por RLS**
  (TRUNCATE además no se expone por PostgREST).
- `couples`/`profiles` no permiten DELETE a usuarios; `couples` no permite INSERT.

**Riesgos residuales — todos requieren una cuenta autenticada:**
- H4: posible "secuestro de pareja" si (registro abierto) **y** (se conoce el UUID
  de la pareja). Baja probabilidad, pero endurecible.
- H1/H2/H3: endurecimiento de funciones `SECURITY DEFINER` y de roles en políticas.
- H5: activar protección de contraseñas filtradas.

**Conclusión:** El `anon key` viviendo en el cliente **no es** un problema por sí
mismo en este proyecto, porque la seguridad real (RLS por pareja) está bien
implementada. La recomendación de **rotar el anon key** (porque estuvo en git)
sigue siendo válida como higiene, pero no hay exposición de datos por ese hecho.

---

## 5. Cómo aplicar los fixes (cuando los revises)

Los `.sql` están en [`supabase/security-fixes/`](supabase/security-fixes/) y **no
se han aplicado**. Orden sugerido y seguridad:

1. `01_harden_my_couple_id.sql` — **seguro**, sin impacto en la app.
2. `02_revoke_securitydefiner_execute.sql` — **seguro** (no rompe el event trigger).
3. `03_scope_policies_authenticated.sql` — **seguro** para usuarios reales; revísalo
   porque recrea las políticas.
4. `04_profiles_insert_hardening.sql` — **NO aplicar** hasta decidir onboarding (H4).

Para aplicar (tras revisar), desde el Dashboard SQL Editor o `supabase db push`, o
pídeme que los aplique con `apply_migration` una vez aprobados.

> Recordatorio de config (no SQL): activar *leaked password protection* (H5) y
> verificar el ajuste de *signups* (H6) en el Dashboard de Auth.

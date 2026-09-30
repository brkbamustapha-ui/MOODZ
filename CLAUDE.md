@AGENTS.md

# MOODZ : notes pour les agents

Site du café-restaurant MOODZ (Oran) : site public avec logo 3D, carte, commande en ligne à
confirmation manuelle, et espace gérant `/admin` (commandes, carte, revenus, réglages).
Textes de l'interface et commentaires du code en français.

## Commandes

- `npm run dev` : développement (base PGlite embarquée dans `.data/` si `DATABASE_URL` est vide ;
  compte de dev `admin` / `moodz2026`).
- Vérifications avant commit : `npx tsc --noEmit`, `npm run lint`, et `npm run build` pour les
  changements de configuration ou de routes. Pas de suite de tests : valider les parcours avec
  Playwright (Chromium : `/opt/pw-browsers/chromium` dans les sessions cloud).

## Architecture

- `src/lib/db/` : `getDb()` choisit PostgreSQL (`DATABASE_URL`, sinon `POSTGRES_URL` de
  l'intégration Vercel–Supabase ; pooler en mode transaction, `prepare: false`) ou PGlite. Les
  migrations de `migrations.ts` s'appliquent au démarrage : ajouter une nouvelle entrée, ne jamais
  modifier une migration existante, puis `npx tsx scripts/export-sql.ts`. RLS activée sur chaque table.
- `DATABASE_SCHEMA` (base partagée avec un autre site) : chaque requête passe par une transaction
  qui fixe `search_path` sur ce schéma. Garder le SQL sans nom de schéma (`orders`, pas
  `public.orders`) et passer par `db.query` / `db.transaction`, jamais par le client brut.
- `src/lib/server/` (`server-only`) : auth (bcrypt + JWT HS256 dans le cookie `moodz_admin`,
  `session_version` pour révoquer), commandes, carte, statistiques, limites de débit en base.
- Chaque handler `src/app/api/admin/**` commence par `guardAdmin(request)` (session + contrôle
  d'origine). `src/proxy.ts` n'est qu'un filtre optimiste.
- Montants en dinars entiers. Le total d'une commande est toujours recalculé côté serveur.
- Heures et statistiques en `Africa/Algiers` (`src/lib/hours.ts`, `src/lib/format.ts`).

## Production

- Vercel : projet `moodz` (équipe brkbamustapha-uis-projects), domaine https://moodz-five.vercel.app,
  fonctions en `iad1`. La branche de production est `claude/optimistic-cray-80lesh` : chaque push
  sur cette branche est mis en ligne. Valider (tsc, lint, build) avant de pousser.
- Base : projet Supabase `supabase-chestnut-desert` (us-east-1), partagé avec le site
  `imtiyaz-el-djazair` (tables Prisma dans `public`). MOODZ vit dans le schéma `moodz` avec le rôle
  `moodz_app` (droits limités à ce schéma), via `DATABASE_URL` (pooler, port 6543) et
  `DATABASE_SCHEMA=moodz`. Ne jamais modifier le schéma `public` de ce projet.

## Pièges connus

- Zod 4 : `.partial()` applique les `.default()`. Les schémas de modification (`*PatchSchema` dans
  `src/lib/validation.ts`) sont construits sans valeurs par défaut, sinon un PATCH efface des champs.
- JSON en base : écrire `$1::text::jsonb` avec `JSON.stringify(...)`. Avec postgres.js, `$1::jsonb`
  ré-encode le texte et stocke une chaîne JSON (PGlite ne le fait pas : le bug n'apparaît qu'en production).
- Règles du React Compiler actives : pas de `setState` dans un effet (utiliser
  `useSyncExternalStore`, `useClientValue`/`useMediaQuery` de `src/lib/hooks`), pas de mutation de
  props ; en 3D, l'état mutable passe par des refs et l'aléatoire par un PRNG à graine.
- La scène 3D (`hero/HeroScene.tsx`) est chargée à la demande (`ssr: false`) : ne pas y ajouter de
  dépendance lourde (drei a été retiré pour cette raison).
- Fluidité sur téléphone (mesurer avec Playwright, CPU ralenti ×4 par CDP) : la scène 3D compile ses
  shaders avec `compileAsync` et prépare badge et reflets hors du rendu ; profil allégé au doigt
  (matériaux standard, moins de pixels). Animations dans `useSceneFrame` (l'horloge de R3F repart de
  zéro quand le rendu reprend). Au doigt : pas de `backdrop-filter` (règle `.glass` dans
  `globals.css`), pas de filtre CSS animé, pas d'or liquide WebGL (`LiquidGold` passe en CSS).
- Couleur d'accent : `--accent` vient des réglages (olive du logo par défaut) ; les nuances
  `--gold-*` (nom historique) en sont dérivées par `color-mix` dans `src/app/globals.css` (Tailwind v4,
  configuration en CSS). `<html data-accent-tone>` (`src/lib/color.ts`) choisit texte crème ou foncé
  sur les boutons ; `.accent-scope` recalcule les nuances sous un `--accent` local (aperçu).
- Logo : badge « Feed your mood » dans `src/lib/brand/badge.ts`, généré par
  `scripts/generate-badge.mjs` (Roboto Slab Black) ; composants `Badge`, `Wordmark`, `AnimatedBadge`.
  Ses couleurs sont fixes (`--logo-olive`, `--logo-cream`), indépendantes de l'accent.

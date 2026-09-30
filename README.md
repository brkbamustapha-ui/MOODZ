# MOODZ · Café · Restaurant (Gambetta, Oran)

Site officiel de MOODZ : logo 3D animé, carte en ligne sans photos, commande depuis le site avec
confirmation manuelle par le restaurant, et espace gérant pour modifier la carte, suivre les commandes
et calculer les revenus.

- **Site public** : `/`
- **Suivi d'une commande** : `/commande/<code>` (lien donné au client après sa commande)
- **Espace gérant** : `/admin`

---

## Ce que fait le site

### Côté clients

- **Intro et logo 3D** : le badge MOODZ « Feed your mood » se compose (anneau, disque olive, branche,
  lettres) ; sur la page d'accueil il devient une pièce émaillée en relief, bord bronze, qui émerge,
  pivote et suit le doigt ou la souris. Sans WebGL, le badge en 2D prend le relais ; avec l'option
  « réduire les animations » du téléphone, la scène reste immobile. Thème olive et crème, aux couleurs
  du logo.
- **Carte 3D fluide, sans photos** : catégories en carrousel 3D, articles présentés comme sur une carte
  de restaurant (nom, description, prix, options de taille), badges *Signature*, *Nouveau*,
  *Populaire*, *Épicé*, *Végétarien*. Les articles en rupture restent visibles mais ne peuvent pas être
  commandés.
- **Commande en ligne** : panier, choix *à emporter*, *livraison* ou *sur place*, frais et minimum de
  livraison, message pour la cuisine. Les prix sont toujours recalculés côté serveur.
- **Confirmation manuelle** : le client reçoit un code et une page de suivi qui se met à jour seule
  (en attente, confirmée avec heure prévue, en préparation, prête, ou refusée avec le motif).
- **Horaires, adresse, téléphone, WhatsApp, Instagram, TikTok**, avec l'état « ouvert / fermé »
  calculé à l'heure d'Oran.

### Côté gérant (`/admin`)

| Page | Contenu |
| --- | --- |
| **Aperçu** | Commandes en attente, chiffre d'affaires du jour, tendance sur 14 jours, meilleures ventes, interrupteur pour suspendre les commandes en ligne. |
| **Commandes** | Nouvelles commandes avec son et notification. Confirmer (avec délai), refuser (avec motif), passer en préparation, prête, terminée. Appel du client en un clic, impression du ticket, historique et recherche. |
| **Carte** | Catégories et articles : ajouter, modifier, réordonner, masquer, mettre en rupture, options de taille, badges, prix de revient. **Import rapide** pour coller une carte entière. |
| **Revenus** | Calculateur : chiffre d'affaires par jour, panier moyen, heures de pointe, ventes par catégorie et par article, marge brute, charges fixes, bénéfice estimé, projection mensuelle et seuil de rentabilité. Export CSV pour Excel. |
| **Réglages** | Nom, textes, contact et réseaux, horaires, règles de commande (frais, minimum, délai), couleur d'accent, votre logo, identifiant et mot de passe. |

Seules les commandes **acceptées** (confirmée, en préparation, prête, terminée) comptent dans le
chiffre d'affaires. Les commandes refusées ou annulées sont exclues.

---

## Démarrer en local

Prérequis : Node.js 20.9 ou plus récent.

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Sans `DATABASE_URL`, une base PostgreSQL embarquée (PGlite) est créée
dans `.data/` avec une carte d'exemple.

Espace gérant : http://localhost:3000/admin, compte de développement **admin / moodz2026**
(créé seulement en local ; changez-le dans *Réglages > Compte*).

Pour tester sur un téléphone connecté au même Wi-Fi, ouvrez l'adresse « Network » affichée dans le
terminal (ex. `http://192.168.1.10:3000`).

---

## Mise en ligne (Vercel + Supabase)

Le site a besoin d'une base PostgreSQL hébergée. Vercel met en ligne la branche par défaut du dépôt
GitHub : c'est elle qui doit contenir la dernière version du code.

### A. Partager une base Supabase déjà reliée à Vercel

Si une base Supabase apparaît déjà dans l'onglet **Storage** de Vercel, MOODZ peut s'y installer dans son
propre schéma `moodz`, sans toucher aux tables des autres sites. Les identifiants de connexion passent
directement de Supabase à Vercel : personne n'a à les copier.

1. **Importer le dépôt** sur [vercel.com](https://vercel.com) : *Add New > Project*, dépôt `MOODZ`.
   Next.js est détecté automatiquement.
2. **Variables d'environnement**, avant de cliquer sur *Deploy* :

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_SCHEMA` | `moodz` |
   | `ADMIN_USERNAME` | votre identifiant gérant, ex. `moodz` |
   | `ADMIN_PASSWORD` | un mot de passe long et unique |

3. **Relier la base** : onglet **Storage** du projet, *Connect Database*, choisissez la base Supabase
   existante. Vercel ajoute `POSTGRES_URL`, que MOODZ utilise automatiquement.
4. **Redéployer** : *Deployments*, menu du dernier déploiement, *Redeploy*. Au premier démarrage, MOODZ
   crée son schéma, ses tables, la carte d'exemple et le compte gérant. Connectez-vous sur `/admin`.

### B. Nouvelle base Supabase

1. **Créer la base** sur [supabase.com](https://supabase.com) et noter le mot de passe de la base.
2. **Copier l'adresse de connexion** : bouton **Connect** du projet, mode **Transaction pooler**
   (port `6543`), en remplaçant `[YOUR-PASSWORD]`.
3. **Importer le dépôt** sur Vercel avec ces variables (voir `.env.example`) :

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_URL` | l'adresse de l'étape 2 |
   | `ADMIN_USERNAME` | votre identifiant gérant |
   | `ADMIN_PASSWORD` | un mot de passe long et unique |
   | `AUTH_SECRET` | facultatif : clé aléatoire de 32 caractères ou plus (`openssl rand -base64 48`) |
   | `NEXT_PUBLIC_SITE_URL` | facultatif : votre domaine, ex. `https://moodz-oran.com` |

### C. Base partagée avec un rôle dédié (configuration en ligne actuelle)

Pour isoler complètement MOODZ dans une base qui sert aussi un autre site, créez dans l'éditeur SQL de
Supabase un rôle qui n'a de droits que sur son schéma :

```sql
create role moodz_app with login password 'un-mot-de-passe-long-et-aleatoire';
create schema if not exists moodz;
grant usage, create on schema moodz to moodz_app;
alter role moodz_app set search_path = moodz;
```

Puis, dans Vercel : `DATABASE_SCHEMA=moodz` et `DATABASE_URL` = l'adresse du *Transaction pooler*
(bouton **Connect** de Supabase) en remplaçant l'utilisateur par `moodz_app.<référence-du-projet>` et
le mot de passe par celui du rôle.

### Région et nom de domaine

`vercel.json` place les fonctions du site à Washington (`iad1`), à côté des bases Supabase de la région
`us-east-1`. Chaque page interroge la base plusieurs fois : si votre base est ailleurs, choisissez la
région Vercel la plus proche (par exemple `cdg1` pour une base à Paris, `eu-west-3`).
Nom de domaine (facultatif) : *Settings > Domains* dans Vercel.

Les tables peuvent aussi être créées à l'avance avec `supabase/migrations/20260929000000_moodz_init.sql`
(éditeur SQL de Supabase ou `supabase db push`), mais ce n'est pas nécessaire.

> Hébergement ailleurs (VPS, serveur local) : `npm run build && npm start`. Sans base PostgreSQL, la base
> embarquée est stockée dans `.data/pglite` (dossier modifiable avec `PGLITE_DIR`), pensez à la
> sauvegarder. En production, `ADMIN_PASSWORD` est obligatoire.

### Mot de passe oublié

Les variables `ADMIN_*` ne servent qu'à créer le premier compte. Pour le recréer, exécutez
`delete from moodz.admins;` dans l'éditeur SQL de Supabase (`delete from admins;` sans
`DATABASE_SCHEMA`), puis redéployez : le compte est recréé à partir de `ADMIN_USERNAME` et
`ADMIN_PASSWORD`.

---

## Premiers réglages

1. **Remplacer la carte d'exemple** : *Carte > Import rapide*, collez votre carte sous cette forme,
   puis choisissez « Remplacer toute la carte ».

   ```text
   # Cafés
   Espresso - 150
   Cappuccino - 300 | Double shot, mousse de lait
   # Pizzas
   Margherita - Moyenne 800 / Large 1150 | Tomate, mozzarella, basilic
   ```

   Titres de catégorie : ligne commençant par `#`, en MAJUSCULES, ou finissant par `:`.
   Descriptions après `|`. Les prix peuvent s'écrire `1 400`, `1400 DA` ou `1400`.
2. **Votre logo** : le badge MOODZ est intégré. Pour en utiliser un autre : *Réglages > Apparence*
   (PNG, SVG ou WebP transparent, 500 Ko maximum) ; il remplace le badge dans la navigation et devient
   un médaillon 3D sur l'accueil. La couleur d'accent (olive par défaut) se choisit au même endroit.
3. **Contact et horaires** : téléphone, WhatsApp, lien Google Maps, horaires par jour.
4. **Commandes** : frais de livraison, livraison offerte dès, minimum, délai habituel, modes acceptés,
   commandes hors horaires.
5. **Marges** : renseignez le *prix de revient* des articles (facultatif) et, dans *Revenus*, le
   pourcentage de coût matières par défaut et vos charges fixes (loyer, salaires, électricité...).

Gardez la page **Commandes** ouverte pendant le service (sur une tablette par exemple) : un son et une
notification signalent chaque nouvelle commande.

---

## Sécurité

- Mots de passe hachés (bcrypt), session signée dans un cookie `httpOnly`, déconnexion de tous les
  appareils après un changement de mot de passe.
- Limites anti-abus : 10 essais de connexion par 15 min et par adresse IP, 6 commandes par 15 min
  et par client, champ piège contre les robots.
- Protection CSRF (vérification de l'origine), en-têtes de sécurité, espace gérant exclu des moteurs
  de recherche.
- Toutes les données passent par le serveur. Sur Supabase, la sécurité par ligne (RLS) est activée
  sans règle publique : les tables sont inaccessibles via l'API publique de Supabase.
- Les adresses IP ne sont jamais stockées en clair (empreinte anonymisée pour les limites).

---

## Pour les développeurs

Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, Three.js + React Three Fiber,
Motion, Lenis, Zod, PostgreSQL (`postgres`) ou PGlite.

```text
src/
  app/                  pages, routes API (api/…) et espace gérant (admin/…)
  components/site/      site public : hero 3D, carte, panier, suivi
  components/admin/     tableau de bord : commandes, carte, revenus, réglages
  components/brand/     badge MOODZ (statique, animé) et mot MOODZ
  lib/db/               connexion, migrations SQL, données d'exemple
  lib/server/           logique serveur : auth, commandes, carte, statistiques
  proxy.ts              protection des routes /admin (ex-middleware)
scripts/
  generate-badge.mjs    régénère les tracés du badge (police Roboto Slab)
  export-sql.ts         exporte les migrations vers supabase/migrations
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | version de production |
| `npm run lint` / `npx tsc --noEmit` | vérifications |
| `npx tsx scripts/export-sql.ts` | après une nouvelle migration dans `src/lib/db/migrations.ts` |
| `node scripts/generate-badge.mjs` | après un changement du dessin ou du lettrage du badge |

Le badge est redessiné en vectoriel d'après le logo de la carte ; ses lettres sont tracées à partir de
la police Roboto Slab Black (SIL Open Font License 1.1).

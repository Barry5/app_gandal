# Deploiement production Render + Vercel

## Architecture cible

- Supabase : base PostgreSQL de production.
- Render : API Fastify Node.js.
- Vercel : frontend Next.js.
- Cloudinary : stockage et diffusion des videos, PDF et images.

## 1. Pre-requis

- Le code doit etre pousse sur GitHub.
- Le fichier `.env` local ne doit jamais etre pousse.
- Les migrations Supabase doivent etre appliquees avant la mise en ligne.
- Node.js 20 et pnpm 8.15.0 sont utilises en production.

## 2. Base Supabase

Les migrations ont deja ete appliquees avec :

```bash
pnpm --filter @savoir/db migrate
```

Verification effectuee : les tables critiques existent dans Supabase.

## 3. Deployer l'API sur Render

### Option recommandee : Blueprint Render

1. Pousser le repository sur GitHub.
2. Ouvrir Render.
3. Choisir **New > Blueprint**.
4. Selectionner le repository.
5. Render detecte le fichier `render.yaml`.
6. Creer le service `savoir-api`.

### Variables d'environnement Render

Configurer ces variables dans Render :

- `DATABASE_URL`
- `DB_SSL_REJECT_UNAUTHORIZED=false`
- `JWT_SECRET`
- `ACCESS_CODE_PEPPER`
- `CORS_ORIGINS=https://votre-front.vercel.app`
- `APP_URL=https://votre-front.vercel.app`
- `API_PUBLIC_URL=https://votre-api.onrender.com`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET`
- `CLOUDINARY_VIDEO_FOLDER=courses/videos`
- `CLOUDINARY_VIDEO_DELIVERY_TYPE=upload`
- `CINETPAY_API_KEY`
- `CINETPAY_SITE_ID`
- `CINETPAY_SECRET_KEY`
- `CINETPAY_CHANNELS=MOBILE_MONEY`

### Commandes Render

Le fichier `render.yaml` configure :

```bash
Build:
corepack enable && corepack prepare pnpm@8.15.0 --activate && pnpm install --frozen-lockfile && pnpm --filter @savoir/shared build && pnpm --filter @savoir/api build

Start:
pnpm --filter @savoir/api start
```

### Test API

Apres deploiement :

```bash
https://votre-api.onrender.com/api/health
```

La reponse attendue :

```json
{ "status": "ok", "timestamp": "..." }
```

## 4. Deployer le frontend sur Vercel

1. Ouvrir Vercel.
2. Importer le repository GitHub.
3. Selectionner le projet frontend.
4. Root Directory : `apps/web`.
5. Framework : Next.js.
6. Le fichier `apps/web/vercel.json` definit les commandes monorepo.

### Variable d'environnement Vercel

Configurer :

```bash
NEXT_PUBLIC_API_URL=https://votre-api.onrender.com/api
```

Puis redeployer le frontend.

## 5. Corriger CORS apres obtention du domaine Vercel

Une fois le domaine Vercel obtenu, retourner sur Render et mettre :

```bash
CORS_ORIGINS=https://votre-front.vercel.app
APP_URL=https://votre-front.vercel.app
API_PUBLIC_URL=https://votre-api.onrender.com
```

Redemarrer l'API Render.

## 6. CinetPay en production

Dans CinetPay, configurer :

- Return URL : `https://votre-front.vercel.app/learn/payment/return`
- Notify URL : `https://votre-api.onrender.com/api/payments/cinetpay/notify`

## 7. Verification finale

Verifier dans cet ordre :

1. `/api/health` repond sur Render.
2. Le frontend Vercel charge correctement.
3. Connexion utilisateur OK.
4. Catalogue des cours OK.
5. Upload Cloudinary OK.
6. Lecture video/PDF OK.
7. Code d'acces hors ligne OK.
8. Assistant IA OK.
9. Paiement CinetPay OK si les identifiants production sont disponibles.

## 8. Notes importantes

- Ne jamais exposer `.env`.
- Ne jamais mettre les secrets dans `render.yaml` ou `vercel.json`.
- Render fournit automatiquement `PORT`; l'API l'utilise maintenant.
- Supabase reste la source de donnees principale.
- Cloudinary reste le stockage recommande pour les fichiers de cours.

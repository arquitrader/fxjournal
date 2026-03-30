# 🚀 FXJournal — Guía de lanzamiento paso a paso

## Lo que necesitas (todo gratis)
- Cuenta en **Supabase** → https://supabase.com
- Cuenta en **GitHub** → https://github.com
- Cuenta en **Vercel** → https://vercel.com

---

## PASO 1 — Configurar Supabase (base de datos + login)

1. Entra a https://supabase.com y crea una cuenta gratuita
2. Clic en **"New project"** → ponle nombre: `fxjournal` → elige una región → crea
3. Espera ~2 minutos mientras se configura
4. Ve al menú izquierdo → **SQL Editor** → **New query**
5. Copia y pega el contenido del archivo `supabase-setup.sql` → clic **Run**
6. Ve a **Settings** (ícono engranaje) → **API**
7. Copia estos dos valores:
   - **Project URL** → algo como `https://abcxyz.supabase.co`
   - **anon public key** → cadena larga que empieza con `eyJ...`

---

## PASO 2 — Subir el proyecto a GitHub

1. Entra a https://github.com y crea una cuenta si no tienes
2. Clic en **"New repository"** → nombre: `fxjournal` → **Create repository**
3. En tu computadora, abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "FXJournal v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fxjournal.git
git push -u origin main
```

> Si no sabes usar la terminal, puedes usar **GitHub Desktop**: https://desktop.github.com

---

## PASO 3 — Publicar en Vercel

1. Entra a https://vercel.com y crea cuenta (puedes entrar con GitHub)
2. Clic en **"Add New Project"** → selecciona tu repositorio `fxjournal`
3. Antes de hacer deploy, agrega las **variables de entorno**:
   - Clic en **"Environment Variables"**
   - Agrega: `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL de Supabase
   - Agrega: `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key de Supabase
4. Clic en **Deploy**
5. En ~1 minuto tendrás tu app en una URL como: `https://fxjournal.vercel.app`

---

## ¡Listo! Tu app está en internet 🎉

### Estructura de archivos
```
fxjournal/
├── pages/
│   ├── index.js        ← Página de login/registro
│   └── app.js          ← App principal (dashboard, historial, premium)
├── lib/
│   └── supabase.js     ← Conexión a la base de datos
├── styles/
│   └── globals.css     ← Estilos globales
├── supabase-setup.sql  ← SQL para crear la base de datos
├── .env.local.example  ← Plantilla de variables de entorno
└── package.json        ← Dependencias del proyecto
```

---

## Próximos pasos para monetizar

Cuando tengas usuarios, agrega Stripe para cobrar:
1. Crea cuenta en https://stripe.com
2. Pídeme que integre los pagos y te genero el código

---

## ¿Problemas?

Mándame un mensaje y te ayudo con cualquier paso.

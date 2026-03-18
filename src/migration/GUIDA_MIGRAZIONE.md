# Guida Migrazione WorkBoard → Server del Cliente

## Prerequisiti sul server
- Node.js 18+
- PostgreSQL 14+
- Nginx o Apache (reverse proxy)
- Certificato SSL (Let's Encrypt)

---

## STEP 1 — Crea il database PostgreSQL

```bash
psql -U postgres
CREATE DATABASE workboard;
\q

psql -U postgres -d workboard -f migration/schema.sql
```

---

## STEP 2 — Configura il backend

```bash
cd migration/backend
npm install

cp .env.example .env
# Modifica .env con i tuoi valori reali
nano .env
```

Avvia in test:
```bash
npm run dev
# oppure per produzione:
npm start
```

---

## STEP 3 — Crea l'utente admin iniziale

Accedi al DB e inserisci il primo admin:

```sql
INSERT INTO users (email, full_name, password_hash, role)
VALUES (
  'admin@tuazienda.it',
  'Admin',
  -- genera hash con: node -e "console.log(require('bcryptjs').hashSync('password', 12))"
  '$2a$12$HASH_QUI',
  'admin'
);
```

---

## STEP 4 — Build del frontend

Nel progetto React, crea un file `src/api/apiClient.js` che punta al tuo backend
invece di usare Base44 SDK (vedi sezione sotto).

```bash
npm run build
# La cartella dist/ va servita da Nginx/Apache
```

---

## STEP 5 — Nginx config (esempio)

```nginx
server {
    listen 443 ssl;
    server_name tuodominio.it;

    # Frontend
    root /var/www/workboard/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # File uploads
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
    }
}
```

---

## STEP 6 — PM2 (processo persistente)

```bash
npm install -g pm2
cd migration/backend
pm2 start server.js --name workboard-api
pm2 save
pm2 startup
```

---

## Mappa API — Da Base44 SDK → REST

| Base44 SDK                              | Nuovo endpoint REST                  |
|-----------------------------------------|--------------------------------------|
| `base44.auth.me()`                      | `GET /api/auth/me`                   |
| `base44.auth.login()`                   | `POST /api/auth/login`               |
| `base44.entities.Task.list()`           | `GET /api/tasks`                     |
| `base44.entities.Task.filter({...})`    | `GET /api/tasks?board_id=xxx`        |
| `base44.entities.Task.create({...})`    | `POST /api/tasks`                    |
| `base44.entities.Task.update(id, {...})`| `PATCH /api/tasks/:id`               |
| `base44.entities.Task.delete(id)`       | `DELETE /api/tasks/:id`              |
| `base44.entities.Board.*`               | `GET/POST/PATCH/DELETE /api/boards`  |
| `base44.entities.Commission.*`          | `/api/commissions`                   |
| `base44.entities.Comment.*`             | `/api/comments`                      |
| `base44.entities.Project.*`             | `/api/projects`                      |
| `base44.integrations.Core.UploadFile`   | `POST /api/upload` (multipart/form-data) |
| `base44.functions.invoke('listUsers')`  | `GET /api/users`                     |
| `base44.functions.invoke('sendCommissionReport')` | `POST /api/reports/commission` |
| `base44.users.inviteUser(email, role)`  | `POST /api/users/invite`             |

---

## Export dati da Base44

Prima di spegnere l'istanza Base44:
1. Vai su **Dashboard Base44 → Settings → Export Data**
2. Scarica i JSON di ogni entità
3. Importa nel nuovo PostgreSQL con uno script di seeding

---

## Note importanti

- **Real-time (subscribe)**: Base44 ha un sistema di subscription real-time.  
  Nel backend autonomo usa **polling** (già implementato nella chat con `refetchInterval`) oppure integra **Socket.io** per eventi in tempo reale.
- **File storage**: i file sono salvati localmente in `uploads/`.  
  Per produzione considera **MinIO** o **S3** se vuoi storage distribuito.
- **Email**: le email vengono inviate tramite SMTP configurato nelle impostazioni.
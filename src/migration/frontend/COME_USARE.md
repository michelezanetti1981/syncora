# Come integrare il nuovo apiClient nel frontend

## 1. Copia i file

Copia questi file nel progetto React:
- `src/api/apiClient.js` → sostituisce `src/api/base44Client.js`
- `src/lib/AuthContext.jsx` → sostituisce `src/lib/AuthContext.jsx`
- `src/pages/Login.jsx` → nuova pagina di login
- `.env.example` → rinomina in `.env` e configura

## 2. Sostituisci gli import

**Prima (Base44):**
```js
import { base44 } from '@/api/base44Client';
```

**Dopo (standalone):**
```js
import { entities, auth, uploadFile } from '@/api/apiClient';
// oppure per compatibilità totale:
import api from '@/api/apiClient';
const base44 = api; // drop-in replacement per base44.entities.X.list()
```

## 3. Mappa chiamate → REST

| Vecchio (Base44 SDK)                              | Nuovo (apiClient)                            |
|---------------------------------------------------|----------------------------------------------|
| `base44.entities.Task.list()`                     | `entities.Task.list()`                       |
| `base44.entities.Task.filter({board_id: x})`      | `entities.Task.filter({board_id: x})`        |
| `base44.entities.Task.create({...})`              | `entities.Task.create({...})`                |
| `base44.entities.Task.update(id, {...})`           | `entities.Task.update(id, {...})`            |
| `base44.entities.Task.delete(id)`                 | `entities.Task.delete(id)`                   |
| `base44.auth.me()`                                | `auth.me()`                                  |
| `base44.auth.logout()`                            | `auth.logout()`                              |
| `base44.users.inviteUser(email, role)`            | `users.inviteUser(email, role)`              |
| `base44.integrations.Core.UploadFile({file})`     | `uploadFile(file)` → `{ file_url }`         |
| `base44.functions.invoke('fnName', payload)`      | `functions.invoke('fnName', payload)`        |

## 4. Upload file

**Prima:**
```js
const { file_url } = await base44.integrations.Core.UploadFile({ file });
```

**Dopo:**
```js
import { uploadFile } from '@/api/apiClient';
const { file_url } = await uploadFile(file);
```

## 5. Rimuovi Base44 dal package.json

```bash
npm uninstall @base44/sdk @base44/vite-plugin
```

Nel `vite.config.js`, rimuovi:
```js
// Rimuovi queste righe:
import base44Plugin from '@base44/vite-plugin';
base44Plugin({ appId: ... })
```

## 6. Aggiungi la route /login in App.jsx

```jsx
import Login from './pages/Login';

// In <Routes>:
<Route path="/login" element={<Login />} />
``
# Sistema di Migrations

Le migrations sono file SQL numerati nella cartella `migrations/`.  
Ogni volta che lo schema cambia, viene creato un nuovo file con il numero progressivo.

## Struttura file

```
migrations/
  000_init.sql          ← schema completo iniziale
  001_nome_modifica.sql ← prima modifica
  002_altra_modifica.sql
  ...
  migrate.js            ← script Node.js per applicare le migrations
```

## Come applicare le migrations

### Opzione A — Script automatico (consigliato)

```bash
cd migration/migrations
node migrate.js
```

Lo script:
1. Crea la tabella `schema_migrations` se non esiste
2. Legge tutti i file `*.sql` in ordine numerico
3. Salta quelli già applicati (registrati nella tabella)
4. Applica solo quelli nuovi

### Opzione B — Manuale (singola migration)

```bash
psql $DATABASE_URL -f migrations/001_nome_modifica.sql
```

## Come creare una nuova migration

Crea un file con il prossimo numero progressivo:

```
001_aggiungi_colonna_xyz.sql
```

Struttura consigliata del file:

```sql
-- Migration 001: Descrizione breve
-- Data: YYYY-MM-DD

-- Le tue modifiche qui
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS xyz VARCHAR(255);

-- Registra la migration (SEMPRE alla fine)
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Descrizione breve')
ON CONFLICT (version) DO NOTHING;
```

## Verificare lo stato

```sql
SELECT version, description, applied_at
FROM schema_migrations
ORDER BY version;
``
#!/usr/bin/env node
/**
 * migrate.js — Applica le migrations SQL in ordine
 * 
 * Uso:
 *   DATABASE_URL=postgres://user:pass@host/db node migrate.js
 *   oppure metti DATABASE_URL nel .env del backend
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Crea tabella tracking se non esiste
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(50) PRIMARY KEY,
        description TEXT,
        applied_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Leggi migrations già applicate
    const { rows: applied } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(applied.map(r => r.version));

    // Leggi tutti i file .sql nella cartella, ordinati
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      const version = file.split('_')[0]; // es. "001" da "001_nome.sql"
      
      if (appliedVersions.has(version)) {
        console.log(`  ✓ ${file} (già applicata)`);
        continue;
      }

      console.log(`  → Applico ${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      
      console.log(`  ✅ ${file} applicata`);
      count++;
    }

    if (count === 0) {
      console.log('\nNessuna nuova migration da applicare.');
    } else {
      console.log(`\n${count} migration(s) applicate con successo.`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Errore durante la migration:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
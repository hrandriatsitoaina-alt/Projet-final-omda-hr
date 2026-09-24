require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

pool.query("SELECT nom, email, role, LEFT(mot_de_passe, 10) as mdp_apercu FROM utilisateurs WHERE role IN ('super_admin','daf')")
  .then(r => { console.log(r.rows); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
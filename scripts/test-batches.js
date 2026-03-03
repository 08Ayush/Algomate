require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(
    'SELECT b.id, b.name, COUNT(bs.id) as cnt FROM batches b LEFT JOIN batch_subjects bs ON bs.batch_id = b.id WHERE b.college_id = $1 GROUP BY b.id, b.name HAVING COUNT(bs.id) > 0 LIMIT 5',
    ['c25be3d2-4b6d-4373-b6de-44a4e2a2508f']
).then(r => {
    r.rows.forEach(x => console.log(x.id, '|', x.name, '| cnt:', x.cnt));
    pool.end();
}).catch(e => { console.error(e.message); pool.end(); });

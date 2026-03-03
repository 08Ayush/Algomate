require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(
    "SELECT id, rule_name, rule_type, description, weight, is_active, rule_parameters FROM constraint_rules WHERE college_id = $1 ORDER BY rule_type, rule_name",
    ['c25be3d2-4b6d-4373-b6de-44a4e2a2508f']
).then(r => {
    console.log(`Total: ${r.rows.length}`);
    r.rows.forEach(x => console.log(
        x.rule_type.padEnd(5),
        '|', (x.rule_name || '').substring(0, 45).padEnd(45),
        '| w:', x.weight,
        '| active:', x.is_active
    ));
    pool.end();
}).catch(e => { console.error(e.message); pool.end(); });

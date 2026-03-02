"""
Supabase → Neon PostgreSQL Migration Script
==============================================
Connects to Supabase, exports all schema + data, and imports into Neon.
"""

import psycopg2
import psycopg2.extras
import json
import sys
import time

# ============================================================================
# CONNECTION STRINGS
# ============================================================================

# Supabase - Session Pooler (ap-northeast-2, port 5432)
SUPABASE_URL = "postgresql://postgres.ciiukyhjjbbxortzfxsj:G1n5zJNy1EcPhLEL@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

NEON_URL = "postgresql://neondb_owner:npg_IA1J8gSseGHT@ep-fragrant-moon-a1mb9u32.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ============================================================================
# HELPERS
# ============================================================================

def get_connection(url: str, label: str):
    print(f"\n🔌 Connecting to {label}...", end=" ")
    try:
        conn = psycopg2.connect(url, connect_timeout=30)
        conn.autocommit = False
        print("✅ Connected")
        return conn
    except Exception as e:
        print(f"❌ Failed: {e}")
        sys.exit(1)


def get_all_tables(conn) -> list[str]:
    cur = conn.cursor()
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    """)
    tables = [row[0] for row in cur.fetchall()]
    cur.close()
    return tables


def get_enum_types(conn) -> list[tuple]:
    """Get all custom ENUM types from Supabase public schema."""
    cur = conn.cursor()
    cur.execute("""
        SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
        ORDER BY t.typname;
    """)
    result = cur.fetchall()
    cur.close()
    return result  # list of (type_name, 'val1,val2,...')


def create_enum_on_neon(conn, type_name: str, labels_csv: str):
    """Create an ENUM type on Neon if it doesn't exist."""
    labels = [f"'{l.strip()}'" for l in labels_csv.split(',')]
    ddl = f"CREATE TYPE {type_name} AS ENUM ({', '.join(labels)});"
    cur = conn.cursor()
    try:
        cur.execute(ddl)
        conn.commit()
    except psycopg2.errors.DuplicateObject:
        conn.rollback()  # already exists, fine
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()


def get_table_schema(conn, table: str) -> str:
    """Get CREATE TABLE statement using information_schema."""
    cur = conn.cursor()

    # Get columns
    cur.execute("""
        SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """, (table,))
    columns = cur.fetchall()

    # Get primary keys
    cur.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = %s
        ORDER BY kcu.ordinal_position;
    """, (table,))
    pks = [row[0] for row in cur.fetchall()]

    cur.close()

    # Build CREATE TABLE
    col_defs = []
    for col in columns:
        col_name, data_type, char_max, is_nullable, col_default, udt_name = col

        # Map types
        if data_type == 'USER-DEFINED':
            pg_type = udt_name  # enum type name
        elif data_type == 'character varying':
            pg_type = f"varchar({char_max})" if char_max else "text"
        elif data_type == 'character':
            pg_type = f"char({char_max})" if char_max else "char"
        elif data_type == 'ARRAY':
            base = udt_name.lstrip('_')
            pg_type = f"{base}[]"
        else:
            pg_type = data_type

        col_def = f'    "{col_name}" {pg_type}'

        if col_default:
            col_def += f" DEFAULT {col_default}"
        if is_nullable == 'NO':
            col_def += " NOT NULL"

        col_defs.append(col_def)

    if pks:
        pk_cols = ', '.join([f'"{pk}"' for pk in pks])
        col_defs.append(f"    PRIMARY KEY ({pk_cols})")

    ddl = f'CREATE TABLE IF NOT EXISTS "{table}" (\n'
    ddl += ',\n'.join(col_defs)
    ddl += '\n);\n'

    return ddl


def get_table_indexes(conn, table: str) -> list[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT indexdef FROM pg_indexes "
        "WHERE schemaname = 'public' AND tablename = %s "
        "AND indexname NOT LIKE '%%_pkey';",
        (table,)
    )
    indexes = [row[0] for row in cur.fetchall()]
    cur.close()
    return indexes


def get_row_count(conn, table: str) -> int:
    cur = conn.cursor()
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{table}";')
        count = cur.fetchone()[0]
    except Exception:
        count = 0
    finally:
        cur.close()
    return count


def get_column_types(conn, table: str) -> dict:
    """Returns {col_name: data_type} for a table."""
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """, (table,))
    rows = cur.fetchall()
    cur.close()
    result = {}
    for col_name, data_type, udt_name in rows:
        if data_type == 'ARRAY':
            result[col_name] = 'array'
        elif data_type in ('json', 'jsonb'):
            result[col_name] = 'jsonb'
        else:
            result[col_name] = data_type
    return result


def _serialize_value(v, col_type: str):
    """Serialize values correctly based on PostgreSQL column type:
    - jsonb  + dict/list → json.dumps string
    - array  + list      → Python list (psycopg2 handles natively)
    - other              → unchanged
    """
    if col_type == 'jsonb' and isinstance(v, (dict, list)):
        return json.dumps(v)
    if col_type == 'array' and isinstance(v, list):
        return v  # pass as Python list → PostgreSQL array
    if isinstance(v, dict):
        return json.dumps(v)  # fallback for unmapped jsonb
    return v


def copy_table_data(src_conn, dst_conn, table: str) -> int:
    """Copy all rows from src table to dst table using batched inserts.
    Uses regular (non-named) cursor for session pooler compatibility.
    """
    # Fetch column type metadata for correct serialization
    col_types = get_column_types(src_conn, table)

    # Regular cursor — no named/server-side cursors (not supported by session pooler)
    src_cur = src_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    dst_cur = dst_conn.cursor()

    src_cur.execute(f'SELECT * FROM "{table}";')
    all_rows = src_cur.fetchall()
    src_cur.close()

    total = 0
    BATCH_SIZE = 500

    for i in range(0, len(all_rows), BATCH_SIZE):
        batch = [dict(row) for row in all_rows[i:i + BATCH_SIZE]]
        _insert_batch(dst_cur, table, batch, col_types)
        dst_conn.commit()
        total += len(batch)
        print(f"    ↳ {total}/{len(all_rows)} rows inserted...", end="\r")

    dst_cur.close()
    return total


def _insert_batch(cur, table: str, rows: list[dict], col_types: dict = None):
    if not rows:
        return
    columns = list(rows[0].keys())
    col_str = ', '.join([f'"{c}"' for c in columns])
    placeholders = ', '.join(['%s'] * len(columns))
    query = f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
    # Serialize values based on column type
    values = [
        tuple(_serialize_value(row[c], (col_types or {}).get(c, '')) for c in columns)
        for row in rows
    ]
    cur.executemany(query, values)


# ============================================================================
# MAIN MIGRATION
# ============================================================================

def main():
    print("=" * 60)
    print("  Supabase → Neon Migration")
    print("=" * 60)

    # Connect to both
    src = get_connection(SUPABASE_URL, "Supabase")
    dst = get_connection(NEON_URL, "Neon")

    # Get tables
    print("\n📋 Fetching tables from Supabase...")
    tables = get_all_tables(src)
    print(f"   Found {len(tables)} tables: {', '.join(tables)}")

    if not tables:
        print("❌ No tables found in public schema!")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # PHASE 1: Create all schemas on Neon
    # -----------------------------------------------------------------------
    print("\n" + "─" * 60)
    print("PHASE 1: Creating table schemas on Neon")
    print("─" * 60)

    dst_cur = dst.cursor()

    # Enable extensions
    for ext in ['uuid-ossp', 'pgcrypto']:
        try:
            dst_cur.execute(f'CREATE EXTENSION IF NOT EXISTS "{ext}";')
            dst.commit()
        except Exception:
            dst.rollback()

    dst_cur.close()

    # -----------------------------------------------------------------------
    # PHASE 0: Export + recreate ENUM types on Neon
    # -----------------------------------------------------------------------
    print("\n" + "─" * 60)
    print("PHASE 0: Migrating custom ENUM types")
    print("─" * 60)

    enum_types = get_enum_types(src)
    print(f"   Found {len(enum_types)} ENUM types")
    for type_name, labels_csv in enum_types:
        print(f"   Creating ENUM: {type_name} ...", end=" ")
        try:
            create_enum_on_neon(dst, type_name, labels_csv)
            print("✅")
        except Exception as e:
            print(f"⚠️  {str(e)[:60]}")

    failed_tables = []
    dst_cur = dst.cursor()  # fresh cursor for Phase 1
    for table in tables:
        print(f"\n  📐 {table}", end=" ... ")
        try:
            ddl = get_table_schema(src, table)
            dst_cur.execute(ddl)
            dst.commit()
            print("✅")
        except Exception as e:
            dst.rollback()
            print(f"⚠️  Skipped ({str(e)[:80]})")
            failed_tables.append(table)

    dst_cur.close()
    print(f"\n  Schema creation done. Skipped: {failed_tables or 'none'}")

    # -----------------------------------------------------------------------
    # PHASE 2: Copy data
    # -----------------------------------------------------------------------
    print("\n" + "─" * 60)
    print("PHASE 2: Copying data")
    print("─" * 60)

    total_rows = 0
    results = []

    for table in tables:
        if table in failed_tables:
            results.append((table, 0, "SKIPPED (schema failed)"))
            continue

        src_count = get_row_count(src, table)
        if src_count == 0:
            results.append((table, 0, "empty"))
            print(f"\n  📭 {table} — empty, skipping")
            continue

        print(f"\n  📦 {table} ({src_count} rows) ...", end=" ")
        try:
            start = time.time()
            inserted = copy_table_data(src, dst, table)
            elapsed = round(time.time() - start, 1)
            total_rows += inserted
            results.append((table, inserted, f"✅ {elapsed}s"))
            print(f"✅  {inserted} rows in {elapsed}s")
        except Exception as e:
            dst.rollback()
            results.append((table, 0, f"❌ {str(e)[:60]}"))
            print(f"❌ Error: {e}")

    # -----------------------------------------------------------------------
    # PHASE 3: Create indexes
    # -----------------------------------------------------------------------
    print("\n" + "─" * 60)
    print("PHASE 3: Creating indexes")
    print("─" * 60)

    dst_cur = dst.cursor()
    for table in tables:
        indexes = get_table_indexes(src, table)
        for idx_sql in indexes:
            try:
                dst_cur.execute(idx_sql)
                dst.commit()
            except Exception:
                dst.rollback()
    dst_cur.close()
    print("  Done.")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"{'Table':<40} {'Rows':>8}  Status")
    print("-" * 60)
    for table, rows, status in results:
        print(f"  {table:<38} {rows:>8}  {status}")
    print("-" * 60)
    print(f"  Total rows migrated: {total_rows}")
    print("=" * 60)

    src.close()
    dst.close()
    print("\n✅ Migration complete!\n")


if __name__ == "__main__":
    main()

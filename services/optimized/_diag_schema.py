from storage.supabase_client import _query

# Check subjects table schema
print("=== subjects columns ===")
cols = _query(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name='subjects' ORDER BY ordinal_position"
)
for c in cols:
    print(" ", c["column_name"], "-", c["data_type"])

print("\n=== batch_subjects columns ===")
cols2 = _query(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name='batch_subjects' ORDER BY ordinal_position"
)
for c in cols2:
    print(" ", c["column_name"], "-", c["data_type"])

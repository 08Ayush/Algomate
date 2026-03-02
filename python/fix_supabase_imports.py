"""
Fix Supabase imports in all TypeScript/TSX files.
Replaces:
  - `import { createClient } from '@supabase/supabase-js'`
  - `const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)`
  - `import { SupabaseClient } from '@supabase/supabase-js'`
  - `import type { RealtimeChannel } from '@supabase/supabase-js'`

With:
  - Neon-compatible imports from @/shared/database or @/lib/neon-supabase-compat
"""

import os
import re
import glob

SRC_DIR = r"f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src"
SKIP_FILES = {
    "neon-supabase-compat.ts",
    "db.ts",
}

# Files that should remain untouched (the central db files)
SKIP_PATHS = {
    os.path.normpath(os.path.join(SRC_DIR, "shared", "database", "client.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "shared", "database", "server.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "shared", "database", "browser.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "shared", "database", "repository.base.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "lib", "supabase", "client.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "lib", "neon-supabase-compat.ts")),
    os.path.normpath(os.path.join(SRC_DIR, "lib", "db.ts")),
}


def fix_file(path: str) -> bool:
    """Process a single file. Returns True if modified."""
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    content = original

    # ── 1. Remove @supabase/supabase-js imports ──────────────────────────────

    # Detects what's imported from @supabase/supabase-js
    has_create_client = bool(re.search(r'\bcreateClient\b', content))
    has_supabase_client_type = bool(re.search(r'\bSupabaseClient\b', content))
    has_realtime = bool(re.search(r'\bRealtimeChannel\b', content))

    # Remove all @supabase/supabase-js import lines
    content = re.sub(
        r'^import\s+.*?from\s+[\'"]@supabase/supabase-js[\'"];\s*\n?',
        '',
        content,
        flags=re.MULTILINE,
    )
    # Also handle @supabase/ssr imports
    content = re.sub(
        r'^import\s+.*?from\s+[\'"]@supabase/ssr[\'"];\s*\n?',
        '',
        content,
        flags=re.MULTILINE,
    )

    # ── 2. Remove createClient() call blocks ────────────────────────────────
    # Matches patterns like:
    #   const supabase = createClient(\n  ...\n);\n or
    #   const supabase = createClient(url, key);\n

    content = re.sub(
        r'const\s+supabase\s*=\s*createClient\s*\([^)]*\);\s*\n?',
        '',
        content,
    )
    content = re.sub(
        r'const\s+supabase\s*=\s*createClient\s*\(\s*\n[^)]*\);\s*\n?',
        '',
        content,
        flags=re.DOTALL,
    )
    # Multi-line variant with process.env
    content = re.sub(
        r'const\s+supabase\s*=\s*createClient\s*\(\s*\n\s*process\.env\.[A-Z_!]+,\s*\n\s*process\.env\.[A-Z_!]+\s*\n?\s*\);\s*\n?',
        '',
        content,
    )

    # ── 3. Insert correct import at the top (after any 'use server' or 'use client') ──

    needs_service_db = has_create_client and 'serviceDb' not in content
    needs_realtime_stub = has_realtime and 'RealtimeChannel' not in content

    import_lines = []
    if needs_service_db:
        import_lines.append("import { serviceDb as supabase } from '@/shared/database';")
    if has_supabase_client_type and 'NeonClient' not in content:
        import_lines.append("import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';")
    if needs_realtime_stub:
        import_lines.append("// RealtimeChannel replaced by Neon (polling-based);\ntype RealtimeChannel = { unsubscribe: () => void };")

    if import_lines:
        # Insert after 'use server'/'use client' directive if present
        directive_match = re.match(r'^(\s*[\'"]use (server|client)[\'"]\s*;\s*\n)', content)
        if directive_match:
            insert_pos = directive_match.end()
            content = content[:insert_pos] + '\n'.join(import_lines) + '\n' + content[insert_pos:]
        else:
            content = '\n'.join(import_lines) + '\n' + content

    # ── 4. Fix remaining NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY refs ──
    # Some files may have inline createClient calls that didn't match above
    content = re.sub(
        r'createClient\s*\(\s*process\.env\.\w+!?,\s*\n?\s*process\.env\.\w+!?\s*\)',
        'supabase',
        content,
    )

    # ── 5. Fix SupabaseTimetableRepository / SupabaseXxxRepository references ─
    # These are imported from modules - leave them as-is since they use `db` internally

    if content == original:
        return False

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return True


def main():
    patterns = [
        os.path.join(SRC_DIR, "**", "*.ts"),
        os.path.join(SRC_DIR, "**", "*.tsx"),
    ]

    all_files = []
    for pattern in patterns:
        all_files.extend(glob.glob(pattern, recursive=True))

    modified = []
    skipped = []
    errors = []

    for path in sorted(all_files):
        norm = os.path.normpath(path)
        fname = os.path.basename(path)

        if norm in SKIP_PATHS or fname in SKIP_FILES:
            continue

        # Only process files that actually import from @supabase
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        if '@supabase' not in content:
            continue

        try:
            changed = fix_file(path)
            rel = os.path.relpath(path, SRC_DIR)
            if changed:
                modified.append(rel)
                print(f"  ✅ Fixed: {rel}")
            else:
                skipped.append(rel)
        except Exception as e:
            errors.append((path, str(e)))
            print(f"  ❌ Error in {path}: {e}")

    print(f"\n{'='*50}")
    print(f"  Modified : {len(modified)} files")
    print(f"  Skipped  : {len(skipped)} files (no changes needed)")
    print(f"  Errors   : {len(errors)} files")
    print(f"{'='*50}")

    if errors:
        for p, e in errors:
            print(f"  ERROR: {p}\n    {e}")


if __name__ == "__main__":
    main()

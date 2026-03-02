"""
Second-pass fix: Remove remaining createClient blocks with options objects.
These have the pattern:
  const supabaseAdmin = createClient(
    url,
    key,
    { auth: { ... } }
  );
And replace all `supabaseAdmin` usages with `supabase`.
"""

import os
import re
import glob

SRC_DIR = r"f:\Timetable scheduler (SIH)\UI update\academic_campass_2025\src"

# Remove ALL flavors of createClient() blocks (with or without options)
CREATE_CLIENT_BLOCK = re.compile(
    r'(//[^\n]*\n)?'                        # optional comment line before
    r'const\s+\w+\s*=\s*createClient\s*\('  # const xyz = createClient(
    r'[\s\S]*?'                              # anything (non-greedy)
    r'\)\s*;?\s*\n',                         # closing );
    re.MULTILINE,
)

# More aggressive: match from `const xyz = createClient(` to the matching closing paren
def remove_create_client_calls(content: str) -> str:
    """Remove all `const xyz = createClient(...)` blocks, handling nested parens."""
    result = []
    i = 0
    while i < len(content):
        # Look for `const <name> = createClient(`
        m = re.search(r'(?://[^\n]*\n)?const\s+\w+\s*=\s*createClient\s*\(', content[i:])
        if not m:
            result.append(content[i:])
            break
        
        # Append text before the match
        result.append(content[i : i + m.start()])
        
        # Find the matching closing paren by counting parens
        start = i + m.end()  # position after the opening (
        depth = 1
        j = start
        while j < len(content) and depth > 0:
            if content[j] == '(':
                depth += 1
            elif content[j] == ')':
                depth -= 1
            j += 1
        
        # Skip optional semicolon and newline(s)
        while j < len(content) and content[j] in (' ', '\t', ';', '\n', '\r'):
            if content[j] in ('\n', '\r'):
                j += 1
                break
            j += 1
        
        i = j  # continue after the removed block
    
    return ''.join(result)


def fix_file(path: str) -> bool:
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original

    # Only touch files that still have createClient
    if 'createClient' not in content:
        return False

    # Remove createClient blocks
    content = remove_create_client_calls(content)

    # Replace supabaseAdmin references with supabase
    if 'supabaseAdmin' in content:
        content = content.replace('supabaseAdmin', 'supabase')

    # Add serviceDb import if needed and not present
    if 'serviceDb' not in content and "from '@/shared/database'" not in content:
        directive_match = re.match(r'^(\s*[\'"]use (server|client)[\'"]\s*;\s*\n)', content)
        insert_line = "import { serviceDb as supabase } from '@/shared/database';\n"
        if directive_match:
            pos = directive_match.end()
            content = content[:pos] + insert_line + content[pos:]
        else:
            content = insert_line + content

    if content == original:
        return False

    with open(path, 'w', encoding='utf-8') as f:
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
    errors = []

    for path in sorted(all_files):
        fname = os.path.basename(path)
        if fname in {'neon-supabase-compat.ts', 'db.ts'}:
            continue

        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        if 'createClient' not in content:
            continue

        try:
            changed = fix_file(path)
            rel = os.path.relpath(path, SRC_DIR)
            if changed:
                modified.append(rel)
                print(f"  ✅ Fixed: {rel}")
        except Exception as e:
            errors.append((path, str(e)))
            print(f"  ❌ Error: {path}: {e}")

    print(f"\n{'='*50}")
    print(f"  Modified : {len(modified)}")
    print(f"  Errors   : {len(errors)}")
    if errors:
        for p, e in errors:
            print(f"    {p}: {e}")


if __name__ == "__main__":
    main()

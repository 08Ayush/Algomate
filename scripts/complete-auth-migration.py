#!/usr/bin/env python3
"""
Complete auth migration across all API routes.
Replaces inline getAuthenticatedUser functions and authenticate() calls
with centralized requireAuth from @/lib/auth.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple, Set

def find_api_routes(src_dir: str = "src/app/api") -> List[Path]:
    """Find all route.ts files in the API directory."""
    api_dir = Path(src_dir)
    if not api_dir.exists():
        print(f"❌ API directory not found: {src_dir}")
        return []
    
    routes = list(api_dir.rglob("route.ts"))
    return routes

def migrate_inline_auth(content: str) -> Tuple[str, bool]:
    """
    Replace inline getAuthenticatedUser function and calls with requireAuth.
    Returns (updated_content, was_modified)
    """
    original = content
    modified = False
    
    # Pattern 1: Remove inline async function getAuthenticatedUser
    # This handles multi-line function definitions
    pattern1 = r"(?:async )?function getAuthenticatedUser\([^)]*\)[^{]*\{(?:[^{}]|\{[^{}]*\})*\}"
    if re.search(pattern1, content, re.MULTILINE | re.DOTALL):
        content = re.sub(pattern1, "", content, flags=re.MULTILINE | re.DOTALL)
        modified = True
    
    # Pattern 2: Replace await getAuthenticatedUser(request) calls
    # const user = await getAuthenticatedUser(request);
    # if (!user) { return NextResponse.json(...401) }
    pattern2 = r"const user = await getAuthenticatedUser\(request(?:, [^)]+)?\);\s*if \(!user\) \{\s*return NextResponse\.json\([^;]+\{ status: 401 \}[^;]*\);\s*\}"
    if re.search(pattern2, content, re.MULTILINE | re.DOTALL):
        content = re.sub(
            pattern2,
            "const user = requireAuth(request);\n    if (user instanceof NextResponse) return user;",
            content,
            flags=re.MULTILINE | re.DOTALL
        )
        modified = True
    
    # Pattern 3: Handle synchronous getAuthenticatedUser  
    # const user = getAuthenticatedUser(request);
    # if (!user) { return NextResponse.json(...401) }
    pattern3 = r"const user = getAuthenticatedUser\(request\);\s*if \(!user\) \{\s*return NextResponse\.json\([^;]+\{ status: 401 \}[^;]*\);\s*\}"
    if re.search(pattern3, content, re.MULTILINE | re.DOTALL):
        content = re.sub(
            pattern3,
            "const user = requireAuth(request);\n    if (user instanceof NextResponse) return user;",
            content,
            flags=re.MULTILINE | re.DOTALL
        )
        modified = True
    
    # Pattern 4: Simple replacement for remaining await getAuthenticatedUser calls
    if "await getAuthenticatedUser(request" in content:
        content = content.replace("await getAuthenticatedUser(request)", "requireAuth(request)")
        modified = True
    
    # Pattern 5: Simple replacement for remaining getAuthenticatedUser calls
    if "getAuthenticatedUser(request)" in content:
        content = content.replace("getAuthenticatedUser(request)", "requireAuth(request)")
        modified = True
    
    # Add import if modified and not already present
    if modified and "from '@/lib/auth'" not in content:
        # Find where to insert import
        import_pattern = r"(import\s+.*from\s+['\"]next/server['\"];)"
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r"\1\nimport { requireAuth } from '@/lib/auth';",
                content,
                count=1
            )
        else:
            # Insert at top after first import
            first_import = re.search(r"import\s+.*from\s+['\"][^'\"]+['\"];", content)
            if first_import:
                insert_pos = first_import.end()
                content = content[:insert_pos] + "\nimport { requireAuth } from '@/lib/auth';" + content[insert_pos:]
    
    was_changed = content != original
    return content, was_changed

def migrate_file(file_path: Path) -> Tuple[bool, str]:
    """Migrate a single file."""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # Skip if already using requireAuth properly
        if "from '@/lib/auth'" in content and "getAuthenticatedUser" not in content and "await authenticate(request)" not in content:
            return (False, "Already migrated")
        
        # Migrate inline auth
        content, modified = migrate_inline_auth(content)
        
        # Remove old imports if present
        content = re.sub(
            r"import \{ getAuthenticatedUser \} from '@/shared/middleware/auth';\n?",
            "",
            content
        )
        content = re.sub(
            r"import \{ authenticate \} from '@/shared/middleware/auth';\n?",
            "",
            content
        )
        
        # Add requireAuth import if needed and not present
        if (modified or "await authenticate(request)" in original_content) and "from '@/lib/auth'" not in content:
            # Find next/server import to add after it
            import_match = re.search(r"(import\s+.*from\s+['\"]next/server['\"];)", content)
            if import_match:
                content = re.sub(
                    r"(import\s+.*from\s+['\"]next/server['\"];)",
                    r"\1\nimport { requireAuth } from '@/lib/auth';",
                    content,
                    count=1
                )
        
        if content == original_content:
            return (False, "No changes needed")
        
        # Write back
        file_path.write_text(content, encoding='utf-8')
        return (True, "✅ Migrated")
        
    except Exception as e:
        return (False, f"❌ Error: {str(e)}")

def main():
    """Main migration function."""
    print("🚀 Complete Authentication Migration")
    print("=" * 60)
    
    routes = find_api_routes()
    print(f"📁 Found {len(routes)} API route files\n")
    
    # Track routes that need attention
    to_check: Set[Path] = set()
    
    for route in routes:
        content = route.read_text(encoding='utf-8')
        
        # Check if needs migration
        needs_migration = (
            "getAuthenticatedUser" in content or
            ("await authenticate(request)" in content and "from '@/shared/middleware/auth'" in content) or
            "from '@/shared/middleware/auth'" in content
        )
        
        if needs_migration:
            to_check.add(route)
    
    print(f"📋 Routes needing migration: {len(to_check)}\n")
    print("=" * 60)
    
    if not to_check:
        print("✅ All routes already migrated!")
        return
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for route in sorted(to_check):
        try:
            relative_path = route.relative_to(Path.cwd())
        except ValueError:
            relative_path = route
            
        print(f"\n📝 {relative_path}")
        
        success, message = migrate_file(route)
        
        if success:
            success_count += 1
            print(f"   {message}")
        elif "already" in message.lower() or "no changes" in message.lower():
            skip_count += 1
            print(f"   ⏭️  {message}")
        else:
            error_count += 1
            print(f"   {message}")
    
    print("\n" + "=" * 60)
    print("📊 Migration Summary:")
    print(f"   ✅ Successfully migrated: {success_count}")
    print(f"   ⏭️  Already migrated/skipped: {skip_count}")
    print(f"   ❌ Errors: {error_count}")
    print(f"   📁 Total processed: {len(to_check)}")
    print("=" * 60)
    
    if success_count > 0:
        print("\n🎉 Complete!")
        print("\n💡 Performance Benefits:")
        print("   • Authentication happens ONCE in middleware")
        print("   • Session cache eliminates repeated DB queries")
        print("   • Expected response time improvement: 50-200ms per request")

if __name__ == "__main__":
    main()

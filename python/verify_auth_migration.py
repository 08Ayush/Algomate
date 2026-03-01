"""
Comprehensive Auth Migration Verification Script
Scans all API route files and verifies authentication implementation
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set

# Define public routes that should NOT have auth
PUBLIC_ROUTES = {
    'health', 'ready', 'test', 'openapi', 'metrics',
    'auth/login', 'auth/register', 'auth/forgot-password', 'auth/reset-password',
    'admin/login',
    'demo-request',
    'college/register', 'college/validate-token', 'college/send-credentials',
}

# Scheduler generate GET is public (health check), POST is protected
SPECIAL_HANDLERS = {
    'scheduler/generate': {'GET': 'public', 'POST': 'protected'}
}

def get_route_path_from_file(file_path: str, base_path: str) -> str:
    """Convert file path to route identifier"""
    rel_path = file_path.replace(base_path, '').replace('\\', '/')
    rel_path = rel_path.replace('src/app/api/', '').replace('/route.ts', '')
    # Remove leading slash
    if rel_path.startswith('/'):
        rel_path = rel_path[1:]
    # Handle dynamic routes like [id]
    rel_path = re.sub(r'\[([^\]]+)\]', r'{\1}', rel_path)
    return rel_path

def analyze_route_file(file_path: str) -> Dict:
    """Analyze a single route file for auth implementation"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for imports
    has_require_auth = 'requireAuth' in content
    has_require_roles = 'requireRoles' in content
    
    # Find all exported handlers
    handler_pattern = r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)'
    handlers = re.findall(handler_pattern, content)
    
    # Check if handlers use auth
    handlers_with_auth = []
    handlers_without_auth = []
    
    for handler in handlers:
        # Find the handler function - look for requireAuth or requireRoles usage
        # Pattern: find the function and check if it calls auth within first part
        handler_func_pattern = rf'export\s+async\s+function\s+{handler}\s*\([^)]*\)[^{{]*\{{((?:[^{{}}]|\{{(?:[^{{}}]|\{{[^{{}}]*\}})*\}})*?)(?:return|const\s+\w+\s*=\s*(?!requireAuth|requireRoles))'
        
        # Simpler approach: check if handler function body contains auth call
        handler_start_pattern = rf'export\s+async\s+function\s+{handler}\s*\([^)]*\)'
        match = re.search(handler_start_pattern, content)
        
        if match:
            # Get next 1000 chars after function declaration
            start_pos = match.end()
            function_start = content[start_pos:start_pos + 1000]
            
            # Look for auth patterns
            has_auth = (
                'const user = requireAuth' in function_start or
                'const user = requireRoles' in function_start or
                'requireAuth(request)' in function_start or
                'requireRoles(request' in function_start or
                'const authResult = requireAuth' in function_start
            )
            
            if has_auth:
                handlers_with_auth.append(handler)
            else:
                handlers_without_auth.append(handler)
        else:
            handlers_without_auth.append(handler)
    
    return {
        'has_require_auth_import': has_require_auth,
        'has_require_roles_import': has_require_roles,
        'handlers': handlers,
        'handlers_with_auth': handlers_with_auth,
        'handlers_without_auth': handlers_without_auth,
        'content_preview': content[:200]
    }

def main():
    base_path = r'c:\Users\HP\Downloads\academic_campass_2025-merger_MDs\academic_campass_2025-merger_MDs'
    api_path = os.path.join(base_path, 'src', 'app', 'api')
    
    # Find all route.ts files
    route_files = []
    for root, dirs, files in os.walk(api_path):
        for file in files:
            if file == 'route.ts':
                route_files.append(os.path.join(root, file))
    
    print(f"📊 AUTH MIGRATION VERIFICATION REPORT")
    print(f"{'='*80}\n")
    print(f"Total route files found: {len(route_files)}\n")
    
    # Analyze each route
    public_routes_verified = []
    protected_routes_verified = []
    missing_auth = []
    
    for file_path in sorted(route_files):
        route_path = get_route_path_from_file(file_path, base_path)
        analysis = analyze_route_file(file_path)
        
        # Check if this is a public route (normalize route_path for comparison)
        normalized_route = route_path.replace('{', '[').replace('}', ']')
        is_public = route_path in PUBLIC_ROUTES
        
        # Handle special cases like scheduler/generate
        if route_path in SPECIAL_HANDLERS:
            special = SPECIAL_HANDLERS[route_path]
            for handler in analysis['handlers']:
                if handler in special:
                    if special[handler] == 'public':
                        public_routes_verified.append(f"{route_path}#{handler}")
                    else:
                        if handler in analysis['handlers_with_auth']:
                            protected_routes_verified.append(f"{route_path}#{handler}")
                        else:
                            missing_auth.append(f"{route_path}#{handler} (SHOULD BE PROTECTED)")
            continue
        
        if is_public:
            # Verify it doesn't have auth (correctly public)
            for handler in analysis['handlers']:
                public_routes_verified.append(f"{route_path}#{handler}")
        else:
            # Should be protected - check each handler
            for handler in analysis['handlers']:
                if handler in analysis['handlers_with_auth']:
                    protected_routes_verified.append(f"{route_path}#{handler}")
                else:
                    # This is a protected route missing auth - BUG!
                    missing_auth.append(f"{route_path}#{handler} ⚠️ MISSING AUTH")
    
    # Print results
    print(f"✅ Public Routes Verified: {len(public_routes_verified)}")
    for route in sorted(public_routes_verified):
        print(f"   - {route}")
    
    print(f"\n✅ Protected Routes Verified: {len(protected_routes_verified)}")
    # Just show count, not full list to keep output manageable
    print(f"   ({len(protected_routes_verified)} routes have proper authentication)\n")
    
    if missing_auth:
        print(f"❌ ROUTES MISSING AUTH: {len(missing_auth)}")
        for route in sorted(missing_auth):
            print(f"   - {route}")
        print()
    else:
        print(f"✅ No routes missing authentication!\n")
    
    # Calculate completion percentage
    total_handlers = len(public_routes_verified) + len(protected_routes_verified) + len(missing_auth)
    auth_complete_handlers = len(public_routes_verified) + len(protected_routes_verified)
    completion = (auth_complete_handlers / total_handlers * 100) if total_handlers > 0 else 0
    
    print(f"{'='*80}")
    print(f"📈 SUMMARY")
    print(f"{'='*80}")
    print(f"Total Route Files Scanned:     {len(route_files)}")
    print(f"Total Handlers Found:          {total_handlers}")
    print(f"Public Routes (No Auth):       {len(public_routes_verified)}")
    print(f"Protected Routes (With Auth):  {len(protected_routes_verified)}")
    print(f"Missing Auth (BUGS):           {len(missing_auth)}")
    print(f"Completion Percentage:         {completion:.1f}%")
    print(f"{'='*80}\n")
    
    if missing_auth:
        print("❌ MIGRATION INCOMPLETE - Fix the missing auth routes above")
        return 1
    else:
        print("✅ MIGRATION COMPLETE - All routes have proper authentication!")
        return 0

if __name__ == '__main__':
    exit(main())

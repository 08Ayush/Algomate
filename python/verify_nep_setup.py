"""
NEP Scheduler Setup Verification Script
========================================
Run this script to verify your environment is properly configured.

Usage:
    python verify_nep_setup.py
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_python_version():
    """Verify Python version is 3.8 or higher."""
    version = sys.version_info
    print(f"✓ Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ ERROR: Python 3.8+ required")
        return False
    return True

def check_ortools():
    """Verify Google OR-Tools is installed."""
    try:
        from ortools.sat.python import cp_model
        print("✓ Google OR-Tools installed")
        return True
    except ImportError:
        print("❌ ERROR: OR-Tools not installed")
        print("   Run: pip install ortools")
        return False

def check_supabase():
    """Verify Supabase client is installed."""
    try:
        from supabase import create_client
        print("✓ Supabase client installed")
        return True
    except ImportError:
        print("❌ ERROR: Supabase client not installed")
        print("   Run: pip install supabase")
        return False

def check_env_variables():
    """Verify required environment variables are set."""
    required_vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"❌ ERROR: Missing environment variables: {', '.join(missing)}")
        print("   Set these in your .env file")
        return False
    else:
        print("✓ Environment variables configured")
        return True

def test_supabase_connection():
    """Test connection to Supabase."""
    try:
        from supabase import create_client
        
        url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not url or not key:
            print("⚠️  Skipping Supabase connection test (env vars not set)")
            return True
        
        client = create_client(url, key)
        
        # Try a simple query
        response = client.table('batches').select('id').limit(1).execute()
        
        print("✓ Supabase connection successful")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Supabase connection failed: {str(e)}")
        return False

def test_scheduler_imports():
    """Test that the NEP scheduler can be imported."""
    try:
        # Add services directory to path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'scheduler'))
        
        from nep_scheduler import NEPScheduler
        print("✓ NEP Scheduler module can be imported")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to import NEP Scheduler: {str(e)}")
        return False

def main():
    """Run all verification checks."""
    print("\n" + "="*60)
    print("NEP 2020 Scheduler - Setup Verification")
    print("="*60 + "\n")
    
    checks = [
        ("Python Version", check_python_version),
        ("OR-Tools Library", check_ortools),
        ("Supabase Client", check_supabase),
        ("Environment Variables", check_env_variables),
        ("Supabase Connection", test_supabase_connection),
        ("Scheduler Module", test_scheduler_imports)
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n🔍 Checking: {name}")
        result = check_func()
        results.append((name, result))
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60 + "\n")
    
    all_passed = all(result for _, result in results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "="*60)
    
    if all_passed:
        print("✅ All checks passed! Your environment is ready.")
        print("\nNext steps:")
        print("1. Configure elective buckets via UI or API")
        print("2. Run the scheduler: python services/scheduler/nep_scheduler.py --batch-id <uuid>")
        print("3. Or use the React component: <NEPSchedulerPage batchId={uuid} />")
        return 0
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

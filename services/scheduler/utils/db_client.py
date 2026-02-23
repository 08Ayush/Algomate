"""
Supabase Database Client

Provides a singleton connection to the Supabase database.
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create a Supabase client instance.
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        ValueError: If environment variables are not set
    """
    global _client
    
    if _client is None:
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError(
                "Missing Supabase credentials. "
                "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
                "in your .env file."
            )
        
        _client = create_client(url, key)
    
    return _client


def reset_client():
    """Reset the client instance (useful for testing)."""
    global _client
    _client = None


def execute_query(query: str, params: dict = None) -> list:
    """
    Execute a raw SQL query (for complex operations).
    
    Args:
        query: SQL query string
        params: Query parameters
        
    Returns:
        List of result rows
    """
    client = get_supabase_client()
    # Use RPC for raw queries if needed
    return client.rpc("execute_sql", {"query": query, "params": params}).execute()

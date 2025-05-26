#!/usr/bin/env python3
"""
FACT Memory FastMCP Server - Main Entry Point

This script provides a convenient way to run the FastMCP server from the root directory.
"""

import sys
from pathlib import Path
import subprocess

def main():
    """Run the FastMCP server with the provided arguments."""
    # Get the directory containing this script
    src_dir = Path(__file__).parent
    server_script = src_dir / "server" / "hello_mcp_server.py"
    
    if not server_script.exists():
        print(f"Error: Server script not found at {server_script}")
        sys.exit(1)
    
    # Pass all command line arguments to the server script
    cmd = [sys.executable, str(server_script)] + sys.argv[1:]
    
    try:
        # Run the server script
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running server: {e}")
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import init_db_and_seed

def main():
    print("[TrustGuard AI] Initializing database and seeding demonstration forensics data...")
    init_db_and_seed()
    print("[TrustGuard AI] Database initialization & seeding completed successfully.")
    print("Default demo credentials:")
    print("  Investigator: investigator@trustguard.ai / Investigator@2026")
    print("  Admin:        admin@trustguard.ai        / Admin@TrustGuard2026")
    print("  Reviewer:     reviewer@trustguard.ai     / Reviewer@2026")
    print("  Demo Guest:   demo@trustguard.ai         / Demo@2026")

if __name__ == "__main__":
    main()

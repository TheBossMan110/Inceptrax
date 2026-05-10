"""
Database Migration Script for Inceptrax V2

Adds new columns to existing tables and creates new tables.
Uses raw SQL ALTER TABLE to safely add columns without dropping data.

Run this script once: python migrate_v2.py
"""
import sqlite3
import os
import sys
import shutil
from datetime import datetime


def get_db_path():
    """Find the database file."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), 'instance', 'inceptrax.db'),
        os.path.join(os.path.dirname(__file__), 'inceptrax.db'),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return possible_paths[0]


def backup_db(db_path):
    """Create a backup before migration."""
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(db_path, backup_path)
        print(f"[Migration] Backup created: {backup_path}")
        return backup_path
    return None


def column_exists(cursor, table, column):
    """Check if a column already exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def table_exists(cursor, table):
    """Check if a table already exists."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def run_migration():
    db_path = get_db_path()
    print(f"[Migration] Database path: {db_path}")

    # Backup first
    backup_db(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # ─── Add new columns to 'ideas' table ────────────────────────────

        ideas_new_columns = [
            ("industry", "VARCHAR(50)"),
            ("target_market", "VARCHAR(200)"),
            ("target_audience", "VARCHAR(200)"),
            ("stage", "VARCHAR(20) DEFAULT 'idea'"),
            ("overall_score", "INTEGER"),
            ("risk_level", "VARCHAR(20)"),
            ("public_views", "INTEGER DEFAULT 0"),
            ("ai_layers_count", "INTEGER DEFAULT 0"),
            ("founder_match_score", "INTEGER"),
            ("updated_at", "DATETIME"),
        ]

        print("[Migration] Updating 'ideas' table...")
        for col_name, col_type in ideas_new_columns:
            if not column_exists(cursor, 'ideas', col_name):
                cursor.execute(f"ALTER TABLE ideas ADD COLUMN {col_name} {col_type}")
                print(f"  + Added column: {col_name}")
            else:
                print(f"  ~ Column exists: {col_name}")

        # ─── Create 'stage_results' table ─────────────────────────────────

        if not table_exists(cursor, 'stage_results'):
            cursor.execute("""
                CREATE TABLE stage_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    idea_id INTEGER NOT NULL,
                    stage_number INTEGER NOT NULL,
                    stage_name VARCHAR(50) NOT NULL,
                    result_json JSON NOT NULL,
                    score INTEGER,
                    version INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (idea_id) REFERENCES ideas(id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_idea_stage ON stage_results(idea_id, stage_name)")
            print("[Migration] Created 'stage_results' table")
        else:
            print("[Migration] 'stage_results' table already exists")

        # ─── Create 'token_blacklist' table ───────────────────────────────

        if not table_exists(cursor, 'token_blacklist'):
            cursor.execute("""
                CREATE TABLE token_blacklist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token VARCHAR(512) UNIQUE NOT NULL,
                    blacklisted_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token ON token_blacklist(token)")
            print("[Migration] Created 'token_blacklist' table")
        else:
            print("[Migration] 'token_blacklist' table already exists")

        # ─── Create 'ai_layers_sessions' table ───────────────────────────

        if not table_exists(cursor, 'ai_layers_sessions'):
            cursor.execute("""
                CREATE TABLE ai_layers_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    idea_id INTEGER NOT NULL,
                    conversation JSON,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (idea_id) REFERENCES ideas(id)
                )
            """)
            print("[Migration] Created 'ai_layers_sessions' table")
        else:
            print("[Migration] 'ai_layers_sessions' table already exists")

        # ─── Create 'checklist_items' table ───────────────────────────────

        if not table_exists(cursor, 'checklist_items'):
            cursor.execute("""
                CREATE TABLE checklist_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    idea_id INTEGER NOT NULL,
                    category VARCHAR(50),
                    text VARCHAR(500) NOT NULL,
                    is_completed BOOLEAN DEFAULT 0,
                    completed_at DATETIME,
                    sort_order INTEGER DEFAULT 0,
                    FOREIGN KEY (idea_id) REFERENCES ideas(id)
                )
            """)
            print("[Migration] Created 'checklist_items' table")
        else:
            print("[Migration] 'checklist_items' table already exists")

        # ─── Create 'research_notes' table ────────────────────────────────

        if not table_exists(cursor, 'research_notes'):
            cursor.execute("""
                CREATE TABLE research_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    idea_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    query VARCHAR(500),
                    result JSON,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (idea_id) REFERENCES ideas(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            print("[Migration] Created 'research_notes' table")
        else:
            print("[Migration] 'research_notes' table already exists")

        # ─── Create 'blocked_users' table ─────────────────────────────────

        if not table_exists(cursor, 'blocked_users'):
            cursor.execute("""
                CREATE TABLE blocked_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    blocker_id INTEGER NOT NULL,
                    blocked_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (blocker_id) REFERENCES users(id),
                    FOREIGN KEY (blocked_id) REFERENCES users(id),
                    UNIQUE (blocker_id, blocked_id)
                )
            """)
            print("[Migration] Created 'blocked_users' table")
        else:
            print("[Migration] 'blocked_users' table already exists")

        # ─── Create 'user_reports' table ──────────────────────────────────

        if not table_exists(cursor, 'user_reports'):
            cursor.execute("""
                CREATE TABLE user_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reporter_id INTEGER NOT NULL,
                    reported_id INTEGER NOT NULL,
                    reason VARCHAR(500) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reporter_id) REFERENCES users(id),
                    FOREIGN KEY (reported_id) REFERENCES users(id)
                )
            """)
            print("[Migration] Created 'user_reports' table")
        else:
            print("[Migration] 'user_reports' table already exists")

        # ─── Commit all changes ───────────────────────────────────────────

        conn.commit()
        print("\n[Migration] [OK] V2 migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n[Migration] [FAIL] Migration failed: {str(e)}")
        print("[Migration] Database has been rolled back. Backup is available.")
        raise

    finally:
        conn.close()


if __name__ == '__main__':
    run_migration()

print("DEBUG: Python script get_db_schema.py is starting execution NOW.")

import sqlite3
import os
import sys

print(f"DEBUG: Python version: {sys.version}")
print(f"DEBUG: Current working directory: {os.getcwd()}") 
print(f"DEBUG: Script absolute path (__file__): {os.path.abspath(__file__)}")

# --- Configuration ---
# Explicitly set the database path based on your confirmed location
DATABASE_PATH = r'C:\Users\mkibb\Documents\trendpulse\src\backend\trendpulse.db'
print(f"DEBUG: Hardcoded DATABASE_PATH = {DATABASE_PATH}")
# --- End Configuration ---

def print_table_info(cursor, table_name):
    print(f"DEBUG: Entered print_table_info for {table_name}.")
    print(f"\n--- Schema for '{table_name}' ---")
    print("cid | name | type | notnull | dflt_value | pk")
    print("----|------|------|---------|------------|---")
    try:
        cursor.execute(f"PRAGMA table_info({table_name});")
        rows = cursor.fetchall()
        if not rows:
            print(f"Table '{table_name}' not found or has no columns.")
        for row_idx, row_data in enumerate(rows):
            printable_row = " | ".join(map(str, row_data))
            print(f"Row {row_idx}: {printable_row}")
    except sqlite3.OperationalError as e:
        print(f"Error getting table_info for {table_name}: {e}")
    print("-" * 40)

def print_alembic_version(cursor):
    print("DEBUG: Entered print_alembic_version.")
    print("\n--- Alembic Version ---")
    try:
        cursor.execute("SELECT version_num FROM alembic_version;")
        row = cursor.fetchone()
        if row:
            print(f"Current version_num: {row[0]}")
        else:
            print("No version found in alembic_version table (Table might be empty or not exist).")
    except sqlite3.OperationalError as e:
        print(f"Error querying alembic_version: {e} (The table 'alembic_version' might not exist).")
    print("-" * 40)

def main():
    print("DEBUG: main() function entered.")
    print(f"Attempting to connect to database using explicit path: {DATABASE_PATH}")
    
    if not os.path.exists(DATABASE_PATH):
        print(f"CRITICAL ERROR: Database file not found at '{DATABASE_PATH}'.")
        print("Please double-check this path is exactly where your trendpulse.db file is located.")
        return

    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        print("Successfully connected to the database.")

        print_alembic_version(cursor)
        print_table_info(cursor, 'topic_streams')
        print_table_info(cursor, 'summaries')
        print_table_info(cursor, 'users')

    except sqlite3.Error as e:
        print(f"SQLite error during database operations: {e}")
    except Exception as e_generic:
        print(f"A general Python error occurred: {e_generic}")
    finally:
        if conn:
            conn.close()
            print("\nDatabase connection closed.")
        else:
            print("\nNo database connection was established (or connection failed before assignment).")

if __name__ == "__main__":
    print("DEBUG: Script's __main__ block is being executed.")
    main()
    print("DEBUG: Script execution finished.")
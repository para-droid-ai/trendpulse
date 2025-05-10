import os
from database import engine
from models import Base

def main():
    print("Resetting database...")
    
    # Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Recreate all tables
    print("Recreating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database reset complete.")

if __name__ == "__main__":
    # Confirm before proceeding
    confirm = input("This will delete ALL data in the database. Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        main()
    else:
        print("Operation cancelled.") 
from database import SessionLocal
from models import User
from passlib.context import CryptContext

# Create password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user(email="test@example.com", password="password123"):
    """Create a test user with known credentials"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists (ID: {existing_user.id})")
            return
        
        # Hash the password
        hashed_password = pwd_context.hash(password)
        
        # Create new user
        new_user = User(email=email, hashed_password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"Created test user: {email} with ID: {new_user.id}")
        print(f"Use these credentials to log in: Email: {email}, Password: {password}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
    # Create an additional user if needed
    create_test_user(email="user@test.com", password="test1234") 
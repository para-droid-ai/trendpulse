# Script to update estimated_content_tokens for existing summaries

import os
import sys

# Add the backend directory to the system path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from database import SessionLocal
from models import Summary
from utils.tokenizer_utils import count_tokens

def update_existing_summary_tokens():
    db = SessionLocal()
    try:
        # Fetch all summaries that have estimated_content_tokens as NULL or 0
        # Or simply fetch all and re-calculate for safety/consistency
        summaries_to_update = db.query(Summary).all()
        
        print(f"Found {len(summaries_to_update)} summaries to process.")
        
        for summary in summaries_to_update:
            # Only update if the estimated_content_tokens is None or 0
            # This prevents overwriting correctly calculated values from new summaries
            if summary.estimated_content_tokens is None or summary.estimated_content_tokens == 0:
                if summary.content:
                    token_count = count_tokens(summary.content)
                    summary.estimated_content_tokens = token_count
                    print(f"Updating Summary ID {summary.id}: Content length {len(summary.content)}, Estimated tokens {token_count}")
                else:
                    summary.estimated_content_tokens = 0
                    print(f"Summary ID {summary.id} has no content, setting estimated tokens to 0.")
                # No commit yet, batch commits later
                
        # Commit all changes in one transaction
        db.commit()
        print("Database commit successful.")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
        # Log the full traceback for better debugging
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting script to update summary tokens...")
    update_existing_summary_tokens()
    print("Script finished.") 
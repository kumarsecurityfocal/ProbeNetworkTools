"""
Initialize the ProbeOps database with the required users and tiers.
This script is intended to be run directly to set up a fresh database.
"""

import asyncio
import logging
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app modules
from app.database import Base, engine, get_db
from app.initialize_db import initialize_database
from app.auth import initialize_default_users
from app.initialize_tiers import initialize_subscription_tiers

async def init_db():
    """Initialize the database with required data."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Get a DB session
    db = next(get_db())
    
    try:
        # Initialize subscription tiers
        logger.info("Initializing subscription tiers...")
        tiers_result = initialize_subscription_tiers(db)
        logger.info(f"Subscription tiers initialization: {tiers_result}")
        
        # Initialize default users
        logger.info("Initializing default users...")
        users_result = initialize_default_users(db)
        logger.info(f"Default users initialization: {users_result}")
        
        logger.info("Database initialization completed successfully!")
    except Exception as e:
        logger.error(f"Error during database initialization: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(init_db())
    print("\nDatabase initialization script completed.")
    print("You can now start the application with the initialized database.")
    print("The following users are available:")
    print("  - Admin: admin@probeops.com (password: probeopS1@)")
    print("  - Test User: test@probeops.com (password: probeopS1@)")
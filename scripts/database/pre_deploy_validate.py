#!/usr/bin/env python3
"""
ProbeOps Pre-Deployment Database Validation
==========================================

This script verifies that the database schema is ready for deployment:
1. Checks that all migrations are present and in correct order
2. Tests that database connection works
3. Verifies the current database state matches expected schema
4. Creates a validation report

Run before deployment to avoid database-related failures.

Usage:
    python pre_deploy_validate.py [--fix] [--env ENV_FILE]

Options:
    --fix    Attempt to fix issues when possible
    --env    Specify a .env file to load (default: .env.db)
"""

import os
import sys
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path so we can import migration_manager
sys.path.append(str(Path(__file__).parent))
from migration_manager import MigrationManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('pre_deploy_validate')

class DeploymentValidator:
    """Validates database readiness before deployment."""
    
    def __init__(self, env_file='.env.db'):
        """Initialize the deployment validator."""
        self.migration_manager = MigrationManager(env_file=env_file)
        self.issues = []
        self.validation_passed = True
        
    def validate_database_connection(self) -> bool:
        """
        Test database connection.
        
        Returns:
            Boolean indicating if the connection was successful
        """
        try:
            import sqlalchemy as sa
            with self.migration_manager.engine.connect() as conn:
                conn.execute(sa.text("SELECT 1"))
            logger.info("Database connection successful")
            return True
        except Exception as e:
            self.issues.append(f"Database connection failed: {str(e)}")
            self.validation_passed = False
            logger.error(f"Database connection failed: {str(e)}")
            return False
            
    def validate_migrations(self) -> bool:
        """
        Validate that all migrations are present and in correct order.
        
        Returns:
            Boolean indicating if the validation passed
        """
        # First, explicitly check for a base migration
        base_migrations = []
        for script in self.migration_manager.script_directory.get_revisions("head"):
            if script.down_revision is None:
                base_migrations.append(script.revision)
        
        if not base_migrations:
            self.issues.append("Missing base migration (one with down_revision=None)")
            self.validation_passed = False
            logger.error("Migration issue: Missing base migration (one with down_revision=None)")
            logger.error("Create a base migration file with down_revision=None that creates all initial tables")
            return False
            
        if len(base_migrations) > 1:
            self.issues.append(f"Multiple base migrations found: {', '.join(base_migrations)}")
            self.validation_passed = False
            logger.error(f"Migration issue: Multiple base migrations found: {', '.join(base_migrations)}")
            return False
        
        logger.info(f"Found base migration: {base_migrations[0]}")
        
        # Continue with the regular validation
        success, issues = self.migration_manager.check_migrations()
        if not success:
            self.issues.extend(issues)
            self.validation_passed = False
            for issue in issues:
                logger.error(f"Migration issue: {issue}")
        else:
            logger.info("Migration validation passed")
        return success
    
    def validate_database_state(self) -> bool:
        """
        Validate the current database state against the expected schema.
        
        Returns:
            Boolean indicating if the validation passed
        """
        current_revision = self.migration_manager.get_current_revision()
        if current_revision is None:
            self.issues.append("Database has no revision information")
            self.validation_passed = False
            logger.error("Database has no revision information")
            return False
        
        # Get the expected head revision
        head_revision = self.migration_manager.script_directory.get_current_head()
        
        if current_revision != head_revision:
            self.issues.append(
                f"Database revision ({current_revision}) doesn't match "
                f"expected head revision ({head_revision})"
            )
            self.validation_passed = False
            logger.error(
                f"Database revision ({current_revision}) doesn't match "
                f"expected head revision ({head_revision})"
            )
            return False
        
        logger.info(f"Database state validation passed (revision: {current_revision})")
        return True
    
    def create_validation_report(self) -> dict:
        """
        Create a validation report.
        
        Returns:
            Dictionary containing the validation report
        """
        return {
            "timestamp": datetime.now().isoformat(),
            "status": "PASSED" if self.validation_passed else "FAILED",
            "current_revision": self.migration_manager.get_current_revision(),
            "issues": self.issues,
        }
    
    def save_validation_report(self, report: dict, filename: str = "validation_report.json"):
        """
        Save the validation report to a file.
        
        Args:
            report: The validation report
            filename: The filename to save the report to
        """
        report_dir = Path(__file__).parent / "reports"
        report_dir.mkdir(exist_ok=True)
        
        with open(report_dir / filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Validation report saved to {report_dir / filename}")
    
    def attempt_fixes(self) -> bool:
        """
        Attempt to fix validation issues.
        
        Returns:
            Boolean indicating if the fixes were successful
        """
        fixes_applied = False
        
        # Check and potentially create base migration
        if "Missing base migration" in " ".join(self.issues):
            logger.info("Attempting to fix missing base migration")
            if self.migration_manager.ensure_base_migration_exists():
                logger.info("Base migration created")
                fixes_applied = True
            else:
                logger.error("Failed to create base migration")
        
        # Apply pending migrations
        if "Database revision" in " ".join(self.issues):
            logger.info("Attempting to apply pending migrations")
            if self.migration_manager.apply_migrations():
                logger.info("Migrations applied")
                fixes_applied = True
            else:
                logger.error("Failed to apply migrations")
        
        return fixes_applied
    
    def run_full_validation(self, fix_issues: bool = False):
        """
        Run a full validation sequence.
        
        Args:
            fix_issues: Whether to attempt to fix issues
        """
        logger.info("Starting pre-deployment database validation")
        
        # Run validations
        connection_ok = self.validate_database_connection()
        if not connection_ok:
            logger.error("Cannot continue validation without database connection")
            report = self.create_validation_report()
            self.save_validation_report(report)
            return
        
        self.validate_migrations()
        self.validate_database_state()
        
        # Create and save report
        report = self.create_validation_report()
        self.save_validation_report(report)
        
        # Attempt fixes if requested
        if fix_issues and not self.validation_passed:
            logger.info("Attempting to fix validation issues")
            fixes_applied = self.attempt_fixes()
            
            if fixes_applied:
                # Re-run validation
                logger.info("Re-running validation after fixes")
                self.issues = []
                self.validation_passed = True
                self.validate_migrations()
                self.validate_database_state()
                
                # Update report
                report = self.create_validation_report()
                self.save_validation_report(report, "validation_report_after_fixes.json")
        
        # Print results
        if self.validation_passed:
            logger.info("✅ Pre-deployment validation PASSED")
        else:
            logger.error("❌ Pre-deployment validation FAILED")
            for issue in self.issues:
                logger.error(f"- {issue}")

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="ProbeOps Pre-Deployment Database Validation"
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Attempt to fix issues when possible"
    )
    parser.add_argument(
        "--env",
        default=".env.db",
        help="Specify a .env file to load (default: .env.db)"
    )
    return parser.parse_args()

def main():
    """Main entry point."""
    args = parse_args()
    validator = DeploymentValidator(env_file=args.env)
    validator.run_full_validation(fix_issues=args.fix)

if __name__ == "__main__":
    main()
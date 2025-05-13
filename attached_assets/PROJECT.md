# ProbeOps: Comprehensive Implementation Guide

## Project Overview

ProbeOps is a distributed network diagnostic platform with user management, authentication, subscription tiers, and a modern React frontend. This document provides detailed instructions to rebuild the application from scratch.

## Project Structure

```
/
├── backend/             # FastAPI backend
│   ├── auth.py          # Authentication logic
│   ├── config.py        # Configuration settings
│   ├── database.py      # Database connection
│   ├── diagnostics.py   # Network diagnostic tools
│   ├── email_service.py # Email functionality
│   ├── initialize_tiers.py # DB initialization
│   ├── main.py          # Main application entry
│   ├── metrics.py       # System metrics collection
│   ├── migrate_subscription_tiers.py # DB migrations
│   ├── models.py        # SQLAlchemy models
│   ├── probe_scheduler.py # Background probe execution
│   ├── schemas.py       # Pydantic schemas
│   └── subscription_utils.py # Subscription helpers
├── frontend/            # React frontend
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # React components
│       │   ├── AdminPanel.js
│       │   ├── ApiUsageDisplay.js
│       │   ├── BasicApiDocs.js
│       │   ├── Dashboard.js
│       │   ├── Navbar.js
│       │   ├── Profile.js
│       │   ├── ScheduledProbes.js
│       │   └── SubscriptionTier.js
│       ├── context/     # React context providers
│       │   └── AuthContext.js
│       ├── pages/       # Page components
│       ├── services/    # API services
│       │   ├── api.js
│       │   ├── auth.service.js
│       │   └── subscription.service.js
│       ├── App.js       # Main React component
│       └── index.js     # React entry point
├── static/              # Static files for API docs
│   ├── api_docs.html
│   └── api_docs_embed.js
└── [configuration files]
```

## Step 1: Setup Project and Dependencies

### Backend Setup

1. Create a PostgreSQL database via Replit's database tool.

2. Create backend folder and install dependencies:
```bash
mkdir -p backend
cd backend
pip install fastapi uvicorn sqlalchemy pydantic passlib python-jose python-multipart bcrypt psycopg2-binary pydantic-settings requests
```

3. Configure the `.replit` file:
```
[env]
DATABASE_URL = "postgresql://postgres:postgres@localhost/netdiag"
JWT_SECRET_KEY = "your-secret-key-here" # Update this for production
BREVO_API_KEY = "your-brevo-api-key" # For email functionality
```

### Frontend Setup

1. Create and setup React frontend:
```bash
npx create-react-app frontend
cd frontend
```

2. Install frontend dependencies:
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers date-fns recharts axios react-router-dom jwt-decode react-markdown react-syntax-highlighter react-intersection-observer framer-motion react-awesome-reveal
```

3. Configure workflow for the backend and frontend:
```
# Backend Server
cd backend && python main.py

# Frontend Server
cd frontend && WATCHPACK_POLLING=true BROWSER=none PORT=5000 HOST=0.0.0.0 npm start
```

## Step 2: Backend Implementation

### 1. Database Configuration (`database.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2. Configuration Settings (`config.py`)

```python
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/netdiag")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: list = ["http://localhost:5000", "http://0.0.0.0:5000", "http://localhost:3000", "http://0.0.0.0:3000", "*"]
    
    # Rate limiting configurations
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Tier-specific rate limits
    FREE_TIER_RATE_LIMIT_MINUTE: int = 10
    FREE_TIER_RATE_LIMIT_HOUR: int = 100
    STANDARD_TIER_RATE_LIMIT_MINUTE: int = 30
    STANDARD_TIER_RATE_LIMIT_HOUR: int = 500
    ENTERPRISE_TIER_RATE_LIMIT_HOUR: int = 2000
    
    # Probe execution settings
    MAX_CONCURRENT_PROBES: int = 20
    STAGGER_INTERVAL_MS: int = 500
    
    # System metrics
    COLLECT_SYSTEM_METRICS: bool = True
    METRICS_RETENTION_DAYS: int = 30
    
    # Email service (Brevo API Key)
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    
    # Default email sender
    DEFAULT_EMAIL_SENDER: str = "no-reply@probeops.com"
    DEFAULT_EMAIL_SENDER_NAME: str = "ProbeOps Support"
    
    # Default base URL for email links
    DEFAULT_BASE_URL: str = os.getenv("DEFAULT_BASE_URL", "https://probeops.com")

settings = Settings()
```

### 3. Data Models (`models.py`)

Create models for users, subscription tiers, scheduled probes, probe results, and metrics. Include fields for:

- **User**: username, email, hashed_password, role, email_verified, API token
- **SubscriptionTier**: tier name, features, limitations
- **UserSubscription**: user-tier relationship with expiration
- **DiagnosticResult**: diagnostic history
- **ScheduledProbe**: scheduled probes with intervals
- **ProbeResult**: results from scheduled probes
- **SystemMetric**: system metrics tracking
- **ApiUsageLog**: API usage tracking

### 4. Pydantic Schemas (`schemas.py`)

Create schemas for all API requests and responses, including:

- User registration, login, and profile
- Diagnostic requests and responses
- Scheduled probe creation and management
- Subscription tier information
- API token management
- System metrics

### 5. Authentication (`auth.py`)

Implement:
- Password hashing with bcrypt
- JWT token generation and validation
- Role-based access control decorators
- API token authentication
- Rate limiting middleware

### 6. Diagnostic Tools (`diagnostics.py`)

Implement functions for:
- Input sanitization to prevent command injection
- Ping simulations using curl
- Traceroute using HTTP requests
- DNS lookup using Python socket
- WHOIS lookup
- Port checking
- HTTP endpoint testing

### 7. Email Service (`email_service.py`)

Implement email functionality using Brevo API:
- Email verification
- Password reset
- Account unlock notifications
- Scheduled probe alerts

### 8. Probe Scheduler (`probe_scheduler.py`)

Implement background scheduling:
- Thread-based execution of scheduled probes
- Staggered execution to prevent system overload
- Result storage and notification

### 9. System Metrics (`metrics.py`)

Implement metrics collection:
- CPU, memory, and disk usage tracking
- Probe execution times
- Rate limit tracking
- API usage statistics

### 10. Main Application (`main.py`)

Implement FastAPI application with:
- CORS configuration
- Authentication routes
- User management routes
- Diagnostic routes
- Scheduled probe routes
- Admin routes for system management
- Subscription management
- API token management
- Database migration on startup
- Rate limiting middleware

## Step 3: Frontend Implementation

### 1. API Service (`services/api.js`)

Create API service with axios:
- Base configuration with auth token interceptors
- Endpoints for all API functionalities
- Error handling and response processing

### 2. Authentication Context (`context/AuthContext.js`)

Implement context provider for:
- Login functionality
- Token storage and validation
- User state management
- Role-based access control

### 3. Core Components

Implement key components:

#### Navbar (`components/Navbar.js`)
- Navigation links based on user role
- User menu with profile and logout
- ProbeOps branding

#### Dashboard (`components/Dashboard.js`)
- Summary statistics cards
- Recent diagnostics visualization
- API usage statistics
- Subscription information

#### Diagnostics Page
- Form for running diagnostics
- Target input and command selection
- Results display with formatting
- History with search/filtering

#### Scheduled Probes (`components/ScheduledProbes.js`)
- List of configured probes
- Creation form with scheduling options
- Result history for each probe
- Status indicators and controls

#### Profile (`components/Profile.js`)
- Tabbed interface for profile sections
- User details editing
- Password changing
- API token management
- Subscription information

#### Admin Panel (`components/AdminPanel.js`)
- User management table
- System metrics visualization
- Rate limit configuration
- Subscription management

#### API Documentation (`components/BasicApiDocs.js`)
- Interactive documentation
- Example requests and responses
- Authentication information
- Command syntax and parameters

#### Subscription Tier Comparison (`components/SubscriptionTier.js`)
- Visual comparison of tiers
- Feature availability indicators
- Upgrade options

### 4. Routing and App Structure (`App.js`)

Implement routing with protected routes:
- Public routes for login, register, etc.
- Protected routes requiring authentication
- Role-protected routes for admin features
- Main application layout with navbar

## Step 4: Database Initialization and Migration

### 1. Initial Tiers Setup (`initialize_tiers.py`)

Create script to initialize subscription tiers:
- Free tier with basic limits
- Standard tier with increased limits
- Enterprise tier with maximum capabilities

### 2. Database Migration (`migrate_subscription_tiers.py`)

Create migration script to:
- Add new columns to existing tables
- Update existing data with default values
- Ensure backward compatibility

## Step 5: Deployment Configuration

### 1. Configure Workflows

```
# Backend Server
cd backend && pip install fastapi uvicorn sqlalchemy pydantic passlib python-jose python-multipart bcrypt psycopg2-binary pydantic-settings && python main.py

# Frontend Server
cd frontend && WATCHPACK_POLLING=true BROWSER=none PORT=5000 HOST=0.0.0.0 npm start
```

### 2. Environment Variables

Ensure all required environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `BREVO_API_KEY`: API key for email services
- `DEFAULT_BASE_URL`: Base URL for email links

## Step 6: API Security and Documentation

### 1. Create API Documentation

Create documentation in `static/api_docs.html` with:
- Authentication details
- Endpoint descriptions
- Example requests
- Parameter requirements
- Response formats

### 2. Add Security Measures

- Input sanitization for all API parameters
- Rate limiting based on user tier
- Token validation and expiration
- Role-based endpoint protection

## Implementation Note

The application strictly uses Python-based implementations for network diagnostic tools rather than shell commands for better reliability in Replit's environment. This means:

1. Network diagnostics are performed using built-in Python libraries
2. HTTP requests use Python's requests library
3. DNS lookups use socket and dnspython
4. All commands are executed securely to prevent injection

## Test Credentials

The system is seeded with these test accounts:

1. Super Admin:
   - Email: test@example.com
   - Password: admin123

2. Regular Admin:
   - Email: kumar@securityfocal.com
   - Password: admin123

## Critical Implementation Details

1. **JWT Authentication**: Uses JWT tokens stored in localStorage with automatic expiration
2. **Email Verification**: Uses 6-digit codes instead of links for better testability
3. **API Rate Limiting**: Per-minute and per-hour limits based on subscription tier
4. **Probe Scheduling**: Background thread for execution with staggered timing
5. **Email Service**: Uses Brevo API (formerly Sendinblue) for all email communications
6. **API Documentation**: Served as static HTML with interactive examples
7. **Input Sanitization**: Strict validation to prevent command injection in diagnostics
8. **Tier-specific Features**: Features and limits enforced based on user subscription

## User Interface

### Pages and Components

#### 1. Authentication Pages

**Login Page:**
- Username/password authentication
- "Forgot Password" option
- Verification code entry field
- Links to register page

**Registration Page:**
- User detail form (username, email, password)
- Email verification process

**Email Verification Page:**
- Code entry for verifying email addresses
- Resend verification option

**Password Reset Page:**
- Email entry for forgotten passwords
- Code-based verification
- New password setup

**Account Unlock Page:**
- Unlock mechanism after failed login attempts
- Code-based verification

#### 2. Main Application

**Navigation Bar:**
- Access to all main application areas
- User profile menu
- Logout option
- Branding with ProbeOps logo

**Dashboard (Landing Page after Login):**
- Quick stats overview (diagnostics run, success rates)
- Recent diagnostic history
- Interactive visualizations of diagnostic results
- API usage statistics (daily and monthly limits)
- Subscription tier information

**Diagnostics Page:**
- Interactive form to run diagnostics
- Target input (URL/IP)
- Diagnostic type selection:
  - Ping
  - Traceroute
  - DNS Lookup
  - WHOIS Lookup
  - Port Check
  - HTTP(S) Requests
- Results display with formatted output
- History of past diagnostics with search/filter

**Scheduled Probes Page:**
- List of configured probes
- Create/edit/delete functionality
- Scheduling options:
  - Interval settings (minutes/hours/days)
  - Start/end dates
  - Custom expiration settings (1-3 months)
- Probe status indicators
- Results history for each probe

**Profile Page (Tabbed Interface):**
- **Profile Tab**: User information and editable fields
- **Security Tab**: Password change functionality
- **API Tokens Tab**: 
  - Token management 
  - Generation of new tokens
  - Token activation/deactivation
  - Masked token display with reveal option
- **Subscription Tab**: Current plan details
- **API Usage Tab**: Usage statistics and limits

**Admin Panel (For Admin/Super Admin Only):**
- **Users Tab**: List of all users with management options
- **System Metrics Tab**: Performance metrics and statistics
- **Rate Limits Tab**: Configure system-wide rate limits (Super Admin only)

**API Documentation Page:**
- Interactive documentation for using the API
- Authentication details
- Endpoint descriptions
- Example requests/responses
- Command syntax and parameters

**Subscription Tier Comparison Page:**
- Side-by-side comparison of different tiers
- Feature list with availability indicators
- Pricing information

## Future Enhancements

1. **AWS Deployment Architecture**:
   - Three-tier architecture with frontend, backend, and distributed probe nodes
   - Regional probe distribution across multiple AWS regions
   - Use of ECS/EKS, CloudFront, Route 53, ALB, API Gateway, RDS Aurora
   - SQS, SNS, Lambda, CloudWatch integration
   - Security with AWS WAF, VPC isolation, Shield, IAM roles, and KMS

2. **Enhanced Rate Limiting**:
   - Per-endpoint rate limiting
   - More granular control for API access

3. **Probe Result Pagination**:
   - Efficient retrieval of large result sets
   - Advanced filtering and sorting

4. **Enhanced User Role Management**:
   - More granular permissions
   - Team-based access control
   - Custom role creation

This comprehensive guide should allow for rebuilding the entire ProbeOps platform from scratch, maintaining all functionality and security measures.
# ProbeOps: Comprehensive User Interface Guide

This document provides a detailed breakdown of every page in the ProbeOps platform, including all available features and functionality for different user roles.

## Table of Contents

1. [Authentication Pages](#authentication-pages)
   - [Login Page](#login-page)
   - [Registration Page](#registration-page)
   - [Email Verification Page](#email-verification-page)
   - [Password Reset Page](#password-reset-page)
   - [Account Unlock Page](#account-unlock-page)
2. [Public Pages](#public-pages)
   - [Landing Page](#landing-page)
   - [Subscription Tiers Page](#subscription-tiers-page)
   - [API Documentation Page](#api-documentation-page)
3. [User Dashboard](#user-dashboard)
4. [Diagnostics Page](#diagnostics-page)
5. [Scheduled Probes Page](#scheduled-probes-page)
6. [User Profile](#user-profile)
   - [Profile Tab](#profile-tab)
   - [Security Tab](#security-tab)
   - [API Tokens Tab](#api-tokens-tab)
   - [Subscription Tab](#subscription-tab)
   - [API Usage Tab](#api-usage-tab)
7. [Admin Panel](#admin-panel)
   - [Users Management Tab](#users-management-tab)
   - [System Metrics Tab](#system-metrics-tab)
   - [Rate Limits Tab](#rate-limits-tab)

---

## Authentication Pages

### Login Page

**URL Path**: `/login`

**Description**: The entry point for authenticated users to access the application.

**UI Elements**:
- Username/Email field: Accepts either username or email for authentication
- Password field: Password input with masked characters
- "Remember me" checkbox: Keeps the user logged in across sessions
- Login button: Submits authentication credentials
- "Forgot password?" link: Navigates to password reset page
- "Need an account? Register" link: Redirects to registration page

**Additional Features**:
- Verification code input field: Appears when an account requires email verification
- Error messages: Display for incorrect credentials or locked accounts
- Account locked notification: Appears after 5 failed login attempts with link to unlock
- Branding: ProbeOps logo and tagline

**Validation**:
- Form validation for empty fields
- Automatic account locking after 5 failed attempts
- Verification of email verification status

**Behavior for Different Roles**:
- All roles use the same login page
- Redirects to Dashboard upon successful login
- Super Admin test accounts bypass email verification

---

### Registration Page

**URL Path**: `/register`

**Description**: Allows new users to create an account.

**UI Elements**:
- Username field: For creating a unique username
- Email field: For user's email address
- Password field: For creating a secure password
- Confirm Password field: To verify password entry
- Register button: Creates the account
- "Already have an account? Login" link: Returns to login page

**Additional Features**:
- Password strength indicator: Visual feedback on password security
- Email domain validation: Checks for valid email format
- Terms and conditions checkbox: Must be accepted to register
- Notification about email verification: Informs user they'll need to verify email

**Validation**:
- Username uniqueness check
- Email format and uniqueness validation
- Password complexity requirements (8+ characters, special characters, numbers)
- Matching password confirmation

**Post-Registration**:
- Success message with instructions to check email
- Automatic email sending with verification code
- Redirection to email verification page

---

### Email Verification Page

**URL Path**: `/verify-email`

**Description**: Allows users to verify their email address using a 6-digit code.

**UI Elements**:
- 6-digit code input field: For entering the verification code
- Verify button: Submits the verification code
- Resend code link: Requests a new verification code
- "Return to login" link: Navigates back to login

**Additional Features**:
- Countdown timer for code expiration (10 minutes)
- Visual feedback on code entry (valid/invalid format)
- Success message upon verification

**Validation**:
- Code format validation (6 digits)
- Code expiration validation
- Code correctness validation

**Post-Verification**:
- Success message with confirmation
- Automatic redirection to login page
- Account status updated to verified

---

### Password Reset Page

**URL Path**: `/reset-password` (request) and `/new-password` (set new password)

**Description**: Two-step process allowing users to reset forgotten passwords.

**Step 1 - Request Reset (UI Elements)**:
- Email field: User enters their account email
- Submit button: Requests password reset code
- "Return to login" link: Navigates back to login

**Step 2 - Reset Password (UI Elements)**:
- 6-digit code input field: For the reset code received by email
- New password field: For entering new password
- Confirm new password field: To verify new password entry
- Reset Password button: Completes the password reset
- "Return to login" link: Navigates back to login

**Additional Features**:
- Password strength indicator
- Countdown timer for code expiration (10 minutes)
- Visual confirmation when password is successfully reset

**Validation**:
- Email existence check in Step 1
- Code format and expiration validation in Step 2
- New password complexity requirements
- Matching password confirmation

**Post-Reset**:
- Success message with confirmation
- Automatic redirection to login page
- Email notification of successful password change

---

### Account Unlock Page

**URL Path**: `/unlock-account`

**Description**: Allows users to unlock their account after it has been locked due to multiple failed login attempts.

**UI Elements**:
- Email field: User enters their account email
- Request Unlock button: Sends unlock code to email
- 6-digit code input field: Appears after code is requested
- Unlock Account button: Submits the unlock code
- "Return to login" link: Navigates back to login

**Additional Features**:
- Countdown timer for code expiration (10 minutes)
- Visual feedback on code entry
- Success message upon account unlock

**Validation**:
- Email existence and locked status check
- Code format and expiration validation
- Code correctness validation

**Post-Unlock**:
- Success message with confirmation
- Reset of failed login attempts counter
- Automatic redirection to login page
- Email notification of successful account unlock

---

## Public Pages

### Landing Page

**URL Path**: `/`

**Description**: The public-facing homepage of ProbeOps, showcasing its features and benefits.

**UI Elements**:
- Hero section: Large banner with ProbeOps logo, tagline, and primary CTA buttons
- Features section: Highlighting key platform capabilities with icons and descriptions
- Subscription tiers summary: Brief overview of available plans
- Testimonials section: User reviews and success stories
- Footer: Contact information, links to terms, privacy policy, and social media

**Main Sections**:
1. **Hero Banner**:
   - Headline: "Enterprise Network Diagnostics Made Simple"
   - Subheadline: "Distributed monitoring across global regions"
   - CTA Buttons: "Get Started" (to registration) and "Learn More" (scrolls to features)

2. **Features Showcase**:
   - Network Diagnostics section: Showcasing the 6 diagnostic tools
   - Scheduled Monitoring section: Highlighting automated probe capabilities
   - Global Distribution section: Explaining multi-region capabilities
   - API Integration section: Showcasing external integration options

3. **Subscription Plans Summary**:
   - Tier cards (Free, Standard, Enterprise)
   - Feature comparison highlights
   - "View Plans" button leading to detailed subscription page

4. **Testimonials**:
   - Customer quotes with photos
   - Success metrics

5. **Footer**:
   - Contact information
   - Social media links
   - Legal information (Terms, Privacy Policy)
   - Copyright notice

**Navigation**:
- Login button in header
- Register button in header
- Documentation link in header
- Pricing link in header (to subscription tiers)

---

### Subscription Tiers Page

**URL Path**: `/tiers-comparison`

**Description**: Detailed comparison of the three subscription tiers (Free, Standard, Enterprise).

**UI Elements**:
- Comparison table: Side-by-side feature comparison across tiers
- Feature category grouping: Network features, API features, Support features, etc.
- Highlighted recommended plan
- CTA buttons for registration

**Features Compared**:
1. **Network Diagnostics**:
   - Available diagnostic tools
   - Retention period for results
   - Maximum targets
   - Concurrent diagnostics limit

2. **Scheduled Probes**:
   - Maximum number of probes
   - Minimum interval
   - Maximum expiration period
   - Notification options

3. **API Access**:
   - Rate limits (per minute/hour)
   - Maximum API tokens
   - API documentation access

4. **Support Options**:
   - Email support
   - Priority support
   - Response time guarantees

5. **Advanced Features**:
   - Data export capabilities
   - Custom SSL certificate support (Enterprise)
   - Custom domains (Enterprise)
   - White-labeling options (Enterprise)

**Visual Elements**:
- Color-coding for tier columns (Free: light blue, Standard: teal, Enterprise: deep blue)
- Checkmarks for included features
- Cross marks for unavailable features
- Numerical values for quantity-based features

**Additional Features**:
- FAQ section addressing common questions
- Contact form for enterprise custom quotes
- Live chat support button

---

### API Documentation Page

**URL Path**: `/api-docs`

**Description**: Comprehensive documentation for the ProbeOps API, enabling external integrations.

**UI Elements**:
- Navigation sidebar: API sections and endpoints
- Authentication section: Detailed API token usage instructions
- Endpoint documentation: Each API endpoint with parameters, example requests, and responses
- Command syntax: Examples for each diagnostic type
- Sample code: Code snippets in multiple languages (curl, Python, JavaScript, etc.)

**Main Sections**:
1. **Authentication**:
   - How to obtain API tokens
   - Authentication headers
   - Token security best practices
   - Rate limiting information

2. **API Endpoints**:
   - User endpoints
   - Diagnostic endpoints
   - Scheduled probe endpoints
   - History endpoints

3. **Diagnostic Commands**:
   - Ping: Parameters and options
   - Traceroute: Parameters and options
   - DNS Lookup: Parameters and options
   - WHOIS Lookup: Parameters and options
   - Port Check: Parameters and options
   - HTTP(S) Requests: Parameters and options

4. **Response Formats**:
   - Success responses
   - Error handling
   - Status codes
   - Rate limit headers

5. **Security Guidelines**:
   - Input sanitization requirements
   - Recommended practices
   - IP restrictions

**Interactive Features**:
- Expandable code blocks
- Copy button for code snippets
- Language selector for code examples
- Dark/light mode toggle
- Interactive API console (Enterprise tier only)

---

## User Dashboard

**URL Path**: `/dashboard`

**Description**: The central hub for users after logging in, providing an overview of their diagnostic activities and system status.

**UI Elements**:
- Welcome message with user's name
- Quick action buttons for common tasks
- Stats summary cards
- Recent activity feed
- Diagnostic visualization charts
- API usage statistics
- Subscription status indicator

**Main Sections**:
1. **Stats Summary Cards**:
   - Total diagnostics run
   - Active scheduled probes
   - Success rate percentage
   - Average response time

2. **Recent Activity Feed**:
   - Latest diagnostic runs with timestamp, target, and status
   - Recently scheduled probes
   - System notifications
   - Clickable entries leading to detailed views

3. **Diagnostic Visualizations**:
   - Response time trends chart
   - Success/failure ratio pie chart
   - Geographic distribution map (Enterprise tier)
   - Command type distribution

4. **API Usage Statistics**:
   - Daily usage bar chart (used vs. available)
   - Monthly usage bar chart (used vs. available)
   - Usage trend line chart
   - Rate limit indicators

5. **Current Subscription**:
   - Current tier badge
   - Key limits and usage
   - Upgrade button (for non-Enterprise users)
   - Days remaining (if subscription is time-limited)

**Quick Action Buttons**:
- "Run New Diagnostic" button: Jump to diagnostics page
- "Schedule New Probe" button: Jump to probe creation
- "View API Tokens" button: Jump to API token management
- "Generate Report" button: Create downloadable report (Standard/Enterprise only)

**Personalization Options**:
- Dashboard layout customization (drag-and-drop panels)
- Widget visibility toggles
- Time range selector for charts

**Role-Specific Content**:
- Admin users: Additional system health indicators
- Super Admin users: System-wide metrics summary
- Free tier users: Upgrade promotions

---

## Diagnostics Page

**URL Path**: `/diagnostics`

**Description**: The core functionality page allowing users to run network diagnostics against specified targets.

**UI Elements**:
- Target input field: For domain/IP entry
- Command type selector: Dropdown for the six diagnostic types
- Additional parameters section: Command-specific options
- Run button: Executes the diagnostic
- Results display panel: Shows formatted command output
- History table: Log of past diagnostics

**Command Types and Options**:

1. **Ping**:
   - Count selector: Number of packets (1-50)
   - Timeout selector: Seconds to wait (1-60)
   - Packet size selector (Advanced): Size in bytes

2. **Traceroute**:
   - Max hops selector: Maximum route steps (1-30)
   - Timeout selector: Seconds to wait (1-60)
   - Protocol selector: UDP/ICMP/TCP (Advanced)

3. **DNS Lookup**:
   - Record type selector: A, AAAA, MX, TXT, etc.
   - Resolver selector: DNS server to use (Advanced)
   - Recursive query toggle (Advanced)

4. **WHOIS Lookup**:
   - No additional options required

5. **Port Check**:
   - Port number input: Single port or comma-separated list
   - Protocol selector: TCP/UDP
   - Timeout selector: Seconds to wait (1-60)

6. **HTTP(S) Request**:
   - Method selector: GET, POST, PUT, DELETE
   - Headers input: Key-value pairs
   - Body input: For POST/PUT requests
   - Follow redirects toggle
   - Timeout selector: Seconds to wait (1-300)

**Results Display**:
- Command summary header
- Execution time indicator
- Formatted output with syntax highlighting
- Success/failure status badge
- Raw/formatted view toggle
- Copy button for results
- Save as PDF button (Standard/Enterprise only)
- Schedule recurring button (creates probe from this diagnostic)

**History Table**:
- Timestamp column
- Target column
- Command type column
- Status column
- Duration column
- View results button
- Repeat button (runs same diagnostic again)
- Pagination controls
- Search and filter options
- Export to CSV button (Standard/Enterprise only)

**Validation and Limitations**:
- Input sanitization for target domains/IPs
- Command parameter validation
- Rate limiting based on subscription tier
- Clear error messages for validation failures
- Tier-specific limitations with upgrade prompts

---

## Scheduled Probes Page

**URL Path**: `/scheduled-probes`

**Description**: Interface for creating and managing automated recurring diagnostic probes.

**UI Elements**:
- Probes list table: All configured probes with status
- Create new probe button: Opens creation form
- Probe detail view: Expanded information for selected probe
- Results history panel: Past results for selected probe

**Probe List Table Columns**:
- Name column: User-defined probe name
- Target column: Domain/IP being monitored
- Command column: Diagnostic type
- Interval column: How often probe runs
- Status column: Active/Paused/Expired
- Last run column: Timestamp of most recent execution
- Last status column: Success/Failure of last execution
- Actions column: Edit, View Results, Pause/Resume, Delete buttons

**Create/Edit Probe Form**:
1. **Basic Information**:
   - Probe name field
   - Target input (domain/IP)
   - Command type selector (same 6 diagnostics)
   - Command parameters (specific to diagnostic type)

2. **Schedule Settings**:
   - Interval type: Minutes, Hours, Days
   - Interval value: Numeric input
   - Start date/time picker: When to begin execution
   - Expiration settings:
     - No expiration option
     - Expiration date picker (custom date)
     - Duration selector (1/2/3 months)

3. **Notification Settings** (Standard/Enterprise only):
   - Email notification toggle
   - Failure-only notification toggle
   - Additional recipient emails

**Probe Detail View**:
- All probe configuration details
- Execution history graph: Success/failure over time
- Performance metrics: Average response time, success rate
- Next scheduled run indicator

**Results History Panel**:
- Timeline view of past results
- Timestamp for each execution
- Status indicator for each execution
- Expanded view button for full result details
- Pagination for large result sets
- Date range filter
- Export results button (Standard/Enterprise only)

**Validation and Limitations**:
- Maximum probes based on subscription tier
- Minimum interval based on subscription tier
- Maximum expiration period based on subscription tier
- Input validation for all fields
- Warning for potential high-load configurations

**Bulk Operations** (Standard/Enterprise only):
- Select multiple probes checkbox
- Bulk pause/resume button
- Bulk delete button
- Bulk export results button

---

## User Profile

**URL Path**: `/profile`

**Description**: A tabbed interface allowing users to manage their account settings, API tokens, and view subscription information.

### Profile Tab

**Tab ID**: `profile`

**Description**: Basic user information and account settings.

**UI Elements**:
- Profile picture: User avatar with upload option
- Username field: Editable (except for OAuth users)
- Email field: Editable by admins only, read-only for regular users
- Full name fields: First and last name
- Company field: Optional organization name
- Job title field: Optional professional title
- Time zone selector: User's preferred time zone
- Date format selector: Preferred date display format
- Save changes button
- Account created date: Read-only display

**Additional Features**:
- Email verification status indicator
- Email verification resend button (if unverified)
- Account type badge (Admin/User)
- Last login information

**Validation**:
- Username uniqueness check
- Email format validation
- Required field validation

---

### Security Tab

**Tab ID**: `security`

**Description**: Password management and account security settings.

**UI Elements**:
- Change password section:
  - Current password field
  - New password field
  - Confirm new password field
  - Update password button
- Two-factor authentication toggle (Enterprise only)
- Session management section:
  - Current active sessions list
  - Logout from all devices button
- Account activity log:
  - Recent logins with date, time, and IP
  - Failed login attempts
  - Password changes
  - Email changes

**Additional Features**:
- Password strength indicator
- Last password change date
- Auto-logout timer settings (inactive session timeout)
- Failed login attempts counter
- Account lockout status

**Validation**:
- Current password verification
- New password complexity requirements
- Matching password confirmation

---

### API Tokens Tab

**Tab ID**: `api-tokens`

**Description**: Management of API access tokens for external integrations.

**UI Elements**:
- Current API token section:
  - Masked token display (●●●●●●●●●●●●●●●●)
  - Show/hide toggle button
  - Copy button
  - Regenerate button
  - Active/Inactive toggle switch
- Token usage statistics:
  - Creation date
  - Last used date
  - Total usage count
- Token permissions section (Enterprise only):
  - Read/Write permission toggles
  - Endpoint-specific permissions

**Additional Features**:
- API token usage chart
- Rate limit indicator for current token
- Token description field
- Token expiration setting (Enterprise only)
- Multiple token management (Enterprise only)

**Validation**:
- Confirmation dialog for token regeneration
- Maximum tokens limit based on subscription tier

**Token Security**:
- Token is only fully displayed once upon generation
- Clipboard auto-clear option after copying
- Activity logging for token operations

---

### Subscription Tab

**Tab ID**: `subscription`

**Description**: View and manage subscription tier information.

**UI Elements**:
- Current plan section:
  - Plan name (Free/Standard/Enterprise)
  - Plan status (Active/Expiring/Expired)
  - Subscription start date
  - Renewal/Expiration date
- Plan features list:
  - Feature-by-feature breakdown
  - Usage limits with visual indicators
- Upgrade/Downgrade section:
  - Available plans comparison
  - Upgrade button
  - Contact sales button (for custom Enterprise)

**Additional Features**:
- Billing history section (if applicable)
- Payment method management (if applicable)
- Subscription auto-renewal setting
- Email notification preferences for subscription events

**Role-Specific Content**:
- Admin users: Organization-wide subscription settings
- Super Admin users: Ability to assign subscription tiers to users

---

### API Usage Tab

**Tab ID**: `api-usage`

**Description**: Detailed breakdown of API consumption and available limits.

**UI Elements**:
- Daily usage chart:
  - Used calls vs. available limit
  - Hours of day on x-axis
  - Call count on y-axis
- Monthly usage chart:
  - Day-by-day breakdown
  - Trend line
  - Limit threshold line
- Endpoint usage breakdown:
  - Table of endpoints with call counts
  - Percentage of total usage
  - Success/failure ratio

**Additional Features**:
- Rate limit status indicators
  - Per-minute limit with countdown
  - Per-hour limit with countdown
  - Per-day limit with countdown
- Usage alerts configuration
  - Threshold setting (e.g., alert at 80% usage)
  - Email notification toggle
- Date range selector for historical data
- Export usage data button (Standard/Enterprise only)

**Role-Specific Content**:
- Admin users: Organization-wide API usage overview
- Super Admin users: System-wide API usage patterns

---

## Admin Panel

**URL Path**: `/admin`

**Description**: Administrative interface for managing users, viewing system metrics, and configuring system-wide settings. Available only to users with admin or super_admin roles.

### Users Management Tab

**Tab ID**: `users`

**Description**: Interface for managing user accounts and permissions.

**UI Elements**:
- Users table:
  - Username column
  - Email column
  - Role column (User/Admin/Super Admin)
  - Status column (Active/Locked/Unverified)
  - Subscription tier column
  - Created date column
  - Last login column
  - Actions column (Edit, Disable, Delete)
- Add new user button
- Bulk actions dropdown
- Search and filter controls

**User Edit Modal**:
- Username field
- Email field
- Role selector dropdown
- Status toggle (Active/Disabled)
- Reset password button
- Subscription tier selector
- Email verification override checkbox
- API rate limit override fields
- Save changes button

**Additional Features**:
- User activity log
- Failed login attempts monitoring
- User metrics (API usage, diagnostics count)
- User impersonation (Super Admin only)
- Export users list to CSV

**Role-Specific Access**:
- Admin users: Can manage regular users only
- Super Admin users: Can manage all users including other admins

---

### System Metrics Tab

**Tab ID**: `metrics`

**Description**: Dashboard for monitoring system performance and resource utilization.

**UI Elements**:
- Time period selector: Last hour/day/week/month
- System resource charts:
  - CPU utilization
  - Memory usage
  - Disk space
  - Network throughput
- Application metrics:
  - Active users count
  - Concurrent diagnostics
  - Database connection pool
  - Request latency
- Scheduled probes metrics:
  - Running probes count
  - Execution queue length
  - Average execution time
  - Success/failure ratio

**Additional Features**:
- Auto-refresh toggle
- Refresh interval selector
- Critical threshold indicators
- Export metrics to CSV
- System alerts log
- Resource bottleneck identification

**Advanced Monitoring** (Super Admin only):
- Database query performance
- Slow query identification
- Cache hit/miss ratio
- Worker process status

---

### Rate Limits Tab

**Tab ID**: `rate-limits`

**Description**: Configuration interface for system-wide rate limiting settings. Available only to Super Admin users.

**UI Elements**:
- Global rate limits section:
  - Per-minute limit input
  - Per-hour limit input
  - Per-day limit input
  - Save changes button
- Tier-specific rate limits section:
  - Free tier limits (minute/hour/day)
  - Standard tier limits (minute/hour/day)
  - Enterprise tier limits (minute/hour/day)
- Endpoint-specific rate limits table:
  - Endpoint path column
  - Method column (GET/POST/etc.)
  - Per-minute limit column
  - Per-hour limit column
  - Override toggle column
  - Edit button column

**Additional Features**:
- Rate limit testing tool
- Current active rate limit status
- Rate limit violations log
- IP-based rate limiting configuration
- Whitelist IP ranges functionality
- Rate limit bypass tokens management

**Monitoring Features**:
- Real-time rate limit consumption graphs
- Peak usage times identification
- Rate limit threshold recommendations
- Alert configuration for approaching limits

**Super Admin Only**:
- System-wide rate limit emergency override
- Maintenance mode toggle
- Global rate limit reset button
- IP blacklist management

---

This detailed UI guide covers every page and feature of the ProbeOps platform, organized by role accessibility and functional area. Each page description includes all UI elements, validation rules, and role-specific content to provide a comprehensive understanding of the application's capabilities and user flows.
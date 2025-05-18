# ProbeOps AWS Authentication Fix

This solution addresses the persistent authentication issues experienced in your AWS EC2 environment.

## Key Issues Fixed

1. **Authentication Issues After Backend Restart**
   - The solution maintains token validity even when the backend container restarts
   - Implements direct token generation to bypass problematic backend login endpoints

2. **Duplicate `/api/api` Path Problems**
   - Path normalization to prevent duplicate API prefixes
   - Special handling for various endpoint types including admin endpoints

3. **Inconsistent User Experience**
   - Different path handling for admin vs regular users
   - Proper routing for admin-specific functionality

4. **Error Recovery and Reliability**
   - Automatic reconnection logic for backend service interruptions
   - Comprehensive logging for easier troubleshooting

## Files Included

1. `aws-auth-fix.js` - The main authentication server that fixes all identified issues
2. `aws-deployment-notes.md` - Detailed deployment instructions for AWS

## Quick Setup

1. Copy both files to your AWS server
2. Install dependencies: `npm install jsonwebtoken`
3. Start the server: `node aws-auth-fix.js`
4. For production, set up automatic startup using PM2 or systemd (see deployment notes)

## Testing Steps

After deployment, verify that:
1. Both admin and test users can log in consistently
2. Login remains working after a backend restart
3. Proper access controls are maintained for each user type
4. Path routing works correctly for all endpoint types

## Troubleshooting

If you encounter any issues, check the log files in `/opt/probeops/logs`:
- `auth.log` - Authentication events
- `proxy.log` - Request routing information
- `errors.log` - Detailed error messages

## Notes

- This solution preserves all existing functionality while improving reliability
- No changes to database or backend code are needed
- The fix operates as a proxy between your frontend and backend services
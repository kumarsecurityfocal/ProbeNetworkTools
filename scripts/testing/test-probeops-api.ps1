# ProbeOps API Test Script for Windows PowerShell
# Run this script from a Windows PowerShell window

# Set default values
$backendHost = "probeops.com"
$username = "admin@probeops.com"
$password = ""

Write-Host "ProbeOps API Test Script for Windows" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in PowerShell
if (-not $PSVersionTable) {
    Write-Host "This script must be run in PowerShell, not Command Prompt." -ForegroundColor Red
    exit 1
}

# Prompt for password if not provided
if (-not $password) {
    $securePassword = Read-Host -Prompt "Enter password for $username" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

# Base URL for API
$baseUrl = "https://$backendHost"
Write-Host "Testing API at $baseUrl" -ForegroundColor Yellow

# Health check
Write-Host -NoNewline "Testing API health... "
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "OK (200)" -ForegroundColor Green
    } else {
        Write-Host "Failed ($($healthResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to connect" -ForegroundColor Red
    Write-Host "Trying alternative endpoint..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "OK (200) on alternative endpoint" -ForegroundColor Green
        } else {
            Write-Host "Failed ($($healthResponse.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "Failed to connect to alternative endpoint" -ForegroundColor Red
    }
}

# Attempt to log in
Write-Host -NoNewline "Attempting to log in as $username... "

# Form the login request
$loginData = @{
    username = $username
    password = $password
}

# Try the regular login endpoint
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/login" -Method Post -Form $loginData -UseBasicParsing -ErrorAction SilentlyContinue
    if ($loginResponse.StatusCode -eq 200) {
        Write-Host "Success" -ForegroundColor Green
        $loginJson = $loginResponse.Content | ConvertFrom-Json
        $token = $loginJson.access_token
        Write-Host "Token received: $($token.Substring(0, [Math]::Min(10, $token.Length)))..." -ForegroundColor Green
    } else {
        Write-Host "Failed with status $($loginResponse.StatusCode)" -ForegroundColor Red
        $token = $null
    }
} catch {
    Write-Host "Failed on /login endpoint" -ForegroundColor Red
    
    # Try alternative login endpoint
    Write-Host -NoNewline "Trying alternative login endpoint (auth/login)... "
    try {
        $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method Post -Form $loginData -UseBasicParsing -ErrorAction SilentlyContinue
        if ($loginResponse.StatusCode -eq 200) {
            Write-Host "Success" -ForegroundColor Green
            $loginJson = $loginResponse.Content | ConvertFrom-Json
            $token = $loginJson.access_token
            Write-Host "Token received: $($token.Substring(0, [Math]::Min(10, $token.Length)))..." -ForegroundColor Green
        } else {
            Write-Host "Failed with status $($loginResponse.StatusCode)" -ForegroundColor Red
            $token = $null
        }
    } catch {
        Write-Host "Failed on /auth/login endpoint" -ForegroundColor Red
        $token = $null
    }
}

# Exit if no token
if (-not $token) {
    Write-Host "Login failed, cannot continue testing endpoints." -ForegroundColor Red
    exit 1
}

# Test user profile endpoints
Write-Host "Testing user profile endpoints..." -ForegroundColor Yellow
Write-Host -NoNewline "GET /users/me: "

# Create headers with token
$headers = @{
    "Authorization" = "Bearer $token"
}

# Try the user profile endpoint
try {
    $userResponse = Invoke-WebRequest -Uri "$baseUrl/users/me" -Method Get -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
    if ($userResponse.StatusCode -eq 200) {
        $userData = $userResponse.Content | ConvertFrom-Json
        
        # Check if the response is HTML instead of JSON
        if ($userResponse.Content -like "*<!DOCTYPE html>*") {
            Write-Host "FAILED - Response contains HTML instead of JSON" -ForegroundColor Red
            Write-Host "This indicates a routing issue - API calls are being sent to frontend" -ForegroundColor Red
            Write-Host "First 100 chars of response:" -ForegroundColor Yellow
            Write-Host $userResponse.Content.Substring(0, [Math]::Min(100, $userResponse.Content.Length)) -ForegroundColor Yellow
        } else {
            Write-Host "Success" -ForegroundColor Green
            
            # Check for admin flag
            if (Get-Member -InputObject $userData -Name "is_admin" -MemberType Properties) {
                Write-Host "is_admin flag present: $($userData.is_admin)" -ForegroundColor Green
            } else {
                Write-Host "FAILED - 'is_admin' flag not found in response" -ForegroundColor Red
            }
            
            # Output the full user object
            Write-Host "User object:" -ForegroundColor Yellow
            $userData | ConvertTo-Json
        }
    } else {
        Write-Host "Failed with status $($userResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed to get user profile" -ForegroundColor Red
    
    # Try alternative endpoint
    Write-Host -NoNewline "Trying alternative user profile endpoint... "
    try {
        $userResponse = Invoke-WebRequest -Uri "$baseUrl/api/users/me" -Method Get -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
        if ($userResponse.StatusCode -eq 200) {
            Write-Host "Success on alternative endpoint" -ForegroundColor Green
            $userData = $userResponse.Content | ConvertFrom-Json
            
            # Check for admin flag
            if (Get-Member -InputObject $userData -Name "is_admin" -MemberType Properties) {
                Write-Host "is_admin flag present: $($userData.is_admin)" -ForegroundColor Green
            } else {
                Write-Host "FAILED - 'is_admin' flag not found in response" -ForegroundColor Red
            }
            
            # Output the full user object
            Write-Host "User object:" -ForegroundColor Yellow
            $userData | ConvertTo-Json
        } else {
            Write-Host "Failed with status $($userResponse.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "Failed on alternative endpoint" -ForegroundColor Red
        # Try to get the response content if available
        if ($_.Exception.Response) {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $streamReader = New-Object System.IO.StreamReader($responseStream)
            $responseContent = $streamReader.ReadToEnd()
            Write-Host "Response: $responseContent" -ForegroundColor Red
        }
    }
}

# Test the admin panel component endpoint directly
Write-Host ""
Write-Host "Testing if the frontend has an admin panel component..." -ForegroundColor Yellow
try {
    $adminPanelResponse = Invoke-WebRequest -Uri "$baseUrl/admin" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    if ($adminPanelResponse.StatusCode -eq 200) {
        Write-Host "Admin panel page exists but might be restricted" -ForegroundColor Yellow
    } else {
        Write-Host "Admin panel page returns status $($adminPanelResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "Admin panel page not found (404) - might be rendered conditionally based on auth" -ForegroundColor Yellow
    } else {
        Write-Host "Error accessing admin panel page: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test other API endpoints
Write-Host ""
Write-Host "Testing additional API endpoints..." -ForegroundColor Yellow

# Test subscriptions endpoint
Write-Host -NoNewline "GET /subscriptions: "
try {
    $subscriptionsResponse = Invoke-WebRequest -Uri "$baseUrl/subscriptions" -Method Get -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
    if ($subscriptionsResponse.StatusCode -eq 200) {
        Write-Host "Success" -ForegroundColor Green
        
        # Check if response is HTML or JSON
        if ($subscriptionsResponse.Content -like "*<!DOCTYPE html>*") {
            Write-Host "FAILED - Response contains HTML instead of JSON" -ForegroundColor Red
        } else {
            $subsData = $subscriptionsResponse.Content | ConvertFrom-Json
            Write-Host "Subscriptions endpoint working" -ForegroundColor Green
        }
    } else {
        Write-Host "Failed with status $($subscriptionsResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed. Please share these results for further troubleshooting." -ForegroundColor Cyan
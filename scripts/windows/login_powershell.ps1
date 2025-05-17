# PowerShell script for testing ProbeOps API login
# This script uses PowerShell which has better JSON handling than Command Prompt

Write-Host "PowerShell ProbeOps API Login Test" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Create the login JSON data
$loginData = @{
    username = "admin@probeops.com"
    password = "probeopS1@"
} | ConvertTo-Json

# Save to file for reference
$loginData | Set-Content -Path "login_data.json" -Encoding UTF8
Write-Host "Created login_data.json with content:" -ForegroundColor Cyan
Write-Host $loginData -ForegroundColor Gray
Write-Host ""

# Method 1: Using PowerShell's Invoke-RestMethod (recommended)
Write-Host "Method 1: Testing login with PowerShell's Invoke-RestMethod..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://probeops.com/api/login" `
                                 -Method Post `
                                 -ContentType "application/json" `
                                 -Body $loginData
    
    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    
    # Save the token for future use
    $token = $response.access_token
    $token | Set-Content -Path "auth_token.txt" -Encoding UTF8
    Write-Host "Access token saved to auth_token.txt" -ForegroundColor Green
}
catch {
    Write-Host "Login failed with Method 1" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Method 2: Testing login with curl..." -ForegroundColor Yellow

# Method 2: Using curl
Write-Host "Using curl command:" -ForegroundColor Cyan
Write-Host "curl -X POST https://probeops.com/api/login -H `"Content-Type: application/json`" -d `"@login_data.json`"" -ForegroundColor Gray
Write-Host ""

# Execute curl command
$curlResult = Invoke-Expression 'curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d "@login_data.json"'
Write-Host "Curl Result:" -ForegroundColor Cyan
Write-Host $curlResult -ForegroundColor Gray

Write-Host "" 
Write-Host "Testing complete. Press any key to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
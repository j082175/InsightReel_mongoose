$headers = @{'Content-Type' = 'application/json'}
$body = @{
    platform = 'INSTAGRAM'
    videoUrl = 'https://www.instagram.com/reels/DOeK1dJjcna/'
    postUrl = 'https://www.instagram.com/reels/DOeK1dJjcna/'
} | ConvertTo-Json

Write-Host "Testing Instagram video processing with new URL..."
try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/process-video' -Method POST -Headers $headers -Body $body
    Write-Host "Success: " -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: " -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host "Details: " $_.ErrorDetails.Message
    }
}
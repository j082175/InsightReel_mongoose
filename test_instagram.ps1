$headers = @{'Content-Type' = 'application/json'}
$body = @{
    platform = 'INSTAGRAM'
    videoUrl = 'https://www.instagram.com/reel/C6lWqzEOZQS/'
    postUrl = 'https://www.instagram.com/reel/C6lWqzEOZQS/'
} | ConvertTo-Json

Write-Host "Testing Instagram video processing..."
Invoke-RestMethod -Uri 'http://localhost:3000/api/process-video' -Method POST -Headers $headers -Body $body
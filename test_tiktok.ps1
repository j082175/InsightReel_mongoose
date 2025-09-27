$headers = @{'Content-Type' = 'application/json'}
$body = @{
    platform = 'TIKTOK'
    videoUrl = 'https://www.tiktok.com/@music/video/6821000000000000000'
    postUrl = 'https://www.tiktok.com/@music/video/6821000000000000000'
} | ConvertTo-Json

Write-Host "Testing TikTok video processing..."
Invoke-RestMethod -Uri 'http://localhost:3000/api/process-video' -Method POST -Headers $headers -Body $body
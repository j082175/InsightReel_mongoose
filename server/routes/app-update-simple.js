const express = require('express');
const router = express.Router();

console.log('🔧 Simple app-update router loading...');

// 간단한 테스트 라우트
router.get('/test', (req, res) => {
    console.log('🧪 Simple test route called!');
    res.json({ message: 'Simple app-update router works!', timestamp: new Date().toISOString() });
});

// 간단한 check 라우트
router.get('/check', (req, res) => {
    console.log('🔍 Simple check route called!');
    res.json({
        hasUpdate: true,
        latestVersion: '1.1.0',
        currentVersion: '1.0.0',
        downloadUrl: '/api/app-update/download',
        releaseNotes: '🚀 Test update available!',
        isForced: false,
        fileSize: 0,
        checkTime: new Date().toISOString()
    });
});

console.log('✅ Simple app-update routes registered');

module.exports = router;
package com.insightreel.shareextension

import android.Manifest
import android.content.BroadcastReceiver
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    private lateinit var networkManager: NetworkManager
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var autoUpdateManager: AutoUpdateManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var serviceStateReceiver: BroadcastReceiver? = null
    private var clipboardAnalyzeButton: Button? = null

    // 권한 요청 코드
    companion object {
        private const val REQUEST_NOTIFICATION_PERMISSION = 1001
        private const val REQUEST_POST_NOTIFICATIONS = 1002
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        println("🚀 MainActivity onCreate - Android 11+ 권장 방식으로 실행됨!")
        println("🚀 현재 시간: ${System.currentTimeMillis()}")

        networkManager = NetworkManager(this)
        preferencesManager = PreferencesManager(this)
        autoUpdateManager = AutoUpdateManager(this)

        setupUI()

        // Register broadcast receiver for service state changes
        registerServiceStateReceiver()

        // 권한 확인 및 포그라운드 서비스 시작
        checkPermissionsAndStartService()

        // 🎯 클립보드 체크 (500ms 지연 후)
        findViewById<android.widget.LinearLayout>(R.id.mainLayout).postDelayed({
            checkClipboardOnStart()
        }, 500)

        // 24시간마다 자동 업데이트 확인
        checkForAppUpdates()
    }

    private fun setupUI() {
        findViewById<TextView>(R.id.descriptionText).text =
            "✨ 새로운 방식으로 업그레이드되었습니다!\n\n" +
            "📋 YouTube/Instagram/TikTok 링크를 복사하면\n" +
            "📢 알림으로 자동 감지하여 분석할 수 있습니다\n\n" +
            "🔗 또는 '공유' → 'InsightReel Share'를 선택하세요"

        // 버전 정보 표시
        val packageInfo = packageManager.getPackageInfo(packageName, 0)
        findViewById<TextView>(R.id.versionText).text = "v${packageInfo.versionName} (Android 11+ 최적화)"

        // 설정 버튼
        val settingsButton = findViewById<Button>(R.id.settingsButton)
        settingsButton.setOnClickListener {
            openSettings()
        }

        // 서비스 상태 토글 버튼 추가
        addServiceToggleButton()
    }

    private fun openSettings() {
        val intent = Intent(this, SettingsActivity::class.java)
        startActivity(intent)
    }

    /**
     * 서비스 토글 버튼 추가
     */
    private fun addServiceToggleButton() {
        val toggleButton = Button(this).apply {
            text = "🔄 클립보드 모니터링 시작"
            textSize = 18f
            setBackgroundColor(0xFF2196F3.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(32, 24, 32, 24)

            setOnClickListener {
                toggleClipboardService()
            }
        }

        val layoutParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        layoutParams.setMargins(32, 16, 32, 16)
        toggleButton.layoutParams = layoutParams

        val mainLayout = findViewById<android.widget.LinearLayout>(R.id.mainLayout)
        mainLayout.addView(toggleButton, 2) // 설명 텍스트 아래에 추가
    }

    /**
     * 앱 시작 시 클립보드 체크
     */
    private fun checkClipboardOnStart() {
        try {
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager

            if (!clipboardManager.hasPrimaryClip()) {
                return
            }

            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val clipText = clipData.getItemAt(0).text?.toString() ?: ""

                if (clipText.isNotEmpty() && isValidVideoUrl(clipText)) {
                    showClipboardAnalyzeButton(clipText)
                }
            }
        } catch (e: Exception) {
            println("⚠️ 클립보드 확인 실패: ${e.message}")
        }
    }

    /**
     * 클립보드 URL 분석 버튼 표시
     */
    private fun showClipboardAnalyzeButton(url: String) {
        // 기존 버튼이 있으면 제거
        clipboardAnalyzeButton?.let { button ->
            val parent = button.parent as? android.view.ViewGroup
            parent?.removeView(button)
        }

        // 새 버튼 생성 (큰 정사각형 버튼)
        clipboardAnalyzeButton = Button(this).apply {
            text = "📹 클립보드 URL 분석하기"
            textSize = 24f
            setBackgroundColor(0xFF4CAF50.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(64, 48, 64, 48)
            elevation = 12f

            // 둥근 배경
            background = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.RECTANGLE
                cornerRadius = 16f
                setColor(0xFF4CAF50.toInt())
            }

            setOnClickListener {
                analyzeCurrentClipboard()
            }
        }

        try {
            val mainLayout = findViewById<android.widget.LinearLayout>(R.id.mainLayout)

            // 정사각형 버튼 크기 (화면 너비의 70%)
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val buttonSize = (screenWidth * 0.7).toInt()

            val layoutParams = android.widget.LinearLayout.LayoutParams(buttonSize, buttonSize)
            layoutParams.setMargins(32, 32, 32, 32)
            clipboardAnalyzeButton?.layoutParams = layoutParams

            mainLayout.addView(clipboardAnalyzeButton, 2) // 설명 아래에 추가

            // URL 미리보기
            val shortUrl = if (url.length > 50) url.substring(0, 47) + "..." else url
            Toast.makeText(this, "📋 클립보드에서 URL 발견: $shortUrl", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            println("❌ 버튼 추가 실패: ${e.message}")
        }
    }

    /**
     * 현재 클립보드 분석
     */
    private fun analyzeCurrentClipboard() {
        clipboardAnalyzeButton?.text = "클립보드 확인 중..."
        clipboardAnalyzeButton?.isEnabled = false

        activityScope.launch {
            try {
                val currentUrl = getCurrentClipboardUrl()

                if (currentUrl.isEmpty()) {
                    Toast.makeText(this@MainActivity, "📋 클립보드에 유효한 URL이 없습니다", Toast.LENGTH_SHORT).show()
                    // 버튼 제거
                    clipboardAnalyzeButton?.let { button ->
                        val parent = button.parent as? android.view.ViewGroup
                        parent?.removeView(button)
                    }
                    clipboardAnalyzeButton = null
                    return@launch
                }

                analyzeUrl(currentUrl)
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "❌ 클립보드 확인 오류: ${e.message}", Toast.LENGTH_SHORT).show()
                clipboardAnalyzeButton?.text = "📹 클립보드 URL 분석하기"
                clipboardAnalyzeButton?.isEnabled = true
            }
        }
    }

    /**
     * 현재 클립보드 URL 가져오기
     */
    private fun getCurrentClipboardUrl(): String {
        return try {
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager

            if (!clipboardManager.hasPrimaryClip()) {
                return ""
            }

            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val clipText = clipData.getItemAt(0).text?.toString() ?: ""
                if (isValidVideoUrl(clipText)) clipText else ""
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * URL 분석 및 전송
     */
    private suspend fun analyzeUrl(url: String) {
        withContext(Dispatchers.Main) {
            Toast.makeText(this@MainActivity, "🚀 비디오 분석 시작 중...", Toast.LENGTH_SHORT).show()
        }

        try {
            val serverUrl = preferencesManager.getCurrentServerUrl()
            val analysisFlags = preferencesManager.getAnalysisFlags()
            val success = networkManager.sendVideoUrl(serverUrl, url, analysisFlags)

            val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"

            withContext(Dispatchers.Main) {
                if (success) {
                    Toast.makeText(this@MainActivity, "✅ 분석 완료! ($networkType)", Toast.LENGTH_LONG).show()
                    // 버튼 제거
                    clipboardAnalyzeButton?.let { button ->
                        val parent = button.parent as? android.view.ViewGroup
                        parent?.removeView(button)
                    }
                    clipboardAnalyzeButton = null
                } else {
                    Toast.makeText(this@MainActivity, "❌ 분석 실패 ($networkType)", Toast.LENGTH_LONG).show()
                    clipboardAnalyzeButton?.text = "📹 클립보드 URL 분석하기"
                    clipboardAnalyzeButton?.isEnabled = true
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                Toast.makeText(this@MainActivity, "❌ 네트워크 오류: ${e.message}", Toast.LENGTH_LONG).show()
                clipboardAnalyzeButton?.text = "📹 클립보드 URL 분석하기"
                clipboardAnalyzeButton?.isEnabled = true
            }
        }
    }

    /**
     * 권한 확인 및 포그라운드 서비스 시작
     */
    private fun checkPermissionsAndStartService() {
        // Android 13+ POST_NOTIFICATIONS 권한 확인
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {

                if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.POST_NOTIFICATIONS)) {
                    showPermissionExplanation()
                } else {
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        REQUEST_POST_NOTIFICATIONS
                    )
                }
                return
            }
        }

        // 배터리 최적화 무시 설정 확인 (선택사항)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            checkBatteryOptimization()
        } else {
            startClipboardService()
        }
    }

    /**
     * 권한 설명 다이얼로그
     */
    private fun showPermissionExplanation() {
        AlertDialog.Builder(this)
            .setTitle("알림 권한 필요")
            .setMessage(
                "YouTube/Instagram/TikTok 링크 감지 시 알림을 표시하기 위해 알림 권한이 필요합니다.\n\n" +
                "권한을 허용하면 링크를 복사했을 때 자동으로 감지하여 분석할 수 있습니다."
            )
            .setPositiveButton("권한 허용") { _, _ ->
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_POST_NOTIFICATIONS
                )
            }
            .setNegativeButton("나중에") { _, _ ->
                Toast.makeText(this, "알림 권한 없이도 수동으로 링크를 분석할 수 있습니다", Toast.LENGTH_LONG).show()
            }
            .show()
    }

    /**
     * 배터리 최적화 설정 확인
     */
    private fun checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent()
            val packageName = packageName
            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager

            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                AlertDialog.Builder(this)
                    .setTitle("배터리 최적화 설정")
                    .setMessage(
                        "백그라운드에서 링크 감지를 위해 배터리 최적화를 해제하는 것이 좋습니다.\n\n" +
                        "설정 → 앱 → InsightReel → 배터리 → 배터리 최적화 무시"
                    )
                    .setPositiveButton("설정으로 이동") { _, _ ->
                        try {
                            intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                            intent.data = Uri.parse("package:$packageName")
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this, "설정 화면을 열 수 없습니다", Toast.LENGTH_SHORT).show()
                        }
                        startClipboardService()
                    }
                    .setNegativeButton("나중에") { _, _ ->
                        startClipboardService()
                    }
                    .show()
            } else {
                startClipboardService()
            }
        } else {
            startClipboardService()
        }
    }

    /**
     * 클립보드 모니터링 서비스 시작
     */
    private fun startClipboardService() {
        try {
            val serviceIntent = Intent(this, ClipboardMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            Toast.makeText(this, "🔥 클립보드 모니터링 시작!", Toast.LENGTH_SHORT).show()
            println("✅ ClipboardMonitorService 시작됨")

            updateServiceToggleButton(true)
        } catch (e: Exception) {
            println("❌ 서비스 시작 실패: ${e.message}")
            Toast.makeText(this, "서비스 시작 실패: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 클립보드 모니터링 서비스 중지
     */
    private fun stopClipboardService() {
        try {
            val serviceIntent = Intent(this, ClipboardMonitorService::class.java)
            stopService(serviceIntent)

            Toast.makeText(this, "🛑 클립보드 모니터링 중지", Toast.LENGTH_SHORT).show()
            println("🛑 ClipboardMonitorService 중지됨")

            updateServiceToggleButton(false)
        } catch (e: Exception) {
            println("❌ 서비스 중지 실패: ${e.message}")
            Toast.makeText(this, "서비스 중지 실패: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 서비스 토글 기능
     */
    private fun toggleClipboardService() {
        // 서비스 상태 확인 (간단한 방법)
        val serviceIntent = Intent(this, ClipboardMonitorService::class.java)

        // 현재는 토글 버튼 텍스트로 상태 판단
        val toggleButton = findViewById<android.widget.LinearLayout>(R.id.mainLayout)
            .getChildAt(2) as? Button

        val isServiceRunning = toggleButton?.text?.contains("중지") == true

        if (isServiceRunning) {
            stopClipboardService()
        } else {
            checkPermissionsAndStartService()
        }
    }

    /**
     * 서비스 토글 버튼 상태 업데이트
     */
    private fun updateServiceToggleButton(isRunning: Boolean) {
        val toggleButton = findViewById<android.widget.LinearLayout>(R.id.mainLayout)
            .getChildAt(2) as? Button

        toggleButton?.apply {
            if (isRunning) {
                text = "🛑 클립보드 모니터링 중지"
                setBackgroundColor(0xFFFF5722.toInt()) // 주황색
            } else {
                text = "🔄 클립보드 모니터링 시작"
                setBackgroundColor(0xFF2196F3.toInt()) // 파란색
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            REQUEST_POST_NOTIFICATIONS -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "알림 권한이 허용되었습니다", Toast.LENGTH_SHORT).show()
                    checkBatteryOptimization()
                } else {
                    Toast.makeText(this, "알림 권한이 거부되었습니다. 수동으로만 사용 가능합니다", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    /**
     * URL 유효성 검증 (유틸리티 메서드)
     */

    private fun isValidVideoUrl(url: String): Boolean {
        return url.contains("youtube.com/watch") ||
               url.contains("youtube.com/shorts") ||
               url.contains("youtu.be/") ||
               url.contains("instagram.com/p/") ||
               url.contains("instagram.com/reel/") ||
               url.contains("tiktok.com/")
    }

    override fun onResume() {
        super.onResume()
        // 서비스 상태 확인 및 UI 업데이트
        updateServiceToggleButtonState()
    }

    /**
     * Register broadcast receiver to listen for service state changes
     */
    private fun registerServiceStateReceiver() {
        serviceStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == ClipboardMonitorService.ACTION_SERVICE_STATE_CHANGED) {
                    val isRunning = intent.getBooleanExtra(ClipboardMonitorService.EXTRA_SERVICE_RUNNING, false)
                    updateServiceToggleButton(isRunning)
                    Toast.makeText(this@MainActivity,
                        if (isRunning) "🔥 Service started" else "🛑 Service stopped",
                        Toast.LENGTH_SHORT).show()
                }
            }
        }

        val filter = IntentFilter(ClipboardMonitorService.ACTION_SERVICE_STATE_CHANGED)
        registerReceiver(serviceStateReceiver, filter)
    }

    /**
     * 서비스 상태를 확인하고 UI를 업데이트
     */
    private fun updateServiceToggleButtonState() {
        // 실제 서비스 상태를 확인하는 방법이 있다면 여기서 구현
        // 현재는 토글 버튼 텍스트로 상태 관리
    }

    private fun checkForAppUpdates() {
        activityScope.launch {
            try {
                if (autoUpdateManager.shouldCheckForUpdates()) {
                    val serverUrl = preferencesManager.getCurrentServerUrl()
                    autoUpdateManager.checkForUpdates(serverUrl)
                }
            } catch (e: Exception) {
                println("⚠️ 자동 업데이트 확인 실패: ${e.message}")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()

        // Unregister broadcast receiver to prevent memory leaks
        serviceStateReceiver?.let {
            unregisterReceiver(it)
            serviceStateReceiver = null
        }
    }
}
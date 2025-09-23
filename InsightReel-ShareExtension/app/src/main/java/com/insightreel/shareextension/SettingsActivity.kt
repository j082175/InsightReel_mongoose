package com.insightreel.shareextension

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*

class SettingsActivity : AppCompatActivity() {

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var networkManager: NetworkManager
    private lateinit var permissionHelper: PermissionHelper
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        preferencesManager = PreferencesManager(this)
        networkManager = NetworkManager(this)
        permissionHelper = PermissionHelper(this)

        setupBasicUI()
        setupFloatingButtonSettings()
        updateNetworkStatus()
    }

    private fun setupBasicUI() {
        try {
            // 제목 설정
            findViewById<TextView>(R.id.titleText)?.text = "InsightReel 설정"

            // 분석 타입 설정
            setupAnalysisTypeSettings()

            // 전송 방식 설정
            setupTransmissionSettings()

            // 버튼 설정
            findViewById<Button>(R.id.buttonSave)?.setOnClickListener {
                saveAllSettings()
            }
            findViewById<Button>(R.id.buttonTest)?.setOnClickListener {
                testConnection()
            }

            // 현재 설정 로드
            loadCurrentSettings()

        } catch (e: Exception) {
            println("⚠️ UI 요소 초기화 실패: ${e.message}")
        }
    }

    private fun setupFloatingButtonSettings() {
        try {
            // 기존 테스트 버튼에 플로팅 버튼 기능 추가
            findViewById<Button>(R.id.buttonTest)?.setOnLongClickListener {
                testFloatingButton()
                true
            }

            println("💡 플로팅 버튼: 테스트 버튼을 길게 누르면 플로팅 버튼 테스트")

        } catch (e: Exception) {
            println("⚠️ 플로팅 버튼 설정 초기화 실패: ${e.message}")
        }
    }

    private fun setupAnalysisTypeSettings() {
        try {
            val radioGroup = findViewById<RadioGroup>(R.id.radioGroupAnalysisType)
            radioGroup?.setOnCheckedChangeListener { _, checkedId ->
                val analysisType = when (checkedId) {
                    R.id.radioVideoOnly -> PreferencesManager.ANALYSIS_VIDEO_ONLY
                    R.id.radioChannelOnly -> PreferencesManager.ANALYSIS_CHANNEL_ONLY
                    R.id.radioBoth -> PreferencesManager.ANALYSIS_BOTH
                    else -> PreferencesManager.ANALYSIS_VIDEO_ONLY
                }
                preferencesManager.setAnalysisType(analysisType)
                println("🔧 분석 타입 변경: $analysisType")
            }
        } catch (e: Exception) {
            println("⚠️ 분석 타입 설정 초기화 실패: ${e.message}")
        }
    }

    private fun setupTransmissionSettings() {
        try {
            val showModalSwitch = findViewById<Switch>(R.id.switchShowModal)
            showModalSwitch?.setOnCheckedChangeListener { _, isChecked ->
                preferencesManager.setShowModal(isChecked)
                println("🔧 전송 방식 변경: ${if (isChecked) "모달 표시" else "백그라운드 전송"}")
            }
        } catch (e: Exception) {
            println("⚠️ 전송 방식 설정 초기화 실패: ${e.message}")
        }
    }

    private fun loadCurrentSettings() {
        try {
            // 분석 타입 로드
            val currentAnalysisType = preferencesManager.getAnalysisType()
            val radioGroup = findViewById<RadioGroup>(R.id.radioGroupAnalysisType)
            val radioButtonId = when (currentAnalysisType) {
                PreferencesManager.ANALYSIS_VIDEO_ONLY -> R.id.radioVideoOnly
                PreferencesManager.ANALYSIS_CHANNEL_ONLY -> R.id.radioChannelOnly
                PreferencesManager.ANALYSIS_BOTH -> R.id.radioBoth
                else -> R.id.radioVideoOnly
            }
            radioGroup?.check(radioButtonId)

            // 전송 방식 로드
            val showModal = preferencesManager.getShowModal()
            findViewById<Switch>(R.id.switchShowModal)?.isChecked = showModal

            // 현재 설정 표시
            updateCurrentSettingsDisplay()

        } catch (e: Exception) {
            println("⚠️ 설정 로드 실패: ${e.message}")
        }
    }

    private fun updateCurrentSettingsDisplay() {
        try {
            val analysisType = preferencesManager.getAnalysisType()
            val showModal = preferencesManager.getShowModal()
            val serverConfig = preferencesManager.getServerConfigSummary()

            val analysisTypeText = when (analysisType) {
                PreferencesManager.ANALYSIS_VIDEO_ONLY -> "영상만 분석"
                PreferencesManager.ANALYSIS_CHANNEL_ONLY -> "채널만 분석"
                PreferencesManager.ANALYSIS_BOTH -> "영상+채널 분석"
                else -> "영상만 분석"
            }

            val transmissionText = if (showModal) "모달 표시" else "백그라운드 전송"

            val floatingButtonStatus = if (permissionHelper.hasOverlayPermission()) {
                if (isFloatingButtonServiceRunning()) "🎈 플로팅 버튼 실행 중" else "🎈 플로팅 버튼 비활성화"
            } else {
                "🎈 플로팅 버튼 권한 필요"
            }

            val settingsText = """
                📊 분석 타입: $analysisTypeText
                📱 전송 방식: $transmissionText
                🌐 서버: ${serverConfig.currentUrl}
                🔧 네트워크: ${if (serverConfig.isAutoMode) "자동 감지" else "수동 설정"}
                $floatingButtonStatus
            """.trimIndent()

            findViewById<TextView>(R.id.textCurrentSettings)?.text = settingsText
            println("📋 현재 설정: $settingsText")

        } catch (e: Exception) {
            println("⚠️ 설정 표시 업데이트 실패: ${e.message}")
        }
    }

    private fun saveAllSettings() {
        try {
            // UI에서 현재 설정된 값들을 다시 저장 (이미 onChange에서 저장되지만 확실히 하기 위해)
            updateCurrentSettingsDisplay()

            // 플로팅 버튼 서비스 자동 시작 (권한이 있으면)
            if (permissionHelper.hasOverlayPermission()) {
                FloatingButtonService.startService(this)
                Toast.makeText(this, "✅ 설정 저장됨! 플로팅 버튼 서비스 시작됨", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "✅ 설정 저장됨! 플로팅 버튼 권한을 허용하면 자동 시작됩니다", Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "❌ 설정 저장 실패: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun testConnection() {
        activityScope.launch {
            try {
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"

                Toast.makeText(this@SettingsActivity, "연결 테스트 중... ($networkType)", Toast.LENGTH_SHORT).show()

                val success = networkManager.sendVideoUrl(
                    serverUrl,
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                )

                if (success) {
                    Toast.makeText(this@SettingsActivity, "✅ 서버 연결 성공! ($networkType)", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@SettingsActivity, "❌ 서버 연결 실패 ($networkType)", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@SettingsActivity, "❌ 네트워크 오류: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateNetworkStatus() {
        activityScope.launch {
            try {
                val networkStatus = networkManager.getNetworkStatusSummary()
                val serverConfig = preferencesManager.getServerConfigSummary()

                val statusText = """
                    🌐 네트워크: ${networkStatus.networkDescription}
                    🔗 현재 서버: ${serverConfig.currentUrl}
                    📡 모드: ${if (serverConfig.isAutoMode) "자동" else "수동"}
                """.trimIndent()

                println("📊 네트워크 상태: $statusText")
            } catch (e: Exception) {
                println("❌ 네트워크 상태 업데이트 실패: ${e.message}")
            }
        }
    }

    // ========== 플로팅 버튼 관련 함수들 ==========

    private fun isFloatingButtonServiceRunning(): Boolean {
        return try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            for (service in activityManager.getRunningServices(Integer.MAX_VALUE)) {
                if (FloatingButtonService::class.java.name == service.service.className) {
                    return true
                }
            }
            false
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 서비스 상태 확인 실패: ${e.message}")
            false
        }
    }

    private fun startFloatingButtonWithPermission() {
        permissionHelper.checkAndRequestPermission(
            activity = this,
            onGranted = {
                // 권한 있음 - 서비스 시작
                FloatingButtonService.startService(this)
                Toast.makeText(this, "🎈 플로팅 버튼 서비스 시작됨", Toast.LENGTH_SHORT).show()
                updateFloatingButtonStatus()
            },
            onDenied = {
                // 권한 없음
                Toast.makeText(this, "⚠️ 플로팅 버튼 권한이 필요합니다", Toast.LENGTH_SHORT).show()
            }
        )
    }

    private fun stopFloatingButton() {
        FloatingButtonService.stopService(this)
        Toast.makeText(this, "🎈 플로팅 버튼 서비스 중지됨", Toast.LENGTH_SHORT).show()
        updateFloatingButtonStatus()
    }

    private fun testFloatingButton() {
        if (!permissionHelper.hasOverlayPermission()) {
            Toast.makeText(this, "⚠️ 플로팅 버튼 권한이 필요합니다", Toast.LENGTH_SHORT).show()
            return
        }

        if (!isFloatingButtonServiceRunning()) {
            Toast.makeText(this, "⚠️ 플로팅 버튼 서비스가 실행되지 않았습니다", Toast.LENGTH_SHORT).show()
            return
        }

        // 테스트 URL로 플로팅 버튼 표시
        val testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

        activityScope.launch {
            try {
                // 클립보드에 테스트 URL 복사
                val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("test_url", testUrl)
                clipboardManager.setPrimaryClip(clip)

                Toast.makeText(this@SettingsActivity, "🎈 테스트 URL이 클립보드에 복사됨 - 플로팅 버튼을 확인하세요!", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@SettingsActivity, "❌ 테스트 실패: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateFloatingButtonStatus() {
        try {
            // 설정 화면 업데이트 (플로팅 버튼 상태 포함)
            updateCurrentSettingsDisplay()
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 상태 업데이트 실패: ${e.message}")
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        // 권한 요청 결과 처리
        if (requestCode == PermissionHelper.OVERLAY_PERMISSION_REQUEST_CODE) {
            permissionHelper.handlePermissionResult(requestCode) { hasPermission ->
                if (hasPermission) {
                    Toast.makeText(this, "✅ 플로팅 버튼 권한이 허용되었습니다", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "❌ 플로팅 버튼 권한이 거부되었습니다", Toast.LENGTH_SHORT).show()
                }
                updateFloatingButtonStatus()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
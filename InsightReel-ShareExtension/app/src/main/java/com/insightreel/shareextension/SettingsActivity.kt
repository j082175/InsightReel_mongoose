package com.insightreel.shareextension

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*

class SettingsActivity : AppCompatActivity() {

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var networkManager: NetworkManager
    private lateinit var autoUpdateManager: AutoUpdateManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        preferencesManager = PreferencesManager(this)
        networkManager = NetworkManager(this)
        autoUpdateManager = AutoUpdateManager(this)

        setupBasicUI()
        setupVersionDisplay()
        updateNetworkStatus()
    }

    private fun setupBasicUI() {
        try {
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
            findViewById<Button>(R.id.buttonCheckUpdate)?.setOnClickListener {
                checkForUpdatesManually()
            }

            // 현재 설정 로드
            loadCurrentSettings()

        } catch (e: Exception) {
            println("⚠️ UI 요소 초기화 실패: ${e.message}")
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

            val settingsText = """
                📊 분석 타입: $analysisTypeText
                📱 전송 방식: $transmissionText
                🌐 서버: ${serverConfig.currentUrl}
                🔧 네트워크: ${if (serverConfig.isAutoMode) "자동 감지" else "수동 설정"}
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
            Toast.makeText(this, "✅ 모든 설정이 저장되었습니다!", Toast.LENGTH_SHORT).show()
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

    private fun setupVersionDisplay() {
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            findViewById<TextView>(R.id.settingsVersionText).text = "v${packageInfo.versionName}"
        } catch (e: Exception) {
            println("⚠️ 버전 표시 설정 실패: ${e.message}")
        }
    }

    private fun checkForUpdatesManually() {
        activityScope.launch {
            try {
                println("🔍 수동 업데이트 확인 시작!")
                Toast.makeText(this@SettingsActivity, "🔍 업데이트 확인 중...", Toast.LENGTH_SHORT).show()

                val serverUrl = preferencesManager.getCurrentServerUrl()
                println("📡 서버 URL: $serverUrl")

                autoUpdateManager.checkForUpdatesManually(serverUrl)
                println("📊 업데이트 확인 완료")

            } catch (e: Exception) {
                println("❌ 업데이트 확인 예외: ${e.message}")
                e.printStackTrace()
                Toast.makeText(this@SettingsActivity, "❌ 업데이트 확인 실패: ${e.message}", Toast.LENGTH_SHORT).show()
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

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
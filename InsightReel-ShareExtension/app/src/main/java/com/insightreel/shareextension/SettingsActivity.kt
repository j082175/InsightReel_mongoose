package com.insightreel.shareextension

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*

class SettingsActivity : AppCompatActivity() {

    private lateinit var preferencesManager: PreferencesManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // UI 컴포넌트들 - 분석 설정
    private lateinit var radioGroupAnalysisType: RadioGroup
    private lateinit var radioVideoOnly: RadioButton
    private lateinit var radioChannelOnly: RadioButton
    private lateinit var radioBoth: RadioButton
    private lateinit var switchShowModal: Switch
    private lateinit var textCurrentSettings: TextView
    private lateinit var buttonSave: Button
    private lateinit var buttonTest: Button

    // UI 컴포넌트들 - 서버 설정 (nullable로 변경)
    private var switchAutoDetectNetwork: Switch? = null
    private var editTextWifiServerUrl: EditText? = null
    private var editTextLteServerUrl: EditText? = null
    private var editTextManualServerUrl: EditText? = null
    private var textCurrentServerStatus: TextView? = null
    private var buttonTestConnection: Button? = null
    private var textNetworkStatus: TextView? = null

    private lateinit var networkManager: NetworkManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        preferencesManager = PreferencesManager(this)
        networkManager = NetworkManager(this)

        // 액션바에 뒤로가기 버튼 추가
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "⚙️ InsightReel 설정"

        initViews()
        loadCurrentSettings()
        setupClickListeners()
        updateCurrentSettingsDisplay()
        updateNetworkStatus()
    }

    // 액션바의 뒤로가기 버튼 처리
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }

    private fun initViews() {
        // 분석 설정 UI
        radioGroupAnalysisType = findViewById(R.id.radioGroupAnalysisType)
        radioVideoOnly = findViewById(R.id.radioVideoOnly)
        radioChannelOnly = findViewById(R.id.radioChannelOnly)
        radioBoth = findViewById(R.id.radioBoth)
        switchShowModal = findViewById(R.id.switchShowModal)
        textCurrentSettings = findViewById(R.id.textCurrentSettings)
        buttonSave = findViewById(R.id.buttonSave)
        buttonTest = findViewById(R.id.buttonTest)

        // 서버 설정 UI (임시로 기존 컴포넌트들로 매핑, 나중에 XML 수정 필요)
        try {
            switchAutoDetectNetwork = findViewById(R.id.switchAutoDetectNetwork)
            editTextWifiServerUrl = findViewById(R.id.editTextWifiServerUrl)
            editTextLteServerUrl = findViewById(R.id.editTextLteServerUrl)
            editTextManualServerUrl = findViewById(R.id.editTextManualServerUrl)
            textCurrentServerStatus = findViewById(R.id.textCurrentServerStatus)
            buttonTestConnection = findViewById(R.id.buttonTestConnection)
            textNetworkStatus = findViewById(R.id.textNetworkStatus)
        } catch (e: Exception) {
            // XML에 아직 추가되지 않은 경우 무시 (null로 남겨둠)
            println("⚠️ 서버 설정 UI 요소들이 XML에 아직 정의되지 않음")
        }
    }

    private fun loadCurrentSettings() {
        // 분석 타입 설정 로드
        when (preferencesManager.getAnalysisType()) {
            PreferencesManager.ANALYSIS_VIDEO_ONLY -> radioVideoOnly.isChecked = true
            PreferencesManager.ANALYSIS_CHANNEL_ONLY -> radioChannelOnly.isChecked = true
            PreferencesManager.ANALYSIS_BOTH -> radioBoth.isChecked = true
        }

        // 모달 표시 설정 로드
        switchShowModal.isChecked = preferencesManager.getShowModal()
    }

    private fun setupClickListeners() {
        // 라디오 그룹 변경 시 현재 설정 업데이트
        radioGroupAnalysisType.setOnCheckedChangeListener { _, _ ->
            updateCurrentSettingsDisplay()
        }

        // 스위치 변경 시 현재 설정 업데이트
        switchShowModal.setOnCheckedChangeListener { _, _ ->
            updateCurrentSettingsDisplay()
        }

        // 저장 버튼
        buttonSave.setOnClickListener {
            saveSettings()
        }

        // 테스트 버튼
        buttonTest.setOnClickListener {
            testSettings()
        }
    }

    private fun updateCurrentSettingsDisplay() {
        val analysisTypeText = when (radioGroupAnalysisType.checkedRadioButtonId) {
            R.id.radioVideoOnly -> "영상 분석만"
            R.id.radioChannelOnly -> "채널 분석만"
            R.id.radioBoth -> "영상+채널 분석"
            else -> "영상 분석만"
        }

        val modalText = if (switchShowModal.isChecked) "모달 표시" else "바로 전송"

        textCurrentSettings.text = "📊 분석 타입: $analysisTypeText\n💬 전송 방식: $modalText"
    }

    private fun saveSettings() {
        // 분석 타입 저장
        val analysisType = when (radioGroupAnalysisType.checkedRadioButtonId) {
            R.id.radioVideoOnly -> PreferencesManager.ANALYSIS_VIDEO_ONLY
            R.id.radioChannelOnly -> PreferencesManager.ANALYSIS_CHANNEL_ONLY
            R.id.radioBoth -> PreferencesManager.ANALYSIS_BOTH
            else -> PreferencesManager.ANALYSIS_VIDEO_ONLY
        }
        preferencesManager.setAnalysisType(analysisType)

        // 모달 표시 설정 저장
        preferencesManager.setShowModal(switchShowModal.isChecked)

        Toast.makeText(this, "✅ 설정이 저장되었습니다!", Toast.LENGTH_SHORT).show()
    }

    private fun testSettings() {
        val flags = preferencesManager.getAnalysisFlags()
        val showModal = preferencesManager.getShowModal()

        val testMessage = """
            🧪 현재 설정 테스트:

            📊 분석 타입: ${preferencesManager.getAnalysisTypeName()}
            - 영상 분석: ${if (flags.includeVideoAnalysis) "✅" else "❌"}
            - 채널 분석: ${if (flags.includeChannelAnalysis) "✅" else "❌"}

            💬 모달 표시: ${if (showModal) "✅ 확인창 표시" else "❌ 바로 전송"}
        """.trimIndent()

        Toast.makeText(this, testMessage, Toast.LENGTH_LONG).show()
    }

    // ========== 서버 설정 관련 함수들 ==========

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

                // 네트워크 상태 텍스트가 있으면 업데이트
                textNetworkStatus?.text = statusText

                println("📊 네트워크 상태: $statusText")
            } catch (e: Exception) {
                println("❌ 네트워크 상태 업데이트 실패: ${e.message}")
            }
        }
    }

    private fun loadServerSettings() {
        try {
            // 서버 설정 UI가 초기화되었을 때만 설정 로드
            if (::switchAutoDetectNetwork.isInitialized) {
                switchAutoDetectNetwork.isChecked = preferencesManager.getAutoDetectNetwork()
                editTextWifiServerUrl.setText(preferencesManager.getWifiServerUrl())
                editTextLteServerUrl.setText(preferencesManager.getLteServerUrl())
                editTextManualServerUrl.setText(preferencesManager.getManualServerUrl())
                updateServerStatus()
            }
        } catch (e: Exception) {
            println("⚠️ 서버 설정 로드 실패: ${e.message}")
        }
    }

    private fun updateServerStatus() {
        try {
            textCurrentServerStatus?.let { statusText ->
                val serverConfig = preferencesManager.getServerConfigSummary()
                statusText.text = """
                    📡 현재 서버: ${serverConfig.currentUrl}
                    🔧 모드: ${if (serverConfig.isAutoMode) "자동 감지" else "수동 설정"}
                """.trimIndent()
            }
        } catch (e: Exception) {
            println("⚠️ 서버 상태 업데이트 실패: ${e.message}")
        }
    }

    private fun testServerConnection() {
        activityScope.launch {
            try {
                val currentUrl = preferencesManager.getCurrentServerUrl()
                Toast.makeText(this@SettingsActivity, "🔍 서버 연결 테스트 중...", Toast.LENGTH_SHORT).show()

                val isHealthy = networkManager.checkServerHealth(currentUrl)
                val resultMessage = if (isHealthy) {
                    "✅ 서버 연결 성공!\n🔗 $currentUrl"
                } else {
                    "❌ 서버 연결 실패\n🔗 $currentUrl"
                }

                Toast.makeText(this@SettingsActivity, resultMessage, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@SettingsActivity, "❌ 연결 테스트 실패: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun saveServerSettings() {
        try {
            switchAutoDetectNetwork?.let { autoDetectSwitch ->
                preferencesManager.setAutoDetectNetwork(autoDetectSwitch.isChecked)
                editTextWifiServerUrl?.text?.toString()?.trim()?.let { wifiUrl ->
                    preferencesManager.setWifiServerUrl(wifiUrl)
                }
                editTextLteServerUrl?.text?.toString()?.trim()?.let { lteUrl ->
                    preferencesManager.setLteServerUrl(lteUrl)
                }
                editTextManualServerUrl?.text?.toString()?.trim()?.let { manualUrl ->
                    preferencesManager.setManualServerUrl(manualUrl)
                }

                updateServerStatus()
                updateNetworkStatus()

                Toast.makeText(this, "✅ 서버 설정이 저장되었습니다!", Toast.LENGTH_SHORT).show()
            } ?: run {
                Toast.makeText(this, "⚠️ 서버 설정 UI가 아직 구현되지 않았습니다", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "❌ 서버 설정 저장 실패: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
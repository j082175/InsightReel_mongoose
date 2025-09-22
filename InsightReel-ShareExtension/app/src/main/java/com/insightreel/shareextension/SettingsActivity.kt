package com.insightreel.shareextension

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    private lateinit var preferencesManager: PreferencesManager

    // UI 컴포넌트들
    private lateinit var radioGroupAnalysisType: RadioGroup
    private lateinit var radioVideoOnly: RadioButton
    private lateinit var radioChannelOnly: RadioButton
    private lateinit var radioBoth: RadioButton
    private lateinit var switchShowModal: Switch
    private lateinit var textCurrentSettings: TextView
    private lateinit var buttonSave: Button
    private lateinit var buttonTest: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        preferencesManager = PreferencesManager(this)

        // 액션바에 뒤로가기 버튼 추가
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "⚙️ InsightReel 설정"

        initViews()
        loadCurrentSettings()
        setupClickListeners()
        updateCurrentSettingsDisplay()
    }

    // 액션바의 뒤로가기 버튼 처리
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }

    private fun initViews() {
        radioGroupAnalysisType = findViewById(R.id.radioGroupAnalysisType)
        radioVideoOnly = findViewById(R.id.radioVideoOnly)
        radioChannelOnly = findViewById(R.id.radioChannelOnly)
        radioBoth = findViewById(R.id.radioBoth)
        switchShowModal = findViewById(R.id.switchShowModal)
        textCurrentSettings = findViewById(R.id.textCurrentSettings)
        buttonSave = findViewById(R.id.buttonSave)
        buttonTest = findViewById(R.id.buttonTest)
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
}
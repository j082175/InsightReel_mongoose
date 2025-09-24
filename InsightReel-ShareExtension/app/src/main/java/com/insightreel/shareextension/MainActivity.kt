package com.insightreel.shareextension

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    private lateinit var networkManager: NetworkManager
    private lateinit var preferencesManager: PreferencesManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var clipboardAnalyzeButton: Button? = null


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        println("🚀 MainActivity onCreate - 클립보드 버전 실행됨!")
        println("🚀 현재 시간: ${System.currentTimeMillis()}")

        networkManager = NetworkManager(this)
        preferencesManager = PreferencesManager(this)

        setupUI()

        // 앱 시작 후 약간 지연해서 클립보드 체크 (Android 10+ 대응)
        findViewById<android.widget.LinearLayout>(R.id.mainLayout).postDelayed({
            println("🔍 500ms 후 클립보드 체크 시작!")
            checkClipboardOnStart()
        }, 500)
    }

    private fun setupUI() {
        findViewById<TextView>(R.id.descriptionText).text =
            "YouTube/Instagram/TikTok에서 '공유' → 'InsightReel Share' 선택하세요!\n\n또는 아래에 링크를 직접 입력할 수도 있습니다."

        // 설정 버튼 추가
        val settingsButton = findViewById<Button>(R.id.settingsButton)
        settingsButton.setOnClickListener {
            openSettings()
        }
    }

    private fun openSettings() {
        val intent = Intent(this, SettingsActivity::class.java)
        startActivity(intent)
    }


    private fun checkClipboardOnStart() {
        try {
            println("🔍 클립보드 체크 진입!")
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

            println("📋 hasPrimaryClip: ${clipboardManager.hasPrimaryClip()}")
            if (!clipboardManager.hasPrimaryClip()) {
                println("📋 클립보드에 데이터 없음")
                return
            }

            val clipData = clipboardManager.primaryClip
            println("📋 clipData: $clipData")

            if (clipData != null && clipData.itemCount > 0) {
                val clipText = clipData.getItemAt(0).text?.toString() ?: ""
                println("📋 클립보드 텍스트: $clipText")

                if (clipText.isNotEmpty() && isValidVideoUrl(clipText)) {
                    println("✅ 유효한 URL 발견! 버튼 생성 시작")
                    showClipboardAnalyzeButton(clipText)
                } else {
                    println("❌ 유효하지 않은 URL: $clipText")
                }
            } else {
                println("📋 clipData가 null이거나 empty")
            }
        } catch (e: Exception) {
            println("⚠️ 클립보드 확인 실패: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun showClipboardAnalyzeButton(url: String) {
        println("🎯 showClipboardAnalyzeButton 호출됨! URL: $url")

        // 기존 버튼이 있으면 제거
        clipboardAnalyzeButton?.let { button ->
            println("🗑️ 기존 버튼 제거")
            val parent = button.parent as? android.view.ViewGroup
            parent?.removeView(button)
        }

        // 새 버튼 생성 (매우 크고 중앙 정렬)
        println("🔨 새 버튼 생성 중...")
        clipboardAnalyzeButton = Button(this).apply {
            text = "📹 클립보드 URL 분석하기"
            textSize = 24f  // 훨씬 더 큰 텍스트
            setBackgroundColor(0xFF4CAF50.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(64, 48, 64, 48)  // 훨씬 더 큰 패딩
            elevation = 12f  // 더 강한 그림자 효과

            // 버튼을 더 둥글게
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
            // 중앙 레이아웃에 버튼 추가
            val centerLayout = findViewById<android.widget.LinearLayout>(R.id.mainLayout)
                .getChildAt(1) as android.widget.LinearLayout  // 중앙 영역 (layout_weight=1인 부분)
            println("🎯 centerLayout 찾음: $centerLayout")

            // 정사각형 버튼을 위한 크기 계산 (화면 너비의 70%)
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val buttonSize = (screenWidth * 0.7).toInt()

            val layoutParams = android.widget.LinearLayout.LayoutParams(
                buttonSize,
                buttonSize
            )
            layoutParams.setMargins(32, 32, 32, 32)  // 더 큰 여백
            clipboardAnalyzeButton?.layoutParams = layoutParams

            // 중앙 레이아웃에 추가
            centerLayout.addView(clipboardAnalyzeButton)
            println("✅ 버튼 추가 완료!")

            // URL 미리보기 표시
            val shortUrl = if (url.length > 50) url.substring(0, 47) + "..." else url
            Toast.makeText(this, "📋 클립보드에서 URL 발견: $shortUrl", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            println("❌ 버튼 추가 실패: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun analyzeCurrentClipboard() {
        clipboardAnalyzeButton?.text = "클립보드 확인 중..."
        clipboardAnalyzeButton?.isEnabled = false

        activityScope.launch {
            try {
                // 실시간으로 클립보드에서 URL 가져오기
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

    private fun getCurrentClipboardUrl(): String {
        return try {
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

            if (!clipboardManager.hasPrimaryClip()) {
                return ""
            }

            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val clipText = clipData.getItemAt(0).text?.toString() ?: ""
                if (clipText.isNotEmpty() && isValidVideoUrl(clipText)) {
                    clipText
                } else {
                    ""
                }
            } else {
                ""
            }
        } catch (e: Exception) {
            println("⚠️ 실시간 클립보드 확인 실패: ${e.message}")
            ""
        }
    }

    private fun analyzeUrl(url: String) {
        clipboardAnalyzeButton?.text = "분석 중..."

        activityScope.launch {
            try {
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val analysisFlags = preferencesManager.getAnalysisFlags()
                val success = networkManager.sendVideoUrl(serverUrl, url, analysisFlags)

                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"
                if (success) {
                    Toast.makeText(this@MainActivity, "✅ 분석 완료! ($networkType)", Toast.LENGTH_SHORT).show()
                    // 버튼 제거
                    clipboardAnalyzeButton?.let { button ->
                        val parent = button.parent as? android.view.ViewGroup
                        parent?.removeView(button)
                    }
                    clipboardAnalyzeButton = null
                } else {
                    Toast.makeText(this@MainActivity, "❌ 분석 실패 ($networkType)", Toast.LENGTH_SHORT).show()
                    clipboardAnalyzeButton?.text = "📹 클립보드 URL 분석하기"
                    clipboardAnalyzeButton?.isEnabled = true
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "❌ 네트워크 오류: ${e.message}", Toast.LENGTH_SHORT).show()
                clipboardAnalyzeButton?.text = "📹 클립보드 URL 분석하기"
                clipboardAnalyzeButton?.isEnabled = true
            }
        }
    }

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
        // 앱이 다시 포그라운드로 올 때마다 클립보드 체크 (Android 10+ 대응으로 지연)
        findViewById<android.widget.LinearLayout>(R.id.mainLayout).postDelayed({
            checkClipboardOnStart()
        }, 200)
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
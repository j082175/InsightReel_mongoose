package com.insightreel.shareextension

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import org.json.JSONObject

class ShareActivity : AppCompatActivity() {

    companion object {
        // 🔧 InsightReel 서버 주소 설정
        // 에뮬레이터용: "http://10.0.2.2:3000"
        // 실제 IP 사용: "http://192.168.0.2:3000"
        private const val SERVER_URL = "http://10.0.2.2:3000"

        private val SUPPORTED_DOMAINS = listOf(
            "youtube.com", "youtu.be", "www.youtube.com",
            "instagram.com", "www.instagram.com",
            "tiktok.com", "www.tiktok.com"
        )
    }

    private lateinit var networkManager: NetworkManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var preferencesManager: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 설정 관리자 초기화
        preferencesManager = PreferencesManager(this)
        networkManager = NetworkManager(this)

        when {
            intent?.action == Intent.ACTION_SEND -> {
                if (intent.type?.startsWith("text/") == true) {
                    handleSharedText(intent)
                } else {
                    showErrorAndFinish("지원하지 않는 공유 형식입니다")
                }
            }
            else -> {
                showErrorAndFinish("지원하지 않는 공유 형식입니다")
            }
        }
    }

    private fun handleSharedText(intent: Intent) {
        intent.getStringExtra(Intent.EXTRA_TEXT)?.let { sharedText ->
            processSharedUrl(sharedText)
        } ?: showErrorAndFinish("공유된 텍스트를 찾을 수 없습니다")
    }

    private fun processSharedUrl(sharedText: String) {
        val url = extractValidUrl(sharedText)
        if (url != null) {
            // 설정에 따라 모달 표시 여부 결정
            if (preferencesManager.getShowModal()) {
                showConfirmationDialog(url)
            } else {
                // 바로 전송
                val analysisType = preferencesManager.getAnalysisTypeName()
                showToast("📤 백그라운드에서 전송 중... ($analysisType)")
                sendToInsightReel(url)
            }
        } else {
            showErrorAndFinish("지원하지 않는 URL입니다\n(YouTube, Instagram, TikTok만 지원)")
        }
    }

    private fun showConfirmationDialog(url: String) {
        // 현재 분석 설정에 따라 다른 모달 표시
        val analysisFlags = preferencesManager.getAnalysisFlags()

        if (analysisFlags.includeChannelAnalysis) {
            // 채널 분석이 포함된 경우 채널 수집 모달 표시
            showChannelCollectionModal(url)
        } else {
            // 영상 분석만인 경우 기존 확인 모달 표시
            showVideoConfirmationDialog(url)
        }
    }

    private fun showChannelCollectionModal(url: String) {
        val channelCollectionModal = ChannelCollectionModal(this, networkManager)
        channelCollectionModal.show(url) { success ->
            if (success) {
                showToast("✅ 수집 완료!")
            } else {
                showToast("❌ 수집 실패")
            }
            finish()
        }
    }

    private fun showVideoConfirmationDialog(url: String) {
        // Chrome 확장프로그램 스타일 커스텀 다이얼로그 생성
        val dialogView = layoutInflater.inflate(R.layout.dialog_chrome_style_confirm, null)

        // UI 요소들 초기화
        val statusContainer = dialogView.findViewById<LinearLayout>(R.id.statusContainer)
        val statusIcon = dialogView.findViewById<TextView>(R.id.statusIcon)
        val statusText = dialogView.findViewById<TextView>(R.id.statusText)
        val urlText = dialogView.findViewById<TextView>(R.id.urlText)
        val platformText = dialogView.findViewById<TextView>(R.id.platformText)
        val totalVideos = dialogView.findViewById<TextView>(R.id.totalVideos)
        val todayVideos = dialogView.findViewById<TextView>(R.id.todayVideos)
        val analysisTypeText = dialogView.findViewById<TextView>(R.id.analysisTypeText)
        val buttonCancel = dialogView.findViewById<Button>(R.id.buttonCancel)
        val buttonConfirm = dialogView.findViewById<Button>(R.id.buttonConfirm)
        val settingsLink = dialogView.findViewById<TextView>(R.id.settingsLink)

        // 플랫폼 정보 설정
        val platformName = when {
            url.contains("youtube.com") || url.contains("youtu.be") -> "YouTube"
            url.contains("instagram.com") -> "Instagram"
            url.contains("tiktok.com") -> "TikTok"
            else -> "비디오"
        }

        // URL 표시 (길면 축약)
        val displayUrl = if (url.length > 60) {
            url.substring(0, 57) + "..."
        } else {
            url
        }

        // UI 데이터 설정
        urlText.text = displayUrl
        platformText.text = platformName
        analysisTypeText.text = preferencesManager.getAnalysisTypeName()

        // 임시 통계 (실제로는 서버에서 가져와야 함)
        totalVideos.text = "23"
        todayVideos.text = "3"

        // 서버 연결 상태 확인
        activityScope.launch {
            try {
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val response = networkManager.checkServerHealth(serverUrl)
                if (response) {
                    statusIcon.text = "✅"
                    statusText.text = "서버 연결됨"
                    statusContainer.setBackgroundColor(getColor(android.R.color.holo_green_light))
                } else {
                    statusIcon.text = "⚠️"
                    statusText.text = "서버 연결 불안정"
                    statusContainer.setBackgroundColor(getColor(android.R.color.holo_orange_light))
                }
            } catch (e: Exception) {
                statusIcon.text = "❌"
                statusText.text = "서버 연결 실패"
                statusContainer.setBackgroundColor(getColor(android.R.color.holo_red_light))
            }
        }

        // 다이얼로그 생성
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        // 버튼 이벤트 설정
        buttonCancel.setOnClickListener {
            dialog.dismiss()
            finish()
        }

        buttonConfirm.setOnClickListener {
            val analysisType = preferencesManager.getAnalysisTypeName()
            showToast("📤 백그라운드에서 전송 중... ($analysisType)")
            dialog.dismiss()
            sendToInsightReel(url)
        }

        settingsLink.setOnClickListener {
            dialog.dismiss()
            // 설정 화면으로 이동
            val intent = Intent(this, SettingsActivity::class.java)
            startActivity(intent)
            finish()
        }

        // 다이얼로그 취소 시 액티비티 종료
        dialog.setOnCancelListener {
            finish()
        }

        dialog.show()
    }

    private fun extractValidUrl(text: String): String? {
        val urlPattern = Regex("https?://[^\\s]+")
        val urls = urlPattern.findAll(text).map { it.value }.toList()

        return urls.find { url ->
            SUPPORTED_DOMAINS.any { domain -> url.contains(domain, ignoreCase = true) }
        }
    }

    private fun sendToInsightReel(url: String) {
        // 즉시 토스트 표시하고 액티비티 종료
        showToast("📤 백그라운드에서 전송 중...")

        // 백그라운드에서 처리
        activityScope.launch {
            try {
                // 현재 설정에 따른 분석 플래그 및 서버 URL 가져오기
                val analysisFlags = preferencesManager.getAnalysisFlags()
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"

                println("📡 전송: $networkType 네트워크로 $serverUrl 서버에 전송")

                val success = networkManager.sendVideoUrl(serverUrl, url, analysisFlags)
                if (success) {
                    println("✅ 백그라운드 전송 완료! ($networkType)")
                } else {
                    println("❌ 백그라운드 전송 실패 ($networkType)")
                }
            } catch (e: Exception) {
                println("❌ 백그라운드 네트워크 오류: ${e.message}")
            }
        }

        // 즉시 액티비티 종료하여 다른 앱 사용 가능하게 함
        finish()
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    private fun showErrorAndFinish(message: String) {
        showToast(message)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
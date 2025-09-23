package com.insightreel.shareextension

import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.*

class ClipboardMonitor(private val context: Context) {

    companion object {
        private val SUPPORTED_DOMAINS = listOf(
            "youtube.com", "youtu.be", "www.youtube.com",
            "instagram.com", "www.instagram.com",
            "tiktok.com", "www.tiktok.com"
        )
    }

    private val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var lastClipText = ""

    // 콜백 함수들
    private var onValidUrlDetected: ((String) -> Unit)? = null
    private var onInvalidUrlDetected: (() -> Unit)? = null

    // 클립보드 변경 리스너
    private val clipboardListener = ClipboardManager.OnPrimaryClipChangedListener {
        checkClipboardForUrl()
    }

    /**
     * 클립보드 모니터링 시작
     */
    fun startMonitoring() {
        if (!isMonitoring) {
            try {
                clipboardManager.addPrimaryClipChangedListener(clipboardListener)
                isMonitoring = true
                println("📋 클립보드 모니터링 시작됨")

                // 최초 실행 시 현재 클립보드 내용 확인
                checkClipboardForUrl()
            } catch (e: Exception) {
                println("❌ 클립보드 모니터링 시작 실패: ${e.message}")
            }
        }
    }

    /**
     * 클립보드 모니터링 중지
     */
    fun stopMonitoring() {
        if (isMonitoring) {
            try {
                clipboardManager.removePrimaryClipChangedListener(clipboardListener)
                isMonitoring = false
                println("📋 클립보드 모니터링 중지됨")
            } catch (e: Exception) {
                println("❌ 클립보드 모니터링 중지 실패: ${e.message}")
            }
        }
    }

    /**
     * 유효한 URL 감지 시 콜백 설정
     */
    fun setOnValidUrlDetected(callback: (String) -> Unit) {
        onValidUrlDetected = callback
    }

    /**
     * 무효한 URL 감지 시 콜백 설정
     */
    fun setOnInvalidUrlDetected(callback: () -> Unit) {
        onInvalidUrlDetected = callback
    }

    /**
     * 클립보드 내용 확인 및 URL 검증
     */
    private fun checkClipboardForUrl() {
        try {
            val clipText = getCurrentClipboardText()

            // 같은 내용이지만 플로팅 버튼이 숨겨진 상태라면 다시 표시
            // (사용자가 의도적으로 같은 URL을 다시 복사한 경우를 고려)
            val isDuplicate = clipText == lastClipText
            lastClipText = clipText

            println("📋 클립보드 처리: 중복=${isDuplicate}, 텍스트=${clipText.take(30)}...")

            if (clipText.isNotEmpty()) {
                println("📋 클립보드 변경 감지: ${clipText.take(50)}...")

                if (isValidVideoUrl(clipText)) {
                    println("✅ 유효한 비디오 URL 감지: $clipText")
                    onValidUrlDetected?.invoke(clipText)
                } else {
                    println("ℹ️ 비디오 URL 아님, 플로팅 버튼 숨김")
                    onInvalidUrlDetected?.invoke()
                }
            }
        } catch (e: Exception) {
            println("❌ 클립보드 확인 실패: ${e.message}")
        }
    }

    /**
     * 현재 클립보드 텍스트 가져오기
     */
    private fun getCurrentClipboardText(): String {
        return try {
            val clipData = clipboardManager.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val item = clipData.getItemAt(0)
                item.text?.toString() ?: ""
            } else {
                ""
            }
        } catch (e: Exception) {
            println("❌ 클립보드 텍스트 읽기 실패: ${e.message}")
            ""
        }
    }

    /**
     * URL이 지원되는 비디오 플랫폼인지 검증
     */
    private fun isValidVideoUrl(text: String): Boolean {
        if (text.isBlank()) return false

        return try {
            // URL 패턴 확인
            val urlPattern = Regex("https?://[^\\s]+")
            val urls = urlPattern.findAll(text).map { it.value }.toList()

            // 지원되는 도메인 확인
            urls.any { url ->
                SUPPORTED_DOMAINS.any { domain ->
                    url.contains(domain, ignoreCase = true)
                }
            }
        } catch (e: Exception) {
            println("❌ URL 검증 실패: ${e.message}")
            false
        }
    }

    /**
     * URL에서 플랫폼 감지
     */
    fun detectPlatform(url: String): String {
        return when {
            url.contains("youtube.com", ignoreCase = true) ||
            url.contains("youtu.be", ignoreCase = true) -> "YOUTUBE"
            url.contains("instagram.com", ignoreCase = true) -> "INSTAGRAM"
            url.contains("tiktok.com", ignoreCase = true) -> "TIKTOK"
            else -> "UNKNOWN"
        }
    }

    /**
     * 현재 모니터링 상태 반환
     */
    fun isMonitoring(): Boolean = isMonitoring

    /**
     * 마지막으로 감지된 클립보드 텍스트 반환
     */
    fun getLastClipText(): String = lastClipText

    /**
     * 클립보드 상태 요약 정보 반환
     */
    fun getStatusSummary(): ClipboardStatusSummary {
        val currentText = getCurrentClipboardText()
        val isValid = isValidVideoUrl(currentText)
        val platform = if (isValid) detectPlatform(currentText) else "NONE"

        return ClipboardStatusSummary(
            isMonitoring = isMonitoring,
            currentText = currentText,
            isValidUrl = isValid,
            platform = platform,
            lastChecked = System.currentTimeMillis()
        )
    }

    /**
     * 메모리 정리
     */
    fun cleanup() {
        stopMonitoring()
        onValidUrlDetected = null
        onInvalidUrlDetected = null
        lastClipText = ""
        println("🧹 ClipboardMonitor 정리 완료")
    }
}

/**
 * 클립보드 상태 요약 정보 데이터 클래스
 */
data class ClipboardStatusSummary(
    val isMonitoring: Boolean,
    val currentText: String,
    val isValidUrl: Boolean,
    val platform: String,
    val lastChecked: Long
)
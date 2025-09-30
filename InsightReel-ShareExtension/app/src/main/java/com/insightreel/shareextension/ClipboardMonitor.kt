package com.insightreel.shareextension

import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlinx.coroutines.*

class ClipboardMonitor(private val context: Context) {

    companion object {
        private const val TAG = "ClipboardMonitor"
        private val SUPPORTED_DOMAINS = listOf(
            "youtube.com", "youtu.be", "www.youtube.com",
            "instagram.com", "www.instagram.com",
            "tiktok.com", "www.tiktok.com"
        )
        private const val POLLING_INTERVAL = 2000L // 2초마다 폴링
        private const val HEALTH_CHECK_INTERVAL = 15000L // 15초마다 건강성 체크 (더 빈번하게)
        private const val LISTENER_TIMEOUT = 30000L // 30초 후 재등록 (더 적극적)
    }

    private val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    private val handler = Handler(Looper.getMainLooper())
    private var isMonitoring = false
    private var lastClipText = ""
    private var lastListenerTriggerTime = 0L

    // 콜백 함수들
    private var onValidUrlDetected: ((String) -> Unit)? = null
    private var onInvalidUrlDetected: (() -> Unit)? = null

    // 클립보드 변경 리스너
    private val clipboardListener = ClipboardManager.OnPrimaryClipChangedListener {
        val currentTime = System.currentTimeMillis()
        lastListenerTriggerTime = currentTime
        Log.d(TAG, "🔥 클립보드 리스너 트리거됨! (시간: $currentTime)")

        // 리스너 상태 확인
        if (!isMonitoring) {
            Log.w(TAG, "⚠️ 모니터링이 중지된 상태에서 리스너 호출됨")
            return@OnPrimaryClipChangedListener
        }

        // Android 10+에서는 클립보드 변경 감지는 되지만 내용 읽기가 제한됨
        // 따라서 변경 감지만으로 플로팅 버튼을 표시하고, 실제 URL은 클릭 시점에 읽기
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            Log.d(TAG, "🔥 Android 10+ 클립보드 변경 감지 - 무조건 플로팅 버튼 표시")
            // 클립보드 변경이 감지되었으므로 무조건 플로팅 버튼 표시
            val temporaryUrl = "clipboard_changed"
            onValidUrlDetected?.invoke(temporaryUrl)
        } else {
            checkClipboardForUrl()
        }
    }

    // 백업 폴링 런어블 (리스너가 작동하지 않을 경우를 대비)
    private val pollingRunnable = object : Runnable {
        override fun run() {
            if (isMonitoring) {
                Log.d(TAG, "🔍 클립보드 폴링 체크...")
                checkClipboardForUrl()
                handler.postDelayed(this, POLLING_INTERVAL)
            }
        }
    }

    /**
     * 클립보드 모니터링 시작
     */
    fun startMonitoring() {
        if (!isMonitoring) {
            try {
                // 리스너 등록
                clipboardManager.addPrimaryClipChangedListener(clipboardListener)
                isMonitoring = true
                Log.d(TAG, "📋 클립보드 모니터링 시작됨 (리스너 + 폴링)")

                // 최초 실행 시 현재 클립보드 내용 확인
                checkClipboardForUrl()

                // 🔥 CRITICAL FIX: Enable polling for ALL Android versions as backup
                // The listener is unreliable and gets killed by system
                handler.postDelayed(pollingRunnable, POLLING_INTERVAL)
                Log.d(TAG, "📋 백업 폴링 시작 (모든 Android 버전)")

                // 주기적으로 모니터링 상태 확인
                startHealthCheck()
            } catch (e: Exception) {
                Log.e(TAG, "❌ 클립보드 모니터링 시작 실패: ${e.message}")
            }
        }
    }

    /**
     * 모니터링 상태 건강성 체크 (리스너 해제 감지 및 복구)
     */
    private fun startHealthCheck() {
        val healthCheckRunnable = object : Runnable {
            override fun run() {
                if (isMonitoring) {
                    val currentTime = System.currentTimeMillis()
                    val timeSinceLastTrigger = currentTime - lastListenerTriggerTime

                    // 🔥 CRITICAL FIX: Always re-register if timeout exceeded (even if never triggered)
                    // This fixes the issue where listener stops working silently
                    if (timeSinceLastTrigger > LISTENER_TIMEOUT) {
                        Log.w(TAG, "⚠️ 리스너가 ${LISTENER_TIMEOUT / 1000}초 이상 비활성화 상태 - 재등록 시도")
                        reRegisterListener()
                    } else {
                        val timeStr = if (lastListenerTriggerTime == 0L) {
                            "아직 트리거 안됨"
                        } else {
                            "${timeSinceLastTrigger / 1000}초 전"
                        }
                        Log.d(TAG, "🏥 모니터링 건강성 체크 - 상태: 정상 (마지막 트리거: $timeStr)")
                    }

                    // 15초마다 건강성 체크
                    handler.postDelayed(this, HEALTH_CHECK_INTERVAL)
                } else {
                    Log.w(TAG, "⚠️ 모니터링이 비활성화됨 - 건강성 체크 중단")
                }
            }
        }
        handler.postDelayed(healthCheckRunnable, HEALTH_CHECK_INTERVAL)
    }

    /**
     * 리스너 재등록 (시스템에 의해 해제된 경우 복구)
     */
    private fun reRegisterListener() {
        try {
            Log.d(TAG, "🔄 클립보드 리스너 재등록 시도...")

            // 기존 리스너 제거
            clipboardManager.removePrimaryClipChangedListener(clipboardListener)

            // 잠시 대기 후 재등록 (메인 스레드 블록 방지)
            handler.postDelayed({
                try {
                    clipboardManager.addPrimaryClipChangedListener(clipboardListener)
                    lastListenerTriggerTime = System.currentTimeMillis()
                    Log.d(TAG, "✅ 클립보드 리스너 재등록 완료")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ 리스너 재등록 실패: ${e.message}")
                }
            }, 100L)

        } catch (e: Exception) {
            Log.e(TAG, "❌ 리스너 제거 실패: ${e.message}")
        }
    }

    /**
     * 클립보드 모니터링 중지
     */
    fun stopMonitoring() {
        if (isMonitoring) {
            try {
                clipboardManager.removePrimaryClipChangedListener(clipboardListener)
                handler.removeCallbacks(pollingRunnable)
                isMonitoring = false
                println("📋 클립보드 모니터링 중지됨 (리스너 + 폴링)")
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
     * Android 10+ 클립보드 변경 처리 (내용 읽기 제한 대응)
     */
    private fun handleClipboardChangeForAndroid10Plus() {
        try {
            Log.d(TAG, "🎈 Android 10+ 클립보드 변경 감지 - 플로팅 버튼 표시")

            // 짧은 지연 후 실제 클립보드 내용 읽기 시도 (때때로 성공할 수 있음)
            handler.postDelayed({
                val clipText = getCurrentClipboardText()
                if (clipText.isNotEmpty() && isValidVideoUrl(clipText)) {
                    Log.d(TAG, "✅ Android 10+에서 실제 URL 읽기 성공: ${clipText.take(30)}...")
                    onValidUrlDetected?.invoke(clipText)
                } else {
                    Log.d(TAG, "⚠️ Android 10+ 클립보드 읽기 실패 - 임시 버튼 표시")
                    // 임시 URL로 플로팅 버튼 표시 (실제 URL은 클릭 시점에 읽기)
                    val temporaryUrl = "https://www.youtube.com/watch?v=temp"
                    onValidUrlDetected?.invoke(temporaryUrl)
                }
            }, 100) // 100ms 지연

        } catch (e: Exception) {
            Log.e(TAG, "❌ Android 10+ 클립보드 처리 실패: ${e.message}")
        }
    }

    /**
     * 클립보드 내용 확인 및 URL 검증 (중복 처리 개선)
     */
    private fun checkClipboardForUrl() {
        try {
            val clipText = getCurrentClipboardText()

            // 🔥 DEBUG: Show actual clipboard content
            Log.d(TAG, "📋 현재 클립보드: '${clipText.take(50)}...' (길이: ${clipText.length})")
            Log.d(TAG, "📋 저장된 클립보드: '${lastClipText.take(50)}...' (길이: ${lastClipText.length})")

            // 중복 체크 - 완전히 같은 내용이면 무시
            val isDuplicate = clipText == lastClipText
            if (isDuplicate) {
                Log.d(TAG, "🔄 중복된 클립보드 내용 감지 - 무시")
                return
            }

            lastClipText = clipText
            Log.d(TAG, "✨ 새로운 클립보드 내용 감지: ${clipText.take(50)}...")

            if (clipText.isNotEmpty()) {
                if (isValidVideoUrl(clipText)) {
                    Log.d(TAG, "✅ 유효한 비디오 URL 감지: ${clipText.take(50)}...")
                    onValidUrlDetected?.invoke(clipText)
                } else {
                    Log.d(TAG, "ℹ️ 비디오 URL 아님")
                    onInvalidUrlDetected?.invoke()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ 클립보드 확인 실패: ${e.message}")
        }
    }

    /**
     * 현재 클립보드 텍스트 가져오기 (로그 최소화)
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
        } catch (e: SecurityException) {
            Log.w(TAG, "클립보드 보안 접근 제한: ${e.message}")
            ""
        } catch (e: Exception) {
            Log.w(TAG, "클립보드 텍스트 읽기 실패: ${e.message}")
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
        handler.removeCallbacks(pollingRunnable)
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
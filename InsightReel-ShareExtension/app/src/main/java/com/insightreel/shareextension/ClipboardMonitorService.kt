package com.insightreel.shareextension

import android.app.*
import android.content.*
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

/**
 * Android 11+ 권장사항을 따른 포그라운드 서비스
 * 1. 포그라운드 서비스로 백그라운드 실행 보장
 * 2. 클립보드 감지 시 알림으로 사용자에게 안내
 * 3. 사용자 클릭으로만 앱 실행
 */
class ClipboardMonitorService : Service() {

    companion object {
        private const val TAG = "ClipboardMonitorService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "clipboard_monitor_channel"
        private const val CHANNEL_NAME = "클립보드 모니터링"
        private const val ACTION_PROCESS_URL = "com.insightreel.shareextension.PROCESS_URL"
        private const val ACTION_STOP_SERVICE = "com.insightreel.shareextension.STOP_SERVICE"
        private const val EXTRA_URL = "url"
        private const val EXTRA_PLATFORM = "platform"

        // Broadcast action for service state changes
        const val ACTION_SERVICE_STATE_CHANGED = "com.insightreel.shareextension.SERVICE_STATE_CHANGED"
        const val EXTRA_SERVICE_RUNNING = "service_running"
    }

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var clipboardMonitor: ClipboardMonitor
    private lateinit var networkManager: NetworkManager
    private lateinit var preferencesManager: PreferencesManager
    private var notificationManager: NotificationManager? = null
    private var isServiceRunning = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🚀 ClipboardMonitorService 생성됨")

        // 의존성 초기화
        clipboardMonitor = ClipboardMonitor(this)
        networkManager = NetworkManager(this)
        preferencesManager = PreferencesManager(this)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // 알림 채널 생성
        createNotificationChannel()

        // 클립보드 모니터 콜백 설정
        setupClipboardCallbacks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "🎯 onStartCommand: ${intent?.action}")

        when (intent?.action) {
            ACTION_PROCESS_URL -> {
                val url = intent.getStringExtra(EXTRA_URL)
                val platform = intent.getStringExtra(EXTRA_PLATFORM)
                if (url != null) {
                    processVideoUrl(url, platform ?: "UNKNOWN")
                }
            }
            ACTION_STOP_SERVICE -> {
                stopService()
            }
            else -> {
                startForegroundService()
            }
        }

        return START_STICKY // 서비스가 종료되어도 자동 재시작
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * 포그라운드 서비스 시작
     */
    private fun startForegroundService() {
        if (!isServiceRunning) {
            Log.d(TAG, "🔥 포그라운드 서비스 시작")

            val notification = createServiceNotification(
                title = "InsightReel 대기 중",
                content = "YouTube/Instagram/TikTok 링크를 복사하면 자동으로 감지합니다",
                showProgressBar = false
            )

            startForeground(NOTIFICATION_ID, notification)

            // 클립보드 모니터링 시작
            clipboardMonitor.startMonitoring()
            isServiceRunning = true

            // Broadcast service state change
            sendServiceStateBroadcast(true)

            Log.d(TAG, "✅ 포그라운드 서비스 시작 완료")
        }
    }

    /**
     * 클립보드 모니터 콜백 설정
     */
    private fun setupClipboardCallbacks() {
        // 유효한 URL 감지 시 - 설정에 따라 즉시 전송 또는 알림 표시
        clipboardMonitor.setOnValidUrlDetected { url ->
            Log.d(TAG, "🎯 유효한 URL 감지: ${url.take(50)}...")

            val platform = clipboardMonitor.detectPlatform(url)
            val platformEmoji = when (platform) {
                "YOUTUBE" -> "📺"
                "INSTAGRAM" -> "📸"
                "TIKTOK" -> "🎵"
                else -> "🎬"
            }

            // 설정에서 자동 전송 모드 확인
            val autoSendEnabled = preferencesManager.getAutoSend()

            // Android 10+에서는 임시 URL일 수 있음
            val isTemporaryUrl = url == "clipboard_changed" || url.contains("temp")

            if (isTemporaryUrl) {
                Log.d(TAG, "⚡ Android 10+ 임시 URL - 실제 클립보드에서 읽기")
                val actualUrl = getCurrentClipboardText()
                if (actualUrl.isNotEmpty() && isValidVideoUrl(actualUrl)) {
                    if (autoSendEnabled) {
                        Log.d(TAG, "🚀 자동 전송 모드: 즉시 서버 전송 시작")
                        processVideoUrl(actualUrl, platform)
                    } else {
                        Log.d(TAG, "📢 수동 모드: 알림 표시")
                        showUrlDetectedNotification(
                            title = "$platformEmoji 링크 감지됨!",
                            content = "클릭하여 분석을 시작하세요",
                            url = actualUrl,
                            platform = platform
                        )
                    }
                }
            } else {
                // 실제 URL을 읽을 수 있는 경우
                if (autoSendEnabled) {
                    Log.d(TAG, "🚀 자동 전송 모드: 즉시 서버 전송 시작")
                    processVideoUrl(url, platform)
                } else {
                    Log.d(TAG, "📢 수동 모드: 알림 표시")
                    showUrlDetectedNotification(
                        title = "$platformEmoji 링크 감지됨!",
                        content = "클릭하여 분석을 시작하세요",
                        url = url,
                        platform = platform
                    )
                }
            }
        }

        // 무효한 URL 감지 시 (서비스는 계속 유지)
        clipboardMonitor.setOnInvalidUrlDetected {
            Log.d(TAG, "ℹ️ 무효한 URL - 대기 상태 유지")
            // 서비스 상태를 대기로 변경
            updateServiceNotification(
                title = "InsightReel 대기 중",
                content = "YouTube/Instagram/TikTok 링크를 복사하면 자동으로 감지합니다"
            )
        }
    }

    /**
     * URL 감지 알림 표시
     */
    private fun showUrlDetectedNotification(title: String, content: String, url: String, platform: String) {
        val processIntent = Intent(this, ClipboardMonitorService::class.java).apply {
            action = ACTION_PROCESS_URL
            putExtra(EXTRA_URL, url)
            putExtra(EXTRA_PLATFORM, platform)
        }

        val processPendingIntent = PendingIntent.getService(
            this, 0, processIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val openAppPendingIntent = PendingIntent.getActivity(
            this, 1, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(processPendingIntent)
            .addAction(
                android.R.drawable.ic_media_play,
                "분석하기",
                processPendingIntent
            )
            .addAction(
                android.R.drawable.ic_menu_view,
                "앱 열기",
                openAppPendingIntent
            )
            .setStyle(NotificationCompat.BigTextStyle().bigText(content))
            .build()

        notificationManager?.notify(NOTIFICATION_ID + 1, notification)

        Log.d(TAG, "📢 URL 감지 알림 표시: $title")
    }

    /**
     * 토스트 메시지 표시 (메인 스레드에서 실행, 터치를 방해하지 않음)
     */
    private fun showToast(message: String, duration: Int = Toast.LENGTH_SHORT) {
        mainHandler.post {
            try {
                val toast = Toast.makeText(this, message, duration)
                toast.show()
                Log.d(TAG, "📢 토스트 표시: $message")
            } catch (e: Exception) {
                Log.w(TAG, "토스트 표시 실패: ${e.message}")
            }
        }
    }

    /**
     * 비디오 URL 처리
     */
    private fun processVideoUrl(url: String, platform: String) {
        serviceScope.launch {
            try {
                // 시작 토스트 메시지
                showToast("🚀 비디오 분석 시작 중...")

                updateServiceNotification(
                    title = "비디오 분석 중...",
                    content = "잠시만 기다려주세요",
                    showProgressBar = true
                )

                // 실제 URL이 없는 경우 (Android 10+) 실시간으로 클립보드에서 읽기
                val actualUrl = if (url.isEmpty() || url == "clipboard_changed") {
                    clipboardMonitor.getLastClipText().ifEmpty {
                        getCurrentClipboardText()
                    }
                } else {
                    url
                }

                if (actualUrl.isEmpty() || !isValidVideoUrl(actualUrl)) {
                    showErrorNotification("클립보드에서 유효한 비디오 링크를 찾을 수 없습니다")
                    return@launch
                }

                Log.d(TAG, "🔄 비디오 URL 처리 시작: ${actualUrl.take(50)}...")

                val serverUrl = preferencesManager.getCurrentServerUrl()
                val analysisFlags = preferencesManager.getAnalysisFlags()
                val success = networkManager.sendVideoUrl(serverUrl, actualUrl, analysisFlags)

                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"

                if (success) {
                    showToast("✅ 분석 완료! ($networkType)", Toast.LENGTH_LONG)
                    showSuccessNotification(
                        title = "✅ 분석 완료!",
                        content = "비디오 분석이 완료되었습니다 ($networkType)"
                    )
                } else {
                    showToast("❌ 분석 실패 ($networkType)", Toast.LENGTH_LONG)
                    showErrorNotification("❌ 분석 실패 ($networkType)")
                }

            } catch (e: Exception) {
                Log.e(TAG, "❌ URL 처리 실패: ${e.message}")
                showToast("❌ 네트워크 오류: ${e.message}", Toast.LENGTH_LONG)
                showErrorNotification("네트워크 오류: ${e.message}")
            } finally {
                // 처리 완료 후 대기 상태로 복귀
                updateServiceNotification(
                    title = "InsightReel 대기 중",
                    content = "YouTube/Instagram/TikTok 링크를 복사하면 자동으로 감지합니다"
                )
            }
        }
    }

    /**
     * 현재 클립보드 텍스트 가져오기 (Android 10+ 대응)
     */
    private fun getCurrentClipboardText(): String {
        return try {
            val clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clipData = clipboardManager.primaryClip

            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text?.toString() ?: ""
                Log.d(TAG, "📋 현재 클립보드 텍스트: ${text.take(30)}...")
                text
            } else {
                ""
            }
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ 클립보드 읽기 실패: ${e.message}")
            ""
        }
    }

    /**
     * URL 유효성 검증
     */
    private fun isValidVideoUrl(url: String): Boolean {
        return url.contains("youtube.com/watch") ||
               url.contains("youtube.com/shorts") ||
               url.contains("youtu.be/") ||
               url.contains("instagram.com/p/") ||
               url.contains("instagram.com/reel/") ||
               url.contains("tiktok.com/")
    }

    /**
     * 서비스 알림 업데이트
     */
    private fun updateServiceNotification(title: String, content: String, showProgressBar: Boolean = false) {
        val notification = createServiceNotification(title, content, showProgressBar)
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    /**
     * 성공 알림 표시
     */
    private fun showSuccessNotification(title: String, content: String) {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val openAppPendingIntent = PendingIntent.getActivity(
            this, 2, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent)
            .build()

        notificationManager?.notify(NOTIFICATION_ID + 2, notification)
    }

    /**
     * 오류 알림 표시
     */
    private fun showErrorNotification(message: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("InsightReel 오류")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager?.notify(NOTIFICATION_ID + 3, notification)
    }

    /**
     * 서비스 알림 생성
     */
    private fun createServiceNotification(title: String, content: String, showProgressBar: Boolean = false): Notification {
        val stopIntent = Intent(this, ClipboardMonitorService::class.java).apply {
            action = ACTION_STOP_SERVICE
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val openAppIntent = Intent(this, MainActivity::class.java)
        val openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "중지",
                stopPendingIntent
            )

        if (showProgressBar) {
            builder.setProgress(0, 0, true)
        }

        return builder.build()
    }

    /**
     * 알림 채널 생성 (Android 8+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "YouTube/Instagram/TikTok 링크 자동 감지 서비스"
                setShowBadge(false)
            }

            notificationManager?.createNotificationChannel(channel)
            Log.d(TAG, "📢 알림 채널 생성됨: $CHANNEL_NAME")
        }
    }

    /**
     * 서비스 중지
     */
    private fun stopService() {
        Log.d(TAG, "🛑 서비스 중지 요청")

        clipboardMonitor.stopMonitoring()
        isServiceRunning = false

        // Broadcast service state change
        sendServiceStateBroadcast(false)

        serviceScope.cancel()
        stopForeground(true)
        stopSelf()

        Log.d(TAG, "✅ 서비스 중지 완료")
    }

    /**
     * Send broadcast to notify MainActivity about service state changes
     */
    private fun sendServiceStateBroadcast(isRunning: Boolean) {
        val intent = Intent(ACTION_SERVICE_STATE_CHANGED).apply {
            putExtra(EXTRA_SERVICE_RUNNING, isRunning)
        }
        sendBroadcast(intent)
        Log.d(TAG, "📡 Service state broadcast sent: isRunning=$isRunning")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 ClipboardMonitorService 소멸")

        clipboardMonitor.cleanup()
        serviceScope.cancel()
        isServiceRunning = false

        // Send final broadcast that service is stopped
        sendServiceStateBroadcast(false)
    }
}
package com.insightreel.shareextension

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class FloatingButtonService : Service() {

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "floating_button_channel"
        private const val ACTION_START_FLOATING = "action_start_floating"
        private const val ACTION_STOP_FLOATING = "action_stop_floating"

        /**
         * 플로팅 버튼 서비스 시작
         */
        fun startService(context: Context) {
            val intent = Intent(context, FloatingButtonService::class.java).apply {
                action = ACTION_START_FLOATING
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * 플로팅 버튼 서비스 중지
         */
        fun stopService(context: Context) {
            val intent = Intent(context, FloatingButtonService::class.java).apply {
                action = ACTION_STOP_FLOATING
            }
            context.stopService(intent)
        }
    }

    // 컴포넌트들
    private lateinit var preferencesManager: PreferencesManager
    private lateinit var networkManager: NetworkManager
    private lateinit var permissionHelper: PermissionHelper
    private lateinit var clipboardMonitor: ClipboardMonitor
    private lateinit var floatingButton: FloatingButtonView

    private var isServiceRunning = false

    override fun onCreate() {
        super.onCreate()
        println("🎈 FloatingButtonService 생성")

        // 컴포넌트 초기화
        preferencesManager = PreferencesManager(this)
        networkManager = NetworkManager(this)
        permissionHelper = PermissionHelper(this)

        // 알림 채널 생성 (Android 8.0+)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_FLOATING -> startFloatingButton()
            ACTION_STOP_FLOATING -> stopFloatingButton()
            else -> startFloatingButton()
        }

        return START_STICKY // 서비스가 종료되어도 자동 재시작
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * 플로팅 버튼 시작
     */
    private fun startFloatingButton() {
        if (isServiceRunning) {
            println("ℹ️ 플로팅 버튼 서비스가 이미 실행 중")
            return
        }

        // 권한 확인
        if (!permissionHelper.hasOverlayPermission()) {
            println("❌ 오버레이 권한이 없어서 플로팅 버튼을 시작할 수 없음")
            stopSelf()
            return
        }

        try {
            // Foreground 서비스로 시작
            startForeground(NOTIFICATION_ID, createNotification())

            // 플로팅 버튼 뷰 초기화
            floatingButton = FloatingButtonView(this, preferencesManager, networkManager)

            // 클립보드 모니터 초기화 및 시작
            clipboardMonitor = ClipboardMonitor(this)
            clipboardMonitor.setOnValidUrlDetected { url ->
                println("🎈 유효한 URL 감지, 플로팅 버튼 표시: $url")
                floatingButton.show(url)
            }
            clipboardMonitor.setOnInvalidUrlDetected {
                println("🎈 무효한 URL, 플로팅 버튼 숨김")
                floatingButton.hide()
            }
            clipboardMonitor.startMonitoring()

            isServiceRunning = true
            println("✅ 플로팅 버튼 서비스 시작 완료")

        } catch (e: Exception) {
            println("❌ 플로팅 버튼 서비스 시작 실패: ${e.message}")
            stopSelf()
        }
    }

    /**
     * 플로팅 버튼 중지
     */
    private fun stopFloatingButton() {
        if (!isServiceRunning) {
            println("ℹ️ 플로팅 버튼 서비스가 이미 중지됨")
            return
        }

        try {
            // 클립보드 모니터링 중지
            if (::clipboardMonitor.isInitialized) {
                clipboardMonitor.cleanup()
            }

            // 플로팅 버튼 숨김
            if (::floatingButton.isInitialized) {
                floatingButton.cleanup()
            }

            isServiceRunning = false
            println("✅ 플로팅 버튼 서비스 중지 완료")

            // 서비스 종료
            stopForeground(true)
            stopSelf()

        } catch (e: Exception) {
            println("❌ 플로팅 버튼 서비스 중지 실패: ${e.message}")
        }
    }

    /**
     * 알림 채널 생성 (Android 8.0+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "플로팅 버튼 서비스",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "InsightReel 플로팅 버튼이 실행 중입니다"
                enableLights(false)
                enableVibration(false)
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Foreground 서비스 알림 생성
     */
    private fun createNotification(): Notification {
        // 서비스 중지 인텐트
        val stopIntent = Intent(this, FloatingButtonService::class.java).apply {
            action = ACTION_STOP_FLOATING
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 설정 열기 인텐트
        val settingsIntent = Intent(this, SettingsActivity::class.java)
        val settingsPendingIntent = PendingIntent.getActivity(
            this, 0, settingsIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🎈 InsightReel 플로팅 버튼")
            .setContentText("URL 복사 시 자동으로 분석 버튼이 나타납니다")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "중지",
                stopPendingIntent
            )
            .addAction(
                android.R.drawable.ic_menu_preferences,
                "설정",
                settingsPendingIntent
            )
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        println("🎈 FloatingButtonService 종료")

        try {
            // 모든 리소스 정리
            if (::clipboardMonitor.isInitialized) {
                clipboardMonitor.cleanup()
            }

            if (::floatingButton.isInitialized) {
                floatingButton.cleanup()
            }

            isServiceRunning = false

        } catch (e: Exception) {
            println("❌ FloatingButtonService 종료 중 오류: ${e.message}")
        }
    }

    /**
     * 서비스 상태 정보 반환
     */
    fun getServiceStatus(): FloatingButtonServiceStatus {
        return FloatingButtonServiceStatus(
            isRunning = isServiceRunning,
            hasPermission = permissionHelper.hasOverlayPermission(),
            isMonitoring = if (::clipboardMonitor.isInitialized) clipboardMonitor.isMonitoring() else false,
            isButtonShowing = if (::floatingButton.isInitialized) floatingButton.isShowing() else false,
            currentUrl = if (::floatingButton.isInitialized) floatingButton.getCurrentUrl() else ""
        )
    }

    /**
     * 플로팅 버튼 설정 업데이트
     */
    fun updateFloatingButtonSettings(sizePercent: Int, alphaPercent: Int) {
        if (::floatingButton.isInitialized) {
            floatingButton.updateSize(sizePercent)
            floatingButton.updateAlpha(alphaPercent)
            println("🎈 플로팅 버튼 설정 업데이트: 크기 ${sizePercent}%, 투명도 ${alphaPercent}%")
        }
    }

    /**
     * 수동으로 플로팅 버튼 표시 (테스트용)
     */
    fun showFloatingButtonManually(url: String) {
        if (::floatingButton.isInitialized) {
            floatingButton.show(url)
            println("🎈 수동으로 플로팅 버튼 표시: $url")
        }
    }

    /**
     * 수동으로 플로팅 버튼 숨김
     */
    fun hideFloatingButtonManually() {
        if (::floatingButton.isInitialized) {
            floatingButton.hide()
            println("🎈 수동으로 플로팅 버튼 숨김")
        }
    }
}

/**
 * 플로팅 버튼 서비스 상태 정보 데이터 클래스
 */
data class FloatingButtonServiceStatus(
    val isRunning: Boolean,
    val hasPermission: Boolean,
    val isMonitoring: Boolean,
    val isButtonShowing: Boolean,
    val currentUrl: String
)
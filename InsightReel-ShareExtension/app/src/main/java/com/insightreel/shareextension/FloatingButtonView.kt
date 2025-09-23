package com.insightreel.shareextension

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.os.Vibrator
import android.view.*
import android.widget.Toast
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*

class FloatingButtonView(
    private val context: Context,
    private val preferencesManager: PreferencesManager,
    private val networkManager: NetworkManager
) : View(context) {

    companion object {
        private const val DEFAULT_SIZE_DP = 70
        private const val DEFAULT_ALPHA = 0.8f
        private const val AUTO_HIDE_DELAY = 5000L // 5초 후 자동 숨김
        private const val ANIMATION_DURATION = 300L
        private const val VIBRATION_DURATION = 50L
    }

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    private val handler = Handler(Looper.getMainLooper())
    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // 버튼 설정
    private var buttonSize = dpToPx(DEFAULT_SIZE_DP)
    private var buttonAlpha = DEFAULT_ALPHA
    private var currentUrl = ""

    // 드래그 관련 변수
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false

    // 윈도우 매니저 파라미터
    private val layoutParams = WindowManager.LayoutParams().apply {
        width = buttonSize
        height = buttonSize
        type = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
        format = PixelFormat.TRANSLUCENT
        gravity = Gravity.TOP or Gravity.START
    }

    // 페인트 객체들
    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
        textSize = dpToPx(24).toFloat()
    }

    // 자동 숨김 런어블
    private val autoHideRunnable = Runnable {
        hideWithAnimation()
    }

    init {
        setupView()
        loadSavedPosition()
    }

    /**
     * 뷰 초기 설정
     */
    private fun setupView() {
        // 배경 그라데이션 설정
        val gradient = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            colors = intArrayOf(
                ContextCompat.getColor(context, android.R.color.holo_red_dark),
                ContextCompat.getColor(context, android.R.color.holo_red_light)
            )
            setStroke(dpToPx(2), Color.WHITE)
        }
        background = gradient

        // 투명도 설정
        alpha = buttonAlpha

        // 터치 리스너 설정
        setOnTouchListener(this::onTouchEvent)
    }

    /**
     * 터치 이벤트 처리
     */
    private fun onTouchEvent(view: View, event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                // 터치 시작
                initialX = layoutParams.x
                initialY = layoutParams.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                isDragging = false

                // 자동 숨김 취소
                handler.removeCallbacks(autoHideRunnable)

                // 스케일 애니메이션 (터치 피드백)
                animateScale(1.0f, 1.1f)

                return true
            }

            MotionEvent.ACTION_MOVE -> {
                // 드래그 중
                val deltaX = event.rawX - initialTouchX
                val deltaY = event.rawY - initialTouchY

                // 이동 거리가 임계값을 넘으면 드래그로 판단
                if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                    isDragging = true

                    // 버튼 위치 업데이트
                    layoutParams.x = (initialX + deltaX).toInt()
                    layoutParams.y = (initialY + deltaY).toInt()

                    // 화면 경계 제한
                    constrainToScreen()

                    // 윈도우 매니저에 업데이트
                    try {
                        windowManager.updateViewLayout(this, layoutParams)
                    } catch (e: Exception) {
                        println("❌ 플로팅 버튼 위치 업데이트 실패: ${e.message}")
                    }
                }

                return true
            }

            MotionEvent.ACTION_UP -> {
                // 터치 종료
                animateScale(1.1f, 1.0f)

                if (isDragging) {
                    // 드래그였다면 위치 저장
                    saveCurrentPosition()
                    vibrate()
                    Toast.makeText(context, "🎈 위치 저장됨", Toast.LENGTH_SHORT).show()
                } else {
                    // 클릭이었다면 분석 실행
                    performAnalysis()
                }

                // 자동 숨김 스케줄링
                scheduleAutoHide()

                return true
            }
        }

        return false
    }

    /**
     * 화면 경계 제한
     */
    private fun constrainToScreen() {
        val displayMetrics = context.resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels

        // 좌우 경계
        layoutParams.x = Math.max(0, Math.min(layoutParams.x, screenWidth - buttonSize))
        // 상하 경계
        layoutParams.y = Math.max(0, Math.min(layoutParams.y, screenHeight - buttonSize))
    }

    /**
     * 스케일 애니메이션
     */
    private fun animateScale(fromScale: Float, toScale: Float) {
        val animator = ValueAnimator.ofFloat(fromScale, toScale)
        animator.duration = 150
        animator.addUpdateListener { animation ->
            val scale = animation.animatedValue as Float
            scaleX = scale
            scaleY = scale
        }
        animator.start()
    }

    /**
     * 진동 피드백
     */
    private fun vibrate() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    android.os.VibrationEffect.createOneShot(
                        VIBRATION_DURATION,
                        android.os.VibrationEffect.DEFAULT_AMPLITUDE
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(VIBRATION_DURATION)
            }
        } catch (e: Exception) {
            println("❌ 진동 실행 실패: ${e.message}")
        }
    }

    /**
     * 분석 실행
     */
    private fun performAnalysis() {
        if (currentUrl.isBlank()) {
            Toast.makeText(context, "❌ 분석할 URL이 없습니다", Toast.LENGTH_SHORT).show()
            return
        }

        vibrate()
        Toast.makeText(context, "📤 분석 시작...", Toast.LENGTH_SHORT).show()

        // 즉시 버튼 숨김
        hideWithAnimation()

        // 백그라운드에서 분석 실행
        coroutineScope.launch {
            try {
                val analysisFlags = preferencesManager.getAnalysisFlags()
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"

                println("🎈 플로팅 버튼 분석: $networkType 네트워크로 $serverUrl 서버에 전송")
                println("🎈 분석 URL: $currentUrl")

                val success = networkManager.sendVideoUrl(serverUrl, currentUrl, analysisFlags)

                if (success) {
                    println("✅ 플로팅 버튼 분석 완료! ($networkType)")
                    showToast("✅ 분석 완료!")
                } else {
                    println("❌ 플로팅 버튼 분석 실패 ($networkType)")
                    showToast("❌ 분석 실패")
                }
            } catch (e: Exception) {
                println("❌ 플로팅 버튼 네트워크 오류: ${e.message}")
                showToast("❌ 네트워크 오류")
            }
        }
    }

    /**
     * 토스트 표시 (메인 스레드에서)
     */
    private fun showToast(message: String) {
        handler.post {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 플로팅 버튼 표시
     */
    fun show(url: String) {
        currentUrl = url
        handler.removeCallbacks(autoHideRunnable)

        try {
            if (parent == null) {
                // 새로 표시하는 경우
                windowManager.addView(this, layoutParams)
                println("🎈 플로팅 버튼 새로 표시: $url")

                // 페이드인 애니메이션
                alpha = 0f
                visibility = VISIBLE
                ObjectAnimator.ofFloat(this, "alpha", 0f, buttonAlpha).apply {
                    duration = ANIMATION_DURATION
                    start()
                }
            } else {
                // 이미 표시 중인 경우 - URL 업데이트 및 자동숨김 시간 리셋
                println("🎈 플로팅 버튼 URL 업데이트: $url")

                // 살짝 강조 애니메이션 (버튼이 업데이트되었음을 알림)
                animateScale(1.0f, 1.2f)
                handler.postDelayed({
                    animateScale(1.2f, 1.0f)
                }, 100)
            }

            // 자동 숨김 스케줄링 (기존 타이머 취소 후 새로 설정)
            scheduleAutoHide()

        } catch (e: Exception) {
            println("❌ 플로팅 버튼 표시 실패: ${e.message}")
        }
    }

    /**
     * 플로팅 버튼 숨김 (애니메이션 포함)
     */
    fun hideWithAnimation() {
        try {
            val fadeOut = ObjectAnimator.ofFloat(this, "alpha", buttonAlpha, 0f)
            fadeOut.duration = ANIMATION_DURATION
            fadeOut.addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    hide()
                }
            })
            fadeOut.start()
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 애니메이션 숨김 실패: ${e.message}")
            hide()
        }
    }

    /**
     * 플로팅 버튼 즉시 숨김
     */
    fun hide() {
        try {
            if (parent != null) {
                windowManager.removeView(this)
                println("🎈 플로팅 버튼 숨김")
            }
            handler.removeCallbacks(autoHideRunnable)
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 숨김 실패: ${e.message}")
        }
    }

    /**
     * 자동 숨김 스케줄링
     */
    private fun scheduleAutoHide() {
        handler.removeCallbacks(autoHideRunnable)
        handler.postDelayed(autoHideRunnable, AUTO_HIDE_DELAY)
    }

    /**
     * 현재 위치 저장
     */
    private fun saveCurrentPosition() {
        try {
            val sharedPrefs = context.getSharedPreferences("floating_button_prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit()
                .putInt("button_x", layoutParams.x)
                .putInt("button_y", layoutParams.y)
                .apply()
            println("💾 플로팅 버튼 위치 저장: (${layoutParams.x}, ${layoutParams.y})")
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 위치 저장 실패: ${e.message}")
        }
    }

    /**
     * 저장된 위치 로드
     */
    private fun loadSavedPosition() {
        try {
            val sharedPrefs = context.getSharedPreferences("floating_button_prefs", Context.MODE_PRIVATE)
            val savedX = sharedPrefs.getInt("button_x", 100) // 기본값: (100, 200)
            val savedY = sharedPrefs.getInt("button_y", 200)

            layoutParams.x = savedX
            layoutParams.y = savedY

            println("📍 저장된 플로팅 버튼 위치 로드: ($savedX, $savedY)")
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 위치 로드 실패: ${e.message}")
            // 기본 위치 설정
            layoutParams.x = 100
            layoutParams.y = 200
        }
    }

    /**
     * dp를 px로 변환
     */
    private fun dpToPx(dp: Int): Int {
        val density = context.resources.displayMetrics.density
        return (dp * density + 0.5f).toInt()
    }

    /**
     * 버튼 크기 변경
     */
    fun updateSize(sizePercent: Int) {
        val baseSize = dpToPx(DEFAULT_SIZE_DP)
        buttonSize = (baseSize * (sizePercent / 100f)).toInt()

        layoutParams.width = buttonSize
        layoutParams.height = buttonSize

        try {
            if (parent != null) {
                windowManager.updateViewLayout(this, layoutParams)
            }
        } catch (e: Exception) {
            println("❌ 플로팅 버튼 크기 업데이트 실패: ${e.message}")
        }
    }

    /**
     * 투명도 변경
     */
    fun updateAlpha(alphaPercent: Int) {
        buttonAlpha = (alphaPercent / 100f)
        alpha = buttonAlpha
    }

    /**
     * 리소스 정리
     */
    fun cleanup() {
        try {
            handler.removeCallbacks(autoHideRunnable)
            coroutineScope.cancel()
            hide()
            println("🧹 FloatingButtonView 정리 완료")
        } catch (e: Exception) {
            println("❌ FloatingButtonView 정리 실패: ${e.message}")
        }
    }

    /**
     * 현재 URL 반환
     */
    fun getCurrentUrl(): String = currentUrl

    /**
     * 표시 여부 확인
     */
    fun isShowing(): Boolean = parent != null
}
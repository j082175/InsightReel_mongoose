package com.insightreel.shareextension

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(private val context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    init {
        // 앱 시작 시 URL 마이그레이션 실행
        migrateServerUrls()
    }

    companion object {
        private const val PREFS_NAME = "InsightReel_Settings"

        // 설정 키들
        private const val KEY_ANALYSIS_TYPE = "analysis_type"
        private const val KEY_SHOW_MODAL = "show_modal"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_AUTO_DETECT_NETWORK = "auto_detect_network"
        private const val KEY_WIFI_SERVER_URL = "wifi_server_url"
        private const val KEY_LTE_SERVER_URL = "lte_server_url"

        // 분석 타입 상수들
        const val ANALYSIS_VIDEO_ONLY = "video_only"
        const val ANALYSIS_CHANNEL_ONLY = "channel_only"
        const val ANALYSIS_BOTH = "both"

        // 기본값
        private const val DEFAULT_ANALYSIS_TYPE = ANALYSIS_VIDEO_ONLY
        private const val DEFAULT_SHOW_MODAL = true
        private const val DEFAULT_WIFI_SERVER_URL = "http://192.168.0.2:3000"
        private const val DEFAULT_LTE_SERVER_URL = "https://insightreel-mobile-test.loca.lt"
        private const val DEFAULT_AUTO_DETECT_NETWORK = true

        // 마이그레이션용 상수
        private const val KEY_MIGRATION_VERSION = "migration_version"
        private const val CURRENT_MIGRATION_VERSION = 2
        private const val OLD_LTE_URL = "https://lemon-brooms-shave.loca.lt"
    }

    /**
     * 분석 타입 설정 저장
     * @param analysisType "video_only", "channel_only", "both" 중 하나
     */
    fun setAnalysisType(analysisType: String) {
        sharedPreferences.edit()
            .putString(KEY_ANALYSIS_TYPE, analysisType)
            .apply()
    }

    /**
     * 분석 타입 설정 가져오기
     * @return "video_only", "channel_only", "both" 중 하나
     */
    fun getAnalysisType(): String {
        return sharedPreferences.getString(KEY_ANALYSIS_TYPE, DEFAULT_ANALYSIS_TYPE)
            ?: DEFAULT_ANALYSIS_TYPE
    }

    /**
     * 모달 표시 여부 설정 저장
     * @param showModal true: 모달 표시, false: 바로 전송
     */
    fun setShowModal(showModal: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_SHOW_MODAL, showModal)
            .apply()
    }

    /**
     * 모달 표시 여부 설정 가져오기
     * @return true: 모달 표시, false: 바로 전송
     */
    fun getShowModal(): Boolean {
        return sharedPreferences.getBoolean(KEY_SHOW_MODAL, DEFAULT_SHOW_MODAL)
    }

    /**
     * 현재 설정에 따라 서버로 보낼 분석 플래그들 반환
     */
    fun getAnalysisFlags(): AnalysisFlags {
        val analysisType = getAnalysisType()
        return when (analysisType) {
            ANALYSIS_VIDEO_ONLY -> AnalysisFlags(
                includeVideoAnalysis = true,
                includeChannelAnalysis = false
            )
            ANALYSIS_CHANNEL_ONLY -> AnalysisFlags(
                includeVideoAnalysis = false,
                includeChannelAnalysis = true
            )
            ANALYSIS_BOTH -> AnalysisFlags(
                includeVideoAnalysis = true,
                includeChannelAnalysis = true
            )
            else -> AnalysisFlags(
                includeVideoAnalysis = true,
                includeChannelAnalysis = false
            )
        }
    }

    /**
     * 분석 타입 한국어 이름 반환
     */
    fun getAnalysisTypeName(): String {
        return when (getAnalysisType()) {
            ANALYSIS_VIDEO_ONLY -> "영상 분석만"
            ANALYSIS_CHANNEL_ONLY -> "채널 분석만"
            ANALYSIS_BOTH -> "영상+채널 분석"
            else -> "영상 분석만"
        }
    }

    // ========== 서버 URL 관리 기능 ==========

    /**
     * 현재 활성 서버 URL 가져오기
     * 간단화: WiFi/LTE 구분 없이 터널 주소로 통일
     */
    fun getCurrentServerUrl(): String {
        return DEFAULT_LTE_SERVER_URL  // 항상 터널 주소 사용
    }

    /**
     * 에뮬레이터/실제 기기를 구분하여 적절한 WiFi URL 반환
     */
    private fun getOptimalWifiUrl(): String {
        // 에뮬레이터인지 확인
        val isEmulator = android.os.Build.FINGERPRINT.contains("generic") ||
                android.os.Build.FINGERPRINT.contains("unknown") ||
                android.os.Build.MODEL.contains("google_sdk") ||
                android.os.Build.MODEL.contains("Emulator") ||
                android.os.Build.MODEL.contains("Android SDK")

        return if (isEmulator) {
            "http://10.0.2.2:3000"      // 에뮬레이터용
        } else {
            getWifiServerUrl()          // 실제 기기용 (설정된 값 또는 기본값)
        }
    }

    /**
     * 수동 서버 URL 설정/가져오기
     */
    fun setManualServerUrl(url: String) {
        sharedPreferences.edit()
            .putString(KEY_SERVER_URL, url)
            .apply()
    }

    fun getManualServerUrl(): String {
        return sharedPreferences.getString(KEY_SERVER_URL, DEFAULT_WIFI_SERVER_URL)
            ?: DEFAULT_WIFI_SERVER_URL
    }

    /**
     * WiFi 서버 URL 설정/가져오기
     */
    fun setWifiServerUrl(url: String) {
        sharedPreferences.edit()
            .putString(KEY_WIFI_SERVER_URL, url)
            .apply()
    }

    fun getWifiServerUrl(): String {
        return sharedPreferences.getString(KEY_WIFI_SERVER_URL, DEFAULT_WIFI_SERVER_URL)
            ?: DEFAULT_WIFI_SERVER_URL
    }

    /**
     * LTE 서버 URL 설정/가져오기
     */
    fun setLteServerUrl(url: String) {
        sharedPreferences.edit()
            .putString(KEY_LTE_SERVER_URL, url)
            .apply()
    }

    fun getLteServerUrl(): String {
        return sharedPreferences.getString(KEY_LTE_SERVER_URL, DEFAULT_LTE_SERVER_URL)
            ?: DEFAULT_LTE_SERVER_URL
    }

    /**
     * 자동 네트워크 감지 모드 설정/가져오기
     */
    fun setAutoDetectNetwork(autoDetect: Boolean) {
        sharedPreferences.edit()
            .putBoolean(KEY_AUTO_DETECT_NETWORK, autoDetect)
            .apply()
    }

    fun getAutoDetectNetwork(): Boolean {
        return sharedPreferences.getBoolean(KEY_AUTO_DETECT_NETWORK, DEFAULT_AUTO_DETECT_NETWORK)
    }

    /**
     * 현재 WiFi 연결 상태 확인 (NetworkManager를 통해 실제 구현)
     */
    private fun isWifiConnected(): Boolean {
        return try {
            val networkManager = NetworkManager(context)
            networkManager.isWifiConnected()
        } catch (e: Exception) {
            // 실패 시 기본값으로 true 반환 (WiFi 우선)
            true
        }
    }

    /**
     * 서버 연결 설정 요약 정보 반환
     */
    fun getServerConfigSummary(): ServerConfigSummary {
        return ServerConfigSummary(
            currentUrl = getCurrentServerUrl(),
            isAutoMode = getAutoDetectNetwork(),
            wifiUrl = getWifiServerUrl(),
            lteUrl = getLteServerUrl(),
            manualUrl = getManualServerUrl()
        )
    }

    /**
     * 서버 URL 마이그레이션 함수
     * 앱 업데이트 시 기존 설정을 새 URL로 자동 전환
     */
    private fun migrateServerUrls() {
        try {
            val currentVersion = sharedPreferences.getInt(KEY_MIGRATION_VERSION, 0)

            if (currentVersion < CURRENT_MIGRATION_VERSION) {
                println("🔄 URL 마이그레이션 시작: v$currentVersion -> v$CURRENT_MIGRATION_VERSION")

                // 버전 1: 기존 LTE URL을 새 터널 URL로 업데이트
                if (currentVersion < 1) {
                    val currentLteUrl = sharedPreferences.getString(KEY_LTE_SERVER_URL, "")
                    if (currentLteUrl == OLD_LTE_URL || currentLteUrl?.contains("lemon-brooms-shave") == true) {
                        println("🔄 LTE URL 마이그레이션: $currentLteUrl -> $DEFAULT_LTE_SERVER_URL")
                        setLteServerUrl(DEFAULT_LTE_SERVER_URL)
                    }
                }

                // 버전 2: 향후 추가 마이그레이션을 위한 예약
                if (currentVersion < 2) {
                    // 필요시 추가 마이그레이션 로직
                }

                // 마이그레이션 버전 업데이트
                sharedPreferences.edit()
                    .putInt(KEY_MIGRATION_VERSION, CURRENT_MIGRATION_VERSION)
                    .apply()

                println("✅ URL 마이그레이션 완료")
            } else {
                println("ℹ️ URL 마이그레이션 불필요 (최신 버전)")
            }
        } catch (e: Exception) {
            println("❌ URL 마이그레이션 실패: ${e.message}")
        }
    }
}

/**
 * 분석 플래그 데이터 클래스
 */
data class AnalysisFlags(
    val includeVideoAnalysis: Boolean,
    val includeChannelAnalysis: Boolean
)

/**
 * 서버 설정 요약 정보 데이터 클래스
 */
data class ServerConfigSummary(
    val currentUrl: String,        // 현재 활성 서버 URL
    val isAutoMode: Boolean,       // 자동 감지 모드 여부
    val wifiUrl: String,          // WiFi 환경 서버 URL
    val lteUrl: String,           // LTE 환경 서버 URL
    val manualUrl: String         // 수동 설정 서버 URL
)
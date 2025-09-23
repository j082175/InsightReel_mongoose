package com.insightreel.shareextension

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NetworkManager(private val context: Context) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    suspend fun sendVideoUrl(serverUrl: String, videoUrl: String, analysisFlags: AnalysisFlags? = null): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                println("🔗 연결 시도: $serverUrl/api/process-video")
                println("🔍 비디오 URL: $videoUrl")
                println("🔍 분석 플래그: $analysisFlags")

                val json = JSONObject().apply {
                    put("url", videoUrl)
                    put("source", "android_share_extension")
                    put("timestamp", System.currentTimeMillis())
                    put("platform", detectPlatform(videoUrl))

                    // 설정에 따른 분석 플래그 적용
                    if (analysisFlags != null) {
                        put("includeVideoAnalysis", analysisFlags.includeVideoAnalysis)
                        put("includeChannelAnalysis", analysisFlags.includeChannelAnalysis)

                        // 분석 타입 결정
                        val analysisType = when {
                            analysisFlags.includeVideoAnalysis && analysisFlags.includeChannelAnalysis -> "complete"
                            analysisFlags.includeChannelAnalysis -> "channel_only"
                            else -> "video_only"
                        }
                        put("analysisType", analysisType)
                    } else {
                        // 기본값 (이전 동작과 호환)
                        put("includeVideoAnalysis", true)
                        put("includeChannelAnalysis", false)
                        put("analysisType", "video_only")
                    }
                }

                println("📤 전송 데이터: ${json.toString()}")

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = json.toString().toRequestBody(mediaType)

                val request = Request.Builder()
                    .url("$serverUrl/api/process-video")
                    .post(requestBody)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("User-Agent", "InsightReel-ShareExtension/1.0")
                    .build()

                println("📡 요청 전송 중...")
                val response = client.newCall(request).execute()
                println("📡 응답 코드: ${response.code}")
                println("📡 응답 성공: ${response.isSuccessful}")

                if (!response.isSuccessful) {
                    val errorBody = response.body?.string() ?: "응답 본문 없음"
                    println("❌ 응답 실패 내용: $errorBody")
                    println("❌ 응답 헤더: ${response.headers}")
                }

                response.isSuccessful
            } catch (e: Exception) {
                println("❌ 네트워크 에러: ${e.message}")
                e.printStackTrace()
                false
            }
        }
    }

    private fun detectPlatform(url: String): String {
        return when {
            url.contains("youtube.com") || url.contains("youtu.be") -> "YOUTUBE"
            url.contains("instagram.com") -> "INSTAGRAM"
            url.contains("tiktok.com") -> "TIKTOK"
            else -> "UNKNOWN"
        }
    }

    /**
     * 서버 상태 확인
     */
    suspend fun checkServerHealth(serverUrl: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                println("🔍 서버 상태 확인: $serverUrl/health")

                val request = Request.Builder()
                    .url("$serverUrl/health")
                    .get()
                    .addHeader("User-Agent", "InsightReel-ShareExtension/1.0")
                    .build()

                val response = client.newCall(request).execute()
                val isHealthy = response.isSuccessful

                println("🔍 서버 상태: ${if (isHealthy) "정상" else "오류"} (${response.code})")
                isHealthy
            } catch (e: Exception) {
                println("❌ 서버 상태 확인 실패: ${e.message}")
                false
            }
        }
    }

    // ========== 네트워크 상태 감지 기능 ==========

    /**
     * 현재 WiFi 연결 상태 확인
     */
    fun isWifiConnected(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        } catch (e: Exception) {
            println("❌ WiFi 상태 확인 실패: ${e.message}")
            false
        }
    }

    /**
     * 현재 모바일 데이터 연결 상태 확인
     */
    fun isMobileDataConnected(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
        } catch (e: Exception) {
            println("❌ 모바일 데이터 상태 확인 실패: ${e.message}")
            false
        }
    }

    /**
     * 인터넷 연결 상태 확인
     */
    fun isInternetAvailable(): Boolean {
        return try {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } catch (e: Exception) {
            println("❌ 인터넷 연결 상태 확인 실패: ${e.message}")
            false
        }
    }

    /**
     * 현재 네트워크 타입 반환
     */
    fun getCurrentNetworkType(): NetworkType {
        return when {
            isWifiConnected() -> NetworkType.WIFI
            isMobileDataConnected() -> NetworkType.MOBILE
            else -> NetworkType.NONE
        }
    }

    /**
     * 네트워크 상태 요약 정보 반환
     */
    fun getNetworkStatusSummary(): NetworkStatusSummary {
        val networkType = getCurrentNetworkType()
        return NetworkStatusSummary(
            networkType = networkType,
            isWifiConnected = isWifiConnected(),
            isMobileConnected = isMobileDataConnected(),
            isInternetAvailable = isInternetAvailable(),
            networkDescription = when (networkType) {
                NetworkType.WIFI -> "📶 WiFi 연결"
                NetworkType.MOBILE -> "📱 모바일 데이터"
                NetworkType.NONE -> "❌ 연결 없음"
            }
        )
    }

    /**
     * 네트워크 변경 모니터링 등록
     */
    fun registerNetworkCallback(callback: NetworkCallback) {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, callback)
    }

    /**
     * 네트워크 변경 모니터링 해제
     */
    fun unregisterNetworkCallback(callback: NetworkCallback) {
        connectivityManager.unregisterNetworkCallback(callback)
    }

    /**
     * PreferencesManager와 연동하여 적절한 서버 URL 반환
     */
    fun getOptimalServerUrl(preferencesManager: PreferencesManager): String {
        return if (preferencesManager.getAutoDetectNetwork()) {
            if (isWifiConnected()) {
                preferencesManager.getWifiServerUrl()
            } else {
                preferencesManager.getLteServerUrl()
            }
        } else {
            preferencesManager.getManualServerUrl()
        }
    }
}

/**
 * 네트워크 타입 열거형
 */
enum class NetworkType {
    WIFI,
    MOBILE,
    NONE
}

/**
 * 네트워크 상태 요약 정보 데이터 클래스
 */
data class NetworkStatusSummary(
    val networkType: NetworkType,
    val isWifiConnected: Boolean,
    val isMobileConnected: Boolean,
    val isInternetAvailable: Boolean,
    val networkDescription: String
)

/**
 * 네트워크 변경 감지 콜백 추상 클래스
 */
abstract class NetworkCallback : ConnectivityManager.NetworkCallback() {
    abstract fun onNetworkChanged(networkType: NetworkType)

    override fun onAvailable(network: Network) {
        super.onAvailable(network)
        // 네트워크 연결 시 호출되는 함수는 서브클래스에서 구현
    }

    override fun onLost(network: Network) {
        super.onLost(network)
        onNetworkChanged(NetworkType.NONE)
    }
}
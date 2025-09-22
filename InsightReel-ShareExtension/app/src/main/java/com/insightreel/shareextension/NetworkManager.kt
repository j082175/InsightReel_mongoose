package com.insightreel.shareextension

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NetworkManager {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    suspend fun sendVideoUrl(serverUrl: String, videoUrl: String, analysisFlags: AnalysisFlags? = null): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                println("🔗 연결 시도: $serverUrl/api/process-video")

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
}
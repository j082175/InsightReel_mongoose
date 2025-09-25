package com.insightreel.shareextension

import android.app.AlertDialog
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.os.Handler
import android.os.Looper
import okhttp3.*
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class AutoUpdateManager(private val context: Context) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    companion object {
        private const val UPDATE_CHECK_URL = "/api/app-update/check"
        private const val APK_DOWNLOAD_URL = "/api/app-update/download"
        private const val CURRENT_VERSION = "1.1.11"
        private const val PREFS_LAST_UPDATE_CHECK = "last_update_check"
        private const val CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000L // 24시간
    }

    /**
     * 앱 업데이트 확인 (자동 호출)
     */
    suspend fun checkForUpdates(serverUrl: String, showNoUpdateMessage: Boolean = false): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                println("🔍 업데이트 확인 중: $serverUrl$UPDATE_CHECK_URL")

                val request = Request.Builder()
                    .url("$serverUrl$UPDATE_CHECK_URL")
                    .addHeader("Current-Version", CURRENT_VERSION)
                    .addHeader("Platform", "android")
                    .addHeader("User-Agent", "InsightReel-ShareExtension/$CURRENT_VERSION")
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    if (responseBody != null) {
                        val updateInfo = parseUpdateResponse(responseBody)

                        if (updateInfo.hasUpdate) {
                            Handler(Looper.getMainLooper()).post {
                                showUpdateDialog(updateInfo, serverUrl)
                            }
                            true
                        } else {
                            if (showNoUpdateMessage) {
                                Handler(Looper.getMainLooper()).post {
                                    showNoUpdateMessage()
                                }
                            }
                            false
                        }
                    } else {
                        false
                    }
                } else {
                    println("❌ 업데이트 확인 실패: HTTP ${response.code}")
                    false
                }
            } catch (e: Exception) {
                println("❌ 업데이트 확인 에러: ${e.message}")
                false
            }
        }
    }

    /**
     * 수동 업데이트 확인 (사용자가 버튼 클릭)
     */
    suspend fun checkForUpdatesManually(serverUrl: String) {
        checkForUpdates(serverUrl, showNoUpdateMessage = true)
    }

    /**
     * 마지막 업데이트 확인 시간 저장/확인
     */
    fun shouldCheckForUpdates(): Boolean {
        val prefs = context.getSharedPreferences("InsightReel_Settings", Context.MODE_PRIVATE)
        val lastCheck = prefs.getLong(PREFS_LAST_UPDATE_CHECK, 0)
        val now = System.currentTimeMillis()

        return (now - lastCheck) > CHECK_INTERVAL_MS
    }

    private fun saveLastUpdateCheckTime() {
        val prefs = context.getSharedPreferences("InsightReel_Settings", Context.MODE_PRIVATE)
        prefs.edit()
            .putLong(PREFS_LAST_UPDATE_CHECK, System.currentTimeMillis())
            .apply()
    }

    /**
     * 서버 응답 파싱
     */
    private fun parseUpdateResponse(responseBody: String): UpdateInfo {
        return try {
            println("🔍 서버 응답 원문: $responseBody")
            val json = JSONObject(responseBody)
            println("🔍 JSON 파싱 완료: ${json.toString()}")

            // 중첩된 구조 체크: data 객체가 있는지 확인
            val dataObj = if (json.has("data")) {
                println("🔍 중첩된 JSON 구조 감지, data 객체 사용")
                json.getJSONObject("data")
            } else {
                println("🔍 평면 JSON 구조, 직접 사용")
                json
            }

            val hasUpdate = dataObj.getBoolean("hasUpdate")
            println("🔍 hasUpdate 값: $hasUpdate")

            UpdateInfo(
                hasUpdate = hasUpdate,
                latestVersion = dataObj.optString("latestVersion", CURRENT_VERSION),
                downloadUrl = dataObj.optString("downloadUrl", ""),
                releaseNotes = dataObj.optString("releaseNotes", ""),
                isForced = dataObj.optBoolean("isForced", false),
                fileSize = dataObj.optLong("fileSize", 0)
            )
        } catch (e: Exception) {
            println("❌ 업데이트 응답 파싱 실패: ${e.message}")
            println("❌ 원본 응답: $responseBody")
            UpdateInfo(false, CURRENT_VERSION, "", "", false, 0)
        }
    }

    /**
     * 업데이트 알림 다이얼로그 표시
     */
    private fun showUpdateDialog(updateInfo: UpdateInfo, serverUrl: String) {
        val context = this.context

        val dialogBuilder = AlertDialog.Builder(context)
            .setTitle("📱 새 버전 업데이트")
            .setMessage(buildUpdateMessage(updateInfo))
            .setPositiveButton("업데이트") { _, _ ->
                downloadAndInstallUpdate(updateInfo, serverUrl)
            }

        if (!updateInfo.isForced) {
            dialogBuilder.setNegativeButton("나중에") { dialog, _ ->
                dialog.dismiss()
                saveLastUpdateCheckTime()
            }
        }

        dialogBuilder
            .setCancelable(!updateInfo.isForced)
            .show()
    }

    private fun buildUpdateMessage(updateInfo: UpdateInfo): String {
        val sizeText = if (updateInfo.fileSize > 0) {
            val sizeMB = updateInfo.fileSize / (1024 * 1024)
            "\n📦 파일 크기: ${sizeMB}MB"
        } else ""

        val forceText = if (updateInfo.isForced) {
            "\n⚠️ 필수 업데이트입니다."
        } else ""

        return """
            🚀 새 버전: ${updateInfo.latestVersion}
            📝 현재 버전: $CURRENT_VERSION
            $sizeText$forceText

            📋 업데이트 내용:
            ${updateInfo.releaseNotes.ifEmpty { "성능 개선 및 버그 수정" }}
        """.trimIndent()
    }

    /**
     * 업데이트 파일 다운로드 및 설치
     */
    private fun downloadAndInstallUpdate(updateInfo: UpdateInfo, serverUrl: String) {
        try {
            val downloadUrl = if (updateInfo.downloadUrl.startsWith("http")) {
                updateInfo.downloadUrl
            } else {
                "$serverUrl$APK_DOWNLOAD_URL"
            }

            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

            val request = DownloadManager.Request(Uri.parse(downloadUrl))
                .setTitle("InsightReel 업데이트")
                .setDescription("새 버전 다운로드 중...")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "InsightReel_${updateInfo.latestVersion}.apk")
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true)

            val downloadId = downloadManager.enqueue(request)

            // 다운로드 완료 리스너 등록
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                    if (id == downloadId) {
                        installApk(updateInfo.latestVersion)
                        context?.unregisterReceiver(this)
                    }
                }
            }

            context.registerReceiver(receiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))

            println("📥 업데이트 다운로드 시작: $downloadUrl")

        } catch (e: Exception) {
            println("❌ 업데이트 다운로드 실패: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                showErrorDialog("다운로드 실패", "업데이트 다운로드 중 오류가 발생했습니다: ${e.message}")
            }
        }
    }

    /**
     * APK 파일 설치
     */
    private fun installApk(version: String) {
        try {
            val apkFile = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "InsightReel_$version.apk")

            if (!apkFile.exists()) {
                Handler(Looper.getMainLooper()).post {
                    showErrorDialog("파일 없음", "다운로드된 APK 파일을 찾을 수 없습니다.")
                }
                return
            }

            val apkUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apkFile)
            } else {
                Uri.fromFile(apkFile)
            }

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(installIntent)
            println("🚀 APK 설치 시작: ${apkFile.absolutePath}")

        } catch (e: Exception) {
            println("❌ APK 설치 실패: ${e.message}")
            Handler(Looper.getMainLooper()).post {
                showErrorDialog("설치 실패", "APK 설치 중 오류가 발생했습니다: ${e.message}")
            }
        }
    }

    /**
     * 업데이트 없음 메시지
     */
    private fun showNoUpdateMessage() {
        AlertDialog.Builder(context)
            .setTitle("✅ 최신 버전")
            .setMessage("현재 최신 버전을 사용하고 있습니다.\n버전: $CURRENT_VERSION")
            .setPositiveButton("확인") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    /**
     * 에러 다이얼로그 표시
     */
    private fun showErrorDialog(title: String, message: String) {
        AlertDialog.Builder(context)
            .setTitle("❌ $title")
            .setMessage(message)
            .setPositiveButton("확인") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    /**
     * 서버에서 최신 업데이트 정보 가져오기
     */
    suspend fun fetchUpdateInfo(serverUrl: String): UpdateInfo? {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$serverUrl$UPDATE_CHECK_URL")
                    .addHeader("Current-Version", CURRENT_VERSION)
                    .build()

                val response = client.newCall(request).execute()

                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    if (responseBody != null) {
                        parseUpdateResponse(responseBody)
                    } else null
                } else null
            } catch (e: Exception) {
                println("❌ 업데이트 정보 가져오기 실패: ${e.message}")
                null
            }
        }
    }
}

/**
 * 업데이트 정보 데이터 클래스
 */
data class UpdateInfo(
    val hasUpdate: Boolean,
    val latestVersion: String,
    val downloadUrl: String,
    val releaseNotes: String,
    val isForced: Boolean,
    val fileSize: Long
)
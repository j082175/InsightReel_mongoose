package com.insightreel.shareextension

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.appcompat.app.AlertDialog

class PermissionHelper(private val context: Context) {

    companion object {
        const val OVERLAY_PERMISSION_REQUEST_CODE = 1001
    }

    /**
     * "다른 앱 위에 표시" 권한이 있는지 확인
     */
    fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // Android 6.0 미만은 자동 허용
        }
    }

    /**
     * 오버레이 권한 요청
     */
    fun requestOverlayPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(context)) {
                showPermissionExplanationDialog(activity)
            }
        }
    }

    /**
     * 권한 설명 다이얼로그 표시
     */
    private fun showPermissionExplanationDialog(activity: Activity) {
        AlertDialog.Builder(context)
            .setTitle("🎈 플로팅 버튼 권한 필요")
            .setMessage("""
                InsightReel 플로팅 버튼을 사용하려면 "다른 앱 위에 표시" 권한이 필요합니다.

                ✨ 기능:
                • URL 복사 시 자동으로 분석 버튼 등장
                • 원터치로 영상 분석 가능
                • 드래그로 위치 조정 가능

                🔒 개인정보:
                • 화면 내용을 읽지 않습니다
                • 클립보드의 URL만 확인합니다
                • 완전히 안전합니다
            """.trimIndent())
            .setPositiveButton("설정에서 허용") { _, _ ->
                openOverlaySettings(activity)
            }
            .setNegativeButton("나중에") { dialog, _ ->
                dialog.dismiss()
            }
            .setCancelable(true)
            .show()
    }

    /**
     * 시스템 설정에서 오버레이 권한 페이지 열기
     */
    private fun openOverlaySettings(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            )
            activity.startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE)
        }
    }

    /**
     * 권한 요청 결과 처리
     */
    fun handlePermissionResult(requestCode: Int, callback: (Boolean) -> Unit) {
        if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
            val hasPermission = hasOverlayPermission()
            callback(hasPermission)

            if (hasPermission) {
                println("✅ 오버레이 권한 허용됨 - 플로팅 버튼 사용 가능")
            } else {
                println("❌ 오버레이 권한 거부됨 - 플로팅 버튼 사용 불가")
            }
        }
    }

    /**
     * 권한 상태를 사용자 친화적 메시지로 반환
     */
    fun getPermissionStatusMessage(): String {
        return if (hasOverlayPermission()) {
            "✅ 플로팅 버튼 사용 가능"
        } else {
            "⚠️ 플로팅 버튼 권한 필요 (설정에서 허용)"
        }
    }

    /**
     * 권한 체크 및 요청 (통합 함수)
     */
    fun checkAndRequestPermission(activity: Activity, onGranted: () -> Unit, onDenied: () -> Unit = {}) {
        if (hasOverlayPermission()) {
            onGranted()
        } else {
            // 권한 요청 다이얼로그 표시
            showPermissionExplanationDialog(activity)
            onDenied()
        }
    }

    /**
     * 권한이 필요한 이유를 설명하는 간단한 토스트
     */
    fun showQuickPermissionInfo(context: Context) {
        android.widget.Toast.makeText(
            context,
            "🎈 플로팅 버튼을 사용하려면 '다른 앱 위에 표시' 권한이 필요합니다",
            android.widget.Toast.LENGTH_LONG
        ).show()
    }
}
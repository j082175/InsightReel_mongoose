package com.insightreel.shareextension

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(context: Context) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "InsightReel_Settings"

        // 설정 키들
        private const val KEY_ANALYSIS_TYPE = "analysis_type"
        private const val KEY_SHOW_MODAL = "show_modal"

        // 분석 타입 상수들
        const val ANALYSIS_VIDEO_ONLY = "video_only"
        const val ANALYSIS_CHANNEL_ONLY = "channel_only"
        const val ANALYSIS_BOTH = "both"

        // 기본값
        private const val DEFAULT_ANALYSIS_TYPE = ANALYSIS_VIDEO_ONLY
        private const val DEFAULT_SHOW_MODAL = true
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
}

/**
 * 분석 플래그 데이터 클래스
 */
data class AnalysisFlags(
    val includeVideoAnalysis: Boolean,
    val includeChannelAnalysis: Boolean
)
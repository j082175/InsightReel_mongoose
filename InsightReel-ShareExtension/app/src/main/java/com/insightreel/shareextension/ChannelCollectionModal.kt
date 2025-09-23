package com.insightreel.shareextension

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.URL

data class ChannelInfo(
    val name: String,
    val subscribers: String,
    val platform: String,
    val thumbnailUrl: String? = null,
    val channelId: String? = null
)

data class CollectionSettings(
    val keywords: List<String>,
    val contentType: String, // "all", "shorts", "longform"
    val aiAnalysisEnabled: Boolean
)

class ChannelCollectionModal(
    private val context: Context,
    private val networkManager: NetworkManager
) {
    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val selectedKeywords = mutableSetOf<String>()
    private val recentKeywords = listOf("#테크", "#리뷰", "#게임", "#음식", "#여행", "#뷰티", "#스포츠", "#영화")

    // 자동완성 어댑터
    private lateinit var autocompleteAdapter: KeywordAutocompleteAdapter

    private lateinit var dialog: AlertDialog
    private lateinit var dialogView: View

    // UI 컴포넌트들
    private lateinit var channelName: TextView
    private lateinit var channelSubscribers: TextView
    private lateinit var channelPlatform: TextView
    private lateinit var channelThumbnail: ImageView
    private lateinit var recentKeywordsContainer: LinearLayout
    private lateinit var customKeywordInput: EditText
    private lateinit var addKeywordButton: Button
    private lateinit var selectedKeywordsContainer: LinearLayout
    private lateinit var selectedKeywordsText: TextView
    private lateinit var contentTypeRadioGroup: RadioGroup
    private lateinit var aiAnalysisSwitch: Switch
    private lateinit var buttonCancel: Button
    private lateinit var buttonStartCollection: Button

    fun show(url: String, onCollectionComplete: (Boolean) -> Unit = {}) {
        dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_channel_collection, null)
        initViews()

        // 채널 정보 로드
        loadChannelInfo(url)

        // 이벤트 리스너 설정
        setupEventListeners(url, onCollectionComplete)

        // 다이얼로그 생성 및 표시
        dialog = AlertDialog.Builder(context)
            .setView(dialogView)
            .setCancelable(true)  // 뒤로가기 버튼으로 취소 가능
            .create()

        // 다이얼로그 외부 터치로 닫기 허용
        dialog.setCanceledOnTouchOutside(true)

        // 다이얼로그 취소 시 콜백 호출
        dialog.setOnCancelListener {
            onCollectionComplete(false)
        }

        dialog.show()
    }

    private fun initViews() {
        channelName = dialogView.findViewById(R.id.channelName)
        channelSubscribers = dialogView.findViewById(R.id.channelSubscribers)
        channelPlatform = dialogView.findViewById(R.id.channelPlatform)
        channelThumbnail = dialogView.findViewById(R.id.channelThumbnail)
        recentKeywordsContainer = dialogView.findViewById(R.id.recentKeywordsContainer)
        customKeywordInput = dialogView.findViewById(R.id.customKeywordInput)
        addKeywordButton = dialogView.findViewById(R.id.addKeywordButton)
        selectedKeywordsContainer = dialogView.findViewById(R.id.selectedKeywordsContainer)
        selectedKeywordsText = dialogView.findViewById(R.id.selectedKeywordsText)
        contentTypeRadioGroup = dialogView.findViewById(R.id.contentTypeRadioGroup)
        aiAnalysisSwitch = dialogView.findViewById(R.id.aiAnalysisSwitch)
        buttonCancel = dialogView.findViewById(R.id.buttonCancelCollection)
        buttonStartCollection = dialogView.findViewById(R.id.buttonStartCollection)

        // 최근 키워드 버튼들 동적 생성
        setupRecentKeywordButtons()

        // 자동완성 설정
        setupAutocomplete()
    }

    private fun setupRecentKeywordButtons() {
        // 기존 예시 버튼들 제거
        recentKeywordsContainer.removeAllViews()

        // 동적으로 최근 키워드 버튼들 생성
        recentKeywords.forEach { keyword ->
            val button = Button(context).apply {
                text = keyword
                textSize = 12f
                setTextColor(context.getColor(android.R.color.holo_blue_dark))
                background = context.getDrawable(android.R.color.transparent)
                minWidth = 0
                minHeight = 0
                setPadding(16, 8, 16, 8)

                setOnClickListener {
                    addKeyword(keyword)
                }
            }

            val layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams.marginEnd = 16
            button.layoutParams = layoutParams

            recentKeywordsContainer.addView(button)
        }
    }

    private fun setupAutocomplete() {
        // AutoCompleteTextView로 변환
        if (customKeywordInput is AutoCompleteTextView) {
            autocompleteAdapter = KeywordAutocompleteAdapter(
                context,
                KeywordAutocompleteAdapter.getDefaultSuggestions()
            )

            (customKeywordInput as AutoCompleteTextView).apply {
                setAdapter(autocompleteAdapter)
                threshold = 1 // 1글자부터 자동완성 시작

                // 항목 선택 시 자동으로 키워드 추가
                setOnItemClickListener { _, _, position, _ ->
                    val selectedSuggestion = autocompleteAdapter.getItem(position)
                    setText(selectedSuggestion.keyword)
                    addKeywordButton.performClick()
                }

                // 텍스트 변경 시 자동완성 필터 적용
                addTextChangedListener(object : TextWatcher {
                    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                    override fun afterTextChanged(s: Editable?) {
                        // 자동으로 필터링됨 (threshold 설정으로)
                    }
                })
            }
        }
    }

    private fun setupEventListeners(url: String, onCollectionComplete: (Boolean) -> Unit) {
        // 커스텀 키워드 추가 버튼
        addKeywordButton.setOnClickListener {
            val keyword = customKeywordInput.text.toString().trim()
            if (keyword.isNotEmpty()) {
                addKeyword(if (keyword.startsWith("#")) keyword else "#$keyword")
                customKeywordInput.text.clear()
            }
        }

        // 엔터 키로 키워드 추가
        customKeywordInput.setOnEditorActionListener { _, _, _ ->
            addKeywordButton.performClick()
            true
        }

        // 취소 버튼
        buttonCancel.setOnClickListener {
            dialog.dismiss()
            onCollectionComplete(false)
        }

        // 수집 시작 버튼
        buttonStartCollection.setOnClickListener {
            if (selectedKeywords.isEmpty()) {
                Toast.makeText(context, "⚠️ 최소 1개 이상의 키워드를 선택해주세요", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val settings = getCollectionSettings()
            startChannelCollection(url, settings, onCollectionComplete)
        }
    }

    private fun loadChannelInfo(url: String) {
        coroutineScope.launch {
            try {
                // URL에서 채널 정보 추출
                val channelInfo = extractChannelInfoFromUrl(url)

                // UI 업데이트
                channelName.text = channelInfo.name
                channelSubscribers.text = channelInfo.subscribers
                channelPlatform.text = channelInfo.platform

                // 플랫폼별 색상 설정
                when (channelInfo.platform) {
                    "YouTube" -> channelPlatform.setTextColor(context.getColor(android.R.color.holo_red_dark))
                    "Instagram" -> channelPlatform.setTextColor(context.getColor(android.R.color.holo_purple))
                    "TikTok" -> channelPlatform.setTextColor(context.getColor(android.R.color.black))
                }

                // TODO: 썸네일 로드 (Picasso 또는 Glide 사용)
                // Picasso.get().load(channelInfo.thumbnailUrl).into(channelThumbnail)

            } catch (e: Exception) {
                println("❌ 채널 정보 로드 실패: ${e.message}")
                // 기본 정보 표시
                channelName.text = "채널 정보를 불러오는 중..."
                channelSubscribers.text = "구독자 정보 없음"
                channelPlatform.text = detectPlatformFromUrl(url)
            }
        }
    }

    private fun extractChannelInfoFromUrl(url: String): ChannelInfo {
        val platform = detectPlatformFromUrl(url)

        return when {
            url.contains("youtube.com") || url.contains("youtu.be") -> {
                // YouTube 채널 정보 추출 로직
                val channelId = extractYouTubeChannelId(url)
                ChannelInfo(
                    name = "YouTube 채널",
                    subscribers = "구독자 정보 로딩중...",
                    platform = "YouTube",
                    channelId = channelId
                )
            }
            url.contains("instagram.com") -> {
                ChannelInfo(
                    name = "Instagram 계정",
                    subscribers = "팔로워 정보 로딩중...",
                    platform = "Instagram"
                )
            }
            url.contains("tiktok.com") -> {
                ChannelInfo(
                    name = "TikTok 계정",
                    subscribers = "팔로워 정보 로딩중...",
                    platform = "TikTok"
                )
            }
            else -> {
                ChannelInfo(
                    name = "알 수 없는 채널",
                    subscribers = "정보 없음",
                    platform = "Unknown"
                )
            }
        }
    }

    private fun extractYouTubeChannelId(url: String): String? {
        return try {
            when {
                url.contains("/channel/") -> {
                    val channelId = url.substringAfter("/channel/").substringBefore("/").substringBefore("?")
                    channelId
                }
                url.contains("/c/") -> {
                    val customUrl = url.substringAfter("/c/").substringBefore("/").substringBefore("?")
                    customUrl
                }
                url.contains("/@") -> {
                    val handle = url.substringAfter("/@").substringBefore("/").substringBefore("?")
                    handle
                }
                else -> null
            }
        } catch (e: Exception) {
            println("❌ YouTube 채널 ID 추출 실패: ${e.message}")
            null
        }
    }

    private fun detectPlatformFromUrl(url: String): String {
        return when {
            url.contains("youtube.com") || url.contains("youtu.be") -> "YouTube"
            url.contains("instagram.com") -> "Instagram"
            url.contains("tiktok.com") -> "TikTok"
            else -> "Unknown"
        }
    }

    private fun addKeyword(keyword: String) {
        if (selectedKeywords.add(keyword)) {
            updateSelectedKeywordsDisplay()

            // 자동완성 어댑터에 최근 키워드로 추가
            if (::autocompleteAdapter.isInitialized) {
                autocompleteAdapter.addRecentKeyword(keyword)
            }

            Toast.makeText(context, "✅ '$keyword' 추가됨", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "⚠️ 이미 선택된 키워드입니다", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateSelectedKeywordsDisplay() {
        if (selectedKeywords.isEmpty()) {
            selectedKeywordsText.text = "선택된 키워드가 없습니다"
            selectedKeywordsText.setTextColor(context.getColor(android.R.color.darker_gray))
        } else {
            selectedKeywordsText.text = selectedKeywords.joinToString(", ")
            selectedKeywordsText.setTextColor(context.getColor(android.R.color.black))
        }
    }

    private fun getCollectionSettings(): CollectionSettings {
        val contentType = when (contentTypeRadioGroup.checkedRadioButtonId) {
            R.id.radioShortsOnly -> "shorts"
            R.id.radioLongformOnly -> "longform"
            else -> "all"
        }

        return CollectionSettings(
            keywords = selectedKeywords.toList(),
            contentType = contentType,
            aiAnalysisEnabled = aiAnalysisSwitch.isChecked
        )
    }

    private fun startChannelCollection(
        url: String,
        settings: CollectionSettings,
        onCollectionComplete: (Boolean) -> Unit
    ) {
        coroutineScope.launch {
            try {
                // 분석 시작 알림
                Toast.makeText(context, "📊 채널 수집을 시작합니다...", Toast.LENGTH_SHORT).show()

                // 분석 중에도 다이얼로그 유지하되 터치 허용
                buttonStartCollection.isEnabled = false
                buttonStartCollection.text = "수집 중..."

                // 다이얼로그는 유지하되 취소 가능하도록 설정
                dialog.setCancelable(true)
                dialog.setCanceledOnTouchOutside(true)

                // 서버에 채널 수집 요청
                val success = requestChannelCollection(url, settings)

                // 분석 완료 후 다이얼로그 닫기
                dialog.dismiss()

                if (success) {
                    Toast.makeText(context, "✅ 채널 수집이 완료되었습니다!", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(context, "❌ 채널 수집에 실패했습니다", Toast.LENGTH_SHORT).show()
                }

                onCollectionComplete(success)

            } catch (e: Exception) {
                println("❌ 채널 수집 오류: ${e.message}")
                dialog.dismiss()
                Toast.makeText(context, "❌ 수집 중 오류가 발생했습니다", Toast.LENGTH_SHORT).show()
                onCollectionComplete(false)
            }
        }
    }

    private suspend fun requestChannelCollection(url: String, settings: CollectionSettings): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("url", url)
                    put("source", "android_channel_collection")
                    put("keywords", settings.keywords.joinToString(","))
                    put("contentType", settings.contentType)
                    put("aiAnalysisEnabled", settings.aiAnalysisEnabled)
                    put("platform", detectPlatformFromUrl(url))
                    put("timestamp", System.currentTimeMillis())
                }

                println("📤 채널 수집 요청: ${json.toString()}")

                // TODO: 실제 서버 엔드포인트 구현 필요
                // val success = networkManager.sendChannelCollectionRequest(serverUrl, json)

                // 임시로 성공 반환 (실제 구현 시 수정)
                true

            } catch (e: Exception) {
                println("❌ 채널 수집 요청 실패: ${e.message}")
                false
            }
        }
    }

    fun dismiss() {
        if (::dialog.isInitialized && dialog.isShowing) {
            dialog.dismiss()
        }
        coroutineScope.cancel()
    }
}
package com.insightreel.shareextension

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Filter
import android.widget.Filterable
import android.widget.TextView

data class KeywordSuggestion(
    val keyword: String,
    val frequency: Int = 0,
    val category: String = "일반"
)

class KeywordAutocompleteAdapter(
    private val context: Context,
    private var suggestions: List<KeywordSuggestion>
) : BaseAdapter(), Filterable {

    private var filteredSuggestions: List<KeywordSuggestion> = suggestions
    private val inflater: LayoutInflater = LayoutInflater.from(context)

    // 미리 정의된 인기 키워드들
    companion object {
        val POPULAR_KEYWORDS = listOf(
            KeywordSuggestion("#테크", 150, "기술"),
            KeywordSuggestion("#리뷰", 120, "리뷰"),
            KeywordSuggestion("#게임", 110, "게임"),
            KeywordSuggestion("#음식", 100, "요리"),
            KeywordSuggestion("#여행", 95, "여행"),
            KeywordSuggestion("#뷰티", 90, "뷰티"),
            KeywordSuggestion("#스포츠", 85, "스포츠"),
            KeywordSuggestion("#영화", 80, "엔터테인먼트"),
            KeywordSuggestion("#음악", 75, "엔터테인먼트"),
            KeywordSuggestion("#패션", 70, "패션"),
            KeywordSuggestion("#헬스", 65, "건강"),
            KeywordSuggestion("#자동차", 60, "자동차"),
            KeywordSuggestion("#교육", 55, "교육"),
            KeywordSuggestion("#요리", 50, "요리"),
            KeywordSuggestion("#키즈", 45, "키즈"),
            KeywordSuggestion("#펫", 40, "반려동물"),
            KeywordSuggestion("#투자", 35, "금융"),
            KeywordSuggestion("#부동산", 30, "부동산"),
            KeywordSuggestion("#창업", 25, "비즈니스"),
            KeywordSuggestion("#마케팅", 20, "비즈니스"),

            // 한국 트렌드 키워드들
            KeywordSuggestion("#먹방", 140, "요리"),
            KeywordSuggestion("#브이로그", 130, "일상"),
            KeywordSuggestion("#아이돌", 125, "K-POP"),
            KeywordSuggestion("#드라마", 115, "K-드라마"),
            KeywordSuggestion("#웹툰", 105, "웹툰"),
            KeywordSuggestion("#코디", 98, "패션"),
            KeywordSuggestion("#홈카페", 92, "라이프스타일"),
            KeywordSuggestion("#홈트", 88, "헬스"),
            KeywordSuggestion("#반찬", 82, "요리"),
            KeywordSuggestion("#꿀팁", 78, "팁"),

            // 플랫폼별 인기 키워드
            KeywordSuggestion("#숏폼", 160, "형식"),
            KeywordSuggestion("#롱폼", 155, "형식"),
            KeywordSuggestion("#라이브", 145, "형식"),
            KeywordSuggestion("#챌린지", 135, "트렌드"),
            KeywordSuggestion("#언박싱", 122, "리뷰"),
            KeywordSuggestion("#ASMR", 118, "힐링"),

            // 시즌별 키워드
            KeywordSuggestion("#겨울", 72, "시즌"),
            KeywordSuggestion("#봄", 68, "시즌"),
            KeywordSuggestion("#여름", 64, "시즌"),
            KeywordSuggestion("#가을", 60, "시즌"),
            KeywordSuggestion("#크리스마스", 58, "이벤트"),
            KeywordSuggestion("#신년", 55, "이벤트"),

            // 감정/분위기 키워드
            KeywordSuggestion("#힐링", 85, "감정"),
            KeywordSuggestion("#감동", 75, "감정"),
            KeywordSuggestion("#재미", 70, "감정"),
            KeywordSuggestion("#신기", 65, "감정"),
            KeywordSuggestion("#놀라운", 60, "감정")
        )

        fun getDefaultSuggestions(): List<KeywordSuggestion> {
            return POPULAR_KEYWORDS.sortedByDescending { it.frequency }
        }
    }

    override fun getCount(): Int = filteredSuggestions.size

    override fun getItem(position: Int): KeywordSuggestion = filteredSuggestions[position]

    override fun getItemId(position: Int): Long = position.toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val view = convertView ?: createView(parent)
        val suggestion = getItem(position)

        view.findViewById<TextView>(android.R.id.text1).apply {
            text = suggestion.keyword
            setTextColor(context.getColor(android.R.color.black))
        }

        view.findViewById<TextView>(android.R.id.text2)?.apply {
            text = "${suggestion.category} • 사용량 ${suggestion.frequency}"
            setTextColor(context.getColor(android.R.color.darker_gray))
        }

        return view
    }

    private fun createView(parent: ViewGroup?): View {
        return inflater.inflate(android.R.layout.simple_list_item_2, parent, false)
    }

    override fun getFilter(): Filter {
        return object : Filter() {
            override fun performFiltering(constraint: CharSequence?): FilterResults {
                val query = constraint?.toString()?.lowercase()?.trim() ?: ""

                val filtered = if (query.isEmpty()) {
                    // 빈 쿼리일 때는 인기 키워드 상위 10개만 표시
                    suggestions.take(10)
                } else {
                    // 쿼리가 있을 때는 필터링
                    suggestions.filter { suggestion ->
                        val keyword = suggestion.keyword.lowercase()
                        val category = suggestion.category.lowercase()

                        // 키워드 또는 카테고리에서 일치하는 항목 찾기
                        keyword.contains(query) ||
                        category.contains(query) ||

                        // '#' 없이 검색해도 찾을 수 있게
                        keyword.removePrefix("#").contains(query) ||

                        // 한글 초성 검색 지원 (간단한 버전)
                        matchesKoreanInitial(keyword, query)
                    }.sortedWith(
                        compareBy<KeywordSuggestion> {
                            // 정확히 일치하는 것 우선
                            if (it.keyword.lowercase() == query ||
                                it.keyword.lowercase() == "#$query") 0 else 1
                        }.thenBy {
                            // 시작 문자 일치하는 것 우선
                            if (it.keyword.lowercase().startsWith(query) ||
                                it.keyword.lowercase().startsWith("#$query")) 0 else 1
                        }.thenByDescending {
                            // 인기도 순
                            it.frequency
                        }
                    ).take(15) // 최대 15개까지만 표시
                }

                return FilterResults().apply {
                    values = filtered
                    count = filtered.size
                }
            }

            @Suppress("UNCHECKED_CAST")
            override fun publishResults(constraint: CharSequence?, results: FilterResults?) {
                filteredSuggestions = (results?.values as? List<KeywordSuggestion>) ?: emptyList()
                notifyDataSetChanged()
            }
        }
    }

    private fun matchesKoreanInitial(keyword: String, query: String): Boolean {
        // 간단한 한글 초성 매칭 (예: "ㄱㅇ" → "게임")
        if (!query.all { it in 'ㄱ'..'ㅎ' }) return false

        val initials = mapOf(
            'ㄱ' to listOf('가', '나'), 'ㄴ' to listOf('나', '다'),
            'ㄷ' to listOf('다', '라'), 'ㄹ' to listOf('라', '마'),
            'ㅁ' to listOf('마', '바'), 'ㅂ' to listOf('바', '사'),
            'ㅅ' to listOf('사', '아'), 'ㅇ' to listOf('아', '자'),
            'ㅈ' to listOf('자', '차'), 'ㅊ' to listOf('차', '카'),
            'ㅋ' to listOf('카', '타'), 'ㅌ' to listOf('타', '파'),
            'ㅍ' to listOf('파', '하'), 'ㅎ' to listOf('하', '힣')
        )

        return false // 복잡한 구현은 생략, 필요시 확장
    }

    fun updateSuggestions(newSuggestions: List<KeywordSuggestion>) {
        suggestions = newSuggestions
        filteredSuggestions = newSuggestions
        notifyDataSetChanged()
    }

    fun addRecentKeyword(keyword: String) {
        val cleanKeyword = if (keyword.startsWith("#")) keyword else "#$keyword"
        val existingIndex = suggestions.indexOfFirst { it.keyword == cleanKeyword }

        suggestions = if (existingIndex >= 0) {
            // 기존 키워드의 사용량 증가
            val updated = suggestions[existingIndex].copy(frequency = suggestions[existingIndex].frequency + 1)
            suggestions.toMutableList().apply {
                set(existingIndex, updated)
            }
        } else {
            // 새 키워드 추가
            listOf(KeywordSuggestion(cleanKeyword, 1, "사용자")) + suggestions
        }.sortedByDescending { it.frequency }

        notifyDataSetChanged()
    }
}
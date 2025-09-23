package com.insightreel.shareextension

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    private lateinit var networkManager: NetworkManager
    private lateinit var preferencesManager: PreferencesManager
    private val activityScope = CoroutineScope(Dispatchers.Main + SupervisorJob())


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        networkManager = NetworkManager(this)
        preferencesManager = PreferencesManager(this)

        setupUI()
    }

    private fun setupUI() {
        findViewById<TextView>(R.id.titleText).text = "InsightReel Share Extension"
        findViewById<TextView>(R.id.descriptionText).text =
            "YouTube/Instagram/TikTok에서 '공유' → 'InsightReel Share' 선택하세요!\n\n또는 아래에 링크를 직접 입력할 수도 있습니다."

        // 설정 버튼 추가
        val settingsButton = findViewById<Button>(R.id.settingsButton)
        settingsButton.setOnClickListener {
            openSettings()
        }

        // 테스트 버튼을 연결 테스트 버튼으로 변경
        val testButton = findViewById<Button>(R.id.testButton)
        testButton.text = "🧪 연결 테스트"
        testButton.setOnClickListener {
            testConnection()
        }
    }

    private fun openSettings() {
        val intent = Intent(this, SettingsActivity::class.java)
        startActivity(intent)
    }

    private fun testConnection() {
        findViewById<Button>(R.id.testButton).text = "테스트 중..."

        activityScope.launch {
            try {
                val serverUrl = preferencesManager.getCurrentServerUrl()
                val success = networkManager.sendVideoUrl(
                    serverUrl,
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                )

                val networkType = if (networkManager.isWifiConnected()) "WiFi" else "LTE"
                if (success) {
                    Toast.makeText(this@MainActivity, "✅ 서버 연결 성공! ($networkType)", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@MainActivity, "❌ 서버 연결 실패 ($networkType)", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "❌ 네트워크 오류: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                findViewById<Button>(R.id.testButton).text = "🧪 연결 테스트"
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
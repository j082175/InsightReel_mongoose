const axios = require(\"axios\");

async function testAPI() {
    try {
        console.log(\"🔍 API 테스트 시작...\");

        const response = await axios.get(\"http://localhost:3000/api/videos?limit=5\");

        console.log(\"✅ API 응답 상태:\", response.status);
        console.log(\"📊 데이터 개수:\", response.data.data ? response.data.data.length : 0);

        if (response.data.data && response.data.data.length > 0) {
            console.log(\"\n📹 첫 번째 비디오:\");
            const video = response.data.data[0];
            console.log(\"- ID:\", video._id);
            console.log(\"- Title:\", video.title);
            console.log(\"- Platform:\", video.platform);
            console.log(\"- URL:\", video.url);
            console.log(\"- Views:\", video.views);
            console.log(\"- Subscribers:\", video.subscribers);
            console.log(\"- ChannelVideos:\", video.channelVideos);
            console.log(\"- MiddleCategory:\", video.middleCategory);
            console.log(\"- Keywords:\", video.keywords);
            console.log(\"- CreatedAt:\", video.createdAt);
        } else {
            console.log(\"❌ 비디오 데이터가 없습니다.\");
        }

    } catch (error) {
        console.error(\"❌ API 오류:\", error.response?.data || error.message);
    }
}

testAPI();

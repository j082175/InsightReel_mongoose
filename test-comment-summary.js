/**
 * 댓글 요약 기능 테스트
 * 다양한 댓글 요약 방법 비교
 */

require('dotenv').config();

// 실제 댓글 데이터 (Google Sheets에서 가져온 것)
const sampleComments = `1. @mariohello3122: The person who put this song in the movie is a funking genius | 2. @sudhanbalakumar3989: "Tomorrow never comes until it's too late" let that sink in | 3. @dattatreyasathe3526: Whenever I feel low or sad, this song takes me to the top. I forget everything. My salute to the person who made this song. | 4. @NghiaTrong-ch1cn: Tokyo Drift is immortal ! It made me always RESPECT Japan | 5. @XxPeruvianGamersxX: Walking around the streets of Tokyo listening to this song is absolutely priceless | 6. @K.AZMI_YT: "at the starting of the week" I had goose bump already🥶 | 7. @Danielcb23: For everyone wondering, the artist is DJ Shadow, the song title is "Six Days" | 8. @AruHitz: This shot. This car. This track ('Six Days'). It's the very essence of cool. Han, leaning against that legendary orange VeilSide RX-7, embodies a level of effortless style and quiet power that transcends the movie itself. | 9. @The_Random-13: 0:50 "tommorow never comes until it's too late"🔥🔥 | 10. @vikaspathania5702: This movie came when i was in college.. Beautiful memories.. This song still gives me goosebumps..😊`;

/**
 * 방법 1: 단순 길이 제한 (현재 방식)
 */
function simpleTruncate(comments, maxLength = 500) {
  if (comments.length <= maxLength) {
    return comments;
  }
  return comments.substring(0, maxLength) + '...';
}

/**
 * 방법 2: 상위 N개 댓글만 추출
 */
function topComments(comments, topN = 5) {
  const commentArray = comments.split(' | ');
  return commentArray.slice(0, topN).join(' | ');
}

/**
 * 방법 3: 키워드 기반 중요 댓글 추출
 */
function keywordBasedSummary(comments) {
  const commentArray = comments.split(' | ');
  const keywords = ['genius', 'best', 'love', 'nostalgia', 'perfect', 'amazing', 'goosebump', 'immortal'];
  
  const importantComments = commentArray.filter(comment => {
    const lowerComment = comment.toLowerCase();
    return keywords.some(keyword => lowerComment.includes(keyword));
  });
  
  return importantComments.slice(0, 5).join(' | ');
}

/**
 * 방법 4: 통계 기반 요약
 */
function statisticalSummary(comments) {
  const commentArray = comments.split(' | ');
  const totalComments = commentArray.length;
  
  // 감정 키워드 분석
  const positiveWords = ['love', 'best', 'amazing', 'perfect', 'genius', 'beautiful', 'goosebump'];
  const nostalgicWords = ['memories', 'nostalgia', 'college', 'old'];
  const movieWords = ['tokyo', 'drift', 'han', 'movie', 'film'];
  
  let positiveCount = 0;
  let nostalgicCount = 0;
  let movieCount = 0;
  
  commentArray.forEach(comment => {
    const lowerComment = comment.toLowerCase();
    if (positiveWords.some(word => lowerComment.includes(word))) positiveCount++;
    if (nostalgicWords.some(word => lowerComment.includes(word))) nostalgicCount++;
    if (movieWords.some(word => lowerComment.includes(word))) movieCount++;
  });
  
  const summary = {
    total: totalComments,
    positive: positiveCount,
    nostalgic: nostalgicCount,
    movieRelated: movieCount,
    topComments: commentArray.slice(0, 3)
  };
  
  return `총 ${summary.total}개 댓글 | 긍정적: ${summary.positive}개 | 향수: ${summary.nostalgic}개 | 영화관련: ${summary.movieRelated}개 | 대표댓글: ${summary.topComments.join(' | ')}`;
}

/**
 * 방법 5: AI 기반 요약 (Gemini 사용)
 */
async function aiBasedSummary(comments) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `다음 YouTube 댓글들을 한국어로 3-5줄로 요약해주세요. 주요 감정과 내용을 포함해주세요:

댓글들:
${comments}

요약 형식:
- 총 댓글 수와 주요 감정
- 가장 많이 언급된 주제들
- 대표적인 댓글 1-2개 (한국어 번역)`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    return summary.trim();
    
  } catch (error) {
    console.log('AI 요약 실패:', error.message);
    return 'AI 요약 불가';
  }
}

/**
 * 모든 요약 방법 테스트
 */
async function testCommentSummary() {
  console.log('📝 댓글 요약 기능 테스트\n');
  
  console.log('📊 원본 댓글 정보:');
  console.log(`   - 길이: ${sampleComments.length}자`);
  console.log(`   - 댓글 개수: ${sampleComments.split(' | ').length}개`);
  console.log(`   - 바이트 크기: ${Buffer.byteLength(sampleComments, 'utf8')} bytes`);
  console.log('');

  // 방법 1: 단순 길이 제한
  console.log('1️⃣ 단순 길이 제한 (500자):');
  const method1 = simpleTruncate(sampleComments, 500);
  console.log(`   길이: ${method1.length}자`);
  console.log(`   내용: ${method1.substring(0, 100)}...`);
  console.log('');

  // 방법 2: 상위 N개 댓글
  console.log('2️⃣ 상위 5개 댓글만:');
  const method2 = topComments(sampleComments, 5);
  console.log(`   길이: ${method2.length}자`);
  console.log(`   내용: ${method2.substring(0, 100)}...`);
  console.log('');

  // 방법 3: 키워드 기반
  console.log('3️⃣ 키워드 기반 중요 댓글:');
  const method3 = keywordBasedSummary(sampleComments);
  console.log(`   길이: ${method3.length}자`);
  console.log(`   내용: ${method3.substring(0, 100)}...`);
  console.log('');

  // 방법 4: 통계 기반
  console.log('4️⃣ 통계 기반 요약:');
  const method4 = statisticalSummary(sampleComments);
  console.log(`   길이: ${method4.length}자`);
  console.log(`   내용: ${method4}`);
  console.log('');

  // 방법 5: AI 기반
  console.log('5️⃣ AI 기반 요약 (Gemini):');
  const method5 = await aiBasedSummary(sampleComments);
  console.log(`   길이: ${method5.length}자`);
  console.log(`   내용: ${method5}`);
  console.log('');

  // 각 방법별 효율성 비교
  console.log('📈 방법별 효율성 비교:');
  console.log('─'.repeat(80));
  console.log('방법               | 길이    | 압축율   | 정보보존도 | 처리속도');
  console.log('─'.repeat(80));
  console.log(`단순 길이 제한        | ${method1.length.toString().padEnd(6)} | ${((1 - method1.length/sampleComments.length)*100).toFixed(1).padEnd(7)}% | 낮음       | 매우빠름`);
  console.log(`상위 N개 댓글        | ${method2.length.toString().padEnd(6)} | ${((1 - method2.length/sampleComments.length)*100).toFixed(1).padEnd(7)}% | 보통       | 빠름`);
  console.log(`키워드 기반          | ${method3.length.toString().padEnd(6)} | ${((1 - method3.length/sampleComments.length)*100).toFixed(1).padEnd(7)}% | 높음       | 보통`);
  console.log(`통계 기반           | ${method4.length.toString().padEnd(6)} | ${((1 - method4.length/sampleComments.length)*100).toFixed(1).padEnd(7)}% | 매우높음    | 보통`);
  console.log(`AI 기반             | ${method5.length.toString().padEnd(6)} | ${((1 - method5.length/sampleComments.length)*100).toFixed(1).padEnd(7)}% | 최고       | 느림`);
  console.log('─'.repeat(80));

  // 권장사항
  console.log('\n💡 권장사항:');
  
  if (process.env.GOOGLE_API_KEY && method5 !== 'AI 요약 불가') {
    console.log('✅ AI 기반 요약 권장:');
    console.log('   - 높은 정보 압축률과 의미 보존');
    console.log('   - 한국어로 이해하기 쉬운 요약');
    console.log('   - 기존 Gemini API 활용 가능');
  } else {
    console.log('✅ 통계 기반 요약 권장:');
    console.log('   - AI 없이도 높은 정보 보존도');
    console.log('   - 빠른 처리 속도');
    console.log('   - 정량적 분석 정보 포함');
  }
  
  console.log('\n🚀 구현 방향:');
  console.log('1. 기본: 상위 5개 댓글 (빠른 처리)');
  console.log('2. 고급: AI 요약 (선택적 활성화)');
  console.log('3. 하이브리드: 통계 + 상위 댓글 조합');

  return {
    methods: {
      simple: method1.length,
      topN: method2.length,
      keyword: method3.length,
      statistical: method4.length,
      ai: method5.length
    },
    original: sampleComments.length,
    aiAvailable: method5 !== 'AI 요약 불가'
  };
}

// 직접 실행 시
if (require.main === module) {
  testCommentSummary().then(result => {
    if (result.aiAvailable) {
      console.log('\n🎉 AI 댓글 요약이 완벽하게 가능합니다!');
    } else {
      console.log('\n✅ 다양한 댓글 요약 방법이 가능합니다!');
    }
  });
}

module.exports = testCommentSummary;
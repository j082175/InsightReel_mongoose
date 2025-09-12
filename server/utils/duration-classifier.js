/**
 * ⏱️ Duration Classifier - 영상 길이별 분류
 * YouTube API duration 파싱 및 SHORT/MID/LONG 분류
 */

class DurationClassifier {
  /**
   * YouTube API ISO 8601 duration을 초로 변환
   * @param {string} isoDuration - PT4M13S 형식
   * @returns {number} 총 초
   */
  static parseDuration(isoDuration) {
    if (!isoDuration) return 0;
    
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  /**
   * 초 단위를 SHORT/MID/LONG으로 분류
   * @param {number} durationSeconds - 총 초
   * @returns {string} 'SHORT' | 'MID' | 'LONG'
   */
  static categorizeByDuration(durationSeconds) {
    if (durationSeconds <= 60) return 'SHORT';    // 60초 이하 (1분 이하)
    if (durationSeconds <= 180) return 'MID';     // 61-180초 (1-3분)
    return 'LONG';                                // 181초 이상 (3분 이상)
  }
  
  /**
   * ISO duration을 바로 카테고리로 변환 (편의 메서드)
   * @param {string} isoDuration - PT4M13S 형식
   * @returns {string} 'SHORT' | 'MID' | 'LONG'
   */
  static categorizeFromISO(isoDuration) {
    const seconds = this.parseDuration(isoDuration);
    return this.categorizeByDuration(seconds);
  }
  
  /**
   * 초를 읽기 쉬운 형태로 포맷
   * @param {number} seconds - 총 초
   * @returns {string} "4:13" 형식
   */
  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

module.exports = DurationClassifier;
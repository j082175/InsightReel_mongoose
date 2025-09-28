import { ServerLogger } from '../../../utils/logger';

interface ParsedResponse {
    success: boolean;
    majorCategory?: string;
    middleCategory?: string;
    subCategory?: string;
    keywords?: string[];
    summary?: string;
    confidence?: number;
    error?: string;
    rawResponse?: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class ResponseParser {
    private static readonly REQUIRED_FIELDS = ['majorCategory', 'middleCategory'];
    private static readonly CONFIDENCE_THRESHOLD = 0.5;

    /**
     * AI 응답 파싱 (JSON 형식)
     */
    static parseAIResponse(
        aiResponse: string,
        metadata?: any,
        context?: any
    ): ParsedResponse {
        try {
            if (!aiResponse || typeof aiResponse !== 'string') {
                return {
                    success: false,
                    error: '유효하지 않은 AI 응답입니다'
                };
            }

            ServerLogger.info('AI 응답 파싱 시작');

            // JSON 추출 시도
            const jsonResult = this.extractAndParseJSON(aiResponse);
            if (jsonResult.success) {
                return this.validateAndNormalize(jsonResult.data!, aiResponse, metadata);
            }

            // 구조화된 텍스트 파싱 시도
            const textResult = this.parseStructuredText(aiResponse);
            if (textResult.success) {
                return this.validateAndNormalize(textResult.data!, aiResponse, metadata);
            }

            // 키워드 기반 파싱 시도 (폴백)
            const keywordResult = this.parseByKeywords(aiResponse);
            if (keywordResult.success) {
                return this.validateAndNormalize(keywordResult.data!, aiResponse, metadata);
            }

            return {
                success: false,
                error: '응답을 파싱할 수 없습니다',
                rawResponse: aiResponse
            };

        } catch (error) {
            ServerLogger.error('AI 응답 파싱 중 오류:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '파싱 오류',
                rawResponse: aiResponse
            };
        }
    }

    /**
     * JSON 형식 추출 및 파싱
     */
    private static extractAndParseJSON(text: string): { success: boolean; data?: any; error?: string } {
        try {
            // JSON 블록 찾기 (```json ... ```)
            const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
            if (jsonBlockMatch) {
                const parsed = JSON.parse(jsonBlockMatch[1]);
                return { success: true, data: parsed };
            }

            // 중괄호로 둘러싸인 JSON 찾기
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return { success: true, data: parsed };
            }

            // 전체 텍스트가 JSON인지 확인
            const parsed = JSON.parse(text.trim());
            return { success: true, data: parsed };

        } catch (error) {
            return { success: false, error: 'JSON 파싱 실패' };
        }
    }

    /**
     * 구조화된 텍스트 파싱
     */
    private static parseStructuredText(text: string): { success: boolean; data?: any; error?: string } {
        try {
            const result: any = {};

            // 카테고리 추출 패턴들
            const patterns = {
                majorCategory: [
                    /대카테고리[:\s]*([^\n\r]+)/i,
                    /major[_\s]*category[:\s]*([^\n\r]+)/i,
                    /메인[_\s]*카테고리[:\s]*([^\n\r]+)/i
                ],
                middleCategory: [
                    /중카테고리[:\s]*([^\n\r]+)/i,
                    /middle[_\s]*category[:\s]*([^\n\r]+)/i,
                    /서브[_\s]*카테고리[:\s]*([^\n\r]+)/i
                ],
                subCategory: [
                    /소카테고리[:\s]*([^\n\r]+)/i,
                    /sub[_\s]*category[:\s]*([^\n\r]+)/i,
                    /세부[_\s]*카테고리[:\s]*([^\n\r]+)/i
                ],
                keywords: [
                    /키워드[:\s]*([^\n\r]+)/i,
                    /keywords?[:\s]*([^\n\r]+)/i,
                    /태그[:\s]*([^\n\r]+)/i
                ],
                summary: [
                    /요약[:\s]*([^\n\r]+)/i,
                    /summary[:\s]*([^\n\r]+)/i,
                    /설명[:\s]*([^\n\r]+)/i
                ]
            };

            let foundAny = false;

            // 각 패턴으로 추출 시도
            for (const [field, fieldPatterns] of Object.entries(patterns)) {
                for (const pattern of fieldPatterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        let value: any = match[1].trim();

                        // 키워드의 경우 배열로 변환
                        if (field === 'keywords' && typeof value === 'string') {
                            value = value.split(/[,;|]/).map(k => k.trim()).filter(k => k.length > 0);
                        }

                        result[field] = value;
                        foundAny = true;
                        break;
                    }
                }
            }

            if (foundAny) {
                return { success: true, data: result };
            }

            return { success: false, error: '구조화된 데이터를 찾을 수 없습니다' };

        } catch (error) {
            return { success: false, error: '구조화된 텍스트 파싱 실패' };
        }
    }

    /**
     * 키워드 기반 파싱 (폴백)
     */
    private static parseByKeywords(text: string): { success: boolean; data?: any; error?: string } {
        try {
            const result: any = {};

            // 일반적인 카테고리 키워드 매핑
            const categoryKeywords = {
                '게임': ['게임', 'game', '플레이', 'play', '리뷰'],
                '교육': ['교육', 'education', '학습', '강의', '튜토리얼'],
                '엔터테인먼트': ['엔터', '예능', '재미', '웃음', '코미디'],
                '음악': ['음악', 'music', '노래', 'song', '뮤직'],
                '스포츠': ['스포츠', 'sport', '운동', '피트니스', '헬스'],
                '기술': ['기술', 'tech', '개발', '프로그래밍', '코딩']
            };

            const lowerText = text.toLowerCase();

            // 키워드 매칭으로 카테고리 추정
            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                for (const keyword of keywords) {
                    if (lowerText.includes(keyword.toLowerCase())) {
                        result.majorCategory = category;
                        result.confidence = 0.6; // 낮은 신뢰도
                        break;
                    }
                }
                if (result.majorCategory) break;
            }

            // 간단한 키워드 추출
            const words = text.match(/\b[가-힣a-zA-Z]{2,}\b/g);
            if (words && words.length > 0) {
                result.keywords = words.slice(0, 10); // 최대 10개
            }

            if (result.majorCategory || result.keywords) {
                return { success: true, data: result };
            }

            return { success: false, error: '키워드 기반 파싱 실패' };

        } catch (error) {
            return { success: false, error: '키워드 파싱 실패' };
        }
    }

    /**
     * 파싱 결과 검증 및 정규화
     */
    private static validateAndNormalize(
        data: any,
        rawResponse: string,
        metadata?: any
    ): ParsedResponse {
        try {
            const validation = this.validateParsedData(data);

            if (!validation.isValid) {
                ServerLogger.warn('파싱 결과 검증 실패:', validation.errors);
                return {
                    success: false,
                    error: `검증 실패: ${validation.errors.join(', ')}`,
                    rawResponse
                };
            }

            // 데이터 정규화
            const normalized = this.normalizeData(data);

            // 신뢰도 계산
            const confidence = this.calculateConfidence(normalized, validation);

            if (validation.warnings.length > 0) {
                ServerLogger.warn('파싱 경고:', validation.warnings);
            }

            ServerLogger.info(`AI 응답 파싱 성공 (신뢰도: ${(confidence * 100).toFixed(1)}%)`);

            return {
                success: true,
                majorCategory: normalized.majorCategory,
                middleCategory: normalized.middleCategory,
                subCategory: normalized.subCategory,
                keywords: normalized.keywords,
                summary: normalized.summary,
                confidence,
                rawResponse
            };

        } catch (error) {
            ServerLogger.error('파싱 결과 검증 중 오류:', error);
            return {
                success: false,
                error: '검증 중 오류 발생',
                rawResponse
            };
        }
    }

    /**
     * 파싱된 데이터 검증
     */
    private static validateParsedData(data: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data || typeof data !== 'object') {
            errors.push('데이터가 객체가 아닙니다');
            return { isValid: false, errors, warnings };
        }

        // 필수 필드 검증
        for (const field of this.REQUIRED_FIELDS) {
            if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
                errors.push(`필수 필드 누락 또는 유효하지 않음: ${field}`);
            }
        }

        // 선택적 필드 검증
        if (data.keywords && !Array.isArray(data.keywords)) {
            warnings.push('키워드가 배열이 아닙니다');
        }

        if (data.confidence && (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1)) {
            warnings.push('신뢰도 값이 유효하지 않습니다');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 데이터 정규화
     */
    private static normalizeData(data: any): any {
        const normalized: any = {};

        // 문자열 필드 정규화
        const stringFields = ['majorCategory', 'middleCategory', 'subCategory', 'summary'];
        for (const field of stringFields) {
            if (data[field] && typeof data[field] === 'string') {
                normalized[field] = data[field].trim();
            }
        }

        // 키워드 배열 정규화
        if (data.keywords) {
            if (Array.isArray(data.keywords)) {
                normalized.keywords = data.keywords
                    .map((k: any) => typeof k === 'string' ? k.trim() : String(k).trim())
                    .filter((k: string) => k.length > 0)
                    .slice(0, 20); // 최대 20개로 제한
            } else if (typeof data.keywords === 'string') {
                normalized.keywords = data.keywords
                    .split(/[,;|]/)
                    .map((k: string) => k.trim())
                    .filter((k: string) => k.length > 0)
                    .slice(0, 20);
            }
        }

        // 신뢰도 정규화
        if (data.confidence && typeof data.confidence === 'number') {
            normalized.confidence = Math.max(0, Math.min(1, data.confidence));
        }

        return normalized;
    }

    /**
     * 신뢰도 계산
     */
    private static calculateConfidence(data: any, validation: ValidationResult): number {
        let confidence = 0.5; // 기본 신뢰도

        // 필수 필드 존재 여부
        if (data.majorCategory) confidence += 0.2;
        if (data.middleCategory) confidence += 0.2;

        // 추가 정보 존재 여부
        if (data.subCategory) confidence += 0.1;
        if (data.keywords && data.keywords.length > 0) confidence += 0.1;
        if (data.summary) confidence += 0.1;

        // 경고 개수에 따른 감점
        confidence -= validation.warnings.length * 0.05;

        // 기존 신뢰도 값이 있다면 고려
        if (data.confidence && typeof data.confidence === 'number') {
            confidence = (confidence + data.confidence) / 2;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * 응답 형식 감지
     */
    static detectResponseFormat(text: string): 'json' | 'structured' | 'plain' {
        if (!text || typeof text !== 'string') return 'plain';

        // JSON 형식 감지
        if (text.includes('{') && text.includes('}')) {
            try {
                JSON.parse(text.trim());
                return 'json';
            } catch {
                if (text.match(/\{[\s\S]*\}/)) {
                    return 'json';
                }
            }
        }

        // 구조화된 텍스트 감지
        if (text.match(/[가-힣a-zA-Z]+\s*[:：]\s*[^\n\r]+/)) {
            return 'structured';
        }

        return 'plain';
    }
}

export default ResponseParser;
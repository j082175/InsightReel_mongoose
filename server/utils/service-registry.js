const { ServerLogger } = require('./logger');

/**
 * API 키를 사용하는 서비스들의 중앙 레지스트리
 * 파일 변경 시 모든 서비스의 캐시를 일괄 클리어
 */
class ServiceRegistry {
    constructor() {
        this.services = new Set();
    }

    /**
     * API 키 사용 서비스 등록
     * @param {Object} service - clearApiKeyCache() 메서드를 가진 서비스 인스턴스
     */
    register(service) {
        if (service && typeof service.clearApiKeyCache === 'function') {
            this.services.add(service);
            ServerLogger.info(`📋 서비스 등록됨: ${service.constructor.name}`, null, 'SERVICE-REGISTRY');
        } else {
            ServerLogger.warn('⚠️ clearApiKeyCache 메서드가 없는 서비스 등록 시도', null, 'SERVICE-REGISTRY');
        }
    }

    /**
     * 서비스 등록 해제
     * @param {Object} service - 제거할 서비스
     */
    unregister(service) {
        if (this.services.has(service)) {
            this.services.delete(service);
            ServerLogger.info(`📤 서비스 등록 해제: ${service.constructor.name}`, null, 'SERVICE-REGISTRY');
        }
    }

    /**
     * 모든 등록된 서비스의 API 키 캐시 클리어
     */
    clearAllServiceCaches() {
        let clearedCount = 0;
        let errorCount = 0;

        this.services.forEach(service => {
            try {
                service.clearApiKeyCache();
                clearedCount++;
            } catch (error) {
                errorCount++;
                ServerLogger.error(`❌ 서비스 캐시 클리어 실패: ${service.constructor.name}`, error, 'SERVICE-REGISTRY');
            }
        });

        ServerLogger.info(`🧹 서비스 캐시 클리어 완료: ${clearedCount}개 성공, ${errorCount}개 실패`, null, 'SERVICE-REGISTRY');
        return { cleared: clearedCount, errors: errorCount };
    }

    /**
     * 등록된 서비스 목록 조회
     */
    getRegisteredServices() {
        return Array.from(this.services).map(service => ({
            name: service.constructor.name,
            hasCache: typeof service.clearApiKeyCache === 'function'
        }));
    }

    /**
     * 등록된 서비스 수 조회
     */
    getServiceCount() {
        return this.services.size;
    }
}

// 싱글톤 인스턴스
module.exports = new ServiceRegistry();
import { ServerLogger } from './logger';

// TypeScript interfaces for service registry
export interface ServiceWithClearCache {
    clearApiKeyCache(): void;
    constructor: {
        name: string;
    };
}

export interface ServiceInfo {
    name: string;
    hasCache: boolean;
}

export interface RegistryStats {
    cleared: number;
    errors: number;
}

/**
 * API 키를 사용하는 서비스들의 중앙 레지스트리
 * 파일 변경 시 모든 서비스의 캐시를 일괄 클리어
 */
export class ServiceRegistry {
    private services: Set<ServiceWithClearCache>;

    constructor() {
        this.services = new Set<ServiceWithClearCache>();
    }

    /**
     * API 키 사용 서비스 등록
     */
    register(service: ServiceWithClearCache): void {
        if (service && typeof service.clearApiKeyCache === 'function') {
            this.services.add(service);
            ServerLogger.info(`📋 서비스 등록됨: ${service.constructor.name}`, null, 'SERVICE-REGISTRY');
        } else {
            ServerLogger.warn('⚠️ clearApiKeyCache 메서드가 없는 서비스 등록 시도', null, 'SERVICE-REGISTRY');
        }
    }

    /**
     * 서비스 등록 해제
     */
    unregister(service: ServiceWithClearCache): void {
        if (this.services.has(service)) {
            this.services.delete(service);
            ServerLogger.info(`📤 서비스 등록 해제: ${service.constructor.name}`, null, 'SERVICE-REGISTRY');
        }
    }

    /**
     * 모든 등록된 서비스의 API 키 캐시 클리어
     */
    clearAllServiceCaches(): RegistryStats {
        let clearedCount = 0;
        let errorCount = 0;

        this.services.forEach(service => {
            try {
                service.clearApiKeyCache();
                clearedCount++;
            } catch (error) {
                errorCount++;
                ServerLogger.error(`❌ 서비스 캐시 클리어 실패: ${service.constructor.name}`, error as Error, 'SERVICE-REGISTRY');
            }
        });

        ServerLogger.info(`🧹 서비스 캐시 클리어 완료: ${clearedCount}개 성공, ${errorCount}개 실패`, null, 'SERVICE-REGISTRY');
        return { cleared: clearedCount, errors: errorCount };
    }

    /**
     * 등록된 서비스 목록 조회
     */
    getRegisteredServices(): ServiceInfo[] {
        return Array.from(this.services).map(service => ({
            name: service.constructor.name,
            hasCache: typeof service.clearApiKeyCache === 'function'
        }));
    }

    /**
     * 등록된 서비스 수 조회
     */
    getServiceCount(): number {
        return this.services.size;
    }

    /**
     * 전체 서비스 초기화 (주로 테스트나 종료 시 사용)
     */
    clear(): void {
        this.services.clear();
        ServerLogger.info('🧹 서비스 레지스트리 초기화 완료', null, 'SERVICE-REGISTRY');
    }

    /**
     * 특정 서비스 타입의 존재 여부 확인
     */
    hasServiceOfType(serviceName: string): boolean {
        return Array.from(this.services).some(service => service.constructor.name === serviceName);
    }

    /**
     * 서비스 등록 상태 체크
     */
    getRegistryStatus(): {
        totalServices: number;
        activeServices: ServiceInfo[];
        registryHealth: 'healthy' | 'warning' | 'error';
    } {
        const services = this.getRegisteredServices();
        const totalServices = services.length;

        let registryHealth: 'healthy' | 'warning' | 'error' = 'healthy';

        if (totalServices === 0) {
            registryHealth = 'warning';
        } else if (services.some(service => !service.hasCache)) {
            registryHealth = 'error';
        }

        return {
            totalServices,
            activeServices: services,
            registryHealth
        };
    }
}

// 싱글톤 인스턴스
const serviceRegistryInstance = new ServiceRegistry();

// Default export for ES6 imports
export default serviceRegistryInstance;

// CommonJS compatibility for legacy require() imports
module.exports = serviceRegistryInstance;

// Named export for TypeScript imports
export { serviceRegistryInstance as ServiceRegistryInstance };
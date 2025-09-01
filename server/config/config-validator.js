const { ServerLogger } = require('../utils/logger');

/**
 * 환경 설정 검증 및 관리 시스템
 */
class ConfigValidator {
  constructor() {
    this.config = {};
    this.errors = [];
    this.warnings = [];
    this.loadConfig();
  }

  /**
   * 설정 로드 및 검증
   */
  loadConfig() {
    this.validateEnvironmentVariables();
    this.validateRequiredSettings();
    this.validateOptionalSettings();
    this.generateReport();
  }

  /**
   * 필수 환경 변수 검증
   */
  validateEnvironmentVariables() {
    const required = [
      {
        key: 'PORT',
        type: 'number',
        default: 3000,
        validate: (val) => val > 0 && val < 65536
      },
      {
        key: 'GOOGLE_SPREADSHEET_ID',
        type: 'string',
        required: true,
        validate: (val) => /^[a-zA-Z0-9-_]{20,}$/.test(val)
      }
    ];

    const optional = [
      {
        key: 'USE_GEMINI',
        type: 'boolean',
        default: false
      },
      {
        key: 'GOOGLE_API_KEY',
        type: 'string',
        required: false,
        validate: (val) => !val || /^AIza[0-9A-Za-z-_]{35}$/.test(val)
      },
      {
        key: 'GOOGLE_SERVICE_ACCOUNT_KEY',
        type: 'json',
        required: false,
        validate: (val) => {
          if (!val) return true;
          
          // 이미 객체인 경우 (타입 변환된 경우)
          if (typeof val === 'object') {
            return val.type === 'service_account' && 
                   val.private_key && 
                   val.client_email;
          }
          
          // 문자열인 경우 JSON 파싱 시도
          try {
            // 이스케이프된 문자들을 실제 문자로 변환
            let processedVal = val
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
              
            const parsed = JSON.parse(processedVal);
            return parsed.type === 'service_account' && 
                   parsed.private_key && 
                   parsed.client_email;
          } catch {
            // JSON 파싱 실패해도 문자열이 있으면 일단 통과 (실제 사용 시 처리)
            return typeof val === 'string' && val.length > 50;
          }
        }
      },
      {
        key: 'MAX_FILE_SIZE',
        type: 'string',
        default: '50mb',
        validate: (val) => /^\d+mb$/.test(val)
      },
      {
        key: 'CLEANUP_DAYS',
        type: 'number',
        default: 7,
        validate: (val) => val > 0 && val < 365
      },
      {
        key: 'LOG_LEVEL',
        type: 'string',
        default: 'info',
        validate: (val) => ['error', 'warn', 'info', 'debug'].includes(val)
      }
    ];

    // 필수 설정 검증
    required.forEach(config => this.validateSetting(config, true));
    
    // 선택적 설정 검증
    optional.forEach(config => this.validateSetting(config, false));
  }

  /**
   * 개별 설정 검증
   */
  validateSetting(config, isRequired = false) {
    const { key, type, default: defaultValue, validate, required } = config;
    const rawValue = process.env[key];
    
    // 값이 없는 경우
    if (!rawValue) {
      if (isRequired || required) {
        this.errors.push(`필수 환경 변수 '${key}'가 설정되지 않았습니다.`);
        return;
      } else {
        this.config[key] = defaultValue;
        if (defaultValue !== undefined) {
          this.warnings.push(`환경 변수 '${key}'가 설정되지 않아 기본값 '${defaultValue}'을 사용합니다.`);
        }
        return;
      }
    }

    // 타입 변환 및 검증
    let convertedValue;
    try {
      convertedValue = this.convertType(rawValue, type, key);
    } catch (error) {
      this.errors.push(`환경 변수 '${key}' 타입 변환 실패: ${error.message}`);
      return;
    }

    // 사용자 정의 검증
    if (validate && !validate(convertedValue)) {
      this.errors.push(`환경 변수 '${key}' 값이 유효하지 않습니다: ${rawValue}`);
      return;
    }

    this.config[key] = convertedValue;
  }

  /**
   * 타입 변환
   */
  convertType(value, type, key = 'unknown') {
    switch (type) {
      case 'string':
        return String(value);
      
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`숫자가 아닙니다: ${value}`);
        }
        return num;
      
      case 'boolean':
        return value.toLowerCase() === 'true';
      
      case 'json':
        try {
          // 이스케이프된 문자들을 실제 문자로 변환
          let processedValue = value
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
          
          const parsed = JSON.parse(processedValue);
          return parsed;
        } catch (error) {
          // JSON 파싱 실패 시 문자열로 처리 (서비스 계정 키는 문자열도 허용)
          if (key === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
            return value; // 원본 문자열 그대로 반환
          }
          throw new Error(`유효하지 않은 JSON: ${error.message}`);
        }
      
      default:
        return value;
    }
  }

  /**
   * 필수 설정 조합 검증
   */
  validateRequiredSettings() {
    // Gemini 사용 시 API 키 필수
    if (this.config.USE_GEMINI && !this.config.GOOGLE_API_KEY) {
      this.errors.push('USE_GEMINI=true일 때 GOOGLE_API_KEY가 필요합니다.');
    }

    // Google Sheets 사용을 위한 인증 정보 필수
    if (!this.config.GOOGLE_SERVICE_ACCOUNT_KEY && !this.config.GOOGLE_API_KEY) {
      this.warnings.push('Google Sheets 기능을 사용하려면 GOOGLE_SERVICE_ACCOUNT_KEY 또는 GOOGLE_API_KEY가 필요합니다.');
    }

    // 파일 크기 단위 검증
    if (this.config.MAX_FILE_SIZE) {
      const sizeMatch = this.config.MAX_FILE_SIZE.match(/^(\d+)(mb|gb)$/i);
      if (!sizeMatch) {
        this.errors.push('MAX_FILE_SIZE 형식이 잘못되었습니다. 예: 50mb, 1gb');
      } else {
        const [, size, unit] = sizeMatch;
        const bytes = unit.toLowerCase() === 'gb' ? size * 1024 * 1024 * 1024 : size * 1024 * 1024;
        this.config.MAX_FILE_SIZE_BYTES = bytes;
      }
    }
  }

  /**
   * 선택적 설정 최적화
   */
  validateOptionalSettings() {
    // 로그 레벨 검증 및 설정
    const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.config.LOG_LEVEL_NUM = logLevels[this.config.LOG_LEVEL] || 2;

    // 개발/프로덕션 환경 감지
    this.config.NODE_ENV = process.env.NODE_ENV || 'development';
    this.config.IS_PRODUCTION = this.config.NODE_ENV === 'production';

    // 프로덕션 환경 추가 검증
    if (this.config.IS_PRODUCTION) {
      if (!this.config.GOOGLE_API_KEY && !this.config.GOOGLE_SERVICE_ACCOUNT_KEY) {
        this.errors.push('프로덕션 환경에서는 Google 인증 정보가 필수입니다.');
      }
    }
  }

  /**
   * 설정 보고서 생성
   */
  generateReport() {
    ServerLogger.info('🔧 환경 설정 검증 시작', null, 'CONFIG');

    if (this.errors.length > 0) {
      ServerLogger.error('❌ 환경 설정 에러:', this.errors, 'CONFIG');
      throw new Error(`환경 설정 에러: ${this.errors.join(', ')}`);
    }

    if (this.warnings.length > 0) {
      this.warnings.forEach(warning => {
        ServerLogger.warn(warning, null, 'CONFIG');
      });
    }

    // 성공 메시지
    ServerLogger.success(`환경 설정 검증 완료`, {
      environment: this.config.NODE_ENV,
      port: this.config.PORT,
      useGemini: this.config.USE_GEMINI,
      hasGoogleAuth: !!(this.config.GOOGLE_API_KEY || this.config.GOOGLE_SERVICE_ACCOUNT_KEY),
      logLevel: this.config.LOG_LEVEL
    }, 'CONFIG');
  }

  /**
   * 설정 값 가져오기
   */
  get(key, defaultValue = undefined) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * 모든 설정 가져오기
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 설정 업데이트 (런타임)
   */
  update(key, value) {
    this.config[key] = value;
    ServerLogger.info(`설정 업데이트: ${key} = ${value}`, null, 'CONFIG');
  }

  /**
   * 설정 파일 생성 도우미
   */
  generateSampleEnv() {
    const sampleEnv = `# 서버 설정
PORT=3000

# 구글 스프레드시트 ID (필수)
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# Google 서비스 계정 키 (JSON 형태)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 또는 Gemini API 사용
USE_GEMINI=true
GOOGLE_API_KEY=your_api_key_here

# 파일 업로드 설정
MAX_FILE_SIZE=50mb
CLEANUP_DAYS=7

# 로그 설정
LOG_LEVEL=info

# 개발/프로덕션 환경
NODE_ENV=development
`;
    return sampleEnv;
  }

  /**
   * 헬스체크 - 외부에서 설정 상태 확인
   */
  healthCheck() {
    const status = {
      status: this.errors.length === 0 ? 'healthy' : 'error',
      errors: this.errors,
      warnings: this.warnings,
      config: {
        environment: this.config.NODE_ENV,
        port: this.config.PORT,
        aiEnabled: this.config.USE_GEMINI,
        sheetsEnabled: !!(this.config.GOOGLE_API_KEY || this.config.GOOGLE_SERVICE_ACCOUNT_KEY)
      }
    };
    return status;
  }
}

// 싱글톤 인스턴스
let configInstance = null;

/**
 * 설정 인스턴스 가져오기
 */
function getConfig() {
  if (!configInstance) {
    configInstance = new ConfigValidator();
  }
  return configInstance;
}

module.exports = {
  ConfigValidator,
  getConfig
};
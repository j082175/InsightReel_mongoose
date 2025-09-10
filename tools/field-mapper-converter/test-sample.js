// 테스트용 샘플 파일
const FieldMapper = require('../types/field-mapper');

function processVideo(data) {
    // 직접 프로퍼티 접근 (변환 대상)
    const channel = data[FieldMapper.get('CHANNEL_NAME')];
    const views = data[FieldMapper.get('VIEWS')];
    const likes = data[FieldMapper.get('LIKES')];
    
    // 객체 리터럴 (변환 대상)  
    return {
        [FieldMapper.get('CHANNEL_NAME')]: channel,
        [FieldMapper.get('VIEWS')]: views,
        [FieldMapper.get('LIKES')]: likes,
        [FieldMapper.get('PLATFORM')]: data[FieldMapper.get('PLATFORM')],
        [FieldMapper.get('VIDEO_URL')]: data.url,
        [FieldMapper.get('PROCESSING')]: true
    };
}

// 레거시 fallback (제거 대상)
const fallbackChannel = metadata[FieldMapper.get('CHANNEL_NAME')] || metadata[FieldMapper.get('CHANNEL_NAME')];

module.exports = { processVideo };
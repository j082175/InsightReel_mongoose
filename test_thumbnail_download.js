const VideoProcessor = require('./server/services/VideoProcessor');

async function testThumbnailDownload() {
    console.log('🧪 썸네일 다운로드 직접 테스트 시작...\n');

    const processor = new VideoProcessor();

    // 성공한 인스타그램 케이스에서 나온 실제 썸네일 URL
    const thumbnailUrl = 'https://instagram.ficn1-1.fna.fbcdn.net/v/t51.2885-15/501475994_1701721024553656_3136115393590968366_n.jpg?stp=dst-jpg_e15_tt6&_nc_ht=instagram.ficn1-1.fna.fbcdn.net&_nc_cat=104&_nc_oc=Q6cZ2QGrjjoqDct1bJFUuNWjEku_-Y6mOdaprhd4es_PF_EyXKxsX1cOo7NrxvyxJmdy3_0&_nc_ohc=XqVMkZqv2YsQ7kNvwG3s4Cp&_nc_gid=f_i9eR3_0OnHrj24Ba_iTA&edm=ANTKIIoBAAAA&ccb=7-5&oh=00_AfaIAMtt0hrrF5SAfpVnBIg0fh1p_iBQmp-hpuQCm1BLqg&oe=68DC71BC&_nc_sid=d885a2';

    console.log(`📸 테스트 썸네일 URL: ${thumbnailUrl.substring(0, 100)}...`);
    console.log('🔄 다운로드 시작...\n');

    try {
        const localPath = await processor.downloadThumbnail(
            thumbnailUrl,
            'DKI6g8ENCWz',
            'instagram'
        );

        console.log('✅ ✅ ✅ 썸네일 다운로드 성공! ✅ ✅ ✅');
        console.log(`로컬 경로: ${localPath}`);
        console.log(`최종 URL: /${localPath}`);

    } catch (error) {
        console.error(`❌ 썸네일 다운로드 실패: ${error.message}`);
        console.error(error.stack);
    }
}

testThumbnailDownload();
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Request } from 'express';

// 다운로드 폴더 경로
const downloadDir = path.join(__dirname, '../../downloads');

// 다운로드 폴더가 없으면 생성
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, downloadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                '-' +
                uniqueSuffix +
                path.extname(file.originalname),
        );
    },
});

const upload = multer.default({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB 제한
    }
});

export default upload;
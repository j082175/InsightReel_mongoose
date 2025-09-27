import * as cors from 'cors';
import { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // 모든 origin 허용 (개발 환경)
        // 프로덕션에서는 허용된 도메인만 지정해야 함
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export default cors.default(corsOptions);
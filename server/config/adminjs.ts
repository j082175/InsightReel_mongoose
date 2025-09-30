import { Express } from 'express';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import session from 'express-session';

// Import models
import VideoModel from '../models/Video';
import Channel from '../models/Channel';

// Register the Mongoose adapter
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

/**
 * AdminJS 설정 및 초기화 (AdminJS v6)
 */
export const setupAdminJS = (app: Express): void => {
  // AdminJS 설정
  const adminOptions: any = {
    resources: [
      {
        resource: VideoModel,
        options: {
          navigation: {
            name: 'Content Management',
            icon: 'Video',
          },
          properties: {
            _id: { isVisible: { list: true, filter: true, show: true, edit: false } },
            title: { isVisible: true },
            platform: { isVisible: true },
            channelName: { isVisible: true },
            views: { isVisible: true },
            likes: { isVisible: true },
            uploadDate: { isVisible: true },
            thumbnailUrl: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            url: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            mainCategory: { isVisible: true },
            middleCategory: { isVisible: true },
            keywords: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            hashtags: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
          },
          sort: {
            sortBy: 'uploadDate',
            direction: 'desc',
          },
          listProperties: ['_id', 'title', 'platform', 'channelName', 'views', 'uploadDate'],
        },
      },
      {
        resource: Channel,
        options: {
          navigation: {
            name: 'Content Management',
            icon: 'Users',
          },
          properties: {
            _id: { isVisible: { list: true, filter: true, show: true, edit: false } },
            name: { isVisible: true },
            platform: { isVisible: true },
            subscribers: { isVisible: true },
            totalVideos: { isVisible: true },
            url: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            categoryInfo: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            keywords: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
          },
          sort: {
            sortBy: 'subscribers',
            direction: 'desc',
          },
          listProperties: ['_id', 'name', 'platform', 'subscribers', 'totalVideos'],
        },
      },
    ],
    rootPath: '/admin',
    branding: {
      companyName: 'InsightReel',
      softwareBrothers: false,
    },
    locale: {
      language: 'en',
      translations: {
        labels: {
          Video: '비디오',
          Channel: '채널',
        },
      },
    },
  };

  const adminJs = new AdminJS(adminOptions);

  // Build and use the AdminJS router with authentication
  const router = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
    cookiePassword: process.env.ADMIN_SESSION_SECRET || 'insightreel-admin-secret-change-in-production',
    cookieName: 'adminjs',
    authenticate: async (email: string, password: string) => {
      // Simple authentication - change these credentials!
      if (email === 'admin@insightreel.com' && password === 'admin123') {
        return { email: 'admin@insightreel.com' };
      }
      return null;
    },
  }, null, {
    secret: process.env.ADMIN_SESSION_SECRET || 'insightreel-admin-secret-change-in-production',
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  });

  app.use(adminJs.options.rootPath, router);

  console.log(`✅ AdminJS running at http://localhost:${process.env.PORT || 3000}${adminJs.options.rootPath}`);
};

export default setupAdminJS;
// Main Manager
export { InstagramManager } from './InstagramManager';

// Extractors
export { ReelsExtractor } from './extractors/ReelsExtractor';

// Services
export { ProfileService } from './services/ProfileService';
export { ReelsCollector } from './services/ReelsCollector';

// Types
export * from './types/instagram-types';

// Default export for backward compatibility
export { default } from './InstagramManager';
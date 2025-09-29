// Modular controllers following SRP (Single Responsibility Principle)
export { BaseController } from './base/BaseController';
export { VideoProcessController } from './VideoProcessController';
export { VideoQueryController } from './VideoQueryController';
export { SystemStatsController } from './SystemStatsController';
export { AdminController } from './AdminController';
export { DebugController } from './DebugController';

// Legacy VideoController has been split into the above focused controllers
// for better maintainability and adherence to SRP
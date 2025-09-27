// Main Services
export { YouTubeManager } from './YouTubeManager';
export { HybridYouTubeExtractor } from './HybridYouTubeExtractor';
export { default as YouTubeBatchProcessor } from './YouTubeBatchProcessor';
export { YouTubeChannelAnalyzer } from './YouTubeChannelAnalyzer';

// Channel Services
export { ChannelService } from './services/ChannelService';
export { ChannelDataCollector } from './services/ChannelDataCollector';

// Extractors
export { YtdlExtractor } from './extractors/YtdlExtractor';
export { APIExtractor } from './extractors/APIExtractor';

// Processors
export { DataMerger } from './processors/DataMerger';
export { BatchProcessor } from './processors/BatchProcessor';

// Managers
export { BatchQueueManager } from './managers/BatchQueueManager';

// Analyzers
export { ChannelInfoCollector } from './analyzers/ChannelInfoCollector';

// Utilities
export { UrlProcessor } from './utils/UrlProcessor';
export { MetadataProcessor } from './utils/MetadataProcessor';

// Types
export * from './types/extraction-types';
export * from './types/batch-types';
export * from './types/channel-types';

// Re-export for backward compatibility
import { YouTubeManager } from './YouTubeManager';
export default YouTubeManager;
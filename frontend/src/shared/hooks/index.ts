// Shared Hooks Public API
export { useModal, useMultiModal } from './useModal';
export { useSelection } from './useSelection';
export { useSearch } from './useSearch';
export { useFilter } from './useFilter';
export { useAPIStatus } from './useAPIStatus';
export { useDelete } from './useDelete';

// API Hooks - Individual exports for direct import
export {
  // Query Hooks
  useVideos,
  useTrendingVideos,
  useChannels,
  useChannelGroups,
  useBatches,
  useTrendingStats,
  useQuotaStatus,
  useServerStatus,

  // Video Mutations
  useDeleteVideo,
  useDeleteVideos,

  // Channel Mutations
  useDeleteChannel,
  useDeleteChannels,

  // Channel Group Mutations
  useCreateChannelGroup,
  useUpdateChannelGroup,
  useDeleteChannelGroup,

  // Batch Mutations
  useCreateBatch,
  useDeleteBatch,
  useDeleteBatches,

  // Legacy
  useCollectTrending,

  // Query Keys
  queryKeys,
} from './useApi';

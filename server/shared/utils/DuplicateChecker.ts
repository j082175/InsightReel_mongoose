/**
 * 🎯 Simple Duplicate Checker
 * Unified duplicate checking for videos and channels using main collections
 * Replaces the complex DuplicateCheckManager system
 */

import Video from '../../models/Video';
import Channel from '../../models/Channel';
import { ServerLogger } from '../../utils/logger';
import type { VideoDocument } from '../../types/video-types';

export class DuplicateChecker {
  /**
   * Check if video URL already exists in the main Video collection
   */
  static async checkVideo(url: string): Promise<boolean> {
    try {
      if (!url || typeof url !== 'string') {
        return false;
      }

      const existing = await Video.findOne({ url }).lean();

      const isDuplicate = !!existing;

      if (isDuplicate) {
        ServerLogger.info(`🔍 Video duplicate found: ${url.substring(0, 50)}...`, null, 'DUPLICATE_CHECKER');
      }

      return isDuplicate;
    } catch (error: any) {
      ServerLogger.error('Video duplicate check failed', { error: error.message, url }, 'DUPLICATE_CHECKER');
      return false; // Return false on error to allow processing
    }
  }

  /**
   * Check if channel already exists in the main Channel collection
   */
  static async checkChannel(channelId: string): Promise<boolean> {
    try {
      if (!channelId || typeof channelId !== 'string') {
        return false;
      }

      const trimmedId = channelId.trim();

      // 🎯 CRITICAL FIX: Check both channelId AND customUrl fields (case-insensitive)
      // customUrl might be stored in lowercase (@mrscoopz) while input is mixed case (@MrScoopz)
      const existing = await Channel.findOne({
        $or: [
          { channelId: trimmedId },
          { customUrl: { $regex: `^${trimmedId}$`, $options: 'i' } } // Case-insensitive match
        ]
      }).lean();

      const isDuplicate = !!existing;

      if (isDuplicate) {
        ServerLogger.info(`🔍 Channel duplicate found: ${channelId}`, null, 'DUPLICATE_CHECKER');
      }

      return isDuplicate;
    } catch (error: any) {
      ServerLogger.error('Channel duplicate check failed', { error: error.message, channelId }, 'DUPLICATE_CHECKER');
      return false; // Return false on error to allow processing
    }
  }

  /**
   * Get existing video details if duplicate exists
   */
  static async getExistingVideo(url: string): Promise<VideoDocument | null> {
    try {
      if (!url || typeof url !== 'string') {
        return null;
      }

      const existing = await Video.findOne({ url });

      if (!existing) return null;

      // Convert MongoDB document to VideoDocument format
      const videoDocument: VideoDocument = {
        ...existing.toObject(),
        _id: existing._id.toString()
      };

      return videoDocument;
    } catch (error: any) {
      ServerLogger.error('Get existing video failed', { error: error.message, url }, 'DUPLICATE_CHECKER');
      return null;
    }
  }

  /**
   * Get existing channel details if duplicate exists
   */
  static async getExistingChannel(channelId: string): Promise<any | null> {
    try {
      if (!channelId || typeof channelId !== 'string') {
        return null;
      }

      const trimmedId = channelId.trim();

      // 🎯 CRITICAL FIX: Check both channelId AND customUrl fields (case-insensitive)
      const existing = await Channel.findOne({
        $or: [
          { channelId: trimmedId },
          { customUrl: { $regex: `^${trimmedId}$`, $options: 'i' } } // Case-insensitive match
        ]
      });

      return existing;
    } catch (error: any) {
      ServerLogger.error('Get existing channel failed', { error: error.message, channelId }, 'DUPLICATE_CHECKER');
      return null;
    }
  }

  /**
   * Check for both video and channel duplicates (batch operation)
   */
  static async checkBoth(url: string, channelId?: string): Promise<{
    videoDuplicate: boolean;
    channelDuplicate: boolean;
    existingVideo?: VideoDocument | null;
    existingChannel?: any | null;
  }> {
    try {
      const promises = [
        this.checkVideo(url),
        channelId ? this.checkChannel(channelId) : Promise.resolve(false)
      ];

      const [videoDuplicate, channelDuplicate] = await Promise.all(promises);

      let existingVideo = null;
      let existingChannel = null;

      // Get details only if duplicates found
      if (videoDuplicate) {
        existingVideo = await this.getExistingVideo(url);
      }
      if (channelDuplicate && channelId) {
        existingChannel = await this.getExistingChannel(channelId);
      }

      return {
        videoDuplicate,
        channelDuplicate,
        existingVideo,
        existingChannel
      };
    } catch (error: any) {
      ServerLogger.error('Batch duplicate check failed', { error: error.message }, 'DUPLICATE_CHECKER');
      return {
        videoDuplicate: false,
        channelDuplicate: false
      };
    }
  }
}

export default DuplicateChecker;
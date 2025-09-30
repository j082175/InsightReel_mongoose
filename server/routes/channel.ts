import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES } from '../config/api-messages';
import { IChannel, IChannelGroup } from '../types/models';
import ChannelGroup from '../models/ChannelGroup';
import Channel from '../models/Channel';

const router = Router();

// 채널 그룹 목록 조회
router.get('/channel-groups', async (req: Request, res: Response) => {
    try {

        const { active, keyword } = req.query;
        let query: any = {};

        if (active === 'true') {
            query.isActive = true;
        }

        if (keyword) {
            query.keywords = { $in: [keyword] };
        }

        const groups = await ChannelGroup.find(query)
            .sort({ updatedAt: -1 })
            .lean();

        res.status(HTTP_STATUS_CODES.OK).json({
            success: true,
            data: groups,
            count: groups.length
        });

    } catch (error) {
        ServerLogger.error('채널 그룹 조회 실패:', error);
        ResponseHandler.serverError(res, error, 'Failed to fetch channel groups');
    }
});

// 채널 그룹 생성
router.post('/channel-groups', async (req: Request, res: Response) => {
    try {
        const { name, description, color, channels, keywords, isActive } = req.body;

        // 필수 필드 검증
        if (!name || !name.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: '그룹 이름은 필수입니다.'
            });
        }

        // 중복 이름 검사
        const existingGroup = await ChannelGroup.findOne({ name: name.trim() });
        if (existingGroup) {
            return res.status(HTTP_STATUS_CODES.CONFLICT).json({
                success: false,
                error: 'DUPLICATE_NAME',
                message: '같은 이름의 그룹이 이미 존재합니다.'
            });
        }

        // channels 필드 변환: string[] → {channelId, name}[]
        let channelsArray = [];
        if (channels && Array.isArray(channels)) {
            if (channels.length > 0 && typeof channels[0] === 'string') {
                // 채널 ID 배열인 경우, 채널 정보 조회하여 변환
                const channelDocs = await Channel.find({
                    channelId: { $in: channels }
                });

                channelsArray = channelDocs.map(ch => ({
                    channelId: ch.channelId || (ch._id as any).toString(),
                    name: ch.name || 'Unknown Channel'
                }));
            } else {
                // 이미 올바른 형식인 경우
                channelsArray = channels;
            }
        }

        const newGroup = new ChannelGroup({
            name: name.trim(),
            description: description?.trim() || '',
            color: color || '#3B82F6',
            channels: channelsArray,
            keywords: keywords || [],
            isActive: isActive !== false
        });

        const savedGroup = await newGroup.save();

        ResponseHandler.success(res, {
            data: savedGroup,
            message: '채널 그룹이 생성되었습니다.'
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to create channel group');
        return;
    }
});

// 채널 그룹 상세 조회
router.get('/channel-groups/:id', async (req: Request, res: Response) => {
    try {
        const group = await ChannelGroup.findById(req.params.id);

        if (!group) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: '채널 그룹을 찾을 수 없습니다.'
            });
        }

        ResponseHandler.success(res, { data: group });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch channel group');
        return;
    }
});

// 채널 그룹 업데이트
router.put('/channel-groups/:id', async (req: Request, res: Response) => {
    try {
        const { name, description, color, channels, keywords, isActive } = req.body;

        const group = await ChannelGroup.findById(req.params.id);
        if (!group) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: '채널 그룹을 찾을 수 없습니다.'
            });
        }

        // 이름 중복 검사 (자기 자신 제외)
        if (name && name.trim() !== group.name) {
            const existingGroup = await ChannelGroup.findOne({
                name: name.trim(),
                _id: { $ne: req.params.id }
            });
            if (existingGroup) {
                return res.status(HTTP_STATUS_CODES.CONFLICT).json({
                    success: false,
                    error: 'DUPLICATE_NAME',
                    message: '같은 이름의 그룹이 이미 존재합니다.'
                });
            }
        }

        // 필드 업데이트
        if (name?.trim()) group.name = name.trim();
        if (description !== undefined) group.description = description?.trim() || '';
        if (color) group.color = color;
        if (keywords !== undefined) group.keywords = keywords;
        if (isActive !== undefined) group.isActive = isActive;

        // channels 필드 변환: string[] → {channelId, name}[]
        if (channels !== undefined) {
            let channelsArray = [];
            if (Array.isArray(channels)) {
                if (channels.length > 0 && typeof channels[0] === 'string') {
                    // 채널 ID 배열인 경우, 채널 정보 조회하여 변환
                    const channelDocs = await Channel.find({
                        channelId: { $in: channels }
                    });

                    channelsArray = channelDocs.map(ch => ({
                        channelId: ch.channelId || (ch._id as any).toString(),
                        name: ch.name || 'Unknown Channel'
                    }));
                } else {
                    // 이미 올바른 형식인 경우
                    channelsArray = channels;
                }
            }
            group.channels = channelsArray as any;
        }

        const updatedGroup = await group.save();

        ResponseHandler.success(res, {
            data: updatedGroup,
            message: '채널 그룹이 수정되었습니다.'
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to update channel group');
        return;
    }
});

// 채널 그룹의 최근 배치 조회
router.get('/channel-groups/:id/recent-batch', async (req: Request, res: Response) => {
    try {
        const groupId = req.params.id;

        // 그룹 존재 확인
        const group = await ChannelGroup.findById(groupId);
        if (!group) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: '채널 그룹을 찾을 수 없습니다.'
            });
        }

        // Import CollectionBatch model
        const CollectionBatch = (await import('../models/CollectionBatch')).default;

        // 최근 배치 조회 (해당 그룹을 타겟으로 한 배치 중 가장 최근 것)
        const recentBatch = await CollectionBatch.findOne({
            targetGroups: groupId,
            status: 'completed'
        })
        .sort({ completedAt: -1 })
        .limit(1)
        .lean();

        if (!recentBatch) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NO_BATCH_FOUND',
                message: '이 그룹에 대한 수집 배치가 없습니다.'
            });
        }

        ResponseHandler.success(res, recentBatch, '최근 배치를 찾았습니다.');
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to get recent batch for group');
        return;
    }
});

// 채널 그룹 트렌딩 수집
router.post('/channel-groups/:id/collect', async (req: Request, res: Response) => {
    try {
        const groupId = req.params.id;
        const { daysBack, minViews, includeShorts, includeMidform, includeLongForm } = req.body;

        // 그룹 조회
        const group = await ChannelGroup.findById(groupId);
        if (!group) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: '채널 그룹을 찾을 수 없습니다.'
            });
        }

        // 그룹에 속한 채널 ID 추출
        const channelIds = group.channels.map(ch => ch.channelId);

        if (channelIds.length === 0) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'NO_CHANNELS',
                message: '그룹에 채널이 없습니다.'
            });
        }

        // 트렌딩 수집 API 호출
        const trendingResponse = await fetch('http://localhost:3000/api/trending/collect-trending', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelIds,
                groupIds: [groupId],  // 그룹 ID 전달
                options: {
                    daysBack: daysBack || 7,
                    minViews: minViews || 100000,
                    includeShorts: includeShorts !== false,
                    includeMidform: includeMidform !== false,
                    includeLongForm: includeLongForm !== false,
                }
            }),
        });

        if (!trendingResponse.ok) {
            const error: any = await trendingResponse.json();
            throw new Error(error.message || '트렌딩 수집 실패');
        }

        const result = await trendingResponse.json();

        // 그룹의 lastCollectedAt 업데이트
        await group.updateLastCollected();

        ResponseHandler.success(res, {
            data: result,
            message: `"${group.name}" 그룹의 트렌딩 영상 수집이 완료되었습니다.`
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to collect trending videos for group');
        return;
    }
});

// 채널 그룹 삭제
router.delete('/channel-groups/:id', async (req: Request, res: Response) => {
    try {

        // ID 유효성 검사
        if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: '유효하지 않은 그룹 ID입니다.'
            });
        }

        const group = await ChannelGroup.findById(req.params.id);

        if (!group) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: '채널 그룹을 찾을 수 없습니다.'
            });
        }

        await ChannelGroup.findByIdAndDelete(req.params.id);

        ResponseHandler.success(res, {
            message: '채널 그룹이 삭제되었습니다.'
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to delete channel group');
        return;
    }
});

// 채널 생성
router.post('/channels', async (req: Request, res: Response) => {
    try {
        const {
            channelId,
            name,
            url,
            platform = 'YOUTUBE',
            subscribers = 0,
            description = '',
            thumbnailUrl = '',
            customUrl = '',
            publishedAt,
            defaultLanguage = '',
            country = '',
            contentType = 'mixed',
            keywords = [],
            aiTags = [],
            deepInsightTags = [],
            targetAudience = '',
            contentStyle = '',
            uniqueFeatures = [],
            channelPersonality = ''
        } = req.body;

        // 필수 필드 검증
        if (!channelId || !channelId.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Channel ID is required'
            });
        }

        if (!name || !name.trim()) {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Channel name is required'
            });
        }

        // 중복 채널 검사
        const existingChannel = await Channel.findOne({ channelId: channelId.trim() });
        if (existingChannel) {
            return res.status(HTTP_STATUS_CODES.CONFLICT).json({
                success: false,
                error: 'DUPLICATE_CHANNEL',
                message: 'Channel with this ID already exists'
            });
        }

        const newChannel = new Channel({
            channelId: channelId.trim(),
            name: name.trim(),
            url: url || `https://youtube.com/channel/${channelId.trim()}`,
            platform,
            subscribers,
            description: description.trim(),
            thumbnailUrl,
            customUrl,
            publishedAt,
            defaultLanguage,
            country,
            contentType,
            keywords,
            aiTags,
            deepInsightTags,
            allTags: [...keywords, ...aiTags, ...deepInsightTags],
            targetAudience,
            contentStyle,
            uniqueFeatures,
            channelPersonality,
            collectedAt: new Date(),
            updatedAt: new Date(),
            version: 1
        });

        const savedChannel = await newChannel.save();

        ResponseHandler.success(res, {
            data: savedChannel,
            message: 'Channel created successfully'
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to create channel');
        return;
    }
});

// 채널 목록 조회
router.get('/channels', async (req: Request, res: Response) => {
    try {

        const {
            limit = 20,
            offset = 0,
            platform,
            groupId,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query: any = {};

        if (platform) {
            query.platform = platform;
        }

        // 특정 그룹의 채널만 조회
        if (groupId) {
            const group = await ChannelGroup.findById(groupId);
            if (group) {
                query.channelId = { $in: group.channels };
            }
        }

        const sortOptions: any = {};
        sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

        const channels = await Channel.find(query)
            .sort(sortOptions)
            .limit(parseInt(limit as string))
            .skip(parseInt(offset as string));
        const totalCount = await Channel.countDocuments(query);

        // Transform data for frontend compatibility
        const transformedChannels = channels.map((channel: any) => {
            const channelObj = channel.toJSON();
            return channelObj;
        });

        res.status(HTTP_STATUS_CODES.OK).json({
            success: true,
            data: transformedChannels,
            pagination: {
                total: totalCount,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                hasMore: (parseInt(offset as string) + channels.length) < totalCount
            }
        });
    } catch (error) {
        ServerLogger.error('채널 목록 조회 실패:', error);
        res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'DATA_FETCH_FAILED',
            message: '채널 목록 조회에 실패했습니다.'
        });
    }
});

// 채널 상세 조회
router.get('/channels/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // TODO: 채널 상세 조회 로직 구현
        const channel: Partial<IChannel> = { _id: id } as any;
        ResponseHandler.success(res, { channel });
    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to fetch channel');
    }
});

// 채널 업데이트
router.put('/channels/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            url,
            platform,
            subscribers,
            description,
            thumbnailUrl,
            customUrl,
            publishedAt,
            defaultLanguage,
            country,
            contentType,
            keywords,
            aiTags,
            deepInsightTags,
            targetAudience,
            contentStyle,
            uniqueFeatures,
            channelPersonality
        } = req.body;

        // ID 유효성 검사
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Invalid channel ID'
            });
        }

        const channel = await Channel.findById(id);
        if (!channel) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Channel not found'
            });
        }

        // 필드 업데이트 (undefined가 아닌 값만)
        if (name !== undefined) channel.name = name.trim();
        if (url !== undefined) channel.url = url;
        if (platform !== undefined) channel.platform = platform;
        if (subscribers !== undefined) channel.subscribers = subscribers;
        if (description !== undefined) channel.description = description;
        if (thumbnailUrl !== undefined) channel.thumbnailUrl = thumbnailUrl;
        if (customUrl !== undefined) channel.customUrl = customUrl;
        if (publishedAt !== undefined) channel.publishedAt = publishedAt;
        if (defaultLanguage !== undefined) channel.defaultLanguage = defaultLanguage;
        if (country !== undefined) channel.country = country;
        if (contentType !== undefined) channel.contentType = contentType;
        if (keywords !== undefined) channel.keywords = keywords;
        if (aiTags !== undefined) channel.aiTags = aiTags;
        if (deepInsightTags !== undefined) channel.deepInsightTags = deepInsightTags;
        if (targetAudience !== undefined) channel.targetAudience = targetAudience;
        if (contentStyle !== undefined) channel.contentStyle = contentStyle;
        if (uniqueFeatures !== undefined) channel.uniqueFeatures = uniqueFeatures;
        if (channelPersonality !== undefined) channel.channelPersonality = channelPersonality;

        // allTags 업데이트
        if (keywords !== undefined || aiTags !== undefined || deepInsightTags !== undefined) {
            channel.allTags = [
                ...(channel.keywords || []),
                ...(channel.aiTags || []),
                ...(channel.deepInsightTags || [])
            ];
        }

        channel.updatedAt = new Date();

        const updatedChannel = await channel.save();

        ResponseHandler.success(res, {
            data: updatedChannel,
            message: 'Channel updated successfully'
        });
        return;

    } catch (error) {
        ResponseHandler.serverError(res, error, 'Failed to update channel');
        return;
    }
});

// 채널 삭제
router.delete('/channels/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // ID 유효성 검사
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Invalid channel ID'
            });
        }

        const channel = await Channel.findByIdAndDelete(id);

        if (!channel) {
            return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Channel not found'
            });
        }

        ServerLogger.info(`✅ Channel deleted: ${channel.name} (${id})`, null, 'CHANNEL_DELETE');

        ResponseHandler.success(res, {
            message: 'Channel deleted successfully',
            data: { id, name: channel.name }
        });
        return;

    } catch (error) {
        ServerLogger.error('Failed to delete channel:', error);
        ResponseHandler.serverError(res, error, 'Failed to delete channel');
        return;
    }
});

export default router;
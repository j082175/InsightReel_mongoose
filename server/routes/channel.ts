import { Router, Request, Response } from 'express';
import { ServerLogger } from '../utils/logger';
import ResponseHandler from '../utils/response-handler';
import { HTTP_STATUS_CODES } from '../config/api-messages';
import { IChannel, IChannelGroup } from '../types/models';

const router = Router();

// 채널 그룹 목록 조회
router.get('/channel-groups', async (req: Request, res: Response) => {
    try {
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');

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
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');
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

        const newGroup = new ChannelGroup({
            name: name.trim(),
            description: description?.trim() || '',
            color: color || '#3B82F6',
            channels: channels || [],
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
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');
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
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');
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
        if (channels !== undefined) group.channels = channels;
        if (keywords !== undefined) group.keywords = keywords;
        if (isActive !== undefined) group.isActive = isActive;

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

// 채널 그룹 삭제
router.delete('/channel-groups/:id', async (req: Request, res: Response) => {
    try {
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');

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

// 채널 목록 조회
router.get('/channels', async (req: Request, res: Response) => {
    try {
        const Channel = require('../models/Channel').default || require('../models/Channel');
        const ChannelGroup = require('../models/ChannelGroup').default || require('../models/ChannelGroup');

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

export default router;
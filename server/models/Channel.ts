import { Document, HydratedDocument, Model, Schema, model } from "mongoose";
import { createChannelSchema } from "../schemas/channel-schema"; // 기존 스키마 생성 함수 임포트
import { IChannel } from "../types/models"; // IChannel 인터페이스 임포트

// 🎯 Mongoose HydratedDocument 타입 (인스턴스 메서드 포함)
export type ChannelDocumentType = HydratedDocument<
    IChannel,
    {
        getBasicInfo(): {
            id: string;
            name: string;
            url: string;
            platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK";
            subscribers: number;
            totalVideos: number;
        };
        getAnalysisResult(): {
            categoryInfo?: {
                mainCategory?: string;
                fullCategoryPath?: string;
                categoryDepth?: number;
                confidence?: string;
                consistencyLevel?: string;
            };
            keywords?: string[];
            aiTags?: string[];
            consistencyLevel?: string;
            lastAnalyzedAt?: Date;
        };
        getPerformanceStats(): {
            totalViews: number;
            totalVideos: number;
            averageViewsPerVideo?: number;
            last7DaysViews?: number;
            uploadFrequency?: string;
            mostViewedVideo?: {
                videoId: string;
                title: string;
                views: number;
            };
        };
        getVideoChannelInfo(): {
            channelName: string;
            channelUrl: string;
            subscribers: number;
            channelVideos: number;
        };
    }
>;

// 🎯 모델 타입 (정적 메서드 포함)
export interface ChannelModelType extends Model<IChannel> {
    findByPlatform(
        platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK",
        sortBy?: keyof IChannel,
        limit?: number
    ): Promise<ChannelDocumentType[]>;
    findByCategory(category: string, limit?: number): Promise<ChannelDocumentType[]>;
    getTopPerforming(
        platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK",
        limit?: number
    ): Promise<ChannelDocumentType[]>;
    findSimilar(channelId: string, limit?: number): Promise<ChannelDocumentType[]>;
}

// 실무 표준: 타입이 완전히 연결된 스키마 생성
const channelSchema = new Schema<IChannel>(createChannelSchema(), {
    timestamps: true,
    collection: "channels",
    toJSON: {
        transform: function (_doc: Document, ret: any) {
            ret.id = ret._id ? ret._id.toString() : undefined;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});

// 복합 인덱스 생성
channelSchema.index({ platform: 1, subscribers: -1 });
channelSchema.index({ totalViews: -1 });
channelSchema.index({ lastAnalyzedAt: -1 });

// 정적 메서드
channelSchema.statics.findByPlatform = async function (
    platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK",
    sortBy: keyof IChannel = "subscribers",
    limit: number = 20
): Promise<ChannelDocumentType[]> {
    const sortObj: { [key: string]: -1 | 1 } = {};
    sortObj[sortBy as string] = -1; // 내림차순

    return this.find({ platform: platform }).sort(sortObj).limit(limit).exec();
};

channelSchema.statics.findByCategory = async function (
    category: string,
    limit: number = 20
): Promise<ChannelDocumentType[]> {
    return this.find({ "categoryInfo.mainCategory": category })
        .sort({ subscribers: -1 })
        .limit(limit)
        .exec();
};

channelSchema.statics.getTopPerforming = async function (
    platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK",
    limit: number = 20
): Promise<ChannelDocumentType[]> {
    return this.find({ platform: platform })
        .sort({ totalViews: -1, subscribers: -1 })
        .limit(limit)
        .exec();
};

channelSchema.statics.findSimilar = async function (
    channelId: string,
    limit: number = 10
): Promise<ChannelDocumentType[]> {
    const channel = await this.findById(channelId).exec();
    if (!channel) return [];

    return this.find({
        _id: { $ne: channelId },
        "categoryInfo.mainCategory": channel.categoryInfo?.mainCategory,
        platform: channel.platform,
    })
        .sort({ subscribers: -1 })
        .limit(limit)
        .exec();
};

// 인스턴스 메서드
channelSchema.methods.getBasicInfo = function (this: ChannelDocumentType) {
    return {
        id: this.id,
        name: this.name,
        url: this.url,
        platform: this.platform,
        subscribers: this.subscribers,
        totalVideos: this.totalVideos,
    };
};

channelSchema.methods.getAnalysisResult = function (this: ChannelDocumentType) {
    return {
        categoryInfo: this.categoryInfo,
        keywords: this.keywords,
        aiTags: this.aiTags,
        consistencyLevel: this.categoryInfo?.consistencyLevel,
        lastAnalyzedAt: this.lastAnalyzedAt,
    };
};

channelSchema.methods.getPerformanceStats = function (this: ChannelDocumentType) {
    return {
        totalViews: this.totalViews,
        totalVideos: this.totalVideos,
        averageViewsPerVideo: this.averageViewsPerVideo,
        last7DaysViews: this.last7DaysViews,
        uploadFrequency: this.uploadFrequency,
        mostViewedVideo: this.mostViewedVideo,
    };
};

channelSchema.methods.getVideoChannelInfo = function (this: ChannelDocumentType) {
    return {
        channelName: this.name,
        channelUrl: this.url,
        subscribers: this.subscribers,
        channelVideos: this.totalVideos,
    };
};

const Channel = model<IChannel, ChannelModelType>("Channel", channelSchema);

export default Channel;

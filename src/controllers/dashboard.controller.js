import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const targetChannelId = channelId || req.user?._id

    if (!targetChannelId) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    const videoStatsAggregate = await Video.aggregate([
        {
                $match: {
                owner: new mongoose.Types.ObjectId(targetChannelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                views: 1,
                likesCount: { $size: "$likes" }
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: "$likesCount" }
            }
        }
    ])

    const totalSubscribers = await Subscription.countDocuments({
        channel: targetChannelId
    })

    const stats = videoStatsAggregate[0] || {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0
    }

    const channelStats = {
        totalVideos: stats.totalVideos,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes,
        totalSubscribers: totalSubscribers
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "Channel analytics dashboard stats fetched successfully"
            )
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const targetChannelId = channelId || req.user?._id

    if (!targetChannelId) {
        throw new ApiError(400, "Channel identifier is required!")
    }

    if (!mongoose.isValidObjectId(targetChannelId)) {
        throw new ApiError(400, "Invalid channel ID formatting!")
    }

    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    const isOwner = req.user?._id?.toString() === targetChannelId.toString()
    const matchQuery = {
        owner: new mongoose.Types.ObjectId(targetChannelId)
    }

    if (!isOwner) {
        matchQuery.isPublished = true
    }

    const sortOptions = {}
    sortOptions[sortBy] = sortType === "desc" ? -1 : 1

    const videoAggregate = await Video.aggregate([
        {
            $match: matchQuery
        },
        {
            $sort: sortOptions
        },
        {
            $facet: {
                    metadata: [
                    { $count: "totalVideos" }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limitNum },
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            isPublished: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        }
    ])

    const videos = videoAggregate[0]?.data || []
    const totalVideos = videoAggregate[0]?.metadata[0]?.totalVideos || 0
    const totalPages = Math.ceil(totalVideos / limitNum)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        totalVideos,
                        totalPages,
                        hasNextPage: pageNum < totalPages
                    }
                },
                "Channel videos fetched successfully"
            )
        )


})

export {
    getChannelStats,
    getChannelVideos
}
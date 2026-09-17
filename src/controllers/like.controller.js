import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID formatting!")
    }

    const videoExists = await Video.findById(videoId)
    if (!videoExists) {
        throw new ApiError(404, "Video not found!")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isLiked: false },
                    "Like removed successfully"
                )
            )
    } else {
        await Like.create({
            video: videoId,
            likedBy: userId
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { isLiked: true },
                    "Video liked successfully"
                )
            )
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id formatting!")
    }

    const commentExists = await Comment.findById(commentId)
    if (!commentExists) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isLiked: false },
                    "Comment like removed successfully"
                )
            )
    } else {
        await Like.create({
            comment: commentId,
            likedBy: userId
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { isLiked: true },
                    "Comment liked successfully"
                )
            )
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id formatting")
    }

    const tweetExists = await Tweet.findById(tweetId)
    if (!tweetExists) {
        throw new ApiError(404, "Tweet not found!")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isLiked: false },
                    "Tweet like removed successfully!"
                )
            )
    } else {
        await Like.create({
            tweet: tweetId,
            likedBy: userId
        })

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { isLiked: true },
                    "Tweet liked successfully"
                )
            )
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const likedVideosPipeline = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 1,
                video: {
                    _id: "$videoDetails._id",
                    videoFile: "$videoDetails.videoFile",
                    thumbnail: "$videoDetails.thumbnail",
                    title: "$videoDetails.title",
                    description: "$videoDetails.description",
                    duration: "$videoDetails.duration",
                    views: "$videoDetails.views",
                    createdAt: "$videoDetails.createdAt",
                    owner: "$ownerDetails",
                }
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosPipeline,
                "Liked videos library fetched!"
            )
        )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
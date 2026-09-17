import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id formatting")
    }

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    const commentsAggregate = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
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
            $unwind: {
                path: "$ownerDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $facet: {
                metadata: [
                    { $count: "totalComments" }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limitNum }
                ]
            }
        }
    ])

    const comments = commentsAggregate[0]?.data || []
    const totalComments = commentsAggregate[0]?.metadata[0]?.totalComments || 0
    const totalPages = Math.ceil(totalComments / limitNum)

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {
                    comments,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        totalComments,
                        totalPages,
                        hasNextPage: pageNum < totalPages
                    }
                }, "Comments fetched successfully!"
            )
        )

})


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required!")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const videoExists = await Video.findById(videoId)

    if (!videoExists) {
        throw new ApiError(404, "Video not found!")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user?._id
    })

    if (!comment) {
        throw new ApiError(500, "Something went wrong while publishing the comment")
    }

    const populatedComment = await Comment.findById(comment._id).populate(
        "owner", "username fullName avatar"
    )

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                populatedComment,
                "Comment added successfully"
            )
        )

})


const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty!")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment formatting!")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(403, "You do not have permission to edit!")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true
        }
    ).populate("owner", "username fullName avatar")

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while editing the comment")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, updatedComment, "Comment updated successfully"
            )
        )

})


const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findByIdAndDelete(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found!")
    }

    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You dont have permission to delete the comment")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, { commentId }, "Comment deleted successfully!"
            )
        )
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
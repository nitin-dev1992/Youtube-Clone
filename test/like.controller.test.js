import { jest } from '@jest/globals'

// Mock models
const mockLike = {
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn()
}
const mockVideo = { findById: jest.fn() }
const mockComment = { findById: jest.fn() }
const mockTweet = { findById: jest.fn() }

jest.unstable_mockModule('../src/models/like.model.js', () => ({ Like: mockLike }))
jest.unstable_mockModule('../src/models/video.model.js', () => ({ Video: mockVideo }))
jest.unstable_mockModule('../src/models/comment.model.js', () => ({ Comment: mockComment }))
jest.unstable_mockModule('../src/models/tweet.model.js', () => ({ Tweet: mockTweet }))

const { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos } = await import('../src/controllers/like.controller.js')

function mockRes() {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

describe('Like controller', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('toggleVideoLike creates like when none exists', async () => {
        const req = { params: { videoId: '507f1f77bcf86cd799439011' }, user: { _id: '507f1f77bcf86cd799439012' } }
        const res = mockRes()
        mockVideo.findById.mockResolvedValue({ _id: 'vid123' })
        const done = new Promise((resolve) => {
            res.json = jest.fn().mockImplementation((payload) => resolve(payload))
        })
        mockLike.findOne.mockResolvedValue(null)
        mockLike.create.mockResolvedValue({ _id: 'like1' })

        toggleVideoLike(req, res, (err) => { throw err })
        await done

        expect(mockVideo.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
        expect(mockLike.create).toHaveBeenCalledWith({ video: '507f1f77bcf86cd799439011', likedBy: '507f1f77bcf86cd799439012' })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalled()
    })

    test('toggleVideoLike removes like when exists', async () => {
        const req = { params: { videoId: '507f1f77bcf86cd799439011' }, user: { _id: '507f1f77bcf86cd799439012' } }
        const res = mockRes()
        mockVideo.findById.mockResolvedValue({ _id: 'vid123' })
        const done = new Promise((resolve) => {
            res.json = jest.fn().mockImplementation((payload) => resolve(payload))
        })
        mockLike.findOne.mockResolvedValue({ _id: 'like1' })
        mockLike.findByIdAndDelete.mockResolvedValue({})

        toggleVideoLike(req, res, (err) => { throw err })
        await done

        expect(mockLike.findByIdAndDelete).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalled()
    })

    test('getLikedVideos returns aggregated results', async () => {
        const req = { user: { _id: '507f1f77bcf86cd799439012' } }
        const res = mockRes()
        const fakeAggregate = [{ _id: 'like1', video: { title: 'Test' } }]
        mockLike.aggregate.mockResolvedValue(fakeAggregate)

        await getLikedVideos(req, res, (err) => { throw err })

        expect(mockLike.aggregate).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalled()
    })
})

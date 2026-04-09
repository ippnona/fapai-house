const express = require('express')
const router = express.Router()
const House = require('../models/House')
const { authMiddleware, memberMiddleware } = require('../middleware/auth')

// GET /api/houses — 房源列表（公开，但详情脱敏）
router.get('/', async (req, res) => {
  try {
    const {
      district,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      status,
      platform,
      keyword,
      page = 1,
      pageSize = 10
    } = req.query
    
    const filter = { city: '深圳' }
    
    if (district) filter.district = district
    if (status) filter.status = status
    if (platform) filter.platform = platform
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ]
    }
    if (minPrice || maxPrice) {
      filter.auctionStartPrice = {}
      if (minPrice) filter.auctionStartPrice.$gte = Number(minPrice)
      if (maxPrice) filter.auctionStartPrice.$lte = Number(maxPrice)
    }
    if (minArea || maxArea) {
      filter.area = {}
      if (minArea) filter.area.$gte = Number(minArea)
      if (maxArea) filter.area.$lte = Number(maxArea)
    }
    
    const total = await House.countDocuments(filter)
    const houses = await House.find(filter)
      .select('-platformUrl -latitude -longitude -remark') // 列表不展示完整详情
      .sort({ auctionStartTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize))
    
    res.json({
      code: 0,
      data: {
        list: houses,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败：' + err.message })
  }
})

// GET /api/houses/:id — 房源详情（需会员）
router.get('/:id', authMiddleware, memberMiddleware, async (req, res) => {
  try {
    const house = await House.findById(req.params.id)
    if (!house) {
      return res.status(404).json({ code: 404, msg: '房源不存在' })
    }
    res.json({ code: 0, data: house })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败：' + err.message })
  }
})

// GET /api/houses/map/points — 地图找房坐标（需会员）
router.get('/map/points', authMiddleware, memberMiddleware, async (req, res) => {
  try {
    const { district, minPrice, maxPrice } = req.query
    const filter = { city: '深圳', latitude: { $exists: true } }
    
    if (district) filter.district = district
    if (minPrice || maxPrice) {
      filter.auctionStartPrice = {}
      if (minPrice) filter.auctionStartPrice.$gte = Number(minPrice)
      if (maxPrice) filter.auctionStartPrice.$lte = Number(maxPrice)
    }
    
    const points = await House.find(filter)
      .select('title district address auctionStartPrice currentPrice marketPrice status latitude longitude roomLayout area')
      .sort({ auctionStartTime: -1 })
    
    res.json({ code: 0, data: points })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败：' + err.message })
  }
})

module.exports = router

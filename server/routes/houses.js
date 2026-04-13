const express = require('express')
const router = express.Router()
const House = require('../models/House')
const { authMiddleware, memberMiddleware } = require('../middleware/auth')

// GET /api/houses/stats — Banner统计数据
router.get('/stats', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [ongoing, upcoming, todayNew] = await Promise.all([
      // 正在拍卖
      House.countDocuments({ 
        city: '深圳', 
        status: 'ongoing' 
      }),
      // 即将拍卖（待开始）
      House.countDocuments({ 
        city: '深圳', 
        status: 'pending',
        auctionStartTime: { $gte: today }
      }),
      // 今日新增
      House.countDocuments({
        city: '深圳',
        createdAt: { $gte: today }
      })
    ])
    
    res.json({
      code: 0,
      data: { ongoing, upcoming, todayNew }
    })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

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
      propertyType,   // 住宅 / 商业
      sortBy,         // createdAt / auctionStartTime / auctionStartPrice
      sortOrder,      // asc / desc
      page = 1,
      pageSize = 10
    } = req.query
    
    const filter = { city: '深圳' }
    
    if (district) filter.district = district
    if (status) filter.status = status
    if (platform) filter.platform = platform
    
    // 物业类型：住宅=仅住宅，商业=写字楼+公寓
    if (propertyType === '住宅') {
      filter.propertyType = '住宅'
    } else if (propertyType === '商业') {
      filter.propertyType = { $in: ['写字楼', '公寓'] }
    }
    
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
    
    // 排序逻辑
    let sort = {}
    if (sortBy === 'createdAt') {
      sort = { createdAt: -1 }
    } else if (sortBy === 'auctionStartTime') {
      sort = { auctionStartTime: 1 }
    } else if (sortBy === 'auctionStartPrice') {
      sort = { auctionStartPrice: sortOrder === 'asc' ? 1 : -1 }
    } else {
      // 默认：按提醒人数降序
      sort = { watchCount: -1, createdAt: -1 }
    }
    
    const total = await House.countDocuments(filter)
    const houses = await House.find(filter)
      .select('-platformUrl -latitude -longitude -remark')
      .sort(sort)
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
    // 增加浏览次数
    house.watchCount = (house.watchCount || 0) + 1
    await house.save()
    
    res.json({ code: 0, data: house })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败：' + err.message })
  }
})

// GET /api/houses/map/points — 地图找房坐标（需会员）
router.get('/map/points', authMiddleware, memberMiddleware, async (req, res) => {
  try {
    const { district, minPrice, maxPrice, status } = req.query
    const filter = { city: '深圳', latitude: { $exists: true, $ne: null } }
    
    if (district) filter.district = district
    if (status) filter.status = status
    if (minPrice || maxPrice) {
      filter.auctionStartPrice = {}
      if (minPrice) filter.auctionStartPrice.$gte = Number(minPrice)
      if (maxPrice) filter.auctionStartPrice.$lte = Number(maxPrice)
    }
    
    const points = await House.find(filter)
      .select('title district address auctionStartPrice marketPrice status latitude longitude roomLayout area propertyType watchCount')
      .sort({ auctionStartTime: -1 })
    
    res.json({ code: 0, data: points })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败：' + err.message })
  }
})

// GET /api/houses/map/clusters — 地图板块聚合数据
router.get('/map/clusters', authMiddleware, memberMiddleware, async (req, res) => {
  try {
    const { status } = req.query
    const filter = { city: '深圳', latitude: { $exists: true, $ne: null } }
    if (status) filter.status = status
    
    // 按区域聚合统计
    const clusters = await House.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$district',
          total: { $sum: 1 },
          ongoing: {
            $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] }
          },
          upcoming: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          avgPrice: { $avg: '$auctionStartPrice' }
        }
      },
      { $sort: { total: -1 } }
    ])
    
    res.json({ code: 0, data: clusters })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// POST /api/houses/:id/watch — 设置/取消提醒
router.post('/:id/watch', authMiddleware, async (req, res) => {
  try {
    const House = require('../models/House')
    const house = await House.findById(req.params.id)
    if (!house) {
      return res.status(404).json({ code: 404, msg: '房源不存在' })
    }
    house.watchCount = (house.watchCount || 0) + 1
    await house.save()
    res.json({ code: 0, msg: '提醒成功' })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

module.exports = router

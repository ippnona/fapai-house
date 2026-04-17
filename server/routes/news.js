const express = require('express')
const router = express.Router()
const News = require('../models/News')
const { authMiddleware } = require('../middleware/auth')

// GET /api/news — 公开列表（学员报喜+服务介绍）
router.get('/', async (req, res) => {
  try {
    const { type, page = 1, pageSize = 10 } = req.query
    const filter = { enabled: true }
    if (type) filter.type = type
    
    const total = await News.countDocuments(filter)
    const list = await News.find(filter)
      .sort({ sort: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize))
    
    res.json({ code: 0, data: { list, total } })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// GET /api/news/:id — 文章详情（学员报喜/服务介绍）
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
    if (!news) return res.status(404).json({ code: 404, msg: '内容不存在' })
    news.viewCount = (news.viewCount || 0) + 1
    await news.save()
    res.json({ code: 0, data: news })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// GET /api/news/services/home — 首页服务介绍（取前6条）
router.get('/services/home', async (req, res) => {
  try {
    const list = await News.find({ type: 'service', enabled: true })
      .sort({ sort: -1, createdAt: -1 })
      .limit(6)
      .select('title serviceIcon serviceDesc')
    res.json({ code: 0, data: list })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// GET /api/news/success/home — 首页学员报喜（取前3条）
router.get('/success/home', async (req, res) => {
  try {
    const list = await News.find({ type: 'success', enabled: true })
      .sort({ sort: -1, createdAt: -1 })
      .limit(3)
      .select('title subtitle images videoUrl')
    res.json({ code: 0, data: list })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// — 以下需管理员权限 —

// POST /api/news — 新建（管理员）
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, msg: '仅管理员可操作' })
    }
    const news = await News.create(req.body)
    res.json({ code: 0, data: news })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// PUT /api/news/:id — 更新（管理员）
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, msg: '仅管理员可操作' })
    }
    const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!news) return res.status(404).json({ code: 404, msg: '内容不存在' })
    res.json({ code: 0, data: news })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// DELETE /api/news/:id — 删除（管理员）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, msg: '仅管理员可操作' })
    }
    await News.findByIdAndDelete(req.params.id)
    res.json({ code: 0, msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

// GET /api/news/admin/list — 管理员全量列表
router.get('/admin/list', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, msg: '仅管理员可操作' })
    }
    const list = await News.find().sort({ createdAt: -1 })
    res.json({ code: 0, data: list })
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message })
  }
})

module.exports = router

const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Contact = require('../models/Contact')
const House = require('../models/House')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

// GET /api/admin/users — 用户列表
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { membership, page = 1, pageSize = 20 } = req.query
    const filter = {}
    if (membership) filter.membership = membership
    
    const total = await User.countDocuments(filter)
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize))
    
    res.json({ code: 0, data: { list: users, total, page: Number(page) } })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败' })
  }
})

// PUT /api/admin/users/:id — 开通/拒绝用户权限
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { membership, membershipExpire } = req.body
    const update = {}
    
    if (membership) update.membership = membership
    if (membershipExpire) update.membershipExpire = new Date(membershipExpire)
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ code: 404, msg: '用户不存在' })
    }
    
    res.json({ code: 0, msg: '更新成功', data: user })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '更新失败' })
  }
})

// GET /api/admin/contacts — 咨询列表
router.get('/contacts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const contacts = await Contact.find()
      .populate('userId', 'phone nickname')
      .populate('houseId', 'title district')
      .sort({ createdAt: -1 })
    
    res.json({ code: 0, data: contacts })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败' })
  }
})

// POST /api/admin/houses — 手动添加房源
router.post('/houses', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const house = await House.create(req.body)
    res.json({ code: 0, msg: '添加成功', data: house })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '添加失败：' + err.message })
  }
})

// PUT /api/admin/houses/:id — 编辑房源
router.put('/houses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const house = await House.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    if (!house) {
      return res.status(404).json({ code: 404, msg: '房源不存在' })
    }
    res.json({ code: 0, msg: '更新成功', data: house })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '更新失败：' + err.message })
  }
})

// DELETE /api/admin/houses/:id — 删除房源
router.delete('/houses/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const house = await House.findByIdAndDelete(req.params.id)
    if (!house) {
      return res.status(404).json({ code: 404, msg: '房源不存在' })
    }
    res.json({ code: 0, msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '删除失败' })
  }
})

// GET /api/admin/stats — 数据概览
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, pendingUsers, activeMembers, totalHouses, newContacts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ membership: 'pending' }),
      User.countDocuments({ membership: 'active' }),
      House.countDocuments(),
      Contact.countDocuments({ status: 'new' })
    ])
    
    res.json({
      code: 0,
      data: { totalUsers, pendingUsers, activeMembers, totalHouses, newContacts }
    })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '查询失败' })
  }
})

module.exports = router

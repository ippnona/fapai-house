const express = require('express')
const router = express.Router()
const Contact = require('../models/Contact')
const { authMiddleware } = require('../middleware/auth')

// POST /api/contact — 提交咨询
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { houseId, content, phone } = req.body
    
    if (!content || !phone) {
      return res.status(400).json({ code: 400, msg: '咨询内容和手机号不能为空' })
    }
    
    const contact = await Contact.create({
      userId: req.user.id,
      houseId: houseId || undefined,
      content,
      phone
    })
    
    res.json({ code: 0, msg: '咨询提交成功，我们会尽快联系您' })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '提交失败' })
  }
})

module.exports = router

const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { generateToken, authMiddleware } = require('../middleware/auth')

// ── 微信小程序登录（通过 wx.login() 的 code 换取 openid）──────────────
router.post('/wx-login', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ code: 400, msg: '缺少 code 参数' })
    }

    const APPID = process.env.WECHAT_APPID || 'wx1b250ad4e69950e8'
    const SECRET = process.env.WECHAT_SECRET || '1b2b39ba50e045a1b90bd6a460c7ca20'

    // 调用微信接口，用 code 换 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`
    )
    const wxData = await wxRes.json()

    if (wxData.errcode) {
      console.error('微信登录失败：', wxData)
      return res.status(400).json({
        code: 400,
        msg: `微信登录失败：${wxData.errmsg}（${wxData.errcode}）`
      })
    }

    const { openid, session_key } = wxData

    // 查找或创建用户（以 openid 为主键，自动注册）
    let user = await User.findOne({ openid })
    if (!user) {
      user = await User.create({
        openid,
        nickname: `用户${openid.slice(-4)}`,
        membership: 'pending',
        role: 'member'
      })
    }

    const token = generateToken(user)

    res.json({
      code: 0,
      msg: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          openid: user.openid,
          phone: user.phone || null,
          nickname: user.nickname,
          membership: user.membership,
          role: user.role,
          avatar: user.avatar || null
        }
      }
    })
  } catch (err) {
    console.error('wx-login error:', err)
    res.status(500).json({ code: 500, msg: '登录失败：' + err.message })
  }
})

// POST /api/auth/register（手机号+密码注册）
router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body

    if (!phone || !password) {
      return res.status(400).json({ code: 400, msg: '手机号和密码不能为空' })
    }

    const existUser = await User.findOne({ phone })
    if (existUser) {
      return res.status(400).json({ code: 400, msg: '该手机号已注册' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      phone,
      password: hashedPassword,
      nickname: nickname || `用户${phone.slice(-4)}`,
      membership: 'pending' // 注册后需管理员开通
    })

    const token = generateToken(user)

    res.json({
      code: 0,
      msg: '注册成功，请等待管理员开通会员权限',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          nickname: user.nickname,
          membership: user.membership,
          role: user.role
        }
      }
    })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '注册失败：' + err.message })
  }
})

// POST /api/auth/login（手机号+密码登录）
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body

    const user = await User.findOne({ phone }).select("+password")
    if (!user) {
      return res.status(400).json({ code: 400, msg: '该手机号未注册' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ code: 400, msg: '密码错误' })
    }

    const token = generateToken(user)

    res.json({
      code: 0,
      msg: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          nickname: user.nickname,
          membership: user.membership,
          role: user.role
        }
      }
    })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '登录失败：' + err.message })
  }
})

// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json({ code: 0, data: user })
  } catch (err) {
    res.status(500).json({ code: 500, msg: '获取用户信息失败' })
  }
})

module.exports = router

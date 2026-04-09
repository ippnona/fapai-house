const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'fapai-house-secret-key-2026'
const TOKEN_EXPIRES = '7d'

function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id, 
      phone: user.phone, 
      role: user.role,
      membership: user.membership 
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES }
  )
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ code: 401, msg: '请先登录' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ code: 401, msg: '登录已过期，请重新登录' })
  }
}

function memberMiddleware(req, res, next) {
  if (req.user.membership !== 'active') {
    return res.status(403).json({ 
      code: 403, 
      msg: '会员权限尚未开通，请联系管理员' 
    })
  }
  next()
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, msg: '需要管理员权限' })
  }
  next()
}

module.exports = {
  generateToken,
  authMiddleware,
  memberMiddleware,
  adminMiddleware,
  JWT_SECRET
}

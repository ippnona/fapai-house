const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const houseRoutes = require('./routes/houses')
const adminRoutes = require('./routes/admin')
const contactRoutes = require('./routes/contact')

const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// 数据库连接
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fapai-house'
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 已连接'))
  .catch(err => console.error('❌ MongoDB 连接失败：', err))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/houses', houseRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/contact', contactRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, msg: 'ok', time: new Date().toISOString() })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 500, msg: '服务器内部错误' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 法拍房后端服务已启动：http://localhost:${PORT}`)
})

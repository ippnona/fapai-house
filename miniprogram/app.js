// 全局配置 — 支持开发/生产环境自动切换
// 环境变量: NODE_ENV=production 时自动切换到生产接口

const ENV = process.env.NODE_ENV || 'development'
const IS_PROD = ENV === 'production'

// ⚠️ 部署前请确认以下 URL 已更新为你的实际后端地址
const BASE_URL = IS_PROD
  ? 'https://daxuanfapai.com/api'         // 👈 生产环境（域名备案通过后）
  : 'http://39.108.61.93:3000/api'        // 👈 开发/测试环境（先用服务器IP）

// ⚠️ 微信登录接口地址（获取 code 换取 openid/session_key）
const WX_LOGIN_URL = IS_PROD
  ? 'https://daxuanfapi.com/api/auth/wx-login'  // 👈 生产环境
  : 'http://39.108.61.93:3000/api/auth/wx-login'  // 👈 测试环境

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: BASE_URL,
    wxLoginUrl: WX_LOGIN_URL,
    isProduction: IS_PROD,
    appid: 'wx5ecf6612012d363d'  // 谷雨拍卖小程序 AppID
  },

  onLaunch() {
    // 检查本地缓存的登录状态
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  },

  // 检查登录状态
  checkLogin() {
    return !!this.globalData.token
  },

  // 检查会员状态
  checkMember() {
    return this.globalData.userInfo?.membership === 'active'
  },

  // 微信小程序登录（使用 wx.login 获取 code）
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        timeout: 10000,
        success: async (res) => {
          if (!res.code) {
            reject(new Error('微信登录失败：未获取到 code'))
            return
          }
          try {
            // 将 code 发给后端，换取 openid 并注册/登录
            const data = await this.request({
              url: '/auth/wx-login',
              method: 'POST',
              data: { code: res.code }
            })
            if (data.code === 0) {
              this.globalData.token = data.data.token
              this.globalData.userInfo = data.data.userInfo
              wx.setStorageSync('token', data.data.token)
              wx.setStorageSync('userInfo', data.data.userInfo)
              resolve(data.data)
            } else {
              reject(new Error(data.msg || '登录失败'))
            }
          } catch (err) {
            reject(err)
          }
        },
        fail: (err) => reject(new Error('wx.login 失败：' + err.errMsg))
      })
    })
  },

  // 封装请求
  request(options) {
    return new Promise((resolve, reject) => {
      const header = {
        'Content-Type': 'application/json'
      }
      if (this.globalData.token) {
        header['Authorization'] = `Bearer ${this.globalData.token}`
      }

      wx.request({
        url: this.globalData.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header,
        success: (res) => {
          if (res.data.code === 401) {
            this.logout()
            wx.showToast({ title: '登录已过期', icon: 'none' })
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/login/login' })
            }, 1500)
            reject(res.data)
          } else if (res.data.code === 403) {
            wx.showToast({ title: res.data.msg, icon: 'none' })
            reject(res.data)
          } else {
            resolve(res.data)
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络请求失败', icon: 'none' })
          reject(err)
        }
      })
    })
  },

  // 登出
  logout() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  }
})

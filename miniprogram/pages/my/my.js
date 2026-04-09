const app = getApp()

Page({
  data: {
    isLogin: false,
    userInfo: {},
    membershipText: '',
    showQr: false
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = app.globalData.userInfo
    if (userInfo) {
      const map = {
        pending: '⏳ 权限审核中',
        active: '✅ 正式会员',
        rejected: '❌ 审核未通过'
      }
      this.setData({
        isLogin: true,
        userInfo,
        membershipText: map[userInfo.membership] || '未知状态'
      })
    } else {
      this.setData({ isLogin: false, userInfo: {} })
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goMyFavorites() {
    if (!this.data.isLogin) return this.goLogin()
    wx.showToast({ title: '收藏功能开发中', icon: 'none' })
  },

  goConsult() {
    if (!this.data.isLogin) return this.goLogin()
    wx.showToast({ title: '咨询记录开发中', icon: 'none' })
  },

  showWechatQr() {
    this.setData({ showQr: true })
  },

  closeQr() {
    this.setData({ showQr: false })
  },

  showAbout() {
    wx.showModal({
      title: '关于深圳法拍房',
      content: '聚合阿里拍卖、京东拍卖深圳地区法拍房源，提供专业法拍房信息服务。\n\n版本：1.0.0',
      showCancel: false
    })
  },

  callHotline() {
    wx.makePhoneCall({ phoneNumber: '400-000-0000' })
  },

  doLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需重新登录',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          this.setData({ isLogin: false, userInfo: {} })
          wx.showToast({ title: '已退出登录', icon: 'none' })
        }
      }
    })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})

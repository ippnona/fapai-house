const app = getApp()

Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  doLogin() {
    const { phone, password } = this.data
    if (!phone || phone.length !== 11) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
    }
    if (!password || password.length < 6) {
      return wx.showToast({ title: '密码至少6位', icon: 'none' })
    }

    this.setData({ loading: true })
    app.request({
      url: '/auth/login',
      method: 'POST',
      data: { phone, password }
    }).then(res => {
      this.setData({ loading: false })
      const { token, user } = res.data
      app.globalData.token = token
      app.globalData.userInfo = user
      wx.setStorageSync('token', token)
      wx.setStorageSync('userInfo', user)
      
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' })
  }
})

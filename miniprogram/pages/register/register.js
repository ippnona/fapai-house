const app = getApp()

Page({
  data: {
    phone: '',
    nickname: '',
    password: '',
    password2: '',
    loading: false
  },

  onPhoneInput(e) { this.setData({ phone: e.detail.value }) },
  onNicknameInput(e) { this.setData({ nickname: e.detail.value }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onPassword2Input(e) { this.setData({ password2: e.detail.value }) },

  doRegister() {
    const { phone, nickname, password, password2 } = this.data
    if (!phone || phone.length !== 11) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
    }
    if (!password || password.length < 6) {
      return wx.showToast({ title: '密码至少6位', icon: 'none' })
    }
    if (password !== password2) {
      return wx.showToast({ title: '两次密码不一致', icon: 'none' })
    }

    this.setData({ loading: true })
    app.request({
      url: '/auth/register',
      method: 'POST',
      data: { phone, password, nickname }
    }).then(res => {
      this.setData({ loading: false })
      const { token, user } = res.data
      app.globalData.token = token
      app.globalData.userInfo = user
      wx.setStorageSync('token', token)
      wx.setStorageSync('userInfo', user)

      wx.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})

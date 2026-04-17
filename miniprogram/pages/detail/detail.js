const app = getApp()

Page({
  data: {
    house: null,
    userInfo: null,
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交',
      withdrawn: '已撤回'
    },
    countdown: '',
    showQrCode: false,
    isWatched: false,
    timer: null
  },

  onLoad(query) {
    this.loadDetail(query.id || query.scene)
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer)
  },

  loadDetail(id) {
    app.request({ url: `/houses/${id}` }).then(res => {
      const h = res.data
      // 预计算显示字段（避免wxml不支持字符串拼接）
      const p = v => v ? (parseFloat(v) >= 100000000
        ? (parseFloat(v)/100000000).toFixed(1) + '亿'
        : (parseFloat(v)/10000).toFixed(0)) : '—'
      const house = {
        ...h,
        displayStartPrice: p(h.auctionStartPrice),
        displayMarketPrice: p(h.marketPrice),
        displayCurrentPrice: p(h.currentPrice),
        displayDeposit: p(h.deposit),
        displayDiscount: (h.marketPrice && h.auctionStartPrice)
          ? (h.auctionStartPrice / h.marketPrice * 10).toFixed(1) + '折' : '—',
        displayDiscountOff: (h.marketPrice && h.auctionStartPrice)
          ? ((h.marketPrice - h.auctionStartPrice) / 10000).toFixed(0) + '万' : '—'
      }
      this.setData({ house })
      this.startCountdown()
    }).catch(err => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  // 倒计时
  startCountdown() {
    const update = () => {
      const end = new Date(this.data.house.auctionEndTime).getTime()
      const now = Date.now()
      const diff = end - now
      if (diff <= 0) {
        this.setData({ countdown: '已结束' })
        clearInterval(this.data.timer)
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      let text = ''
      if (d > 0) text = d + '天' + h + '时'
      else if (h > 0) text = h + '时' + m + '分'
      else text = m + '分' + s + '秒'
      this.setData({ countdown: text })
    }
    update()
    this.data.timer = setInterval(update, 1000)
  },

  formatPrice(val) {
    if (!val) return '0'
    return (val / 10000).toFixed(0)
  },

  discount() {
    const h = this.data.house
    if (!h.marketPrice || !h.auctionStartPrice) return '—'
    return (h.auctionStartPrice / h.marketPrice * 10).toFixed(1)
  },

  discountOff() {
    const h = this.data.house
    if (!h.marketPrice || !h.auctionStartPrice) return '—'
    return ((h.marketPrice - h.auctionStartPrice) / 10000).toFixed(0) + '万'
  },

  formatTime(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0')
  },

  previewImage(e) {
    wx.previewImage({ urls: this.data.house.images, current: e.currentTarget.dataset.url })
  },

  toggleWatch() {
    if (!app.checkMember()) {
      wx.showModal({ title: '需要会员', content: '开通会员后可设置提醒', success: res => {
        if (res.confirm) wx.navigateTo({ url: '/pages/login/login' })
      }})
      return
    }
    app.request({ url: '/houses/' + this.data.house._id + '/watch', method: 'POST' })
      .then(() => {
        this.setData({ isWatched: true })
        wx.showToast({ title: '已设置提醒', icon: 'success' })
      })
      .catch(() => wx.showToast({ title: '设置失败', icon: 'none' }))
  },

  // 去成本计算器
  goCalculator() {
    wx.navigateTo({ url: '/pages/calculator/calculator?id=' + this.data.house._id })
  },

  showConsult() { this.setData({ showQrCode: true }) },
  closeConsult() { this.setData({ showQrCode: false }) },

  gotoPlatform() {
    if (!this.data.house.platformUrl) return
    wx.setClipboardData({
      data: this.data.house.platformUrl,
      success: () => {
        wx.showModal({ title: '链接已复制', content: '请到浏览器打开阿里/京东APP', confirmText: '知道了' })
      }
    })
  }
})

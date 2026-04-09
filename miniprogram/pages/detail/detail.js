const app = getApp()

Page({
  data: {
    house: {},
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交',
      withdrawn: '已撤回'
    },
    countdown: '',
    showQrCode: false,
    countdownTimer: null
  },

  onLoad(options) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
  },

  loadDetail(id) {
    app.request({
      url: `/houses/${id}`
    }).then(res => {
      this.setData({ house: res.data })
      // 启动倒计时
      if (res.data.status === 'pending' || res.data.status === 'ongoing') {
        this.startCountdown()
      }
    }).catch(err => {
      // 403 = 非会员
    })
  },

  startCountdown() {
    const timer = setInterval(() => {
      const house = this.data.house
      const target = house.status === 'pending' 
        ? new Date(house.auctionStartTime).getTime()
        : new Date(house.auctionEndTime).getTime()
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        this.setData({ countdown: '已结束' })
        clearInterval(timer)
        return
      }

      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      let str = ''
      if (d > 0) str += d + '天 '
      str += `${h}时${m}分${s}秒`
      this.setData({ countdown: str })
    }, 1000)

    this.setData({ countdownTimer: timer })
  },

  formatPrice(val) {
    if (!val) return '-'
    return (val / 10000).toFixed(0)
  },

  formatTime(val) {
    if (!val) return '-'
    const d = new Date(val)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  },

  discountOff() {
    const h = this.data.house
    if (!h.marketPrice || !h.auctionStartPrice) return ''
    const off = ((h.marketPrice - h.auctionStartPrice) / h.marketPrice * 100).toFixed(1)
    return off + '%'
  },

  discount() {
    const h = this.data.house
    if (!h.marketPrice || !h.auctionStartPrice) return ''
    return (h.auctionStartPrice / h.marketPrice * 10).toFixed(1)
  },

  previewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.house.images
    })
  },

  gotoPlatform() {
    const house = this.data.house
    if (house.platformUrl) {
      // 复制链接到剪贴板，小程序内无法直接跳转外部链接
      wx.setClipboardData({
        data: house.platformUrl,
        success: () => {
          wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' })
        }
      })
    }
  },

  showConsult() {
    this.setData({ showQrCode: true })
  },

  closeConsult() {
    this.setData({ showQrCode: false })
  }
})

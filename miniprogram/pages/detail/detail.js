const app = getApp()

Page({
  data: {
    house: null,
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

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer)
  },

  loadDetail(id) {
    app.request({ url: `/houses/${id}` }).then(res => {
      this.setData({ house: res.data })
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
      if (d > 0) text = `${d}天${h}时`
      else if (h > 0) text = `${h}时${m}分`
      else text = `${m}分${s}秒`
      this.setData({ countdown: text })
    }
    update()
    this.data.timer = setInterval(update, 1000)
  },

  // 价格格式化
  formatPrice(val) {
    if (!val) return '0'
    return (val / 10000).toFixed(0)
  },

  // 折扣
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

  // 时间格式化
  formatTime(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  },

  // 图片预览
  previewImage(e) {
    wx.previewImage({ urls: this.data.house.images, current: e.currentTarget.dataset.url })
  },

  // 提醒我
  toggleWatch() {
    if (!app.checkMember()) {
      wx.showModal({ title: '需要会员', content: '开通会员后可设置提醒', success: res => {
        if (res.confirm) wx.navigateTo({ url: '/pages/login/login' })
      }})
      return
    }
    app.request({
      url: `/houses/${this.data.house._id}/watch`,
      method: 'POST'
    }).then(() => {
      this.setData({ isWatched: true })
      wx.showToast({ title: '已设置提醒', icon: 'success' })
    }).catch(() => {
      wx.showToast({ title: '设置失败', icon: 'none' })
    })
  },

  // 咨询
  showConsult() {
    this.setData({ showQrCode: true })
  },
  closeConsult() {
    this.setData({ showQrCode: false })
  },

  // 跳转平台
  gotoPlatform() {
    if (!this.data.house.platformUrl) return
    wx.setClipboardData({ data: this.data.house.platformUrl, success: () => {
      wx.showModal({ title: '链接已复制', content: '请到浏览器打开，或直接打开阿里/京东APP', confirmText: '知道了' })
    }})
  }
})

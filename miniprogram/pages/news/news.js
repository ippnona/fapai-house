const app = getApp()

Page({
  data: {
    newsType: 'success',
    list: [],
    loading: false,
    page: 1,
    isDetail: false,
    detail: null,
    showQrCode: false
  },

  onLoad(query) {
    if (query.type) {
      this.setData({ newsType: query.type })
    }
    if (query.id) {
      this.loadDetail(query.id)
    } else {
      this.loadList()
    }
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ newsType: type, list: [], page: 1, isDetail: false })
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    app.request({ url: '/news?type=' + this.data.newsType + '&pageSize=50' }).then(res => {
      if (res.code === 0) {
        this.setData({ list: res.data.list || [], loading: false })
      }
    }).catch(() => this.setData({ loading: false }))
  },

  loadDetail(id) {
    app.request({ url: '/news/' + id }).then(res => {
      if (res.code === 0) {
        const d = res.data
        const createdAt = d.createdAt ? new Date(d.createdAt).toLocaleDateString('zh-CN') : ''
        this.setData({ isDetail: true, detail: Object.assign({}, d, { createdAt }) })
        wx.setNavigationBarTitle({ title: this.data.newsType === 'success' ? '🏆 学员报喜' : '🏢 服务介绍' })
      }
    }).catch(() => {})
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/news/news?id=' + e.currentTarget.dataset.id })
  },

  previewImg(e) {
    const urls = this.data.detail.images
    wx.previewImage({ urls, current: e.currentTarget.dataset.url })
  },

  showConsult() {
    wx.showModal({
      title: '联系我们',
      content: '如需了解更多服务详情，请扫码添加企业微信：\n\n📱 大宣法拍专业顾问',
      confirmText: '知道了'
    })
  }
})

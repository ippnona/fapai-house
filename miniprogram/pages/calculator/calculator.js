const app = getApp()

Page({
  data: {
    // 来自房源详情的预填数据
    presettedPrice: '',
    presettedArea: '',
    presettedTaxPayer: '',

    price: '',
    area: '',
    taxPayer: 'buyer',
    hasLoan: false,
    downPaymentRatio: 30,
    otherFees: '',
    result: null
  },

  onLoad(query) {
    const userInfo = wx.getStorageSync('userInfo')
    // 非管理员不允许使用计算器
    if (!userInfo || userInfo.role !== 'admin') {
      wx.showModal({
        title: '权限提示',
        content: '购房成本计算器目前仅对公司内部员工开放',
        showCancel: false
      })
      setTimeout(() => wx.navigateBack(), 2000)
      return
    }

    if (query.id) {
      // 从房源详情跳转，预填价格
      app.request({ url: '/houses/' + query.id }).then(res => {
        if (res.code === 0 && res.data) {
          const h = res.data
          this.setData({
            presettedPrice: h.auctionStartPrice ? (h.auctionStartPrice / 10000).toFixed(0) : '',
            presettedArea: h.area || '',
            presettedTaxPayer: h.courtInfo && h.courtInfo.taxBearPayer ? h.courtInfo.taxBearPayer : 'buyer',
            price: h.auctionStartPrice ? (h.auctionStartPrice / 10000).toFixed(0) : '',
            area: h.area || '',
            taxPayer: h.courtInfo && h.courtInfo.taxBearPayer ? h.courtInfo.taxBearPayer : 'buyer'
          })
          if (h.title) {
            wx.setNavigationBarTitle({ title: '成本计算 - ' + h.district })
          }
        }
      }).catch(() => {})
    }

    if (query.price) this.setData({ price: query.price, presettedPrice: query.price })
    if (query.area) this.setData({ area: query.area })
    if (query.taxPayer) this.setData({ taxPayer: query.taxPayer })
  },

  onPriceInput(e) { this.setData({ price: e.detail.value }) },
  onAreaInput(e) { this.setData({ area: e.detail.value }) },
  onOtherInput(e) { this.setData({ otherFees: e.detail.value }) },

  setTaxPayer(e) { this.setData({ taxPayer: e.currentTarget.dataset.val }) },
  setLoan(e) { this.setData({ hasLoan: e.currentTarget.dataset.val === 'true' }) },
  setDownPayment(e) { this.setData({ downPaymentRatio: parseInt(e.currentTarget.dataset.val) }) },

  calculate() {
    const price = parseFloat(this.data.price)
    if (!price || price <= 0) {
      wx.showToast({ title: '请输入房屋价格', icon: 'none' }); return
    }
    const priceYuan = Math.round(price * 10000)
    const area = parseFloat(this.data.area) || 0
    const otherFees = parseFloat(this.data.otherFees) || 0

    // 辅拍服务费：起拍价 × 1%，最低5万
    const agencyFee = Math.max(Math.round(priceYuan * 0.01), 50000)

    // 契税（买家承担部分）
    let deedTax = 0
    let deedTaxRate = ''
    if (this.data.taxPayer === 'buyer' || this.data.taxPayer === 'each') {
      if (area > 0 && area <= 90) {
        deedTax = Math.round(priceYuan * 0.01)
        deedTaxRate = '90㎡以下 1%'
      } else if (area > 90) {
        deedTax = Math.round(priceYuan * 0.015)
        deedTaxRate = '90㎡以上 1.5%'
      } else {
        deedTax = Math.round(priceYuan * 0.01)
        deedTaxRate = '1%（面积未知）'
      }
    }

    // 个税（买家全承担时）
    let personalTax = 0
    if (this.data.taxPayer === 'buyer') {
      personalTax = Math.round(priceYuan * 0.01)
    }

    // 平台费（0.5%，买家全承担时）
    const platformFee = this.data.taxPayer === 'buyer' ? Math.round(priceYuan * 0.005) : 0

    const total = priceYuan + agencyFee + deedTax + personalTax + platformFee + otherFees
    const unitPrice = area > 0 ? Math.round(total / area) : 0

    const fmt = n => n.toLocaleString('zh-CN')

    this.setData({
      result: {
        priceYuan,
        priceStr: fmt(priceYuan),
        agencyFee,
        agencyFeeStr: fmt(agencyFee),
        deedTax,
        deedTaxStr: fmt(deedTax),
        deedTaxRate,
        personalTax,
        personalTaxStr: fmt(personalTax),
        platformFee,
        platformFeeStr: fmt(platformFee),
        otherFees,
        otherFeesStr: fmt(otherFees),
        total,
        totalStr: fmt(total),
        unitPrice: unitPrice > 0 ? fmt(unitPrice) : '—',
        savingStr: '—'
      }
    })
  }
})

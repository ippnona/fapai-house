const app = getApp()

Page({
  data: {
    latitude: 22.5431, // 深圳中心
    longitude: 114.0579,
    markers: [],
    selectedHouse: null,
    activeDistrict: '',
    activePriceRange: '',
    loading: false,
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交'
    }
  },

  onLoad() {
    if (app.checkMember()) {
      this.loadMapPoints()
    } else {
      wx.showModal({
        title: '需要会员权限',
        content: '地图找房需开通会员，请联系管理员',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          } else {
            wx.switchTab({ url: '/pages/home/home' })
          }
        }
      })
    }
  },

  loadMapPoints() {
    this.setData({ loading: true })
    const data = {}
    if (this.data.activeDistrict) data.district = this.data.activeDistrict
    if (this.data.activePriceRange) {
      const [min, max] = this.data.activePriceRange.split('-')
      data.minPrice = min * 10000
      data.maxPrice = max * 10000
    }

    app.request({
      url: '/houses/map/points',
      data
    }).then(res => {
      const markers = res.data.map((h, i) => ({
        id: i,
        latitude: h.latitude,
        longitude: h.longitude,
        title: h.title,
        iconPath: '/assets/marker.png',
        width: 32,
        height: 40,
        callout: {
          content: `${h.auctionStartPrice ? (h.auctionStartPrice/10000).toFixed(0) + '万' : '询价'}`,
          display: 'ALWAYS',
          color: '#fff',
          bgColor: '#e94560',
          borderRadius: 6,
          padding: 6,
          fontSize: 12
        },
        _houseData: h
      }))
      this.setData({ markers, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId || e.markerId
    const marker = this.data.markers[markerId]
    if (marker && marker._houseData) {
      this.setData({ selectedHouse: marker._houseData })
    }
  },

  goDetail() {
    if (this.data.selectedHouse && this.data.selectedHouse._id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${this.data.selectedHouse._id}` })
    }
  },

  formatWan(val) {
    return val ? (val / 10000).toFixed(0) : '-'
  },

  showDistrictPicker() {
    const districts = ['全部', '南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']
    wx.showActionSheet({
      itemList: districts,
      success: (res) => {
        const d = districts[res.tapIndex]
        this.setData({ 
          activeDistrict: d === '全部' ? '' : d,
          selectedHouse: null
        })
        this.loadMapPoints()
      }
    })
  },

  showPricePicker() {
    const prices = ['不限', '200万以下', '200-500万', '500-1000万', '1000万以上']
    const priceValues = ['', '0-200', '200-500', '500-1000', '1000-999999']
    wx.showActionSheet({
      itemList: prices,
      success: (res) => {
        this.setData({
          activePriceRange: priceValues[res.tapIndex],
          selectedHouse: null
        })
        this.loadMapPoints()
      }
    })
  }
})

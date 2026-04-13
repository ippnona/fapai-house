const app = getApp()

// 深圳各区中心坐标
const DISTRICT_CENTERS = {
  '南山': { lat: 22.5308, lng: 113.9297 },
  '福田': { lat: 22.5217, lng: 114.0626 },
  '罗湖': { lat: 22.5493, lng: 114.1297 },
  '宝安': { lat: 22.7210, lng: 113.8836 },
  '龙岗': { lat: 22.7198, lng: 114.2527 },
  '龙华': { lat: 22.7007, lng: 114.0496 },
  '光明': { lat: 22.7811, lng: 113.9293 },
  '坪山': { lat: 22.6887, lng: 114.3387 },
  '盐田': { lat: 22.5578, lng: 114.2361 },
  '大鹏': { lat: 22.5823, lng: 114.4789 }
}

Page({
  data: {
    latitude: 22.5431,
    longitude: 114.0579,
    markers: [],
    clusters: [],
    selectedHouse: null,
    activeDistrict: '',
    activeStatus: '',
    loading: false,
    viewMode: 'points', // 'points' | 'clusters'
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交',
      withdrawn: '已撤回'
    }
  },

  onLoad() {
    if (app.checkMember()) {
      this.loadClusters()
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

  // 加载板块聚合数据
  loadClusters() {
    this.setData({ loading: true })
    const data = {}
    if (this.data.activeStatus) data.status = this.data.activeStatus

    app.request({
      url: '/houses/map/clusters',
      data
    }).then(res => {
      const markers = res.data.map((c, i) => {
        const center = DISTRICT_CENTERS[c._id] || { lat: 22.5431, lng: 114.0579 }
        return {
          id: i,
          latitude: center.lat,
          longitude: center.lng,
          title: c._id,
          iconPath: '/assets/cluster-marker.png',
          width: 56,
          height: 56,
          customCallout: {
            display: 'ALWAYS'
          },
          _cluster: c
        }
      })
      this.setData({ 
        clusters: res.data,
        markers,
        loading: false,
        viewMode: 'clusters'
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  // 切换到单点模式
  loadPoints() {
    this.setData({ loading: true })
    const data = {}
    if (this.data.activeDistrict) data.district = this.data.activeDistrict
    if (this.data.activeStatus) data.status = this.data.activeStatus

    app.request({
      url: '/houses/map/points',
      data
    }).then(res => {
      const markers = res.data.map((h, i) => {
        const statusColor = {
          ongoing: '#e94560',
          pending: '#ff9f43',
          ended: '#999',
          sold: '#2ed573'
        }
        return {
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
            bgColor: statusColor[h.status] || '#e94560',
            borderRadius: 6,
            padding: 6,
            fontSize: 12
          },
          _houseData: h
        }
      })
      this.setData({ markers, loading: false, viewMode: 'points' })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  // 点击聚合点 → 放大到该区
  onClusterTap(e) {
    const markerId = e.detail.markerId || e.markerId
    const marker = this.data.markers[markerId]
    if (!marker || !marker._cluster) return

    const district = marker._cluster._id
    const center = DISTRICT_CENTERS[district] || { lat: 22.5431, lng: 114.0579 }

    this.setData({
      latitude: center.lat,
      longitude: center.lng,
      activeDistrict: district
    })

    wx.showToast({ title: `进入${district}区域`, icon: 'none', duration: 800 })

    setTimeout(() => {
      this.loadPoints()
    }, 800)
  },

  // 点击单点
  onMarkerTap(e) {
    const markerId = e.detail.markerId || e.markerId
    const marker = this.data.markers[markerId]
    if (marker && marker._houseData) {
      this.setData({ selectedHouse: marker._houseData })
    }
  },

  // 点击地图空白处关闭详情
  onMapTap() {
    this.setData({ selectedHouse: null })
  },

  // 区域筛选
  showDistrictPicker() {
    const districts = ['全部', '南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '光明', '坪山', '盐田', '大鹏']
    wx.showActionSheet({
      itemList: districts,
      success: (res) => {
        const d = districts[res.tapIndex]
        this.setData({ activeDistrict: d === '全部' ? '' : d, selectedHouse: null })
        this.data.activeDistrict ? this.loadPoints() : this.loadClusters()
      }
    })
  },

  // 状态筛选
  showStatusPicker() {
    wx.showActionSheet({
      itemList: ['全部', '正在拍卖', '即将拍卖', '已结束'],
      success: (res) => {
        const vals = ['', 'ongoing', 'pending', 'ended']
        this.setData({ activeStatus: vals[res.tapIndex], selectedHouse: null })
        this.data.activeDistrict ? this.loadPoints() : this.loadClusters()
      }
    })
  },

  // 返回聚合视图
  backToClusters() {
    this.setData({ activeDistrict: '', selectedHouse: null })
    this.loadClusters()
  },

  goDetail() {
    const house = this.data.selectedHouse
    if (house && house._id) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${house._id}` })
    }
  },

  formatWan(val) {
    return val ? (val / 10000).toFixed(0) : '-'
  }
})

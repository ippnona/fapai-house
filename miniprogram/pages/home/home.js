const app = getApp()

Page({
  data: {
    houses: [],
    keyword: '',
    page: 1,
    pageSize: 10,
    loading: false,
    noMore: false,
    
    // 筛选
    filterDistrict: '',
    filterPrice: '',
    filterStatus: '',
    filterPlatform: '',
    showFilterPanel: false,
    filterType: '',
    filterOptions: [],
    currentFilterValue: '',
    
    // 状态映射
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交',
      withdrawn: '已撤回'
    },
    
    // 筛选选项
    districtOptions: [
      { label: '全部区域', value: '' },
      { label: '南山', value: '南山' },
      { label: '福田', value: '福田' },
      { label: '罗湖', value: '罗湖' },
      { label: '宝安', value: '宝安' },
      { label: '龙岗', value: '龙岗' },
      { label: '龙华', value: '龙华' },
      { label: '光明', value: '光明' },
      { label: '坪山', value: '坪山' },
      { label: '盐田', value: '盐田' },
      { label: '大鹏', value: '大鹏' }
    ],
    priceOptions: [
      { label: '不限价格', value: '' },
      { label: '200万以下', value: '0-200' },
      { label: '200-500万', value: '200-500' },
      { label: '500-1000万', value: '500-1000' },
      { label: '1000-2000万', value: '1000-2000' },
      { label: '2000万以上', value: '2000-999999' }
    ],
    statusOptions: [
      { label: '全部状态', value: '' },
      { label: '待拍卖', value: 'pending' },
      { label: '拍卖中', value: 'ongoing' },
      { label: '已结束', value: 'ended' },
      { label: '已成交', value: 'sold' }
    ],
    platformOptions: [
      { label: '全部来源', value: '' },
      { label: '阿里拍卖', value: 'ali' },
      { label: '京东拍卖', value: 'jd' }
    ]
  },

  onLoad() {
    this.loadHouses()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, houses: [], noMore: false })
    this.loadHouses(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadHouses()
    }
  },

  // 加载房源列表
  loadHouses(callback) {
    if (this.data.loading) return
    this.setData({ loading: true })

    const data = {
      page: this.data.page,
      pageSize: this.data.pageSize
    }
    
    // 筛选参数
    if (this.data.filterDistrict) data.district = this.data.filterDistrict
    if (this.data.filterStatus) data.status = this.data.filterStatus
    if (this.data.filterPlatform) data.platform = this.data.filterPlatform
    if (this.data.filterPrice) {
      const [min, max] = this.data.filterPrice.split('-')
      data.minPrice = min * 10000
      data.maxPrice = max * 10000
    }
    if (this.data.keyword) data.keyword = this.data.keyword

    app.request({
      url: '/houses',
      data
    }).then(res => {
      const newList = res.data.list.map(h => ({
        ...h,
        // 价格转换为"万"
        auctionStartPrice: (h.auctionStartPrice / 10000).toFixed(0),
        marketPrice: (h.marketPrice / 10000).toFixed(0)
      }))
      
      this.setData({
        houses: this.data.page === 1 ? newList : [...this.data.houses, ...newList],
        page: this.data.page + 1,
        noMore: newList.length < this.data.pageSize,
        loading: false
      })
      callback && callback()
    }).catch(() => {
      this.setData({ loading: false })
      callback && callback()
    })
  },

  // 折扣计算
  discount(item) {
    if (!item.marketPrice || !item.auctionStartPrice) return ''
    return (item.auctionStartPrice / item.marketPrice * 10).toFixed(1)
  },

  // 跳转详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (app.checkMember()) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    } else {
      wx.showModal({
        title: '需要会员权限',
        content: '查看房源详情需开通会员，请联系管理员',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          }
        }
      })
    }
  },

  // 搜索
  onSearchTap() {
    // 简版：弹出输入框
    wx.showModal({
      title: '搜索房源',
      editable: true,
      placeholderText: '输入区域或小区名',
      success: (res) => {
        if (res.content) {
          this.setData({ 
            keyword: res.content, 
            page: 1, 
            houses: [], 
            noMore: false 
          })
          this.loadHouses()
        }
      }
    })
  },

  // 筛选面板
  showDistrictFilter() { this.showFilter('district', this.data.districtOptions) },
  showPriceFilter() { this.showFilter('price', this.data.priceOptions) },
  showStatusFilter() { this.showFilter('status', this.data.statusOptions) },
  showPlatformFilter() { this.showFilter('platform', this.data.platformOptions) },

  showFilter(type, options) {
    let currentValue = ''
    if (type === 'district') currentValue = this.data.filterDistrict
    if (type === 'price') currentValue = this.data.filterPrice
    if (type === 'status') currentValue = this.data.filterStatus
    if (type === 'platform') currentValue = this.data.filterPlatform

    this.setData({
      showFilterPanel: true,
      filterType: type,
      filterOptions: options,
      currentFilterValue: currentValue
    })
  },

  selectFilter(e) {
    const { type, value, label } = e.currentTarget.dataset
    const updateData = { showFilterPanel: false }
    
    if (type === 'district') updateData.filterDistrict = label === '全部区域' ? '' : label
    if (type === 'price') updateData.filterPrice = value
    if (type === 'status') updateData.filterStatus = label === '全部状态' ? '' : label
    if (type === 'platform') updateData.filterPlatform = label === '全部来源' ? '' : label
    
    this.setData({ ...updateData, page: 1, houses: [], noMore: false })
    this.loadHouses()
  },

  closeFilter() {
    this.setData({ showFilterPanel: false })
  }
})

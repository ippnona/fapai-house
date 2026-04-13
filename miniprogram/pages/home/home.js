const app = getApp()

Page({
  data: {
    houses: [],
    keyword: '',
    page: 1,
    pageSize: 10,
    loading: false,
    noMore: false,
    
    // Banner统计数据
    stats: {
      todayNew: 0,
      ongoing: 0,
      upcoming: 0
    },
    
    // 筛选
    filterDistrict: '',
    filterSort: '',
    filterSortLabel: '',
    filterPropertyType: '',
    filterPrice: '',
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
    sortOptions: [
      { label: '默认排序', value: 'default' },
      { label: '最新发布', value: 'latest' },
      { label: '拍卖时间', value: 'auctionTime' },
      { label: '价格从低到高', value: 'priceAsc' },
      { label: '价格从高到低', value: 'priceDesc' }
    ],
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
    propertyTypeOptions: [
      { label: '全部物业', value: '' },
      { label: '住宅', value: '住宅' },
      { label: '商业', value: '商业' }
    ],
    priceOptions: [
      { label: '不限价格', value: '' },
      { label: '200万以下', value: '0-200' },
      { label: '200-500万', value: '200-500' },
      { label: '500-1000万', value: '500-1000' },
      { label: '1000-2000万', value: '1000-2000' },
      { label: '2000万以上', value: '2000-999999' }
    ]
  },

  onLoad() {
    this.loadBannerStats()
    this.loadHouses()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, houses: [], noMore: false })
    this.loadBannerStats()
    this.loadHouses(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadHouses()
    }
  },

  // 加载Banner统计数据
  loadBannerStats() {
    app.request({ url: '/houses/stats' }).then(res => {
      this.setData({ stats: res.data || {} })
    }).catch(() => {})
  },

  // Banner点击筛选
  filterByBanner(e) {
    const type = e.currentTarget.dataset.type
    let status = ''
    if (type === 'ongoing') status = 'ongoing'
    if (type === 'upcoming') status = 'pending'
    // todayNew 需要后端按日期筛选，暂时用status
    this.setData({ 
      filterStatus: status,
      page: 1,
      houses: [],
      noMore: false
    })
    this.loadHouses()
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
    if (this.data.filterPropertyType) data.propertyType = this.data.filterPropertyType
    if (this.data.filterPrice) {
      const [min, max] = this.data.filterPrice.split('-')
      data.minPrice = min * 10000
      data.maxPrice = max * 10000
    }
    if (this.data.keyword) data.keyword = this.data.keyword
    
    // 排序
    if (this.data.filterSort === 'latest') data.sortBy = 'createdAt'
    if (this.data.filterSort === 'auctionTime') data.sortBy = 'auctionStartTime'
    if (this.data.filterSort === 'priceAsc') { data.sortBy = 'auctionStartPrice'; data.sortOrder = 'asc' }
    if (this.data.filterSort === 'priceDesc') { data.sortBy = 'auctionStartPrice'; data.sortOrder = 'desc' }
    // default = 按阿里提醒人数排序，由后端实现

    app.request({
      url: '/houses',
      data
    }).then(res => {
      const newList = res.data.list.map(h => ({
        ...h,
        // 价格转换为"万"
        auctionStartPrice: (h.auctionStartPrice / 10000).toFixed(0),
        marketPrice: (h.marketPrice / 10000).toFixed(0),
        // 折扣
        discount: h.marketPrice && h.auctionStartPrice 
          ? (h.auctionStartPrice / h.marketPrice * 10).toFixed(1) : ''
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
  showSortFilter() { this.showFilter('sort', this.data.sortOptions) },
  showDistrictFilter() { this.showFilter('district', this.data.districtOptions) },
  showPropertyTypeFilter() { this.showFilter('propertyType', this.data.propertyTypeOptions) },
  showPriceFilter() { this.showFilter('price', this.data.priceOptions) },

  showFilter(type, options) {
    let currentValue = ''
    if (type === 'sort') currentValue = this.data.filterSort
    if (type === 'district') currentValue = this.data.filterDistrict
    if (type === 'propertyType') currentValue = this.data.filterPropertyType
    if (type === 'price') currentValue = this.data.filterPrice

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
    
    if (type === 'sort') {
      updateData.filterSort = value
      updateData.filterSortLabel = label
    }
    if (type === 'district') updateData.filterDistrict = value === '' ? '' : label
    if (type === 'propertyType') updateData.filterPropertyType = value
    if (type === 'price') updateData.filterPrice = value
    
    this.setData({ ...updateData, page: 1, houses: [], noMore: false })
    this.loadHouses()
  },

  closeFilter() {
    this.setData({ showFilterPanel: false })
  }
})

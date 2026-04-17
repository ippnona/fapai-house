const app = getApp()

Page({
  data: {
    houses: [],
    stats: { todayNew: 0, ongoing: 0, upcoming: 0 },
    // 新增区域
    successList: [],      // 学员报喜
    serviceList: [],       // 服务介绍
    showCalculatorBanner: false,  // 计算器入口（管理员或员工可见）
    // 原有筛选
    houses: [],
    stats: {},
    filterDistrict: '',
    filterSort: '',
    filterSortLabel: '',
    filterPropertyType: '',
    filterPrice: '',
    showFilterPanel: false,
    filterType: '',
    filterOptions: [],
    currentFilterValue: '',
    keyword: '',
    loading: false,
    page: 1,
    noMore: false,
    statusMap: {
      pending: '待拍卖',
      ongoing: '拍卖中',
      ended: '已结束',
      sold: '已成交',
      withdrawn: '已撤回'
    },
    userInfo: null
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })
    this.loadStats()
    this.loadHouses()
    this.loadHomeData()
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })
    // 管理员显示计算器banner
    this.setData({ showCalculatorBanner: userInfo && (userInfo.role === 'admin') })
  },

  // 加载首页内容数据
  loadHomeData() {
    app.request({ url: '/news/success/home' }).then(res => {
      if (res.code === 0) this.setData({ successList: res.data || [] })
    }).catch(() => {})
    app.request({ url: '/news/services/home' }).then(res => {
      if (res.code === 0) this.setData({ serviceList: res.data || [] })
    }).catch(() => {})
  },

  // 加载统计数据
  loadStats() {
    app.request({ url: '/houses/stats' }).then(res => {
      if (res.code === 0) this.setData({ stats: res.data || {} })
    }).catch(() => {})
  },

  // 加载房源列表
  loadHouses(reset = true) {
    if (this.data.loading) return
    if (reset) {
      this.setData({ page: 1, houses: [], noMore: false })
    }
    this.setData({ loading: true })
    
    const params = { page: this.data.page, pageSize: 10 }
    if (this.data.filterDistrict) params.district = this.data.filterDistrict
    if (this.data.filterSort === 'price_asc') { params.sortBy = 'auctionStartPrice'; params.sortOrder = 'asc' }
    if (this.data.filterSort === 'price_desc') { params.sortBy = 'auctionStartPrice'; params.sortOrder = 'desc' }
    if (this.data.filterSort === 'time') { params.sortBy = 'auctionStartTime' }
    if (this.data.filterPropertyType) params.propertyType = this.data.filterPropertyType
    if (this.data.keyword) params.keyword = this.data.keyword

    app.request({ url: '/houses', data: params }).then(res => {
      if (res.code === 0) {
        const p = v => v ? (parseFloat(v) >= 100000000
          ? (parseFloat(v)/100000000).toFixed(1) + '亿'
          : (parseFloat(v)/10000).toFixed(0)) : '—'
        const list = (reset ? res.data.list : [...this.data.houses, ...res.data.list]).map(h => ({
          ...h,
          displayStartPrice: p(h.auctionStartPrice),
          displayMarketPrice: p(h.marketPrice),
          displayDiscount: (h.marketPrice && h.auctionStartPrice)
            ? (h.auctionStartPrice / h.marketPrice * 10).toFixed(1) : '10.0'
        }))
        this.setData({
          houses: list,
          loading: false,
          noMore: res.data.list.length < 10
        })
      } else {
        this.setData({ loading: false })
      }
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStats()
    this.loadHomeData()
    this.loadHouses(true)
    setTimeout(() => wx.stopPullDownRefresh(), 800)
  },

  // 上拉加载
  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadHouses(false)
    }
  },

  // 跳转详情
  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  // 搜索
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // Banner筛选
  filterByBanner(e) {
    const type = e.currentTarget.dataset.type
    if (type === 'today') this.setData({ filterSort: 'createdAt' })
    else if (type === 'ongoing') this.setData({ filterDistrict: 'ongoing' })
    this.loadHouses(true)
  },

  // 筛选面板
  showSortFilter() { this.showFilterPanel('sort', this.data.sortOptions) },
  showDistrictFilter() { this.showFilterPanel('district', this.data.districtOptions) },
  showPropertyTypeFilter() { this.showFilterPanel('propertyType', this.data.propertyTypeOptions) },
  showPriceFilter() { this.showFilterPanel('price', this.data.priceOptions) },

  showFilterPanel(type, options) {
    const opts = options || this.getFilterOptions(type)
    this.setData({
      showFilterPanel: true,
      filterType: type,
      filterOptions: opts,
      currentFilterValue: this.data['filter' + type.charAt(0).toUpperCase() + type.slice(1)]
    })
  },

  getFilterOptions(type) {
    if (type === 'sort') return [
      { label: '默认排序', value: '' },
      { label: '价格从低到高', value: 'price_asc' },
      { label: '价格从高到低', value: 'price_desc' },
      { label: '拍卖时间', value: 'time' }
    ]
    if (type === 'district') return [
      { label: '全部', value: '' }, { label: '福田', value: '福田' }, { label: '罗湖', value: '罗湖' },
      { label: '南山', value: '南山' }, { label: '宝安', value: '宝安' }, { label: '龙岗', value: '龙岗' },
      { label: '龙华', value: '龙华' }, { label: '光明', value: '光明' }, { label: '盐田', value: '盐田' }
    ]
    if (type === 'propertyType') return [
      { label: '全部', value: '' }, { label: '住宅', value: '住宅' }, { label: '商业', value: '商业' }
    ]
    if (type === 'price') return [
      { label: '不限', value: '' },
      { label: '200万以下', value: '0-200' },
      { label: '200-500万', value: '200-500' },
      { label: '500-1000万', value: '500-1000' },
      { label: '1000万以上', value: '1000-' }
    ]
    return []
  },

  selectFilter(e) {
    const { type, value, label } = e.currentTarget.dataset
    const key = 'filter' + type.charAt(0).toUpperCase() + type.slice(1)
    this.setData({ [key]: value, showFilterPanel: false })
    if (type === 'district') this.setData({ filterDistrict: value })
    if (type === 'sort') this.setData({ filterSort: value, filterSortLabel: label })
    if (type === 'propertyType') this.setData({ filterPropertyType: value })
    if (type === 'price') this.setData({ filterPrice: value })
    this.loadHouses(true)
  },

  closeFilter() { this.setData({ showFilterPanel: false }) },

  // 去计算器
  goCalculator() {
    wx.navigateTo({ url: '/pages/calculator/calculator' })
  },

  // 学员报喜列表
  goSuccessList() { wx.navigateTo({ url: '/pages/news/news?type=success' }) },
  goSuccessDetail(e) { wx.navigateTo({ url: '/pages/news/news?id=' + e.currentTarget.dataset.id }) },

  // 服务介绍
  goServiceList() { wx.navigateTo({ url: '/pages/news/news?type=service' }) },
  goServiceDetail(e) { wx.navigateTo({ url: '/pages/news/news?id=' + e.currentTarget.dataset.id }) }
})

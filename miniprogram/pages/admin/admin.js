const app = getApp()

Page({
  data: {
    activeTab: 'users',
    stats: {},
    users: [],
    houses: [],
    contacts: [],
    userFilter: ''
  },

  onLoad() {
    // 非管理员拦截
    if (app.globalData.userInfo?.role !== 'admin') {
      wx.showModal({
        title: '无权限',
        content: '仅管理员可访问',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }
    this.loadStats()
    this.loadUsers()
  },

  loadStats() {
    app.request({ url: '/admin/stats' }).then(res => {
      this.setData({ stats: res.data })
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'users') this.loadUsers()
    if (tab === 'houses') this.loadHouses()
    if (tab === 'contacts') this.loadContacts()
  },

  // === 用户管理 ===
  loadUsers() {
    const data = {}
    if (this.data.userFilter) data.membership = this.data.userFilter
    app.request({ url: '/admin/users', data }).then(res => {
      this.setData({ users: res.data.list })
    })
  },

  filterUsers(e) {
    const val = e.currentTarget.dataset.val
    this.setData({ userFilter: val })
    this.loadUsers()
  },

  approveUser(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '开通会员',
      content: '确认开通该用户会员权限？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/admin/users/${id}`,
            method: 'PUT',
            data: { 
              membership: 'active',
              membershipExpire: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
            }
          }).then(() => {
            wx.showToast({ title: '已开通', icon: 'success' })
            this.loadUsers()
            this.loadStats()
          })
        }
      }
    })
  },

  rejectUser(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝申请',
      content: '确认拒绝该用户会员申请？',
      success: (res) => {
        if (res.confirm) {
          app.request({
            url: `/admin/users/${id}`,
            method: 'PUT',
            data: { membership: 'rejected' }
          }).then(() => {
            wx.showToast({ title: '已拒绝', icon: 'none' })
            this.loadUsers()
            this.loadStats()
          })
        }
      }
    })
  },

  // === 房源管理 ===
  loadHouses() {
    app.request({ url: '/houses', data: { pageSize: 50 } }).then(res => {
      this.setData({ houses: res.data.list })
    })
  },

  goAddHouse() {
    wx.showToast({ title: '添加房源功能开发中', icon: 'none' })
  },

  // === 咨询管理 ===
  loadContacts() {
    app.request({ url: '/admin/contacts' }).then(res => {
      this.setData({ contacts: res.data })
    })
  },

  formatDate(val) {
    if (!val) return ''
    const d = new Date(val)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }
})

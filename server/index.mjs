import express from 'express'
import cors from 'cors'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = 3100
const root = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(root, 'db.json')
const adminUser = { id: 1, name: '王老师', role: '宿管老师', initials: '王', building: '松园 1 号楼', permissions: ['dorm-manager'] }
const studentUser = { id: 1, studentId: 1, name: '陈一凡', role: '学生', initials: '陈', studentNo: '2024010312', permissions: ['student'] }
const adminToken = createHash('sha256').update('smart-dormitory-admin-session').digest('hex')
const studentToken = createHash('sha256').update('smart-dormitory-student-session').digest('hex')
const tokenUsers = new Map([[adminToken, adminUser], [studentToken, studentUser]])
const defaultPasswordHash = createHash('sha256').update('123456').digest('hex')
const hashPassword = (password) => createHash('sha256').update(String(password)).digest('hex')

app.use(cors())
app.use(express.json({ limit: '1mb' }))

async function readDb() {
  return JSON.parse(await readFile(dbPath, 'utf8'))
}

async function saveDb(db) {
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8')
}

function ok(res, data, message = '操作成功') {
  res.json({ code: 0, message, data })
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token || !tokenUsers.has(token)) return res.status(401).json({ code: 401, message: '登录状态已失效', data: null })
  req.user = tokenUsers.get(token)
  next()
}

const requireRole = (role) => (req, res, next) => req.user?.role === role
  ? next()
  : res.status(403).json({ code: 403, message: '无权访问该功能', data: null })
const adminOnly = requireRole('宿管老师')
const studentOnly = requireRole('学生')

function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.find((field) => req.body[field] === undefined || req.body[field] === '')
    if (missing) return res.status(400).json({ code: 400, message: `字段 ${missing} 不能为空`, data: null })
    next()
  }
}

app.get('/api/health', (_req, res) => ok(res, { status: 'up', timestamp: new Date().toISOString() }))

app.post('/api/auth/login', requireFields(['account', 'password']), async (req, res) => {
  const db = await readDb()
  const isAdmin = req.body.account === 'dorm' || req.body.account === 'admin'
  const isStudent = req.body.account === '2024010312' || req.body.account === 'student'
  if (!isAdmin && !isStudent) return res.status(401).json({ code: 401, message: '账号或密码错误', data: null })
  const credentialKey = isAdmin ? 'admin' : 'student'
  const savedHash = db.authAccounts?.[credentialKey]?.passwordHash ?? defaultPasswordHash
  if (hashPassword(req.body.password) !== savedHash) return res.status(401).json({ code: 401, message: '账号或密码错误', data: null })
  if (isAdmin) return ok(res, { token: adminToken, user: adminUser }, '登录成功')
  if (isStudent) return ok(res, { token: studentToken, user: studentUser }, '登录成功')
  return res.status(401).json({ code: 401, message: '账号或密码错误', data: null })
})

app.get('/api/auth/profile', auth, (req, res) => ok(res, req.user))
app.patch('/api/auth/password', auth, requireFields(['currentPassword', 'newPassword']), async (req, res) => {
  const currentPassword = String(req.body.currentPassword)
  const newPassword = String(req.body.newPassword)
  if (newPassword.length < 8 || newPassword.length > 32 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return res.status(400).json({ code: 400, message: '新密码需为 8—32 位，且同时包含字母和数字', data: null })
  if (currentPassword === newPassword) return res.status(400).json({ code: 400, message: '新密码不能与原密码相同', data: null })
  const db = await readDb()
  const credentialKey = req.user.role === '宿管老师' ? 'admin' : 'student'
  const savedHash = db.authAccounts?.[credentialKey]?.passwordHash ?? defaultPasswordHash
  if (hashPassword(currentPassword) !== savedHash) return res.status(400).json({ code: 400, message: '原密码不正确', data: null })
  db.authAccounts ??= {}
  db.authAccounts[credentialKey] = { passwordHash: hashPassword(newPassword), updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }) }
  await saveDb(db)
  ok(res, null, '密码修改成功，请重新登录')
})

app.get('/api/student/home', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === (req.user.studentId ?? 1))
  const room = db.rooms.find((item) => item.id === student?.roomId)
  const building = db.buildings.find((item) => item.id === room?.buildingId)
  const myRepairs = db.repairs.filter((item) => item.student === student.name)
  ok(res, {
    student,
    room: room ? { building: room.building, roomNo: room.roomNo, bedNo: student.bedNo, floor: `${room.floor}层`, manager: building?.manager ?? '—', managerPhone: building?.phone ?? '—', occupancy: room.occupied, capacity: room.capacity } : null,
    roommates: room ? db.students
      .filter((item) => item.roomId === room.id && item.id !== student.id)
      .sort((a, b) => Number.parseInt(a.bedNo) - Number.parseInt(b.bedNo))
      .map(({ id, name, major, bedNo }) => ({ id, name, major, bedNo })) : [],
    pendingRepairs: myRepairs.filter((item) => item.status !== '已完成').length,
    unreadNotices: db.notices.filter((item) => {
      const visible = !item.audience || item.audience === '全体学生' || item.audience === `${student.gender}生宿舍` || item.audience === room?.building
      const read = Array.isArray(item.readBy) ? item.readBy.includes(student.id) : item.read
      return visible && !read
    }).length,
    latestInspection: db.inspections[0],
    utility: db.utilities[0]
  })
})

app.get('/api/student/notices', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === (req.user.studentId ?? 1))
  const room = db.rooms.find((item) => item.id === student?.roomId)
  const list = db.notices
    .filter((item) => !item.audience || item.audience === '全体学生' || item.audience === `${student.gender}生宿舍` || item.audience === room?.building)
    .map((item) => ({ ...item, read: Array.isArray(item.readBy) ? item.readBy.includes(student.id) : Boolean(item.read) }))
    .sort((a, b) => b.id - a.id)
  ok(res, list)
})
app.patch('/api/student/notices/:id/read', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const notice = db.notices.find((item) => item.id === Number(req.params.id))
  if (!notice) return res.status(404).json({ code: 404, message: '通知不存在', data: null })
  notice.readBy = Array.isArray(notice.readBy) ? notice.readBy : notice.read ? [req.user.studentId] : []
  if (!notice.readBy.includes(req.user.studentId)) notice.readBy.push(req.user.studentId)
  await saveDb(db)
  ok(res, { ...notice, read: true }, '已标记为已读')
})
app.get('/api/student/inspections', auth, studentOnly, async (_req, res) => ok(res, (await readDb()).inspections))
app.get('/api/student/utilities', auth, studentOnly, async (_req, res) => ok(res, (await readDb()).utilities))

app.get('/api/student/repairs', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === (req.user.studentId ?? 1))
  ok(res, db.repairs.filter((item) => item.student === student.name))
})
app.post('/api/student/repairs', auth, studentOnly, requireFields(['title', 'category', 'description']), async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === (req.user.studentId ?? 1))
  const repair = { id: Date.now(), orderNo: `BX${new Date().toISOString().slice(0, 10).replaceAll('-', '')}${String(db.repairs.length + 1).padStart(3, '0')}`, title: req.body.title, category: req.body.category, description: req.body.description, location: student.room, student: student.name, submittedAt: '刚刚', priority: req.body.priority === '紧急' ? '紧急' : '普通', status: '待受理' }
  db.repairs.unshift(repair)
  await saveDb(db)
  ok(res.status(201), repair, '报修提交成功')
})

app.get('/api/student/transfers', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  ok(res, db.transfers.filter((item) => item.studentId === (req.user.studentId ?? 1)))
})
app.post('/api/student/transfers', auth, studentOnly, requireFields(['reason', 'preferredArea']), async (req, res) => {
  const db = await readDb()
  if (db.transfers.some((item) => item.studentId === (req.user.studentId ?? 1) && ['审核中', '待搬迁'].includes(item.status))) return res.status(409).json({ code: 409, message: '你已有一条正在办理的调宿申请', data: null })
  const student = db.students.find((item) => item.id === (req.user.studentId ?? 1))
  const transfer = { id: Date.now(), studentId: student.id, currentRoom: student.room, preferredArea: req.body.preferredArea, reason: req.body.reason, status: '审核中', createdAt: new Date().toISOString().slice(0, 10) }
  db.transfers.unshift(transfer)
  await saveDb(db)
  ok(res.status(201), transfer, '调宿申请已提交')
})

app.get('/api/student/utility-account', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const studentId = req.user.studentId ?? 1
  const account = db.utilityAccounts?.[studentId] ?? { balance: 36.5 }
  const records = (db.utilityRecharges ?? []).filter((item) => item.studentId === studentId).sort((a, b) => b.id - a.id)
  const transactions = (db.utilityTransactions ?? []).filter((item) => item.studentId === studentId).sort((a, b) => b.id - a.id)
  ok(res, { balance: account.balance, records, transactions })
})

app.post('/api/student/utility-recharges', auth, studentOnly, requireFields(['amount', 'paymentMethod']), async (req, res) => {
  const amount = Number(req.body.amount)
  if (!Number.isFinite(amount) || amount < 10 || amount > 500) return res.status(400).json({ code: 400, message: '单次充值金额应为 10—500 元', data: null })
  const allowedMethods = ['微信支付', '支付宝', '校园卡']
  if (!allowedMethods.includes(req.body.paymentMethod)) return res.status(400).json({ code: 400, message: '无效的支付方式', data: null })
  const db = await readDb()
  const studentId = req.user.studentId ?? 1
  db.utilityAccounts ??= {}
  db.utilityRecharges ??= []
  const account = db.utilityAccounts[studentId] ?? { balance: 36.5 }
  account.balance = Number((account.balance + amount).toFixed(2))
  db.utilityAccounts[studentId] = account
  const record = { id: Date.now(), orderNo: `CZ${Date.now()}`, studentId, amount, paymentMethod: req.body.paymentMethod, status: '充值成功', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }) }
  db.utilityRecharges.unshift(record)
  await saveDb(db)
  ok(res.status(201), { balance: account.balance, record }, '充值成功')
})

app.post('/api/student/utilities/:month/pay', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const studentId = req.user.studentId ?? 1
  const bill = db.utilities.find((item) => item.month === req.params.month)
  if (!bill) return res.status(404).json({ code: 404, message: '水电账单不存在', data: null })
  if (bill.status === '已缴费') return res.status(409).json({ code: 409, message: '该账单已经缴费', data: null })
  db.utilityAccounts ??= {}
  db.utilityTransactions ??= []
  const account = db.utilityAccounts[studentId] ?? { balance: 36.5 }
  if (account.balance < bill.amount) return res.status(409).json({ code: 409, message: `余额不足，还需充值 ¥${(bill.amount - account.balance).toFixed(2)}`, data: null })
  account.balance = Number((account.balance - bill.amount).toFixed(2))
  db.utilityAccounts[studentId] = account
  bill.status = '已缴费'
  bill.paidAt = new Date().toLocaleString('zh-CN', { hour12: false })
  const transaction = { id: Date.now(), studentId, type: '水电缴费', month: bill.month, amount: -bill.amount, status: '支付成功', createdAt: bill.paidAt }
  db.utilityTransactions.unshift(transaction)
  await saveDb(db)
  ok(res, { balance: account.balance, bill, transaction }, '水电费缴纳成功')
})

app.patch('/api/student/transfers/:id/confirm', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  const transfer = db.transfers.find((item) => item.id === Number(req.params.id) && item.studentId === (req.user.studentId ?? 1))
  if (!transfer) return res.status(404).json({ code: 404, message: '调宿申请不存在', data: null })
  if (transfer.status !== '待搬迁') return res.status(409).json({ code: 409, message: '该申请当前无需确认', data: null })
  transfer.status = '已完成'
  transfer.confirmedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  await saveDb(db)
  ok(res, transfer, '搬迁已确认，调宿流程完成')
})

app.get('/api/student/late-returns', auth, studentOnly, async (req, res) => {
  const db = await readDb()
  ok(res, db.lateReturns.filter((item) => item.studentId === req.user.studentId))
})
app.post('/api/student/late-returns', auth, studentOnly, requireFields(['returnDate', 'expectedTime', 'reason', 'contact']), async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === req.user.studentId)
  const duplicate = db.lateReturns.some((item) => item.studentId === req.user.studentId && item.returnDate === req.body.returnDate && item.status === '待确认')
  if (duplicate) return res.status(409).json({ code: 409, message: '当天已有一条待确认的晚归登记', data: null })
  const record = { id: Date.now(), studentId: student.id, studentNo: student.studentNo, studentName: student.name, room: student.room, returnDate: req.body.returnDate, expectedTime: req.body.expectedTime, reason: req.body.reason, contact: req.body.contact, status: '待确认', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }) }
  db.lateReturns.unshift(record)
  await saveDb(db)
  ok(res.status(201), record, '晚归登记提交成功')
})

app.get('/api/admin/late-returns', auth, adminOnly, async (_req, res) => ok(res, (await readDb()).lateReturns))
app.patch('/api/admin/late-returns/:id/status', auth, adminOnly, requireFields(['status']), async (req, res) => {
  if (!['已联系', '已确认'].includes(req.body.status)) return res.status(400).json({ code: 400, message: '无效的处理状态', data: null })
  const db = await readDb()
  const record = db.lateReturns.find((item) => item.id === Number(req.params.id))
  if (!record) return res.status(404).json({ code: 404, message: '晚归记录不存在', data: null })
  record.status = req.body.status
  record.handledBy = req.user.name
  record.handledAt = new Date().toLocaleString('zh-CN', { hour12: false })
  await saveDb(db)
  ok(res, record, '晚归记录已更新')
})

app.get('/api/admin/transfers', auth, adminOnly, async (_req, res) => {
  const db = await readDb()
  const list = db.transfers.map((item) => {
    const student = db.students.find((row) => row.id === item.studentId)
    return { ...item, studentName: student?.name ?? '未知学生', studentNo: student?.studentNo ?? '—', gender: student?.gender ?? '男', college: student?.college ?? '—', phone: student?.phone ?? '—' }
  }).sort((a, b) => b.id - a.id)
  ok(res, list)
})

app.get('/api/admin/dashboard', auth, adminOnly, async (_req, res) => {
  const db = await readDb()
  const occupied = db.rooms.reduce((sum, room) => sum + room.occupied, 0)
  const capacity = db.rooms.reduce((sum, room) => sum + room.capacity, 0)
  const buildingRates = db.buildings.map((building) => ({ id: building.id, name: building.name, gender: building.gender, occupied: building.occupied, capacity: building.capacity, value: building.capacity ? Math.round(building.occupied / building.capacity * 100) : 0 }))
  const pendingRepairs = db.repairs.filter((item) => item.status !== '已完成')
  ok(res, {
    metrics: { occupied, capacity, availableBeds: capacity - occupied, occupancy: capacity ? Math.round(occupied / capacity * 100) : 0, buildings: db.buildings.length, rooms: db.rooms.length, pendingRepairs: pendingRepairs.length, urgentRepairs: pendingRepairs.filter((item) => item.priority === '紧急').length, pendingTransfers: db.transfers.filter((item) => item.status === '审核中').length, pendingLateReturns: db.lateReturns.filter((item) => item.status === '待确认').length, unassignedStudents: db.students.filter((item) => item.status === '未入住').length },
    buildingRates, latestRepairs: db.repairs.slice(0, 3), latestNotices: db.notices.slice(0, 3)
  })
})

app.patch('/api/admin/transfers/:id/reject', auth, adminOnly, requireFields(['remark']), async (req, res) => {
  const db = await readDb()
  const transfer = db.transfers.find((item) => item.id === Number(req.params.id))
  if (!transfer) return res.status(404).json({ code: 404, message: '调宿申请不存在', data: null })
  if (transfer.status !== '审核中') return res.status(409).json({ code: 409, message: '该申请已经处理', data: null })
  Object.assign(transfer, { status: '已驳回', remark: String(req.body.remark).trim(), handledBy: req.user.name, handledAt: new Date().toLocaleString('zh-CN', { hour12: false }) })
  await saveDb(db)
  ok(res, transfer, '申请已驳回')
})

app.patch('/api/admin/transfers/:id/approve', auth, adminOnly, requireFields(['roomId']), async (req, res) => {
  const db = await readDb()
  const transfer = db.transfers.find((item) => item.id === Number(req.params.id))
  if (!transfer) return res.status(404).json({ code: 404, message: '调宿申请不存在', data: null })
  if (transfer.status !== '审核中') return res.status(409).json({ code: 409, message: '该申请已经处理', data: null })
  const student = db.students.find((item) => item.id === transfer.studentId)
  const targetRoom = db.rooms.find((item) => item.id === Number(req.body.roomId))
  const oldRoom = db.rooms.find((item) => item.id === student?.roomId)
  if (!student || !targetRoom) return res.status(404).json({ code: 404, message: '学生或目标房间不存在', data: null })
  if (targetRoom.id === oldRoom?.id) return res.status(409).json({ code: 409, message: '目标房间不能与当前房间相同', data: null })
  if (targetRoom.gender !== student.gender) return res.status(409).json({ code: 409, message: '目标房间与学生性别不匹配', data: null })
  if (targetRoom.status === '维修中' || targetRoom.occupied >= targetRoom.capacity) return res.status(409).json({ code: 409, message: '目标房间当前没有可用床位', data: null })
  const occupiedBeds = new Set(db.students.filter((item) => item.roomId === targetRoom.id).map((item) => Number.parseInt(item.bedNo)))
  const bedNo = Array.from({ length: targetRoom.capacity }, (_, index) => index + 1).find((bed) => !occupiedBeds.has(bed))
  if (oldRoom) {
    oldRoom.occupied = Math.max(0, oldRoom.occupied - 1)
    if (oldRoom.status !== '维修中') oldRoom.status = oldRoom.occupied === 0 ? '空闲' : oldRoom.occupied >= oldRoom.capacity ? '已住满' : '未住满'
  }
  targetRoom.occupied += 1
  targetRoom.status = targetRoom.occupied >= targetRoom.capacity ? '已住满' : '未住满'
  student.roomId = targetRoom.id
  student.room = `${targetRoom.building} ${targetRoom.roomNo}`
  student.bedNo = `${bedNo}号床`
  Object.assign(transfer, { status: '待搬迁', targetRoom: student.room, targetBed: student.bedNo, remark: String(req.body.remark ?? '').trim(), handledBy: req.user.name, handledAt: new Date().toLocaleString('zh-CN', { hour12: false }) })
  await saveDb(db)
  ok(res, transfer, '调宿已批准，等待学生确认搬迁')
})

app.get('/api/admin/notices', auth, adminOnly, async (_req, res) => {
  const notices = (await readDb()).notices
    .map((item) => ({ ...item, audience: item.audience ?? '全体学生', publisher: item.publisher ?? '宿舍管理中心', readCount: item.readBy?.length ?? (item.read ? 1 : 0) }))
    .sort((a, b) => b.id - a.id)
  ok(res, notices)
})

app.post('/api/admin/notices', auth, adminOnly, requireFields(['title', 'summary', 'category', 'audience']), async (req, res) => {
  const allowedCategories = ['安全通知', '生活服务', '校园活动']
  if (!allowedCategories.includes(req.body.category)) return res.status(400).json({ code: 400, message: '无效的通知分类', data: null })
  const db = await readDb()
  const allowedAudiences = ['全体学生', '男生宿舍', '女生宿舍', ...db.buildings.map((item) => item.name.replaceAll(' ', ''))]
  if (!allowedAudiences.includes(req.body.audience)) return res.status(400).json({ code: 400, message: '无效的通知对象', data: null })
  const notice = {
    id: Date.now(), title: String(req.body.title).trim(), summary: String(req.body.summary).trim(),
    category: req.body.category, audience: req.body.audience, important: Boolean(req.body.important),
    publishedAt: new Date().toISOString().slice(0, 10), publisher: req.user.name, readBy: []
  }
  db.notices.unshift(notice)
  await saveDb(db)
  ok(res.status(201), { ...notice, readCount: 0 }, '通知发布成功')
})

app.delete('/api/admin/notices/:id', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const index = db.notices.findIndex((item) => item.id === Number(req.params.id))
  if (index < 0) return res.status(404).json({ code: 404, message: '通知不存在', data: null })
  db.notices.splice(index, 1)
  await saveDb(db)
  ok(res, null, '通知已删除')
})

app.get('/api/buildings', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const keyword = String(req.query.keyword ?? '').trim()
  const campus = String(req.query.campus ?? '')
  const list = db.buildings.filter((item) => (!keyword || `${item.name}${item.manager}`.includes(keyword)) && (!campus || item.campus === campus))
  ok(res, list)
})

app.post('/api/buildings', auth, adminOnly, requireFields(['name', 'campus', 'gender', 'manager']), async (req, res) => {
  const db = await readDb()
  if (db.buildings.some((item) => item.name === req.body.name)) return res.status(409).json({ code: 409, message: '楼栋名称已存在', data: null })
  const item = { ...req.body, id: Date.now(), occupied: 0 }
  db.buildings.unshift(item)
  await saveDb(db)
  ok(res.status(201), item, '楼栋创建成功')
})

app.put('/api/buildings/:id', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const item = db.buildings.find((row) => row.id === Number(req.params.id))
  if (!item) return res.status(404).json({ code: 404, message: '楼栋不存在', data: null })
  Object.assign(item, req.body, { id: item.id, occupied: item.occupied })
  await saveDb(db)
  ok(res, item, '楼栋信息已更新')
})

app.delete('/api/buildings/:id', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const index = db.buildings.findIndex((row) => row.id === Number(req.params.id))
  if (index < 0) return res.status(404).json({ code: 404, message: '楼栋不存在', data: null })
  if (db.buildings[index].occupied > 0) return res.status(409).json({ code: 409, message: '楼栋仍有入住学生，不能删除', data: null })
  db.buildings.splice(index, 1)
  await saveDb(db)
  ok(res, null, '楼栋已删除')
})

app.get('/api/students', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const keyword = String(req.query.keyword ?? '').trim().toLowerCase()
  const status = String(req.query.status ?? '')
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 20))
  const filtered = db.students.filter((student) => {
    const matchesKeyword = !keyword || `${student.name}${student.studentNo}${student.college}${student.major}${student.room}`.toLowerCase().includes(keyword)
    return matchesKeyword && (!status || student.status === status)
  })
  const start = (page - 1) * pageSize
  ok(res, { list: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize })
})

app.get('/api/admin/students/:id', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === Number(req.params.id))
  if (!student) return res.status(404).json({ code: 404, message: '学生不存在', data: null })
  const room = db.rooms.find((item) => item.id === student.roomId) ?? null
  const building = db.buildings.find((item) => item.id === room?.buildingId) ?? null
  ok(res, {
    student, room, building,
    repairs: db.repairs.filter((item) => item.student === student.name),
    lateReturns: db.lateReturns.filter((item) => item.studentId === student.id),
    transfers: db.transfers.filter((item) => item.studentId === student.id),
    rechargeRecords: (db.utilityRecharges ?? []).filter((item) => item.studentId === student.id),
    utilityBalance: db.utilityAccounts?.[student.id]?.balance ?? (student.id === 1 ? 36.5 : 0)
  })
})

app.get('/api/admin/rooms', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const buildingId = Number(req.query.buildingId) || 0
  const floor = Number(req.query.floor) || 0
  const status = String(req.query.status ?? '')
  const keyword = String(req.query.keyword ?? '').trim()
  const list = db.rooms
    .filter((room) => (!buildingId || room.buildingId === buildingId) && (!floor || room.floor === floor) && (!status || room.status === status) && (!keyword || room.roomNo.includes(keyword)))
    .map((room) => ({ ...room, availableBeds: room.capacity - room.occupied }))
  ok(res, list)
})

app.get('/api/admin/rooms/:id/students', auth, adminOnly, async (req, res) => {
  const db = await readDb()
  const room = db.rooms.find((item) => item.id === Number(req.params.id))
  if (!room) return res.status(404).json({ code: 404, message: '房间不存在', data: null })
  const building = db.buildings.find((item) => item.id === room.buildingId)
  const students = db.students
    .filter((item) => item.roomId === room.id)
    .sort((a, b) => Number.parseInt(a.bedNo) - Number.parseInt(b.bedNo))
  ok(res, { room, building, students })
})

app.get('/api/rooms/available', auth, adminOnly, async (req, res) => {
  const gender = String(req.query.gender ?? '')
  const db = await readDb()
  ok(res, db.rooms.filter((room) => room.gender === gender && room.occupied < room.capacity && room.status !== '维修中'))
})

app.post('/api/check-ins', auth, adminOnly, requireFields(['studentId', 'roomId']), async (req, res) => {
  const db = await readDb()
  const student = db.students.find((item) => item.id === Number(req.body.studentId))
  const room = db.rooms.find((item) => item.id === Number(req.body.roomId))
  if (!student) return res.status(404).json({ code: 404, message: '学生不存在', data: null })
  if (!room) return res.status(404).json({ code: 404, message: '房间不存在', data: null })
  if (student.status === '已入住') return res.status(409).json({ code: 409, message: '该学生已经入住，不能重复分配', data: null })
  if (student.gender !== room.gender) return res.status(409).json({ code: 409, message: '学生性别与宿舍类型不匹配', data: null })
  if (room.occupied >= room.capacity) return res.status(409).json({ code: 409, message: '床位刚刚被占用，请重新选择', data: null })
  const occupiedBeds = new Set(db.students.filter((item) => item.roomId === room.id).map((item) => Number.parseInt(item.bedNo)))
  const bedNo = Array.from({ length: room.capacity }, (_, index) => index + 1).find((bed) => !occupiedBeds.has(bed))
  student.room = `${room.building} ${room.roomNo}`
  student.roomId = room.id
  student.bedNo = `${bedNo}号床`
  student.status = '已入住'
  room.occupied += 1
  room.status = room.occupied >= room.capacity ? '已住满' : '未住满'
  db.checkInLogs.unshift({ id: Date.now(), studentId: student.id, roomId: room.id, operator: req.user.name, createdAt: new Date().toISOString() })
  await saveDb(db)
  ok(res, student, '宿舍分配成功')
})

app.get('/api/repairs', auth, adminOnly, async (_req, res) => ok(res, (await readDb()).repairs))
app.patch('/api/repairs/:id/status', auth, adminOnly, requireFields(['status']), async (req, res) => {
  const allowed = ['待受理', '已受理', '维修中', '已完成']
  if (!allowed.includes(req.body.status)) return res.status(400).json({ code: 400, message: '无效的工单状态', data: null })
  const db = await readDb()
  const repair = db.repairs.find((item) => item.id === Number(req.params.id))
  if (!repair) return res.status(404).json({ code: 404, message: '报修工单不存在', data: null })
  repair.status = req.body.status
  await saveDb(db)
  ok(res, repair, '工单状态已更新')
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
})

app.listen(port, '127.0.0.1', () => console.log(`API ready at http://127.0.0.1:${port}`))

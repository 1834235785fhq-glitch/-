import type { Building, Repair, Student } from '@/types'

export const buildings: Building[] = [
  { id: 1, name: '松园 1 号楼', campus: '东校区', gender: '男生', floors: 6, rooms: 120, occupied: 624, capacity: 720, manager: '王建国', phone: '138 0000 1201', status: '正常使用' },
  { id: 2, name: '松园 2 号楼', campus: '东校区', gender: '男生', floors: 6, rooms: 108, occupied: 596, capacity: 648, manager: '周海燕', phone: '138 0000 1202', status: '正常使用' },
  { id: 3, name: '兰园 1 号楼', campus: '东校区', gender: '女生', floors: 8, rooms: 144, occupied: 812, capacity: 864, manager: '李秀兰', phone: '138 0000 1301', status: '正常使用' },
  { id: 4, name: '兰园 2 号楼', campus: '西校区', gender: '女生', floors: 6, rooms: 96, occupied: 532, capacity: 576, manager: '赵敏', phone: '138 0000 1302', status: '维护中' },
  { id: 5, name: '竹园 1 号楼', campus: '西校区', gender: '男生', floors: 7, rooms: 126, occupied: 688, capacity: 756, manager: '陈强', phone: '138 0000 1401', status: '正常使用' },
]

export const students: Student[] = [
  { id: 1, studentNo: '2024010312', name: '陈一凡', gender: '男', college: '计算机学院', major: '软件工程', grade: '2024级', room: '松园1号楼 302', roomId: 5, bedNo: '3号床', phone: '187****4831', status: '已入住' },
  { id: 2, studentNo: '2024020826', name: '林晓雨', gender: '女', college: '设计学院', major: '数字媒体艺术', grade: '2024级', room: '兰园1号楼 506', roomId: 45, bedNo: '2号床', phone: '186****7254', status: '已入住' },
  { id: 3, studentNo: '2023010457', name: '吴天宇', gender: '男', college: '计算机学院', major: '网络工程', grade: '2023级', room: '竹园1号楼 407', roomId: 87, bedNo: '1号床', phone: '139****1620', status: '已入住' },
  { id: 4, studentNo: '2024030211', name: '苏雅晴', gender: '女', college: '外国语学院', major: '英语', grade: '2024级', room: '兰园2号楼 215', roomId: 65, bedNo: '4号床', phone: '158****9043', status: '已入住' },
  { id: 5, studentNo: '2022010699', name: '赵子航', gender: '男', college: '自动化学院', major: '人工智能', grade: '2022级', room: '—', roomId: null, bedNo: '—', phone: '177****6138', status: '未入住' },
]

export const repairs: Repair[] = [
  { id: 1, orderNo: 'BX20260910018', title: '空调无法制冷', category: '空调维修', location: '松园1号楼 302', student: '陈一凡', submittedAt: '今天 14:26', priority: '紧急', status: '待受理' },
  { id: 2, orderNo: 'BX20260910017', title: '洗手台水龙头漏水', category: '水电维修', location: '兰园1号楼 506', student: '林晓雨', submittedAt: '今天 11:08', priority: '普通', status: '已受理' },
  { id: 3, orderNo: 'BX20260909042', title: '房门门锁损坏', category: '门窗维修', location: '竹园1号楼 407', student: '吴天宇', submittedAt: '昨天 19:42', priority: '紧急', status: '维修中' },
  { id: 4, orderNo: 'BX20260909031', title: '阳台灯不亮', category: '水电维修', location: '兰园2号楼 215', student: '苏雅晴', submittedAt: '昨天 15:17', priority: '普通', status: '已完成' },
]

export type BuildingStatus = '正常使用' | '维护中'
export type RoomStatus = '空闲' | '未住满' | '已住满' | '维修中'
export type RepairStatus = '待受理' | '已受理' | '维修中' | '已完成'

export interface Building {
  id: number
  name: string
  campus: string
  gender: '男生' | '女生'
  floors: number
  rooms: number
  occupied: number
  capacity: number
  manager: string
  phone: string
  status: BuildingStatus
}

export interface Student {
  id: number
  studentNo: string
  name: string
  gender: '男' | '女'
  college: string
  major: string
  grade: string
  room: string
  roomId: number | null
  bedNo: string
  phone: string
  status: '已入住' | '未入住'
}

export interface Room {
  id: number
  buildingId: number
  building: string
  roomNo: string
  floor: number
  gender: '男' | '女'
  capacity: number
  occupied: number
  availableBeds: number
  status: RoomStatus
}

export interface Repair {
  id: number
  orderNo: string
  title: string
  category: string
  location: string
  student: string
  submittedAt: string
  priority: '普通' | '紧急'
  status: RepairStatus
}

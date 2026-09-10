import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(root, 'db.json')
const db = JSON.parse(await readFile(dbPath, 'utf8'))

const surnames = ['陈','林','吴','苏','赵','周','李','王','张','刘','黄','徐','孙','胡','朱','高','何','郭','马','罗','梁','宋','郑','谢','韩','唐','冯','于','董','萧']
const givenNames = ['一凡','晓雨','天宇','雅晴','子航','嘉怡','浩然','思远','欣悦','明轩','诗涵','俊杰','若曦','博文','雨桐','晨曦','宇辰','梓萱','泽宇','佳宁','启航','可欣','景程','梦瑶','睿哲','语彤','致远','依诺','嘉豪','静怡']
const colleges = [
  ['计算机学院','软件工程'],['计算机学院','网络工程'],['自动化学院','人工智能'],['电子信息学院','通信工程'],
  ['机械学院','机械设计制造'],['经济管理学院','工商管理'],['外国语学院','英语'],['设计学院','数字媒体艺术']
]

const rooms = []
for (const building of db.buildings) {
  const gender = building.gender === '男生' ? '男' : '女'
  for (let floor = 1; floor <= 5; floor += 1) {
    for (let index = 1; index <= 4; index += 1) {
      const roomNo = `${floor}0${index}`
      const id = rooms.length + 1
      const isRepairing = id % 29 === 0
      const isEmpty = !isRepairing && id % 17 === 0
      const occupied = isRepairing || isEmpty ? 0 : 4 + ((id * 7) % 3)
      const status = isRepairing ? '维修中' : isEmpty ? '空闲' : occupied === 6 ? '已住满' : '未住满'
      rooms.push({ id, buildingId: building.id, building: building.name.replaceAll(' ', ''), roomNo, floor, gender, capacity: 6, occupied, status })
    }
  }
}

const students = []
let nextId = 2
for (const room of rooms) {
  for (let bed = 1; bed <= room.occupied; bed += 1) {
    const isDemoStudent = room.buildingId === 1 && room.roomNo === '302' && bed === 3
    const id = isDemoStudent ? 1 : nextId++
    const nameIndex = id * 11 + bed * 3
    const [college, major] = colleges[id % colleges.length]
    students.push({
      id,
      studentNo: isDemoStudent ? '2024010312' : `${2022 + (id % 4)}${String(id % 20 + 1).padStart(2, '0')}${String(id).padStart(4, '0')}`,
      name: isDemoStudent ? '陈一凡' : `${surnames[nameIndex % surnames.length]}${givenNames[(nameIndex * 3) % givenNames.length]}`,
      gender: room.gender,
      college: isDemoStudent ? '计算机学院' : college,
      major: isDemoStudent ? '软件工程' : major,
      grade: isDemoStudent ? '2024级' : `${2022 + (id % 4)}级`,
      room: `${room.building} ${room.roomNo}`,
      roomId: room.id,
      bedNo: `${bed}号床`,
      phone: `1${[3,5,7,8,9][id % 5]}${String(100000000 + id * 7919).slice(-9)}`,
      status: '已入住'
    })
  }
}

for (let count = 0; count < 18; count += 1) {
  const id = nextId++
  const [college, major] = colleges[id % colleges.length]
  students.push({ id, studentNo: `${2026}${String(id % 20 + 1).padStart(2, '0')}${String(id).padStart(4, '0')}`, name: `${surnames[id % surnames.length]}${givenNames[(id * 5) % givenNames.length]}`, gender: id % 2 ? '男' : '女', college, major, grade: '2026级', room: '—', roomId: null, bedNo: '—', phone: `1${[3,5,7,8,9][id % 5]}${String(100000000 + id * 7919).slice(-9)}`, status: '未入住' })
}

for (const building of db.buildings) {
  const buildingRooms = rooms.filter((room) => room.buildingId === building.id)
  building.rooms = buildingRooms.length
  building.capacity = buildingRooms.reduce((sum, room) => sum + room.capacity, 0)
  building.occupied = buildingRooms.reduce((sum, room) => sum + room.occupied, 0)
}

db.rooms = rooms
db.students = students.sort((a, b) => a.id - b.id)
await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8')
console.log(`Seed complete: ${students.length} students, ${rooms.length} rooms, ${db.buildings.length} buildings`)

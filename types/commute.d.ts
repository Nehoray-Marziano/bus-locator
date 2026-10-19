interface CommuteTrip {
  id: string
  from: string
  to: string
  stopCode: string
  stopName: string
  routeDesc: string
  startMinute: number
  endMinute: number
}
interface CommuteConfig {
  error?: string
  demo?: boolean
  trips?: CommuteTrip[]
}

interface CommuteTrip {
  id: string
  from: string
  to: string
  stopCode: string
  stopName: string
  routeDesc: string
  routeId: number
  stopId: number
  endStopId: number
  startMinute: number
  endMinute: number
  dayOffset?: number
  serviceDate?: string
}
interface CommuteConfig {
  error?: string
  demo?: boolean
  trips?: CommuteTrip[]
}

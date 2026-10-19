import '@zos/ui'

declare module '@zos/ui' {
  // Documented API_LEVEL 2.0 function omitted from device-types 4.0.0 exports.
  // https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/getAppWidgetSize/
  export function getAppWidgetSize(): {
    w: number
    h: number
    radius: number
    margin: number
  }
}

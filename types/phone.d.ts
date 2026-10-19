// Zepp phone runtime contracts from the official Fetch and Settings UI docs.
declare function fetch(options: {
  url: string
  method: string
  headers?: Record<string, string>
}): Promise<{ status: number; body: any }>
declare function AppSideService(options: object): void
declare function AppSettingsPage(options: { build(props?: any): any }): void
declare function Section(props: object, children: any[]): any
declare function Text(props: { paragraph?: boolean }, content: string): any
declare function TextInput(props: {
  label: string
  settingsKey: string
  placeholder?: string
}): any
declare function Toggle(props: { label: string; settingsKey: string }): any

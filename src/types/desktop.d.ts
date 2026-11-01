export {}

declare global {
  interface SaveFileOptions {
    filename: string
    kind: 'text' | 'png'
    content: string
  }

  interface SaveFileResult {
    saved: boolean
    path?: string
  }

  interface Window {
    galflowDesktop?: {
      isDesktop: true
      platform: string
      electronVersion: string
      saveFile: (options: SaveFileOptions) => Promise<SaveFileResult>
    }
  }
}

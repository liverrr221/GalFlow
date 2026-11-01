export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadText(
  text: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8',
): Promise<SaveFileResult> {
  if (window.galflowDesktop?.saveFile) {
    return window.galflowDesktop.saveFile({
      filename,
      kind: 'text',
      content: text,
    })
  }

  downloadBlob(new Blob([text], { type: mimeType }), filename)
  return { saved: true }
}

export async function downloadDataUrl(
  dataUrl: string,
  filename: string,
): Promise<SaveFileResult> {
  if (window.galflowDesktop?.saveFile) {
    return window.galflowDesktop.saveFile({
      filename,
      kind: 'png',
      content: dataUrl,
    })
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  return { saved: true }
}

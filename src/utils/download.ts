export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    // Defer revocation so browsers that read the blob asynchronously after
    // the click (rather than synchronously) aren't interrupted mid-download.
    setTimeout(() => URL.revokeObjectURL(url), 0)
}

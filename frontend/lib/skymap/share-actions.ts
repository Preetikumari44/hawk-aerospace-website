export async function copyShareLink(url: string) {
  await navigator.clipboard.writeText(url)
}

export function openWhatsAppShare(message: string, url: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\n\n${url}`)}`, "_blank", "noopener,noreferrer")
}

export async function openNativeShare(title: string, message: string, url: string) {
  if (!navigator.share) return
  await navigator.share({ title, text: message, url })
}

export function canNativeShare() {
  return typeof navigator !== "undefined" && !!navigator.share
}

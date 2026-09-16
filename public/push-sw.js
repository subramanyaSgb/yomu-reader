// Push handlers imported into the generated service worker (workbox importScripts).
// Pushes are payload-free tickles: fetch what's new from the worker, then notify.

const YOMU_WORKER = 'https://yomu-image-proxy.subramanya-bellary.workers.dev'

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    try {
      const sub = await self.registration.pushManager.getSubscription()
      if (!sub) return
      const res = await fetch(`${YOMU_WORKER}/push/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      const data = await res.json()
      const items = data.items || []
      if (items.length === 0) return
      if (items.length === 1) {
        await self.registration.showNotification(items[0].title, {
          body: `Chapter ${items[0].number} is out`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'yomu-new-chapter',
        })
      } else {
        await self.registration.showNotification('New chapters', {
          body: items.map((i) => `${i.title} — Ch. ${i.number}`).join('\n'),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'yomu-new-chapter',
        })
      }
    } catch (e) {
      // Chrome requires a notification for a userVisibleOnly push — show a generic one.
      await self.registration.showNotification('Yomu', { body: 'New chapters may be available', icon: '/icon-192.png' })
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (all.length > 0) return all[0].focus()
    return clients.openWindow('/')
  })())
})

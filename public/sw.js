self.addEventListener("push", (event) => {
  let payload = {
    title: "GlucoTrack AI Reminder",
    body: "Hi there, it's time for your pre-meal glucose check.",
    icon: "/glucotracker.png", // Ensure you have an icon here or use a default one
    badge: "/glucotracker.png",
    data: { url: "/upload" } 
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      vibrate: [200, 100, 200, 100, 200]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || "/upload";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window directly into the Capture Reading interface
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

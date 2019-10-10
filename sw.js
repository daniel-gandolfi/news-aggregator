const filesToCache = [
  '*.json'
]

const staticCacheName = 'pages-cache-v1';

self.addEventListener('install', event => {
  console.log('Attempting to install service worker and cache static assets');
  event.waitUntil(
    caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});


self.addEventListener('fetch', event => {
  console.log('Fetch event for ', event.request.url);
  if (event.request.url.indexOf(".json") !== -1) {
    event.respondWith(
      caches.match(event.request).then((resp) => {
        return resp || fetch(event.request).then((response) => {
          let responseClone = response.clone();
          caches.open(staticCacheName).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        });
      }).catch(error => {

        // TODO 6 - Respond with custom offline page
          return fetch(event.request).then((response)=>{
            cache.put(event.request, response.clone());
            return res;
        })

      })
    );
  } else {
    event.respondWith(
      fetch(event.request)
    )
  }
});

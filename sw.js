const assetsRelativeUrl = [
  'styles/app.css',
  
  'third_party/handlebars-v3.0.0.js',
  'third_party/handlebars-intl.min.js',
  
  'scripts/data.js',
  'scripts/featureDetection.js',
  'scripts/namespace.js',
  'scripts/StoryDetails.js',
  'scripts/app.js',

  "https://fonts.googleapis.com/css?family=Roboto:400,500,700",

  "images/ic_close_24px.svg",
  "images/loader.png",

  "index.html"
]

const hackerNewsJsonCacheName = 'hacker-news';
const assetsCacheName = "assets";

self.oninstall= event => {
  console.log('Attempting to install service worker and cache static assets');
  caches.open(assetsCacheName).then(assetsCache => {
    return assetsCache.addAll(assetsRelativeUrl);
  });
  event.waitUntil(
    self.skipWaiting()
  );
};
self.onactivate= function(event){
  event.waitUntil(
    self.clients.claim()
  );
};
const hackerNewsJsonFetchListener = function (event) {
  if (event.request.url.indexOf("hacker-news") !== -1) {
    if (!navigator.onLine) {
      event.respondWith(
        caches.match(event.request)
      )
    } else {
      event.respondWith(
        fetch(event.request).then((response) => {
          let responseClone = response.clone();
          caches.open(hackerNewsJsonCacheName).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        }).catch(error => {
          if (caches.has(event.request)) {
            return caches.match(event.request);
          } else {
            throw error;
          }
        })
      );
    }
    return true;
  } else {
    return false;
  }
}

const isStaticAsset = function(request) {
  const url = request.url;
  const destinationsToCache = [
    "document",
    "style",
    "script",
    "image"
  ];
  const regex = /\.(?:png|jpg|jpeg|gif|icon|svg|js|css)$/
  return destinationsToCache.indexOf(request.destination) !== -1 
    || regex.test(url);
};
const assetsCacheListeners = function (event) {
  if (isStaticAsset(event.request)) {
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse){
        if (cachedResponse) {
          if (navigator.onLine) {
            fetch(event.request).then(function(response){
              caches.open(assetsCacheName).then(function(assetsCache) {
                assetsCache.put(event.request, response.clone());
              });
              return response;
            });
          }
          return cachedResponse;
        } else {
          return fetch(event.request).then(function(response){
            caches.open(assetsCacheName).then(function(assetsCache) {
              assetsCache.put(event.request, response);
            });
            return response.clone();
          });
        }
      },function(){
        return fetch(event.request).then(function(response){
          caches.open(assetsCacheName).then(function(assetsCache) {
            assetsCache.put(event.request, response);
          });
          return response.clone();
        });
      })
    );
    return true;
  } else {
    return false;
  }
}
const fetchListeners = [
  hackerNewsJsonFetchListener,
  assetsCacheListeners,

  function (event) {
    event.respondWith(
      fetch(event.request)
    )
    return true;
  }
]

self.addEventListener('fetch', event => {
  console.log('Fetch event for ', event.request.url);
  const fetchListenerIterator = fetchListeners[Symbol.iterator]();

  var listener;
  while ((listener=fetchListenerIterator.next()) != null && listener.value(event) !== true);
});

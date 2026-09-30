import { Platform } from 'react-native';

function getWebGeolocation() {
  const captured = typeof window !== 'undefined' ? window.__realGeolocation : null;
  return captured ||
    (typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : null) ||
    (typeof window !== 'undefined' && window.navigator && window.navigator.geolocation ? window.navigator.geolocation : null);
}

function getGeolocationFromIframe() {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const geo = iframe.contentWindow.navigator.geolocation;
      document.body.removeChild(iframe);
      if (geo) resolve(geo);
      else reject(new Error('Geolocation null even from iframe'));
    } catch (e) {
      reject(e);
    }
  });
}

function getNativeGeolocation() {
  try {
    return require('@react-native-community/geolocation').default;
  } catch (e) {
    return null;
  }
}

function getPositionWithOptions(geo, options) {
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(resolve, reject, options);
  });
}

let cachedGeo = null;

export function getBrowserGeolocation() {
  if (cachedGeo) return Promise.resolve(cachedGeo);

  const isNative = Platform.OS !== 'web';

  if (isNative) {
    const geo = getNativeGeolocation();
    if (geo) {
      cachedGeo = geo;
      return Promise.resolve(geo);
    }
    return Promise.reject(new Error('Geolocation not available on native'));
  }

  const direct = getWebGeolocation();
  if (direct) {
    cachedGeo = direct;
    return Promise.resolve(direct);
  }

  if (typeof document !== 'undefined' && document.createElement) {
    return getGeolocationFromIframe().then((geo) => {
      cachedGeo = geo;
      return geo;
    });
  }

  return Promise.reject(new Error('Geolocation not available'));
}

export function getCurrentPosition(options) {
  return getBrowserGeolocation().then((geo) => {
    return getPositionWithOptions(geo, options);
  });
}

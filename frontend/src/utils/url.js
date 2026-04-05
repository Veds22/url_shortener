const APP_BASE_URL = import.meta.env.APP_BASE_URL;

export function shortUrl(code) {
  return `${APP_BASE_URL}/${code}`;
}
export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL;

export function shortUrl(code) {
  return `${APP_BASE_URL}/${code}`;
}
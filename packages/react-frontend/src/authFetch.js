export function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}

export function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const sessionToken =
    typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem("userAuthToken");

  if (sessionToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}

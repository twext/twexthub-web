// Internal routes are the same strings onNavigate takes ("home", "search",
// "ext/ns/id", "search?q=foo"); only "home" maps differently, to "/".

export function routeToPath(route: string): string {
  if (!route || route === 'home') return '/';
  return route.startsWith('/') ? route : `/${route}`;
}

export function getRouteFromLocation(): string {
  const route = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!route) return 'home';
  return `${route}${window.location.search}`;
}

export function navigateToRoute(route: string): void {
  const path = routeToPath(route);
  if (`${window.location.pathname}${window.location.search}` === path) return;
  window.history.pushState(null, '', path);
}

// Links shared while routing was hash-based pointed at #/ext/...; turn those
// into paths so old bookmarks keep working.
export function migrateLegacyHash(): void {
  if (!window.location.hash) return;
  const route = window.location.hash.replace(/^#/, '').replace(/^\//, '');
  window.history.replaceState(null, '', routeToPath(route));
}

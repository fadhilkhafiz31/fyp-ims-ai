// src/components/NProgressBar.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Optional: tweak speed/disable spinner
NProgress.configure({ showSpinner: false, trickleSpeed: 120 });

/**
 * Starts NProgress every time the route (pathname) changes.
 * We'll call NProgress.done() when the page actually mounts (see PageReady).
 */
export function RouteProgress() {
  const { pathname } = useLocation();

  useEffect(() => {
    // start the bar as soon as navigation begins
    NProgress.start();
  }, [pathname]);

  return null;
}

/**
 * When this component mounts, it signals that the page content is ready.
 * Place this inside each route element (so it runs after lazy-loaded page resolves).
 */
export function PageReady() {
  useEffect(() => {
    // stop the bar when the new page has mounted
    NProgress.done();
  }, []);
  return null;
}

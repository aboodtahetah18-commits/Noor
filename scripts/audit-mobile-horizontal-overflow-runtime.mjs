/*
 * Post-deploy runtime contract. Intended for the authenticated evidence runner.
 * For every mobile route and width, assert exactly:
 * document.documentElement.scrollWidth <= window.innerWidth
 * widths: 320, 360, 390, 430, 767
 * This file is deliberately dependency-free so it can be consumed by the local Chromium/CDP evidence harness.
 */
export const MOBILE_AUDIT_WIDTHS = [320, 360, 390, 430, 767];
export const horizontalOverflowAssertion = () =>
  document.documentElement.scrollWidth <= window.innerWidth;

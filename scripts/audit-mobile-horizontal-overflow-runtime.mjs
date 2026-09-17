/*
 * Post-deploy runtime contract. Intended for the authenticated evidence runner.
 * For every mobile route and width, assert exactly:
 * document.documentElement.scrollWidth <= window.innerWidth
 * Baseline locked widths: 320, 360, 390, 430, 767
 * Extended acceptance adds 412px without removing the frozen baseline.
 * This file is deliberately dependency-free so it can be consumed by the local Chromium/CDP evidence harness.
 */
export const BASELINE_MOBILE_AUDIT_WIDTHS = [320, 360, 390, 430, 767];
export const MOBILE_AUDIT_WIDTHS = [320, 360, 390, 412, 430, 767];
export const horizontalOverflowAssertion = () =>
  document.documentElement.scrollWidth <= window.innerWidth;

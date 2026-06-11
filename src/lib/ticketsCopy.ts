/**
 * Single source of truth for the legally-important Tickets copy. Reuse this
 * everywhere Tickets are shown so the "no cash value" statement stays consistent.
 */
export const TICKETS_DISCLAIMER =
  'Tickets are a virtual in-app currency with no real-world monetary value. ' +
  'They cannot be cashed out, withdrawn, sold, transferred, or exchanged for ' +
  'money or prizes.';

/** Short version for tight spaces (e.g. under a balance pill). */
export const TICKETS_DISCLAIMER_SHORT = 'No cash value · cannot be cashed out';

/** Tickets granted per distance milestone (kept in sync with the SQL function). */
export const TICKETS_PER_MILESTONE = 50;
/** Milestone size in meters (~50 miles), kept in sync with the SQL function. */
export const MILESTONE_METERS = 80467;

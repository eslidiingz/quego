/**
 * DOM anchor ids for the guided tour. Each value is what lands in a
 * `data-tour="…"` attribute on a real element; the tour registry references the
 * same constants, so a rename can never drift between the markup and the copy.
 *
 * Deliberately split out from `shop-tours.ts`: ~20 page/component files import
 * an anchor id, and none of them should drag the whole Thai copy registry into
 * their bundle.
 *
 * Ids are lowercase + hyphens only — they go straight into a
 * `[data-tour="…"]` attribute selector, so anything needing escaping is out.
 */
export const TOUR_ANCHORS = {
  // Shell — present on every (authed) page
  shellNav: "shell-nav",
  shellHeaderTools: "shell-header-tools",
  /** The NewBookingDialog trigger — rendered on /shop, /shop/bookings and the
   *  customer detail page; `querySelector` resolves the first in DOM order. */
  newBooking: "new-booking",

  // /shop
  homeGlance: "home-glance",
  homeFilters: "home-filters",
  homeQueueList: "home-queue-list",
  homeChecklist: "home-checklist",

  // /shop/bookings
  bookingsTabs: "bookings-tabs",
  bookingsRow: "bookings-row",
  bookingsRowActions: "bookings-row-actions",

  // /shop/customers
  customersSearch: "customers-search",
  customersSort: "customers-sort",
  customersCard: "customers-card",

  // /shop/customers/[phone]
  customerStats: "customer-stats",
  customerNote: "customer-note",
  customerHistory: "customer-history",

  // /shop/insights
  insightsRange: "insights-range",
  insightsPeriod: "insights-period",
  insightsFilter: "insights-filter",
  insightsRevenue: "insights-revenue",
  insightsProfit: "insights-profit",
  insightsBusy: "insights-busy",

  // /shop/expenses
  expensesAdd: "expenses-add",
  expensesPeriod: "expenses-period",
  expensesTotal: "expenses-total",

  // /shop/share
  shareShopQr: "share-shop-qr",
  shareShopUrl: "share-shop-url",
  shareWalkIn: "share-walk-in",
  shareBookingUrl: "share-booking-url",

  // /shop/services
  servicesAdd: "services-add",
  servicesPresets: "services-presets",
  servicesRow: "services-row",
  servicesRowControls: "services-row-controls",

  // /shop/staff
  staffAdd: "staff-add",
  staffRow: "staff-row",
  staffRowControls: "staff-row-controls",

  // /shop/profile
  profileTabs: "profile-tabs",
  profileImages: "profile-images",
  profileHandle: "profile-handle",
  profileLocation: "profile-location",
  profileCutoff: "profile-cutoff",
  profileHours: "profile-hours",
  profilePin: "profile-pin",

  // /shop/display
  displayHero: "display-hero",
  displayUpcoming: "display-upcoming",
  displayCallNext: "display-call-next",
  displayExit: "display-exit",
} as const;

export type TourAnchorId = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS];

/** Every anchor id, for registry validation in tests. */
export const ALL_TOUR_ANCHORS: readonly TourAnchorId[] =
  Object.values(TOUR_ANCHORS);

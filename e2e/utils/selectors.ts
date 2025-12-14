/**
 * Centralized Selectors for E2E Tests
 *
 * Keeping selectors in one place makes tests more maintainable.
 * When UI changes, update selectors here instead of in every test.
 */

export const SELECTORS = {
  // Common UI Elements
  common: {
    toast: '[data-testid="toast"]',
    toastTitle: '[data-testid="toast-title"]',
    toastDescription: '[data-testid="toast-description"]',
    toastClose: '[data-testid="toast"] button[aria-label="Close"]',
    loadingSpinner: '[data-testid="loading"]',
    pageHeader: '[data-testid="page-header"]',
    skeleton: '.animate-pulse, [data-testid="skeleton"]',
  },

  // Navigation
  navigation: {
    sidebar: '[data-testid="sidebar"]',
    userButton: '[data-testid="user-button"]',
    orgSwitcher: '[data-testid="org-switcher"]',
  },

  // Dialogs
  dialogs: {
    dialog: '[role="dialog"]',
    alertDialog: '[role="alertdialog"]',
    dialogTitle: '[role="dialog"] h2',
    dialogClose: '[role="dialog"] button[aria-label="Close"]',
    alertConfirm: '[role="alertdialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Archive"), [role="alertdialog"] button:has-text("Publish"), [role="alertdialog"] button:has-text("Unpublish"), [role="alertdialog"] button:has-text("Delete")',
    alertCancel: '[role="alertdialog"] button:has-text("Cancel")',
  },

  // Forms
  forms: {
    submitButton: 'button[type="submit"]',
    cancelButton: 'button:has-text("Cancel")',
    saveButton: 'button:has-text("Save"), button:has-text("Create")',
    fieldError: '[data-field-error]',
    requiredIndicator: '[aria-required="true"]',
  },

  // Tables
  tables: {
    table: 'table',
    tableHeader: 'thead',
    tableBody: 'tbody',
    tableRow: 'tbody tr',
    actionsMenuTrigger: 'button[aria-label="Actions menu"]',
    sortButton: 'button:has([data-lucide="arrow-up-down"])',
    emptyState: '[data-testid="empty-state"]',
  },

  // Status Badges
  badges: {
    statusBadge: '[data-testid="status-badge"]',
    draftBadge: '[data-testid="status-badge"]:has-text("Draft")',
    publishedBadge: '[data-testid="status-badge"]:has-text("Published")',
    unpublishedBadge: '[data-testid="status-badge"]:has-text("Unpublished")',
  },

  // Appointment Types Page
  appointmentTypes: {
    addButton: 'button:has-text("Add Appointment Type")',
    searchInput: 'input[placeholder*="Search"]',
    statusFilter: '[data-testid="status-filter"]',
    categoryFilter: '[data-testid="category-filter"]',
    appointmentTypeRow: '[data-testid="appointment-type-row"]',
  },

  // Appointment Type Form/Dialog
  appointmentTypeForm: {
    nameInput: '#name, input[name="name"]',
    descriptionInput: '#description, textarea[name="description"]',
    durationInput: '#duration, input[name="duration"]',
    durationUnitSelect: '[data-testid="duration-unit"]',
    categorySelect: '#category, [data-testid="category-select"]',
    locationModeOnline: '#online, input[value="ONLINE"]',
    locationModeBusinessLocation: '#business-location, input[value="BUSINESS_LOCATION"]',
    locationModeStudentLocation: '#student-location, input[value="STUDENT_LOCATION"]',
    businessLocationSelect: '#businessLocationId, [data-testid="business-location-select"]',
    instructorSelect: '[data-testid="instructor-select"]',
  },

  // Locations Page
  locations: {
    addButton: 'button:has-text("Add Location")',
    showInactiveToggle: '#show-inactive, [data-testid="show-inactive-toggle"]',
    locationRow: '[data-testid="location-row"]',
  },

  // Location Form/Dialog
  locationForm: {
    nameInput: '#name, input[name="name"]',
    addressInput: '#address, input[name="address"]',
    cityInput: '#city, input[name="city"]',
    stateInput: '#state, input[name="state"]',
    zipCodeInput: '#zipCode, input[name="zipCode"]',
    notesInput: '#notes, textarea[name="notes"]',
  },

  // Teaching Page (Instructor View)
  teaching: {
    appointmentTypeCard: '[data-testid="appointment-type-card"]',
    categoryIcon: '[data-testid="category-icon"]',
    statTotal: '[data-testid="stat-total"]',
    statPrivateLessons: '[data-testid="stat-private-lessons"]',
    statAppointments: '[data-testid="stat-appointments"]',
    emptyState: 'text=not qualified for any appointment types',
  },

  // Actions Menu Items
  actions: {
    edit: '[role="menuitem"]:has-text("Edit")',
    publish: '[role="menuitem"]:has-text("Publish")',
    unpublish: '[role="menuitem"]:has-text("Unpublish")',
    archive: '[role="menuitem"]:has-text("Archive")',
    unarchive: '[role="menuitem"]:has-text("Unarchive")',
    delete: '[role="menuitem"]:has-text("Delete")',
    deactivate: '[role="menuitem"]:has-text("Deactivate")',
    activate: '[role="menuitem"]:has-text("Activate")',
  },
} as const;

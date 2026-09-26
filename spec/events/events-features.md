# Activity Catalog And Working Context - Features

## Problem

Administrators need one place to understand the academic activity catalog and select the event
program or activity they will use in attendance, certificates, and reports. Without a working
context selection, those modules cannot establish which records should be displayed.

## Users

- Authenticated administrators and event organizers.

## Desired Outcome

An authorized user can explore event programs and activities, narrow the activity catalog, and
select one event program or activity as the active working context for the current browser
session.

## In Scope

- Show summary totals for event programs, activities, registered attendees, and represented
  organizational units.
- List event programs with their date range (or permanent agenda), organizational unit,
  activity count, and registered-attendee total.
- List activities with their event program, organizational unit, classroom, speakers, date, and
  time.
- Search activities by name, description, speaker, classroom, event program, or organizational
  unit.
- Filter activities by organizational unit, activity type, and event program.
- Combine active filters using AND logic.
- Sort activities by date and start time in ascending or descending order.
- Paginate the activity catalog with nine activities per page.
- Reset pagination when search, filters, or sorting change.
- Clear search, filters, sorting, and pagination in one action.
- Show an explicit empty state when no activity matches.
- Select an event program or an activity as the active working context.
- Make the active selection available to attendance, certificates, and reports.
- Keep the selection in memory for the current browser session only, and clear it on logout.

## Out Of Scope

- Creating, editing, cancelling, or archiving event programs and activities.
- Editing collaborators, permissions, or inherited permissions.
- Sending attendee notifications.
- Registering attendees.
- Persisting the active context in local storage or a backend.
- Defining the final backend API contract.

## Domain Rules

- Every activity belongs to exactly one event program.
- Every event program belongs to exactly one organizational unit.
- Activity types follow the backend contract: `WORKSHOP`, `SEMINAR`, `TALK`, `CONFERENCE`,
  `PANEL`, `COURSE`, `COMPETITION`, `OTHER`.
- Activity statuses follow the backend contract: `DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`,
  `CANCELLED`.
- Default event programs have no dates; additional programs include them.

## User Stories

### Catalog Summary

As an administrator, I want to see the size and reach of the catalog so that I can understand the
current operational workload before opening an activity.

Acceptance criteria:

- The page displays totals for event programs, activities, registered attendees, and
  organizational units.
- Summary values are derived from the same catalog used by the activity listings.

### Find An Activity

As an administrator, I want to search and filter activities so that I can locate one without
scanning the full catalog.

Acceptance criteria:

- Search is case-insensitive and ignores leading and trailing whitespace.
- Search includes the fields listed in the scope.
- Unit, type, and event program filters combine using AND logic.
- Changing any search, filter, or sort control returns the catalog to page one.
- Clearing filters restores the default ascending order and the complete catalog.
- No matching activities produce an informative empty state.

### Browse Results

As an administrator, I want predictable ordering and pagination so that I can move through a
large catalog without losing context.

Acceptance criteria:

- Activities are ordered by date and start time.
- The user can switch between ascending and descending order.
- At most nine activities are shown per page.
- The current page, total pages, result count, and navigation controls are exposed.

### Select A Working Context

As an administrator, I want to select an event program or activity as my working context so that
attendance, certificates, and reports operate on the intended scope.

Acceptance criteria:

- An event program or an activity can be selected from the catalog.
- The selected context is visually identified and announced in the page status region.
- Selecting an event program makes its activities the downstream scope.
- Selecting an activity makes only that activity the downstream scope.
- The selection is shared with attendance, certificates, and reports.
- Reloading the application clears the selection.
- Closing the session clears the selection.

## Quality Requirements

- All controls are keyboard accessible and have programmatic labels.
- Status and empty-state messages are available to assistive technologies.
- Loading, error, and retry states are handled through the data adapter seam.
- The layout works on mobile and desktop viewports.
- Meaningful behavior is covered with Vitest and Testing Library, with tests colocated next to
  the file under test.
- `pnpm run check` passes before the feature is considered implemented.

## Dependencies

- Organizational unit, event program, activity, classroom, speaker, attendance, certificate, and
  report domain data.
- Shared frontend state for the active context.
- Authenticated administrative routes.

## Open Questions

- Attendance, certificates, speakers, and reports wait for their backend OpenAPI contracts.
- Authorization for selecting or viewing a catalog entry must ultimately be enforced by the
  backend.

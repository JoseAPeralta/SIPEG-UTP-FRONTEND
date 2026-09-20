# Event Catalog And Working Selection - Features

## Problem

Administrators need one place to understand the academic event catalog and select the event they
will use in attendance, certificates, and reports. Without a working event selection, those
modules cannot establish which records should be displayed.

## Users

- Authenticated administrators and event organizers.

## Desired Outcome

An authorized user can explore large event series and small events, narrow the small-event
catalog, and select one large or small event as the active working event for the current browser
session.

## In Scope

- Show summary totals for large events, small events, registered attendees, and represented
  faculties.
- List large events with their date range, faculty, child-event count, and registered-attendee
  total.
- List small events with their parent series, faculty, classroom, speakers, date, and time.
- Search small events by name, description, speaker, speaker organization, classroom, faculty, or
  parent series.
- Filter small events by faculty, event type, parent series, or absence of a parent series.
- Combine active filters using AND logic.
- Sort small events by date and start time in ascending or descending order.
- Paginate the small-event catalog with nine events per page.
- Reset pagination when search, filters, or sorting change.
- Clear search, filters, sorting, and pagination in one action.
- Show an explicit empty state when no event matches.
- Select a large or small event as the active working event.
- Make the active selection available to attendance, certificates, and reports.
- Keep the selection in memory for the current browser session only.

## Out Of Scope

- Creating, editing, or deleting events.
- Editing collaborators, permissions, or inherited permissions.
- Sending attendee notifications.
- Registering attendees.
- Persisting the active event in local storage or a backend.
- Defining the final backend API contract.
- Public discovery of available and past events.

## User Stories

### Catalog Summary

As an administrator, I want to see the size and reach of the event catalog so that I can understand
the current operational workload before opening an event.

Acceptance criteria:

- The page displays totals for large events, small events, registered attendees, and faculties.
- Summary values are derived from the same catalog used by the event listings.

### Find A Small Event

As an administrator, I want to search and filter small events so that I can locate an activity
without scanning the full catalog.

Acceptance criteria:

- Search is case-insensitive and ignores leading and trailing whitespace.
- Search includes the fields listed in the scope.
- Faculty, type, and parent-series filters combine using AND logic.
- Changing any search, filter, or sort control returns the catalog to page one.
- Clearing filters restores the default ascending order and the complete catalog.
- No matching events produce an informative empty state.

### Browse Results

As an administrator, I want predictable ordering and pagination so that I can move through a large
catalog without losing context.

Acceptance criteria:

- Events are ordered by date and start time.
- The user can switch between ascending and descending order.
- At most nine small events are shown per page.
- The current page, total pages, result count, and navigation controls are exposed.

### Select A Working Event

As an administrator, I want to select an event as my working context so that attendance,
certificates, and reports operate on the intended event.

Acceptance criteria:

- A large or small event can be selected from the catalog.
- The selected event is visually identified and announced in the page status region.
- Selecting a large event makes its child small events the downstream scope.
- Selecting a small event makes only that event the downstream scope.
- The selection is shared with attendance, certificates, and reports.
- Reloading the application clears the selection.

## Quality Requirements

- All controls are keyboard accessible and have programmatic labels.
- Status and empty-state messages are available to assistive technologies.
- The layout works on mobile and desktop viewports.
- Meaningful behavior is covered with Vitest and Testing Library.
- `pnpm run check` passes before the feature is considered implemented.

## Dependencies

- Event, faculty, classroom, speaker, attendance, certificate, and report domain data.
- Shared frontend state for the active event.
- Authenticated administrative routes.

## Open Questions

- The final loading, error, and retry behavior depends on the future backend API contract.
- Authorization for selecting or viewing an event must ultimately be enforced by the backend.

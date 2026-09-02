# AGENTS.md

## Project Overview

- **Type**: Frontend web application.
- **Scope of this repository**: React frontend only.
- **Backend**: A separate Node.js API will be developed in its own repository/folder.
- **Product goal**: Event management platform for users, events, attendance, certificates, classrooms, speaker registration, reports, and statistics.
- **Frontend entry point**: `src/main.tsx`
- **Main router**: `src/App.tsx`
- **Package manager**: npm

## Current Frontend Stack

- React 19
- TypeScript
- Vite
- Vitest
- Testing Library
- Chakra UI v3
- React Router v7
- Zustand

## Development Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm test
pnpm run test:ui
pnpm run test:coverage
pnpm run preview
```

## Project Structure

```txt
src/
├── components/
│   └── Layout/
├── pages/
├── store/
├── hooks/
├── utils/
├── theme/
├── App.tsx
├── main.tsx
└── setupTests.ts
```

## Import Aliases

```txt
@           -> src/
@components -> src/components/
@pages      -> src/pages/
@store      -> src/store/
@hooks      -> src/hooks/
@utils      -> src/utils/
@theme      -> src/theme/
```

## Frontend Rules

- This repository must stay frontend-only.
- Do not add backend API code to this repo.
- Do not create Node.js controllers, database models, migrations, queues, mailers, or server routes here.
- Backend integration should be isolated in future frontend service/API client files.
- Keep UI components separate from API request logic.
- Use TypeScript for all frontend code.
- Use Chakra UI v3 patterns.
- Use `gap` instead of `spacing` in Chakra stack components.
- Use Zustand only for shared frontend state.
- Prefer local component state when the state is not global.
- Keep route-level views in `src/pages`.
- Keep reusable UI and layout components in `src/components`.
- Keep helpers in `src/utils`.
- Keep custom hooks in `src/hooks`.

## Testing Rules

- Test runner: Vitest.
- Test environment: jsdom.
- Setup file: `src/setupTests.ts`.
- Prefer Testing Library for component behavior tests.
- Add tests for meaningful behavior.
- Run `pnpm test` when adding or modifying tested behavior.
- Run `pnpm run build` before considering large frontend changes complete.

## Backend Boundary

- The backend will be a separate Node.js API project.
- Backend-specific instructions belong in the backend repository/folder.
- This frontend should later consume the backend through a clear API client layer.
- Do not assume the backend framework until it is chosen.
- Do not hardcode backend URLs directly inside components.

## Expected Product Features

## User Management

- Create users.
- Send email notifications.
- Select faculty.
- Select career.
- Modify user data.
- Assign permissions in events.

## Events

- Create large events or event series.
- Large events include name, dates, custom label, and banner.
- Add collaborators and permissions to large events.
- Large event collaborators and permissions should be inherited by child events by default.
- Create small events.
- Small events include name, type, speaker, classroom, date, time, required equipment, and banner.
- Small events can belong to a larger event series.
- Add collaborators and permissions to small events.
- If a small event belongs to a large event, show users who already have inherited permissions.
- Delete large events.
- Deleting a large event deletes all associated small events.
- Ask whether registered attendees should be notified before deleting large events.
- Delete small events.
- Ask whether registered attendees should be notified before deleting small events.
- Modify events.
- Ask whether registered attendees should be notified before modifying events.
- Show an event list view.
- Show available and past events.
- Allow filtering by faculty.
- Prioritize events related to the selected faculty.

## Attendance

- Register attendance for a specific event.
- Support QR code attendance.
- Support manual attendance codes.

## Certificates

- Generate attendance certificates automatically.
- Generate certificates from the attendance list.

## Classroom Inventory

- Manage available classrooms.
- Classroom types include laboratory and classroom.
- Store available hours.
- Store available days.
- Store maximum capacity.
- Store amenities such as projector, desks, tables, smart board, and whiteboard.

## Speaker Registration

- Provide a speaker registration form.
- Capture first name and last name.
- Capture email.
- Capture CV.
- Capture approximate duration.
- Capture talk type such as workshop, seminar, or similar.
- Capture proposal title and content.
- Capture submission date.
- Optionally forward the form to a specific email.
- Specify the event the speaker is applying to.

## Reports And Statistics

- Show attendance numbers.
- Export reports to Excel.
- Export reports to PDF.

## Agent Guidelines

- Inspect existing files before editing.
- Preserve existing user changes.
- Make the smallest correct change.
- Keep frontend and backend concerns separated.
- Do not add libraries unless there is a concrete reason.
- Prefer clear domain naming for users, faculties, careers, permissions, events, attendance, classrooms, speakers, certificates, and reports.
- When implementing frontend features, consider future integration with the separate Node.js API.

## Local Harness Safety

- Harness agents must work only in a workspace created by `scripts/prepare-agent-workspace.sh`.
- Run local agent commands through `scripts/run-agent-sandbox.sh`.
- Do not provide agents with GitHub connectors, tokens, SSH credentials, MCP servers, credential helpers, or remote repository tools.
- Harness agents must not access GitHub or any other Git remote under any circumstances.
- Harness agents must not run Git commands or create commits.
- A trusted local operator may create a local commit only after an explicit user request.
- A request to create a local commit never authorizes a push or any other remote operation.

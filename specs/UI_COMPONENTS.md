# UI Components Specification

## Purpose

The UI should provide a practical, fast training dashboard for repeated use. Components should remain reusable, accessible, and thin over domain logic.

Relevant folders:

```text
components/ui/
components/dashboard/
app/
```

## Design Principles

- Keep screens dense but readable.
- Prefer predictable app controls over marketing-style sections.
- Use stable dimensions for repeated elements such as cards, tabs, timers, and charts.
- Keep business logic in `features/`, not in components.
- Use icons for clear commands when appropriate.
- Use text labels where commands could be ambiguous.
- Avoid nested cards.
- Make mobile layouts first-class.

## UI Primitive Layer

Folder:

```text
components/ui/
```

Current primitives:

- `Badge`
- `Button`
- `Card`
- `Input`
- `Label`
- `Progress`
- `Select`
- `Switch`
- `Tabs`
- `Textarea`

Expected behavior:

- Primitives should be styling and accessibility wrappers only.
- Primitives should not know about training plans, exercises, auth, or storage.
- Props should use native element props where possible.
- Variants should remain small and consistent.

## Dashboard Layer

Folder:

```text
components/dashboard/
```

Current dashboard components:

- `FitnessDashboard`
- `MetricCard`
- `TrendChart`
- `ExercisePlayerPanel`
- `BodyMeasurementForm`
- `PlanImporter`
- `PlanGenerator`
- `ExerciseCatalogManager`
- `NotificationPanel`

## Component Contracts

### `FitnessDashboard`

Responsibilities:

- Compose plan, player, tracking, import, and notification views.
- Hold temporary demo state until persistence is connected.
- Trigger JSON export download.

Should not:

- Validate import schemas directly.
- Implement countdown transitions.
- Calculate statistics inline.

### `ExercisePlayerPanel`

Responsibilities:

- Render current exercise media, phase, countdown, progress, and controls.
- Delegate transitions to `player-state-machine`.
- Link to external video URL.

Expected states:

- No exercises loaded.
- Preview.
- Work.
- Rest.
- Complete.

### `PlanImporter`

Responsibilities:

- Accept uploaded JSON files.
- Accept pasted JSON.
- Call import parser.
- Report validation errors.
- Return valid `Plan` objects through callback.

Should not:

- Write directly to Supabase.
- Trust unparsed JSON.

### `PlanGenerator`

Responsibilities:

- Show whether optional OpenAI generation is configured.
- Send the current exercise catalog to the server so generated plans can reference existing IDs.
- Call the server-side OpenAI route.
- Validate returned JSON locally before importing the plan.

Should not:

- Expose `OPENAI_API_KEY` to the browser.
- Import invalid generated JSON.

### `ExerciseCatalogManager`

Responsibilities:

- Show the active exercise catalog count.
- Accept uploaded or pasted catalog JSON.
- Add single exercises manually.
- Extend the catalog through OpenAI when configured.
- Persist merged catalog items in IndexedDB.

Should not:

- Require OpenAI for manual catalog editing.
- Allow generated catalog JSON to bypass validation.

### `NotificationPanel`

Responsibilities:

- Show notification permission state.
- Toggle rules.
- Calculate scheduled reminder count.
- Request browser permission on user action.

Should not:

- Request permission automatically on page load.

### `BodyMeasurementForm`

Responsibilities:

- Capture weekly measurement fields.
- Calculate BMI when weight and height are available.
- Return a typed `BodyMeasurement`.
- Show that body tracking is optional.
- Show whether the current week is still open or already recorded.
- Never block training workflows when body values are missing.

Future fields:

- waist
- hip
- chest
- arm
- thigh
- VO2max

### `TrendChart`

Responsibilities:

- Render compact trend lines from `TrendPoint[]`.
- Handle missing or insufficient data.
- Avoid layout shifts.

## Accessibility Requirements

- All interactive controls must be keyboard reachable.
- Icon buttons need visible text or accessible labels.
- Inputs need labels.
- Tabs must communicate selected state.
- Progress indicators should have contextual text nearby.
- Color must not be the only way to communicate status.

## Responsive Requirements

Desktop:

- Dashboard metrics in a four-column grid.
- Main schedule and status panels side by side.
- Charts and forms can be two-column.

Mobile:

- Single-column layout.
- Tabs should remain horizontally scrollable if needed.
- Timer and player controls must fit without text clipping.
- Cards should use compact padding.

## Loading and Error States

Required states for future persistence integration:

- Loading local IndexedDB data.
- Empty plan state.
- Invalid JSON import.
- Supabase sync failed.
- Offline mode active.
- OpenAI key missing.
- Notification permission denied.

## Visual QA Checklist

- No text overlap at mobile widths.
- No cards nested inside cards.
- Buttons keep readable labels.
- Charts remain within container width.
- Player image does not distort the layout.
- Tabs remain usable on small screens.
- PWA install metadata is available.

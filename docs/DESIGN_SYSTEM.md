# Design system

Goal: a premium hospitality technology brand — calm, warm, trustworthy. Not a dating app, not a coupon site.

## Tokens (`src/app/globals.css`)

| Token                        | Light                    | Dark                     | Use                              |
| ---------------------------- | ------------------------ | ------------------------ | -------------------------------- |
| `background` / `foreground`  | warm off-white / espresso| near-black / warm white  | Page                             |
| `card`                       | white                    | raised dark              | Surfaces                         |
| `primary`                    | espresso                 | warm white               | Primary buttons, logo mark       |
| `brand`                      | amber `oklch(.58 .13 65)`| amber `oklch(.76 .13 70)`| Single restrained accent, focus  |
| `accent`                     | pale amber               | dark amber               | Hover, selected nav, brand badges|
| `muted-foreground`           | ≥4.5:1 on background     | ≥4.5:1 on background     | Secondary text                   |
| `success` / `destructive`    | green / red              | lighter variants         | Status                           |
| `--radius`                   | 0.625rem                 |                          | Rounded but professional         |

Typography: Geist Sans (self-hosted via the `geist` package), Geist Mono. No gradients, no decorative imagery,
motion limited to color transitions and a skeleton pulse; `prefers-reduced-motion` disables animation.

## Components (`src/components/ui`)

shadcn/ui-style source we own: `Button` (default, brand, outline, secondary, ghost, destructive, link), `Input`,
`Textarea`, `NativeSelect`, `Label`, `Switch`, `Card` (with configurable heading level), `Badge`, `Alert`
(incl. dashed `placeholder` variant), `Separator`, `Skeleton`, `Field` (label + hint + error with aria wiring).

Layout components (`src/components/layout`): `SidebarNav` (desktop), `BottomNav` (mobile, safe-area aware),
`RoleSwitcher` (mobile, multi-role users), `PageHeader`, `EmptyState`, `DevPlaceholder` ("Not built yet" label),
`ThemeToggle`, `Logo` (reads brand name from config).

Form components: `SubmitButton` (pending state), `ActionButton` (runs a Server Action with inline error and optional
confirm), `FormMessage`.

## Patterns

- Mobile-first. Dashboards: sidebar ≥ md, bottom nav below md. Public profile is a single 28rem column.
- Every async section has a skeleton fallback; every list has an empty state; route-level `error.tsx` for dashboards.
- Sponsored content always carries a "Sponsored" badge and a disclosure paragraph; links use `rel="sponsored"`.
- Destructive or irreversible actions ask for confirmation.

## Accessibility (WCAG 2.2 AA targets)

Skip link; visible focus rings (`ring` = brand); labeled controls via `Field`; `aria-invalid`/`aria-describedby` on
errors; `aria-current` in navigation; `role="alert"` for action errors; native selects; ≥44px touch targets in the
bottom nav; contrast-checked tokens. E2E tests check the skip link, no horizontal overflow and invalid-field states.

## Note on shadcn

The shadcn registry (ui.shadcn.com) was unreachable from the build environment, so components were written by hand
following shadcn conventions (`components.json` is present). `pnpm dlx shadcn add <component>` works normally on a
machine with internet access.

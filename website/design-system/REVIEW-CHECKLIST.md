# Design Systems Ops review checklist

Use for token changes, new components, section changes and Storybook releases. Mark each item pass, fail or not applicable, with evidence. This checklist is a repeatable review process; it does not claim that a background agent continuously monitors the repository.

## Scope and authority

- [ ] Identify affected component, section, stories and shared tokens.
- [ ] Preserve approved content and recent explicit user decisions.
- [ ] Apply current Google Sans and light/inverse website system; do not revive superseded typography or styling.
- [ ] Record new intentional exceptions with their reason and owner/request.
- [ ] Limit the change to its intended scope; do not include unrelated edits in a publish.

## Source and documentation consistency

- [ ] Production and stories use the same component/section source and CSS.
- [ ] Generated outputs rebuild cleanly from their documented source.
- [ ] Shared colors, type and motion consume tokens instead of copied near-matches.
- [ ] Any component-specific value is meaningful and documented.
- [ ] Style-guide values match actual CSS/JS, including responsive overrides.
- [ ] Story links and names are stable and usable by another reviewer.
- [ ] No private files, source photographs outside approved assets, local absolute paths or secrets enter the public build.

## Visual states

- [ ] Rest, hover, active/selected and focus states are represented where supported.
- [ ] Light/dark header content stays readable over each section.
- [ ] Shared heading timing matches between Selected works and What we do; their intentional 500/400 weight distinction remains.
- [ ] Narrative and team statement share typography and reading behavior.
- [ ] Services show four visible rows and capability groups; title/description/orb alignment remains coherent.
- [ ] Team bio, portrait and member switcher retain their approved hierarchy and copy.
- [ ] Loading, missing-image and renderer-failure states are deliberate.
- [ ] Each viewport has one primary visual treatment; decorative effects do not compromise text.

## Interaction and accessibility

- [ ] Keyboard order follows meaning; focus is visible on every control.
- [ ] Buttons, links and selectors have appropriate semantics and accessible names.
- [ ] Targets are at least 44×44px or the exception is explicitly assessed.
- [ ] Selected member/state is programmatically communicated.
- [ ] Character animation does not create duplicate screen-reader text.
- [ ] Text and controls meet AA contrast in their real surface context.
- [ ] Reduced-motion users see complete content without scrolling through hidden letter states or continuous particle movement.
- [ ] Touch users can read and navigate without hover.
- [ ] Forced colors and no-JavaScript content remain meaningful.

## Responsive and performance checks

- [ ] Check 320px, representative phone, tablet, desktop and wide desktop.
- [ ] No horizontal overflow, accidental clipping or overlapping essential text.
- [ ] Sticky scenes release correctly and reverse scroll remains smooth.
- [ ] Offscreen/hidden-tab animation work stops where intended.
- [ ] WebGL contexts, textures, listeners and animation frames clean up.
- [ ] No unnecessary simultaneous heavy scenes in an isolated story.
- [ ] Existing test suite and relevant build checks pass.
- [ ] Browser console has no new errors for affected interactions.

## Release checks

- [ ] Production and static Storybook builds complete.
- [ ] Relative assets work under the GitHub Pages project base path.
- [ ] Visit the deployed homepage and Storybook URL; check one component and one complete section story.
- [ ] Record exact tested viewports/preferences and any untested limitations.
- [ ] Update documentation when behavior or token values change.

## Review report template

**Scope:** component/section, files, stories, revision.

**Keep:** approved behavior and visual decisions retained.

**Adjust:** issue, severity, reproducible state, expected behavior, owning source.

**Remove:** stale documentation, duplicated rules or unnecessary effects.

**Evidence:** automated results, browser states, viewports, motion preference, screenshots when relevant.

**Outcome:** ready / ready with documented limitations / changes required. Separate verified results from recommendations.

Severity: P1 blocks an essential flow or broad accessibility; P2 is a reproducible component inconsistency or responsive failure; P3 is minor polish or documentation debt. Aesthetic preference alone is not a blocking finding when the user has approved the design.

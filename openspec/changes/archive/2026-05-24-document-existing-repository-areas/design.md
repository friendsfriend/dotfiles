## Context

This repository is a personal dotfiles repository with setup scripts and platform/application configuration directories. Existing behavior is documented mostly through README files and the scripts themselves. OpenSpec currently has no baseline specs, so future edits have no explicit contract to validate against.

The change is documentation-only at the OpenSpec layer: it introduces repository-area specs that describe the current intended behavior of scripts and configuration areas. The specs are organized by repository area because that matches the maintenance model for this repo.

## Goals / Non-Goals

**Goals:**

- Create baseline OpenSpec specs for existing repository areas.
- Keep specs grounded in current files, README descriptions, and setup/linking behavior.
- Describe externally meaningful contracts: supported profiles, target locations, key responsibilities, and preservation expectations.
- Make future changes easier to review by clarifying which existing behaviors should not regress.

**Non-Goals:**

- Do not change shell scripts, PowerShell scripts, package lists, or application config files.
- Do not refactor repository structure.
- Do not introduce automated tests in this change.
- Do not over-specify incidental implementation details such as internal helper function names unless they define observable behavior.

## Decisions

### Decision: Organize specs by repository area

Specs will mirror major repository folders such as `scripts`, `hyprland`, `sketchybar`, `nvim`, and `zsh`.

Rationale: The user explicitly prefers repository-area organization. This makes it easy to locate the relevant spec when editing a folder and keeps contracts aligned with how the repo is maintained.

Alternative considered: Organize by user-facing capability such as bootstrap, dependency installation, or desktop setup. That would better model workflows, but it would scatter responsibility for a single folder across multiple specs.

### Decision: Use baseline ADDED requirements

Because there are no existing specs, all current behavior will be captured as new capabilities with `ADDED Requirements`.

Rationale: This creates an initial baseline without claiming behavior changed.

Alternative considered: Create one large monolithic `dotfiles` spec. That would be simpler initially but harder to maintain as individual repo areas evolve.

### Decision: Keep specs behavioral, not implementation-prescriptive

Requirements will focus on what each area must provide, where it is linked or installed, and which profiles/platforms use it.

Rationale: Dotfile implementations often change. Specs should prevent accidental behavior regressions while still allowing config internals to evolve.

Alternative considered: Capture exact line-level config details. That would be brittle and create unnecessary spec churn.

## Risks / Trade-offs

- Specs may become stale as personal preferences evolve → Keep requirements at the responsibility/behavior level and update area specs whenever changing folder ownership or setup flow.
- Repository-area specs can duplicate cross-cutting setup behavior → Put orchestration details in `scripts` and only reference profile participation from individual area specs.
- Some areas are lightweight and may feel over-documented → Group smaller terminal/system tools under `terminal-tools` to reduce maintenance overhead.
- Baseline specs may encode existing bugs as intended behavior → Write requirements from README/script intent and observable purpose, not every incidental quirk.

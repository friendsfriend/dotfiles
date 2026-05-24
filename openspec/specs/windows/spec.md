# windows Specification

## Purpose
TBD - created by archiving change document-existing-repository-areas. Update Purpose after archive.
## Requirements
### Requirement: Windows dotfile linking
The windows capability SHALL define Windows-specific installation behavior for supported repository areas.

#### Scenario: Windows install runs with defaults
- **WHEN** the Windows install script runs without `-UseSymlink`
- **THEN** it SHALL create directory junctions for GlazeWM, Neovim, Zebar, and WezTerm

### Requirement: Windows symbolic link option
The windows capability SHALL support symbolic links when explicitly requested and permitted by the operating system.

#### Scenario: Symlink mode is permitted
- **WHEN** the Windows install script runs with `-UseSymlink` and the user has administrator privileges or Developer Mode enabled
- **THEN** it SHALL create symbolic links instead of junctions

#### Scenario: Symlink mode is not permitted
- **WHEN** the Windows install script runs with `-UseSymlink` without administrator privileges and without Developer Mode
- **THEN** it SHALL stop with an actionable error

### Requirement: Existing target protection
The windows capability SHALL protect existing non-link target directories from being overwritten.

#### Scenario: Target already exists and is not a link
- **WHEN** a target path already exists and is not a junction or symbolic link
- **THEN** the Windows install script SHALL fail and instruct the user to back up and remove it manually


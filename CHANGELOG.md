# Changelog
All notable changes to this project will be documented in this file.

## [0.3.6] - not yet released
### Fixed
- overwork node documentation
- fixed some documentation errors (get_songmedia)

### Changed
- Wiki documentation now cover the full scope and has more complex examples

## [0.3.5] - 2019-08-27T1623
### Fixed
- error in documentation for node "get status"

### Added
- Link to Wiki - new Examples

### Changed
- Some messages

## [0.3.4] - 2019-08-26T1615
### Added
- manage queue node: new command "get_sonos_playlists"
- example to insert a playlist into the SONOS queue

### Changed
- get queue node: now all commands will send message as output (if no error)
- Color of nodes

### Fixed
- get_queue now provides output message even if albumArtURL could not be found

## [0.3.3] - 2019-08-24T2200
### Added
- CHANGELOG.md
- Wiki first page

### Changed
- Status and error messages have been standardized in all nodes
- Now debug messages instead of info messages (keep log clean)
- README: moved some stuff to Wiki

### Removed
- nothing

### Fixed
- error handling when IP address points to non SONOS device
- bug in get queue. It works now for empty queue.

## [0.3.2] - 2019-08-21
### Added
- ip address syntax check in configNode

## [0.3.1] - 2019-08-21

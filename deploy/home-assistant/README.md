# Home Assistant repository metadata

This directory is the source for the separate `Amenophus79/home-assistant-fitness-pwa` app repository.

The app metadata declares `mysql:want`. On startup Fitness PWA requests `GET /services/mysql` with `SUPERVISOR_TOKEN`. When a MariaDB provider is installed and reachable, the app creates `fitness_pwa_state` in the discovered `homeassistant` database and reconciles it with `/data/fitness-pwa.sqlite` by revision. Without a provider, SQLite is used on its own.

`backup: cold` lets Home Assistant stop the app while `/data` is backed up, keeping the SQLite file consistent. The app does not require broad `hassio_api` or host access because `/services/*` is available to declared service consumers.

The public repository still needs the versioned multi-architecture application image and builder workflow before this metadata can be installed from the Home Assistant store.

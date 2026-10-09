<!-- bettersite #37 — append this section to the ORIGIN https://luongnv.com/auth.md -->
<!-- The origin auth.md exists but lacks an explicit `agent_auth` block; the
     authorization-server metadata already carries one. Appending this keeps
     the document and the AS metadata in the same shape per
     https://isitagentready.com/.well-known/agent-skills/auth-md/SKILL.md -->

## agent_auth

- `skill`: `auth.md` (this document)
- `register_uri`: `https://auth.luongnv.com/register`
- `methods`:
  - `authorization_code` + PKCE — browser agents and assistants
  - `client_credentials` — service agents (contact the owner to provision)
  - `urn:ietf:params:oauth:grant-type:device_code` — CLI/device agents

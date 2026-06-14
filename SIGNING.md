# macOS code signing & notarization

By default DockTerm's macOS `.dmg` is **unsigned**, so users hit Gatekeeper's
"can't check it for malicious software" prompt. Signing it with an Apple
**Developer ID Application** certificate and **notarizing** it with Apple removes
that warning.

The pipeline is fully wired (`electron-builder.yml` + `.github/workflows/release.yml`).
You only add five GitHub secrets; then every `v*` tag produces a signed +
notarized macOS build. Until the secrets exist, builds stay unsigned and nothing
breaks.

## The five secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name                   | Value |
|-------------------------------|-------|
| `CSC_LINK`                    | base64 of your **Developer ID Application** `.p12` |
| `CSC_KEY_PASSWORD`            | the password you set when exporting that `.p12` |
| `APPLE_ID`                    | your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | an app-specific password (see below) |
| `APPLE_TEAM_ID`               | your 10-char Team ID |

> ⚠️ These are signing keys. Add them only in GitHub's secrets UI. Never paste
> the `.p12`, its base64, or any password into chat, issues, or commits.

## Preferred: App Store Connect API key (more reliable in CI)

The Apple-ID + app-specific-password method works but `notarytool` can hang for
hours on Apple's side. Apple's recommended CI method is an **App Store Connect
API key**, which the pipeline uses automatically when these three secrets exist
(it falls back to the Apple-ID method otherwise):

| Secret name         | Value |
|---------------------|-------|
| `APPLE_API_KEY_P8`  | the full contents of the downloaded `AuthKey_XXXX.p8` file |
| `APPLE_API_KEY_ID`  | the Key ID (e.g. `ABC123DEF4`) |
| `APPLE_API_ISSUER`  | the Issuer ID (a UUID) |

Create it: **App Store Connect → Users and Access → Integrations →
App Store Connect API → Team Keys → ＋** → name it `dockterm-notarize`, Access
**Developer** → Generate. **Download the `.p8` (one time only)**; copy the Key ID
from the list and the Issuer ID from the top of the page. `CSC_LINK` +
`CSC_KEY_PASSWORD` (the signing cert) are still required.

## Getting each value

**Developer ID Application cert** (note: this is *different* from the
"Apple Distribution" cert used for the App Store — you may need to create it):
- Xcode → Settings → Accounts → your Apple ID → **Manage Certificates** → **+** →
  **Developer ID Application**. Or web:
  <https://developer.apple.com/account/resources/certificates> → **+** →
  *Developer ID Application*.
- Export from **Keychain Access** → *My Certificates* → right-click the
  "Developer ID Application: …" entry (expanded so the private key is included) →
  **Export** as `.p12`, set a password.
- Encode it: `base64 -i Certificates.p12 | pbcopy` → paste into `CSC_LINK`.

**App-specific password:** <https://appleid.apple.com> → Sign-In and Security →
**App-Specific Passwords** → generate → `xxxx-xxxx-xxxx-xxxx`.

**Team ID:** <https://developer.apple.com/account> → Membership → **Team ID**.

## Releasing a signed build

Bump version, tag, push (same flow as always). CI signs the `.dmg`, notarizes it
with Apple, staples the ticket, and attaches it to the GitHub Release — it then
opens with no Gatekeeper warning. Notarization adds a few minutes while Apple
scans the build; if it fails, the most common cause is the `.p12` not being a
*Developer ID Application* cert or a wrong app-specific password.

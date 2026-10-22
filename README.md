# Figma2Klaviyo

Export a selected Figma Auto Layout email frame as responsive, table-based HTML for a Klaviyo custom HTML template. Free local export works without an account, checkout or API key. Version 0.1.0 is a development-import package, not a published Figma Community plugin.

## Policy decision ? 22 October 2026

Decision: external monetization is permitted with clear account/payment/license disclosure, consent for design transfer and an accurate privacy policy. Proceed with free export and the separately configured server license boundary; no paid offering or checkout is active. Community acceptance remains Figma's decision. Official sources checked 2026-10-22:

- https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines
- https://help.figma.com/hc/en-us/articles/12067637274519-About-selling-Community-resources
- https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development (desktop creation/publication required)
- https://developers.figma.com/docs/plugins/manifest/ (manifest and network allowlist)
- https://developers.klaviyo.com/en/reference/create_template (templates:write, revision 2026-10-15)
- https://developer.paddle.com/api-reference/transactions/get-transaction/ (read existing transaction and adjustments)

## Run

Node 22 or newer, no dependencies: `npm run build`.

In **Figma Desktop**, create a development plugin/import `plugin/manifest.json` through **Plugins → Development → Import plugin from manifest**. Figma assigns the development plugin ID; keep the generated ID when publishing. Run the plugin, select one Auto Layout frame, then **Export selection → Download HTML**. Upload the downloaded file using Klaviyo's custom HTML template import. `plugin/ui.html` is also a standalone interactive sample; use **Try sample** outside Figma. `example-email.html` shows the generated sample email.

## Design contract

- One FRAME, COMPONENT or INSTANCE, 240–1000 px wide; vertical/horizontal Auto Layout, no wrapping. Free export and optional upload both allow 40 visible nodes and 12 levels.
- Text stays text, escaped against HTML injection. One style and one optional HTTPS link per text node. Output uses Arial/Helvetica email-safe fonts with original size, weight, solid color and left/center/right text alignment. Font families, line height and letter spacing are normalized; it is not pixel-perfect export.
- Start-aligned layouts and top-aligned rows; padding, positive spacing, proportional column widths and opaque single-color fills. Horizontal rows stack below 620 px. Rounded corners, clip content, constraints and advanced alignment are not reproduced; simplify the design before export.
- Rectangles export as solid swatches/spacers, or as hosted images. To attach a public image select a rectangle and use **Add a hosted image**. Only the URL and description are stored as plugin data; the plugin never uploads images or reads Figma image bytes. You must own or have permission to use the asset. Images must be public HTTPS URLs with stable hosting and suitable dimensions.
- Unsupported vectors, groups, mixed text/fills, gradients, effects, strokes, masks, absolute positioning, opacity and rotation produce actionable errors. Hidden nodes are excluded.
- Output has inline email styles, a table container with Outlook conditional fallback, mobile stacking, and Klaviyo `{% unsubscribe %}`. Review sender postal address, personalization and legal compliance before sending. Preview is a browser approximation: Gmail/Outlook/Apple Mail and a live Figma runtime have not been validated here. The result is **CODE HTML**, not Klaviyo drag-and-drop blocks. No campaigns are sent.

## Optional self-hosted upload

No hosted backend, checkout, active paid plan or issued customer license is included. Paid integration remains disabled until configured by its operator. Figma free export needs no network access. There is no fake checkout or revenue claim.

The single-account server is intentionally bound to loopback. Deploy behind your own HTTPS reverse proxy with authentication, request size/time limits and rate limiting; no new paid service is required by this package. Run only one server process per persistent data directory. Add **only that exact HTTPS host** to `plugin/manifest.json` `networkAccess.allowedDomains`; the build preserves your existing manifest ID and allowlist. Do not use a wildcard. The development manifest allows `http://127.0.0.1:8799` for local integration only. Hosted image previews in Figma also require their exact asset hosts in the manifest; downloaded HTML can load those images independently. Figma plugin UI has opaque `null` origin; CORS alone is not authentication.

Set protected server environment variables described in `.env.example` (the application does not load .env automatically). Use a random 32+ character `SERVER_ACCESS_TOKEN`, entered in the plugin only for the current session. `KLAVIYO_PRIVATE_KEY` with **templates:write**, `PADDLE_API_KEY` with **transaction.read**, allowed one-time `PADDLE_PRICE_ID`, account-bound `PADDLE_CUSTOMER_ID`, and license signing keys exist only on your server. Never enter Paddle or Klaviyo private keys in the plugin, commit them, include them in screenshots, or send them to support. Use the OS credential manager/your platform secret store, restrict file ACLs on Windows, and disable request-body/authorization logging at the proxy.

Use a server-generated Ed25519 keypair. To issue a 30-day signed license for an **already completed** eligible one-time Paddle transaction:

`node server/issue-license.cjs txn_ID PROTECTED_OUTPUT_FILE`

The CLI checks the provider's transaction status, account, configured price, adjustments and absence of a subscription. It writes the license to a new protected file; it never creates a charge or checkout. Set `LICENSE_PRIVATE_KEY_FILE` only for this operator CLI. The upload server needs only `LICENSE_PUBLIC_KEY_FILE`. License renewal/delivery is manual; no automatic checkout fulfillment is implemented. Paddle sandbox defaults must be explicitly configured; sandbox licenses are not production purchases. No price is advertised until a real approved Paddle product and checkout exist.

Start with `npm start`. Keep `ALLOW_KLAVIYO_WRITE=false` until the account owner explicitly consents to actual template creation. The plugin separately requires transfer consent on every session. The endpoint verifies bearer access, signed expiring account-bound license, current Paddle payment eligibility and node limits on the server. It regenerates HTML from node data; client HTML, prices and plan claims are not trusted. Refund/dispute records fail closed. Network or malformed provider responses fail closed.

`POST /api/upload`: `{ tree, title, license, requestId, consent: true }`. Request UUID is stable for one export; re-export intentionally creates a new operation. The persistent `.data/requests.json` ledger stores only a payload digest, state and created template ID. Successful repeats return the same ID. Pending/failed/ambiguous operations are blocked; no automatic upstream POST retries on timeout, 429 or 5xx. Check the Klaviyo account before creating a new export after an uncertain response. Maintain and back up the ledger; deleting it removes duplicate protection. No external upload was performed during this delivery.

## Privacy and support

Free exports remain in the Figma process/browser memory until download. No analytics or external requests. Exported HTML includes any hosted URLs supplied by the user; email clients/preview can request those images. Optional upload transfers the selected serialized design and license to the user's own server, then HTML to Klaviyo. Paddle receives only a transaction eligibility read, not design content. Server and license credentials are held in the operator's protected environment; the plugin keeps server token/license only in memory. The operator controls retention and must publish their own accurate privacy policy before offering a hosted service. Close the plugin to clear transient credentials; downloaded HTML must be removed separately. Support: sametatesen2@gmail.com. Independent product by Samet Atesen, not affiliated with Figma or Klaviyo.

## Attribution

Responsive table/reset/container conventions adapted from Lee Munroe's MIT template, pinned reference commit `60b5b6ddf9600e4b7d7e1ef60e5a3a8f1e56e186`:
https://github.com/leemunroe/responsive-html-email-template
Full upstream license: `vendor/responsive-email-LICENSE.txt`. No third-party brand imagery or code copied from paid plugins.

## Review handoff

Community listing: `LISTING.md`; illustrative listing graphic: `listing-cover.svg`. Before submission: import and run in Figma Desktop, test a real design with images, inspect supported email clients, replace the development manifest with the Figma-assigned plugin ID and exact production allowlist (if enabled), publish a publicly accessible privacy URL, then submit through Figma Desktop. A GitHub push is source delivery, not Community publication. Independent acceptance is pending.

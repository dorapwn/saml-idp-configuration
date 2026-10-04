---

theme: seriph
title: Configuring an Identity Provider with SAML 2.0
info: |
  ## SAML 2.0 IDP Configuration
  A practical presentation as code (Slidev) deck covering SAML concepts,
  trust setup, metadata exchange, attribute mapping, and operational
  considerations when configuring an Identity Provider.

  Author: Neo
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
fonts:
  sans: Inter
  mono: 'JetBrains Mono'
---

# Configuring an Identity Provider with SAML 2.0

<div class="text-lg mt-8">
  Federation, Trust, and the Reality of Single Sign-On
</div>

<div class="mt-12 text-sm opacity-70">
  Presentation as Code · Slidev · {{ $slidev.configs.theme }}
</div>

<div class="abs-br m-6 text-xs opacity-50">
  Press <kbd>Space</kbd> for next slide · <kbd>o</kbd> for overview
</div>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: two-cols

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Why SAML, why now?

SAML 2.0 is the **lingua franca** of enterprise federation. Even in 2026, when OIDC dominates new apps, SAML still runs the identity backbone for thousands of SaaS platforms, government systems, and legacy monoliths.

::right::

<v-clicks>

- **Federation at scale** — one IDP serves hundreds of SPs
- **Standards-based trust** — X.509 signatures, XML canonicalization
- **B2B reality** — many enterprise customers *only* speak SAML
- **Compliance driver** — audit, eIDAS, FedRAMP, gov-tech contracts
- **Loose coupling** — SPs don't need user databases

</v-clicks>

<!--
Quick framing: SAML 2.0 is from 2005 and we're still using it because enterprise federation moves slowly and the standard is good enough. OIDC dominates new apps but won't replace SAML in regulated environments for the foreseeable future. So you need to know it.
-->
---

layout: center

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# What we'll cover

<v-clicks>

1. 🎭 SAML in 30 seconds — the mental model
2. 🧩 Roles, assertions, bindings, profiles
3. 🔐 Trust foundation — keys, certificates, signing & encryption
4. 🤝 The configuration handshake — metadata + entityIDs
5. ⚙️ Step-by-step IDP setup (Okta, Azure AD, Keycloak)
6. 📨 Attribute mapping & NameID strategies
7. 🐛 Real-world troubleshooting
8. 🛡️ Security hardening checklist
9. 🚀 Beyond SAML — when to graduate to OIDC

</v-clicks>

<!--
Walking through the agenda — 9 chapters, the deck goes deep on the trust foundation and the IDP setup walkthroughs because those are where the real time goes. I'll skip the troubleshooting chapter's details live and refer people to it during Q&A.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 1 · 🎭 SAML in 30 Seconds

The mental model that makes the rest click.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: two-cols
layoutClass: gap-8

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Three actors, one dance

**Identity Provider (IDP)** — the source of truth for identity. Authenticates users. Signs assertions. Examples: Okta, Azure AD/Entra ID, Auth0, Ping, Keycloak, ADFS.

**Service Provider (SP)** — the application the user wants to use. Trusts the IDP to vouch for users. Examples: Salesforce, Slack, GitHub Enterprise, AWS IAM, custom apps.

::right::

**User (Principal)** — has credentials at the IDP and wants to access an SP.

The **user never gets a password** at the SP. The SP just trusts whatever the IDP says about them, as long as it's properly signed.

<div class="mt-6">

<img src="/diagram-saml-flow.svg" alt="SP-Initiated SSO numbered message flow" style="width:100%;max-width:720px;display:block;margin:0 auto"/>

</div>

<!--
The mental model: three actors — IDP, SP, and the user. The user authenticates at the IDP. The SP never sees a password. The SP just trusts a signed assertion. That's the whole game in one diagram. Take a moment here, this is the foundation for everything else.
-->
---

layout: center

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# The SAML assertion

The **assertion** is the heart of SAML — a signed XML document saying "this user, with these attributes, did authenticate at this time, by this method."

```xml {all|4-7|9-13|15-19}
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_a1234..." IssueInstant="2026-10-04T08:00:00Z"
                Version="2.0">
  <saml:Issuer>https://idp.example.com</saml:Issuer>

  <!-- A digital signature on the entire assertion -->
  <ds:Signature>...</ds:Signature>

  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      alice@example.com
    </saml:NameID>
    <saml:SubjectConfirmation Method="bearer">
      <saml:SubjectConfirmationData
        InResponseTo="_req5678"
        Recipient="https://sp.example.com/acs"
        NotOnOrAfter="2026-10-04T08:05:00Z"/>
    </saml:SubjectConfirmation>
  </saml:Subject>

  <saml:Conditions NotBefore="..." NotOnOrAfter="...">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>

  <saml:AuthnStatement AuthnInstant="2026-10-04T08:00:00Z"
                       SessionIndex="_sess42">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>

  <saml:AttributeStatement>
    <saml:Attribute Name="email"><saml:AttributeValue>alice@example.com</saml:AttributeValue></saml:Attribute>
    <saml:Attribute Name="role"><saml:AttributeValue>admin</saml:AttributeValue></saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

<div class="text-xs opacity-60 mt-2">Click lines to walk through Issuer → Signature → Subject → Conditions → Authn → Attributes. The <code style="background:#fef3c7;padding:0 4px;border-radius:3px">Issuer</code> element on line 4 is the subject of the next two slides.</div>

<!--
Walking through the assertion XML piece by piece — Issuer, Signature, Subject
with NameID, Conditions with validity window, AuthnStatement, AttributeStatement.
The slide has line numbers so you can walk it with your finger on screen. The
NameID is the primary identity — usually an email or a persistent opaque ID.
The Conditions tell the SP when the assertion is valid. The Signature is what
makes the whole thing trustworthy — without it, anyone could forge an assertion.
Don't skip this slide, it's referenced later in the troubleshooting chapter.
The Issuer element on line 4 of the example leads directly into the next two
slides — pause briefly at the end to tee them up: "let's spend a moment on
this Issuer field specifically, because it deserves more than a single line."
-->

---

# Meet `<saml:Issuer>` — who signed this thing?

The Issuer is the **entityID of the IDP that produced this assertion**. It looks trivial — a single URI element — but it's the linchpin of signature dispatch and trust routing.

<v-clicks>

- 🎯 **Issuer == IDP's entityID.** Same string in metadata, in every assertion, in audit logs. Not optional. Not free-form. Configure it once, freeze it.
- 🪪 **SP uses Issuer to look up the right signing cert.** Multi-IDP environments (think: B2B SaaS federating with dozens of enterprise customers) have many `<KeyDescriptor use="signing">` blocks — Issuer tells the SP *which one* to verify against.
- 🔒 **SP rejects assertions whose Issuer isn't in its trusted list.** Even if the signature is valid, an unknown Issuer = reject. This is the second trust check after signature validation.
- 🆔 **Issuer vs entityID vs audience** — common confusion:
  - `Issuer` = who *issued* (the IDP)
  - `entityID` = a SAML entity's stable identifier (an IDP has one; each SP has one)
  - `Audience` = who the assertion is *for* (the SP, in `<AudienceRestriction>`)
  - For IDPs, `Issuer` value == `entityID` of the IDP, byte-for-byte.

</v-clicks>

<!--
The Issuer element looks like nothing — a single URI inside the assertion —
but it carries enormous weight. Two things to hammer home on this slide.
First: in multi-IDP federation (B2B SaaS, government shared services, anything
where one SP trusts multiple IDPs) the Issuer is the dispatch key. The SP
receives an assertion, parses the Issuer, looks up the matching signing cert
in its trusted list, and verifies. Without a correct Issuer dispatch, you
either accept too much (forgery risk) or reject too much (outage).
Second: the identity hierarchy — Issuer / entityID / Audience — confuses
everyone the first time. Use the analogy: Issuer is the author, entityID is
the author's canonical name, Audience is the intended reader. For an IDP the
first two are the same string, but they answer different questions. Audience
is the SP and lives in Conditions/AudienceRestriction, not in the Issuer slot.
If you take one thing from this slide, let it be: the Issuer string in your
assertions must match, byte-for-byte, what the SP has on its trusted list.
-->

---

# Issuer gone wrong — three real failures

<v-clicks>

- ❌ **Issuer URL has trailing slash** — `https://idp.example.com/` vs `https://idp.example.com`. SAML string-compares these. The signature validates, but the SP's trusted-Issuer list doesn't match. Login rejected with "unknown issuer".
- ❌ **Issuer changed mid-deployment** — your team decided to "clean up" the entityID from `https://idp.acme.com/saml/idp` to `https://idp.acme.com`. Old metadata in caches still works; new assertions don't. SPs that pinned the old value reject everything.
- ❌ **Two IDPs accidentally share an Issuer** — a staging and a production IDP both configured as `https://idp.example.com`. Production SPs now trust signatures from the staging IDP's signing key. Test users become production users. Real breach, real audit finding.

</v-clicks>

<v-click>

<div class="mt-4">

> 🛡️ **Operational rule:** the IDP's Issuer/URL is *infrastructure*. Change it only with a coordinated cutover: new metadata published first, both old and new signing certs trusted during overlap, then deprecate. Same playbook as cert rotation.

</div>

</v-click>

<!--
Three real failure patterns, each from a different industry. Read all three.
The trailing-slash issue is the most common — it's the same class of bug as
the audience mismatch one we'll see later in the troubleshooting chapter, but
manifested on a different element. The Issuer-change-mid-deployment story is
less common but catastrophic when it happens, because SP metadata caches live
for days and the failure window is silent — login just stops working at
random intervals as caches roll over. The shared-Issuer-between-staging-and-
production story is the scariest — I've seen this in two pen-test reports.
It's the SAML equivalent of accidentally pointing production at the dev
database. The fix is procedural: per-environment entityIDs, enforced by IaC.
End the slide with the operational rule at the bottom — Issuer is infra,
change it with the same care as a cert rotation.
-->

---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 2 · 🧩 The four concepts you must internalize

Roles are easy. These four are where 80% of SAML bugs hide.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Concept 1 · Bindings

A **binding** = the wire format + transport for SAML messages. The same logical message can ride different transports.

| Binding | Direction | Transport | Use case |
|---|---|---|---|
| `HTTP-POST` | SP→IDP, IDP→SP | Form POST with base64 SAML in hidden field | Default for browser SSO |
| `HTTP-Redirect` | SP→IDP | 302 with `SAMLRequest` query param | AuthnRequest, LogoutRequest |
| `HTTP-Artifact` | IDP→SP | Small artifact → back-channel `<ArtifactResolve>` | Long assertions, large messages |
| `SOAP` | Either | Back-channel over HTTPS | Artifact resolution, SLO |

<v-click>

**90% of broken SAML integrations** = someone trying to POST an artifact, or redirect an assertion. Match the binding end-to-end.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Concept 2 · Profiles

A **profile** = a complete end-to-end flow combining assertions + bindings + roles.

- **Web Browser SSO Profile** — the famous SP-initiated and IDP-initiated flows
- **Single Logout (SLO) Profile** — coordinated logout across all SPs
- **Enhanced Client or Proxy (ECP)** — non-browser clients (rare, painful)
- **Attribute Push / Pull** — let IDP send attributes proactively, or let SP query

<v-click>

**Start with SP-initiated SSO**, get it solid, then add IDP-initiated as a convenience, then *maybe* SLO. SLO is where vendor interoperability breaks down.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Concept 3 · NameID formats

The `<saml:NameID>` is *the* primary user identifier in the assertion. Its `Format=` attribute tells the SP how to interpret it.

| Format URI | Meaning | When to use |
|---|---|---|
| `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` | Email | Most common, easy for SPs to display |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` | Opaque, stable ID | Best — survives email/name changes |
| `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified` | Whatever IDP wants | Avoid — ambiguous |
| `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` | One-time, request-scoped | Anonymous use cases only |

<v-click>

> **Pro tip:** always negotiate `persistent` if the SP supports it. Tying user identity to an email address means a user changing their email breaks their account.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Concept 4 · Metadata

**Metadata** = a signed XML document describing a SAML entity — its entityID, signing/encryption certificates, supported bindings, endpoints.

```xml
<EntityDescriptor entityID="https://idp.example.com"
                  xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data><X509Certificate>MIID...base64...</X509Certificate></X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        Location="https://idp.example.com/slo"/>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                        Location="https://idp.example.com/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>
```

<v-click>

**Exchange metadata, don't hand-type URLs.** One metadata file = entityID + all certs + all endpoints + all NameIDs. No copy-paste drift.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 3 · 🔐 Trust foundation

Before a single message flies, you need crypto. **And for a SAML IDP, crypto means two independent keypairs** — signing and encryption — each with its own role, metadata descriptor, and rotation lifecycle. This chapter is the deep dive.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Two keypairs, not one

A SAML deployment runs on **two independent asymmetric keypairs** on the IDP, with **one optional** on the SP. Most outages and security incidents come from conflating them. Separate them mentally, separate them in metadata, separate them in your key store.

<v-clicks>

- 🔏 **Signing keypair (IDP, mandatory)** — private key signs `<Assertion>` and `<Response>`; SP holds the public cert to verify. Direction: **IDP → SP**.
- 🔐 **Encryption keypair (IDP, mandatory if any assertion contains sensitive attrs)** — SP holds the public cert; IDP uses it to encrypt the `<EncryptedAssertion>` blob. Direction: **SP → IDP** for the cert, **IDP → SP** for the encrypted payload.
- ✍️ **Signing keypair (SP, optional but recommended)** — private key signs `<AuthnRequest>`; IDP verifies. Used when the IDP rejects unsigned AuthnRequests.
- 🚫 **Why two keypairs?** Compromise of one shouldn't silently grant both impersonation (sign) and decryption (read). Defense in depth: encrypt with key X, sign with key Y, so stealing signing key ≠ reading past assertions, and stealing encryption key ≠ forging future ones.

</v-clicks>

<!--
This is where I want to slow down. Most SAML failures and most SAML security incidents trace back to people treating signing and encryption as the same thing. They're not. Signing keys prove identity — they let the SP verify that an assertion really came from your IDP. Encryption keys protect confidentiality — they let the IDP send an assertion that only the SP can read. The threat model is different, so the keys should be different. If I steal your signing key I can forge new assertions. If I steal your encryption key I can decrypt old ones. In both cases the damage is bad but contained to one capability, not both. That's the argument for separation.
-->
---

# What an `<EncryptedAssertion>` actually contains

When encryption is on, the wire looks like this. Notice the **plaintext assertion is gone** — the SP unwraps it locally with its private key.

<v-clicks>

1. IDP builds the assertion XML exactly as before (Subject, Conditions, Attributes).
2. IDP generates a random **session key** (AES-256).
3. IDP encrypts the assertion XML with the session key → `<xenc:EncryptedData>`.
4. IDP encrypts the session key with the **SP's public encryption cert** (RSA-OAEP) → `<xenc:EncryptedKey>`.
5. Both blobs ship inside `<saml:EncryptedAssertion>` in place of `<saml:Assertion>`.
6. SP decrypts the session key with its private key, then decrypts the assertion.
7. SP verifies the embedded `<ds:Signature>` against the IDP's signing cert — **encryption ≠ authenticity**.

</v-clicks>

<v-click>

<div class="mt-4">

```xml {all|2-3|5-8|10-12|14-15}
<saml:EncryptedAssertion>
  <xenc:EncryptedData Type="...element" xmlns:xenc="...xmlenc#">
    <xenc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>
    <ds:KeyInfo><xenc:EncryptedKey>...</xenc:EncryptedKey></ds:KeyInfo>
    <xenc:CipherData>
      <xenc:CipherValue>base64(AES-256(plaintext_assertion))</xenc:CipherValue>
    </xenc:CipherData>
  </xenc:EncryptedData>
</saml:EncryptedAssertion>

<!-- The SP unwraps EncryptedKey with its private RSA key,
     then uses that to decrypt CipherValue. -->
<!-- Signature on the plaintext is verified separately
     against the IDP's SIGNING cert, not the encryption cert. -->
```

</div>

</v-click>

<!--
Concrete walkthrough of what encryption actually does. The IDP doesn't
encrypt the assertion directly with RSA — that would be slow. Instead,
it generates a random AES-256 session key, encrypts the assertion with
that, then encrypts the session key with the SP's public RSA key. The
SP unwraps the session key with its private RSA key, then decrypts.
The plaintext assertion also has its own signature — encryption provides
confidentiality, the signature provides authenticity. Both are needed.
When you see the XML on screen, point out that the plaintext assertion
is gone — there's no <saml:Assertion> element, only
<saml:EncryptedAssertion> wrapping the encrypted blob. Common mistake:
people think encryption replaces signing. It doesn't.
-->

---

# Key descriptors in metadata

Metadata declares **which cert is for what**. SPs and IDPs parse this — sending the wrong cert in the wrong slot means broken trust.

<v-clicks>

- `<KeyDescriptor use="signing">` — public cert the *peer* uses to **verify** signatures I produce
- `<KeyDescriptor use="encryption">` — public cert a peer uses to **encrypt** data destined for me
- A cert can be both — declare it twice, once per `use`. Don't share private keys between roles.
- Some stacks publish one cert marked `use="signing encryption"` (a `KeyDescriptor` with no `use` attribute). This is legal but discouraged — you lose the ability to rotate one independently.

</v-clicks>

```xml
<EntityDescriptor entityID="https://idp.example.com">
  <IDPSSODescriptor protocolSupportEnumeration="...SAML:2.0:protocol">

    <!-- Cert the SP uses to verify assertion signatures -->
    <KeyDescriptor use="signing">
      <KeyInfo><X509Data><X509Certificate>MIID...signing...</X509Certificate></X509Data></KeyInfo>
    </KeyDescriptor>

    <!-- Cert the SP uses to encrypt assertions for this IDP -->
    <KeyDescriptor use="encryption">
      <KeyInfo><X509Data><X509Certificate>MIID...encryption...</X509Certificate></X509Data></KeyInfo>
    </KeyDescriptor>

    <SingleSignOnService .../>
  </IDPSSODescriptor>
</EntityDescriptor>
```

<!--
The metadata declares two KeyDescriptors for our IDP — one for signing,
one for encryption. Each contains a public X.509 cert. The SP uses the
signing cert to verify assertion signatures and the encryption cert to
encrypt new assertions destined for the IDP. Yes, the cert in the
encryption slot is used by the *peer* to encrypt to us — not by us to
encrypt. That trips people up. Take a moment. The XML comments inside
the code block above are illustrative — they don't affect the actual
metadata parsing.
-->

---

# Generating the keypairs — OpenSSL

Don't let your IDP vendor generate these silently. You want to know what's in your key store. Use a 2048-bit minimum RSA key (or ECDSA P-256/P-384 for modern stacks).

```bash {all|1-3|5-7|9-11|13-16}
# 1. Generate the signing private key
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
  -out idp-signing.key -aes256
# You'll be prompted for a passphrase — store it in your KMS, not in git

# 2. Self-signed signing certificate, valid 2 years
openssl req -new -x509 -key idp-signing.key -out idp-signing.crt \
  -days 730 -subj "/CN=idp.example.com SAML Signing" \
  -addext "keyUsage=digitalSignature,nonRepudiation"

# 3. Generate the encryption private key — SEPARATE keypair
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
  -out idp-encryption.key -aes256

# 4. Self-signed encryption certificate, valid 2 years
openssl req -new -x509 -key idp-encryption.key -out idp-encryption.crt \
  -days 730 -subj "/CN=idp.example.com SAML Encryption" \
  -addext "keyUsage=keyEncipherment,dataEncipherment"
```

<v-click>

> ⚠️ The `-addext keyUsage=...` lines matter. Signing keys should not be marked `keyEncipherment`; encryption keys should not be marked `nonRepudiation`. Some SPs (and Java's `XMLSignatureFactory`) actually inspect key usage and reject mismatches.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Configuring both certs in your IDP

The same five settings, applied to **both** keypairs.

<v-clicks>

- 📁 **Key store** — load the `.key` files (or their PKCS#12 bundles) into the IDP's key store. Mark signing vs encryption with a friendly name/alias. Keep them in separate aliases so you can rotate independently.
- 🪪 **Certificate alias** — both IDs must be stable. Don't reuse "default" if your IDP supports per-app certs.
- 📜 **Metadata publishing** — emit both `<KeyDescriptor>` blocks with `use="signing"` and `use="encryption"`. Host at a stable URL.
- 🧷 **Cert chain** — self-signed is fine for federation, but if your IDP's issuer chain matters to auditors, include intermediates in the metadata `<X509Certificate>` block.
- 🔁 **Rotation policy** — document overlap (typically 2–4 weeks), who owns it, and what triggers emergency rotation (suspected key compromise).

</v-clicks>

<!--
Five settings applied to both keypairs. The principle is symmetry: treat signing and encryption with the same operational rigor. Different aliases in your keystore, both published in metadata, both documented in your runbook, both rotated on a schedule. If you only audit signing cert rotation, your encryption cert will expire silently and the day someone enables EncryptedAssertion everything breaks.
-->
---

# Cert rotation — the operation that breaks everything

Cert rotation is the single most common cause of "the IDP was working yesterday and now nothing logs in." Get it right *once* and document it.

<v-clicks>

1. **Generate the new keypair at least 2 weeks before expiry.** Don't wait for the expiry alert — automation may not catch vendor-specific metadata TTLs.
2. **Publish updated metadata with BOTH old and new signing certs** as `<KeyDescriptor use="signing">` entries. SPs reading the metadata can adopt the new cert at their own pace.
3. **SP verifies against both certs** during the overlap window. Most modern SAML libraries (onelogin, SAML-Toolkits, pac4j) accept a list of trusted certs.
4. **Wait for the overlap window to elapse**, then remove the old cert from IDP metadata.
5. **Never edit metadata by hand** mid-incident — push a fresh full document. SPs cache aggressively and partial updates confuse them.
6. **Test in a staging IDP first.** Have a parallel metadata URL you can point test SPs at.

</v-clicks>

<v-click>

<div class="mt-4">

> ☠️ The classic disaster: vendor rotates the IDP signing cert, publishes new metadata, but the SP was configured by hard-pasting the old cert 18 months ago and has never re-pulled metadata. Every login fails with "signature validation failed" until someone manually updates the SP.

</div>

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Signature & digest algorithms

Don't leave these at defaults blindly. As of 2026, modern SAML stacks should use:

| Purpose | Recommended | Avoid |
|---|---|---|
| Signature | `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` | `rsa-sha1` (deprecated, broken) |
| Digest | `http://www.w3.org/2001/04/xmlenc#sha256` | `sha1` |
| Key transport (assertion encryption) | `rsa-oaep-mgf1p` (2048+ RSA) | `rsa-1_5` (vulnerable to Bleichenbacher) |
| Data encryption (assertion payload) | `aes256-gcm` or `aes256-cbc` | `tripledes-cbc` |

<v-click>

> Old ADFS / Shibboleth defaults to SHA-1 still ship in the wild. If you're integrating with a 2014-era SP, you'll need `sha1` for compatibility, but isolate it behind a dedicated metadata profile.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 4 · 🤝 The configuration handshake

Metadata in, metadata out. URLs match. Certs match. Tests pass.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# The seven values that must agree

<v-clicks>

For SP-initiated SSO to work, the **IDP and SP must agree** on:

1. **SP entityID** — a URI (not necessarily resolvable), unique, persistent. Often the SP's ACS URL or a dedicated metadata URL.
2. **IDP entityID** — same idea, the IDP's identifier.
3. **Assertion Consumer Service (ACS) URL** — where the IDP POSTs the SAMLResponse.
4. **Single Sign-On Service URL** — where the SP sends the AuthnRequest.
5. **Single Logout Service URL** — optional but recommended.
6. **NameID format** — must be one both sides support.
7. **Signing certificate fingerprint or full cert** — what's used to validate signatures.

</v-clicks>

<v-click>

<div class="mt-6 text-center text-xl">

🤝 **If any one of these mismatches, login fails.** No graceful fallback. No helpful error. Just a 401 or an infinite loop.

</div>

</v-click>

<!--
These seven values must match exactly between IDP and SP. No graceful fallback, no helpful error message. Just a 401 or an infinite redirect loop. This slide is the single most important slide in the whole deck for someone debugging a broken integration. Memorize it.
-->
---

# Metadata exchange — the right way

<img src="/diagram-metadata-exchange.svg" alt="Metadata exchange sequence diagram" style="width:100%;max-width:900px;display:block;margin:0 auto"/>

<v-click>

**Hot tip:** host your metadata at a stable URL (`https://idp.example.com/metadata.xml`) and pin to that. Avoid re-uploading metadata every time you rotate — let the SP pull live.

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 5 · ⚙️ Step-by-step IDP setup

The same five-step recipe, three different IDPs.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: two-cols
layoutClass: gap-6

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Recipe for any IDP

<v-clicks>

1. **Create the SP application** in the IDP admin console. Give it a name the user will recognize.
2. **Configure SAML settings:**
   - ACS URL (paste from SP)
   - SP entityID (paste from SP)
   - NameID format (start with email, graduate to persistent)
   - Audience restriction (usually = SP entityID)
3. **Upload SP metadata OR manually paste:**
   - SP entityID, ACS URL, SLO URL
   - SP signing cert (if SP signs requests)
4. **Map attributes:**
   - `email`, `firstName`, `lastName`, `groups` → SAML attributes
5. **Assign users / groups** to the application.

</v-clicks>

::right::

<v-click>

<div class="text-center mt-12">

<img src="/diagram-admin-console.svg" alt="IDP admin console new SAML app" style="width:100%;max-width:520px;display:block;margin:0 auto"/>

</div>

</v-click>

<!--
The five-step recipe works for every IDP, regardless of vendor. Create the app, configure SAML settings, upload metadata, map attributes, assign users. The next three slides apply this to specific vendors.
-->
---

# Okta

```yaml {all|1-3|5-11|13-19|21-26}
# Okta SAML app — key fields to configure
app_name: "Acme HR Portal"

general:
  app_label: "Acme HR Portal"

sign_on:
  default_relay_state: "https://hr.acme.com/login"

sso:
  sign_on_mode: "SAML 2.0"
  recipient: "https://hr.acme.com/saml/acs"
  destination: "https://hr.acme.com/saml/acs"
  audience: "https://hr.acme.com"
  issuer: "http://www.okta.com/exk8a9b3c1d2eF0g3"
  name_id_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  response: "Signed"
  assertion: "Signed"
  signature_algorithm: "RSA_SHA256"
  digest_algorithm: "SHA256"

attribute_statements:
  - name: "email"
    type: "basic"
    value: "${user.email}"
  - name: "firstName"
    type: "basic"
    value: "${user.firstName}"
  - name: "lastName"
    type: "basic"
    value: "${user.lastName}"
  - name: "groups"
    type: "regex"
    value: ".*"
```

<div class="text-xs opacity-60 mt-2">Lines toggle: app meta · SAML settings · attributes · group mapping</div>

<!--
Okta YAML — note the Okta-specific quirks. The issuer is Okta's own URL with a per-app random suffix. The audience must match your SP's entityID exactly. The attribute statements use Okta's expression language — \${user.email}, \${user.firstName} etc. The regex type with value '.*' on groups means Okta will emit every group the user is a member of as a separate attribute value.
-->
---

# Microsoft Entra ID (Azure AD)

```powershell {all|2-7|9-14|16-20}
# Azure CLI — create a SAML enterprise app
az ad app create \
  --display-name "Acme HR Portal" \
  --web-redirect-uris "https://hr.acme.com/saml/acs" \
  --identifier-uris "https://hr.acme.com" \
  --required-resource-accesses @manifest.json

# PowerShell — set SAML-specific properties
$params = @{
  IdentifierUris     = @("https://hr.acme.com")
  ReplyUrls          = @("https://hr.acme.com/saml/acs")
  PreferredSingleSignOnMode = "saml"
}
Set-MgApplication -ApplicationId $appId -BodyParameter $params

# Then in the Enterprise App blade:
#   1. Set "User assignment required" = Yes
#   2. Users and groups → Assign
#   3. Single sign-on → SAML → edit attributes
#   4. Download Federation Metadata XML → upload to SP
```

<v-click>

**Gotcha:** Entra ID's default NameID is the user's UPN (`user@tenant.onmicrosoft.com`). Map it to the email-based NameID format via the *Identifier (unique ID)* transform if your SP needs email-as-ID.

</v-click>

<!--
Azure AD / Entra ID specifics. Default NameID is the UPN — user@tenant.onmicrosoft.com — which is almost never what your SP wants. Use the Identifier transform to remap it to email. Also note the lifecycle story is different here — Entra has its own provisioning engine that may overlap or conflict with your SAML config.
-->
---

# Keycloak

```bash {all|1-5|7-12|14-18}
# Create a new realm (optional, for isolation)
kc.sh bootstrap-admin user --username admin
# Then in the admin UI: Realm Settings → Create Realm

# Export an existing client (SP) config to JSON for review
kc.sh export --realm acme --file acme-realm.json --users realm_file

# The realm export shows what you need:
# - clientId (= entityID)
# - redirectUris (= ACS URL whitelist)
# - adminUrl (= back-channel SLO)
# - attributes.saml.assertionConsumerUrl
# - attributes.saml.singleLogoutServiceUrl

# Generate SP metadata for sharing with the IDP:
#   Clients → acme-hr → Action → Download adapter config
#   Choose "SAML SP Metadata"
```

```json {1-15}
# realm-export.json — Keycloak SP client excerpt
"acme-hr": {
  "clientId": "https://hr.acme.com",
  "protocol": "saml",
  "redirectUris": ["https://hr.acme.com/*"],
  "attributes": {
    "saml.assertionConsumerUrl": "https://hr.acme.com/saml/acs",
    "saml.singleLogoutServiceUrl": "https://hr.acme.com/saml/slo",
    "saml.nameIdFormat": "persistent",
    "saml.signatureAlgorithm": "RSA_SHA256",
    "saml_force_name_id_format": "true"
  }
}
```

<!--
Keycloak is the open-source option and the most flexible. The clientId becomes the entityID, the redirectUris list gates which ACS URLs are accepted, and the attributes section controls signature algorithms and NameID format. If you're building your own IDP, study the Keycloak export format — it's a reference implementation of SAML.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 6 · 📨 Attribute mapping & NameID strategies

The IDP passes user data; the SP decides what to do with it.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# The attribute statement, decoded

```xml
<saml:AttributeStatement>
  <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                   NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
    <saml:AttributeValue xsi:type="xs:string">alice@example.com</saml:AttributeValue>
  </saml:Attribute>

  <saml:Attribute Name="groups"
                   NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
    <saml:AttributeValue xsi:type="xs:string">engineering</saml:AttributeValue>
    <saml:AttributeValue xsi:type="xs:string">oncall</saml:AttributeValue>
  </saml:Attribute>
</saml:AttributeStatement>
```

<v-clicks>

- **Two `NameFormat` flavors**:
  - `basic` — short names (`email`, `groups`). Compact, vendor-friendly.
  - `uri` — long names (Microsoft claims, OID-based). Formal, but verbose.
- **Multiple `<AttributeValue>`** elements = list/array semantics. The SP iterates.
- **Group/role membership** drives authorization — map your IDP groups to SP roles via the attribute statement.

</v-clicks>

<!--
Two flavors of attribute name — basic (short names like 'email') and uri (long namespaced names like Microsoft's claim URLs). Pick one and be consistent. The SP iterates over multiple AttributeValue elements as a list — this is how you send multiple groups or roles.
-->
---

# NameID strategy decision tree

<v-clicks>

<img src="/diagram-nameid-decision.svg" alt="NameID format decision tree" style="width:100%;max-width:900px;display:block;margin:0 auto"/>

</v-clicks>

<v-click>

<div class="mt-6 text-center">

**Decision:** Start with **persistent**. Fall back to **emailAddress** only if the SP doesn't support persistent. Avoid transient unless you genuinely don't want to identify users.

</div>

</v-click>

<!--
Read the recommendation at the bottom. Persistent whenever possible. Email as fallback. Transient only for genuinely anonymous flows. If you take one operational lesson from this deck, let it be this one.
-->
---

# Just-in-Time (JIT) provisioning

A major SAML pattern: **let the IDP create users on the SP at first login.**

<v-clicks>

- SP checks: "I don't have a user with NameID = `X`. Do they have `email`, `firstName`, etc.?"
- If yes → SP creates user, assigns roles based on attribute claims, logs them in.
- If attribute missing → SP rejects login.
- **Pros:** no separate user provisioning pipeline.
- **Cons:** user lifecycle is event-driven and hard to audit; deprovisioning needs its own mechanism (e.g., SCIM, group removals).

</v-clicks>

<v-click>

> Pair JIT with **SCIM 2.0** for lifecycle management. SCIM doesn't replace SAML — it complements it. SAML for auth, SCIM for user/group CRUD.

</v-click>

<!--
JIT is great for reducing onboarding friction but creates a lifecycle problem — deprovisioning. If a user leaves the company, the SP doesn't know to disable their account because they were never explicitly created. Pair JIT with SCIM 2.0 for the lifecycle story to work.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 7 · 🐛 Real-world troubleshooting

The five SAML errors you'll hit, and how to fix them.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Error 1 · "SAML message not signed" / "Signature validation failed"

<v-click>

**Symptom:** Login redirects fine, but the SP rejects the SAMLResponse.

**Causes:**
</v-click>

<v-clicks>

- IDP configured to sign response but SP expects signed assertion (or vice versa)
- SP clock skew > 5 minutes (check `<Conditions NotBefore>` / `NotOnOrAfter`)
- Cert fingerprint mismatch — wrong cert pasted, or new cert not yet trusted
- Algorithm mismatch: IDP uses SHA-256, SP pinned to SHA-1

**Fix:**
</v-clicks>

<v-click>

- Capture the SAMLResponse with browser devtools, decode base64, inspect the `<ds:Signature>` element
- Diff what the SP expects against what the IDP sent
- Use an online SAML tracer (e.g., SAML-tracer browser extension) — non-negotiable tool

</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Error 2 · "Audience does not match"

```text
SAML Response rejected: Audience 'https://wrong-sp.example.com'
does not match expected 'https://hr.acme.com'
```

<v-click>

**Fix:** the `<saml:AudienceRestriction><saml:Audience>` value must **exactly equal** the SP's entityID. No trailing slash, no `https://` vs `http://`, no path. Strings.
</v-click>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Error 3 · Infinite redirect loop

<v-click>

**Symptom:** Browser keeps bouncing between IDP login and SP callback.

**Causes:**
</v-click>

<v-clicks>

- IDP initiates (IDP-first) but user has no session → redirects to login → after login, redirects to SP ACS → SP sees no valid SAMLResponse (because IDP-initiated doesn't have one) → redirects to IDP → infinite loop.
- AuthnRequest is malformed (wrong binding, missing `ID`) and IDP silently fails to process it.
- RelayState lost — SP sends user to a deep link, then can't reconstruct it after callback.

**Fix:** ensure your first test is **SP-initiated**, not IDP-initiated. Add logging at the SP's ACS endpoint to see what's arriving.
</v-clicks>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Error 4 · "No user found / No matching attribute"

<v-click>

**Symptom:** Login succeeds at IDP, SP creates session, then says "no user" or "missing email".

**Fixes:**
</v-click>

<v-clicks>

- Inspect the assertion — is the `email` attribute actually there?
- Check NameID format — SP may be looking for `persistent` but IDP sent `emailAddress`
- Check attribute name casing: `email` vs `Email` vs `EMAIL` — SAML is case-sensitive
- Some IDPs require attribute statement `NameFormat` to match SP expectation

</v-clicks>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Error 5 · Clock skew causing NotOnOrAfter rejection

<v-click>

```
saml:Assertion rejected: NotOnOrAfter '2026-10-04T08:05:00Z' is in the past
(current server time: 2026-10-04T08:08:23Z)
```

</v-click>

<v-click>

**Cause:** 3-minute clock drift between IDP server and SP server. SAML assertions typically have a 5-minute window. Anything more and they're invalid on receipt.

**Fixes:**
</v-click>

<v-clicks>

- Run NTP on both sides. Time skew should be < 30 seconds.
- Many SPs allow configuring "clock skew tolerance" (bump to 60–120 seconds).
- Never extend `<NotOnOrAfter>` past 5 minutes without a security review.

</v-clicks>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# The troubleshooting toolkit

<v-clicks>

- 🧪 **SAML-tracer** (Firefox/Chrome extension) — captures every SAML message in the browser
- 🔬 **[samltool.io](https://samltool.io)** — decode, validate, and inspect SAML XML
- 🪛 **OneLogin's SAML tester** — paste IDP metadata, simulate SP behavior
- 🐛 **Browser devtools** — Network tab → filter `saml` → see the actual POST
- 📋 **`xmllint --format`** — pretty-print the decoded response
- ⏱️ **`curl -v` + NTP check** — verify cert chain and clock before chasing the XML

</v-clicks>

<!--
These are the tools you'll actually reach for. SAML-tracer is the single most valuable — it captures every SAML message in the browser and shows you the actual XML. Without it you're debugging blind. Bookmark samltool.io for quick decode and validation.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 8 · 🛡️ Security hardening

SAML done wrong is a single point of total compromise. Hardening is not optional.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# The SAML security checklist

<v-clicks>

- ✅ **Sign the response AND the assertion** — belt and suspenders
- ✅ **Reject unsigned AuthnRequests** at the IDP unless the SP explicitly requires otherwise
- ✅ **Use SHA-256, never SHA-1** for signing and digest
- ✅ **Validate `InResponseTo`** on every assertion to prevent replay
- ✅ **Enforce `NotBefore` and `NotOnOrAfter`** — never accept assertions outside the validity window
- ✅ **Validate `Recipient`** matches your ACS URL exactly
- ✅ **Pin `<saml:Issuer>` per trusted IDP** — reject assertions from any Issuer not in your allowlist, even if the signature verifies
- ✅ **Per-environment entityIDs** — never let staging and production IDPs share an Issuer; the SP's trusted list doesn't know which is which
- ✅ **Enforce HTTPS** on every endpoint — no HTTP fallback
- ✅ **Encrypt assertions** (`<EncryptedAssertion>`) when transporting sensitive attributes — and require SPs to publish a stable encryption cert
- ✅ **Sign metadata** so consumers can detect tampering
- ✅ **Rotate signing AND encryption certs** at least yearly, with a documented ≥2-week overlap window in metadata
- ✅ **Audit log every assertion** — issuer, subject, timestamp, source IP, attributes
- ✅ **Separate signing and encryption keypairs** — never reuse one keypair for both roles
- ✅ **Set `keyUsage` correctly** on certs (`digitalSignature,nonRepudiation` for signing; `keyEncipherment` for encryption)
- ✅ **Store private keys in a KMS or HSM**, never on disk in plaintext

</v-clicks>

<!--
This is the operational checklist. Run through it before going to production and after any cert change. The four new items — separate keypairs, correct keyUsage, KMS storage, and joint rotation of signing and encryption certs — come from real incident postmortems.
-->
---

# Common SAML attack vectors

<v-clicks>

- 🎯 **XML Signature Wrapping (XSW)** — attacker wraps a legitimate assertion inside extra XML elements; the signature validates, but the SP reads the *wrong* assertion. Mitigated by modern SAML libraries; still check yours.
- 🎯 **Signature stripping** — attacker removes the `<ds:Signature>` and SPs that don't require signed assertions fall for it. Mitigation: enforce signing at the SP.
- 🎯 **Replay attacks** — attacker captures a valid assertion and replays it. Mitigated by `NotOnOrAfter`, `InResponseTo` validation, and one-time use tracking.
- 🎯 **Open redirect / XSS via RelayState** — RelayState is reflected back to the browser. Validate it strictly against an allowlist before redirecting.
- 🎯 **SSRF via `<AssertionConsumerServiceURL>`** — make sure the SP rejects AuthnRequests with attacker-controlled ACS URLs.

</v-clicks>

<!--
These five attack vectors show up in SAML penetration tests. XSW is the scariest because the signature validates but the SP reads a different assertion than the one signed. Modern SAML libraries mitigate this but old ones don't. If you're using a library from 2015, audit it specifically for XSW before going to production.
-->
---

layout: section

<!--
Chapter divider — pause here, take a breath, advance when ready.
-->
---

# 9 · 🚀 Beyond SAML

SAML isn't the end of the story — it's the foundation.

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# When to stay with SAML

<v-clicks>

- 🏛️ **Enterprise B2B SaaS** — customers expect SAML; OIDC isn't enough
- 🏛️ **Government / regulated** — eIDAS, FedRAMP, many frameworks mandate SAML
- 🏛️ **Legacy SPs** — that vendor still on Java 8 with Shibboleth 2.x
- 🏛️ **Attribute-heavy authz** — SAML's `<AttributeStatement>` is more expressive than OIDC's claims for complex group/role maps

</v-clicks>

<!--
SAML is staying in enterprise B2B and regulated environments for the foreseeable future. If you're selling to large enterprises, government, or healthcare, you must support SAML.
-->
---

# When to add OIDC alongside

<v-clicks>

- 🚀 **Modern web/mobile apps** — OIDC's JSON+JWT is simpler than XML+base64
- 🚀 **API-first services** — JWT bearer tokens work natively with HTTP APIs
- 🚀 **Mobile deep linking** — OIDC's `redirect_uri` flows handle native app schemes better
- 🚀 **Microservices** — JWTs propagate identity between services without a SAML XML parse at every hop

</v-clicks>

<v-click>

**Most enterprises end up running both.** SAML for legacy/enterprise federation, OIDC for modern apps. The IDP (Okta, Entra ID, Auth0, Keycloak) presents SAML to the old world and OIDC to the new.

</v-click>

<!--
OIDC wins for modern apps, mobile, APIs. Most enterprises end up running both. The IDP presents SAML to the old world and OIDC to the new — the user-facing experience is identical.
-->
---

# The hybrid identity stack

<img src="/diagram-hybrid-stack.svg" alt="Hybrid identity stack diagram" style="width:100%;max-width:980px;display:block;margin:0 auto"/>

<!--
This is the architecture you'll see in mature enterprise environments. One IDP, multiple protocols — SAML for the legacy and the regulated, OIDC for the modern, SCIM for lifecycle. The user experience is uniform even though the wire protocols differ. The investment in this kind of platform pays off as the application portfolio grows.
-->
---

layout: center

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

# Key takeaways

<v-clicks>

- 🧠 **SAML is a trust contract.** entityIDs, certificates, and URLs must all agree. Exchange metadata; don't hand-type.
- 🔐 **Two keypairs, not one.** Separate signing and encryption keys, separate `KeyDescriptor use=` blocks, separate rotation schedules — compromise of one shouldn't grant both forgery and decryption.
- 🎯 **Pick the right NameID.** Persistent when possible; email only when forced.
- 📨 **Attributes drive authz.** Map groups to roles via the attribute statement; consider JIT + SCIM.
- 🐛 **Test SP-initiated first.** Always use SAML-tracer. Always sync clocks.
- 🛡️ **Hardening is mandatory.** Validate `Recipient`, `InResponseTo`, `NotOnOrAfter`. Reject unsigned.
- 🚀 **SAML and OIDC coexist.** Most enterprises run both. SAML for the legacy and the regulated, OIDC for the modern.

</v-clicks>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->
---

layout: end
---

# Thanks 🙏

Questions? Let's dig into metadata XML.

<div class="text-sm mt-8 opacity-70">

📚 Resources

- [OASIS SAML 2.0 spec](https://docs.oasis-open.org/security/saml/v2.0/)
- [SAML-tracer extension](https://addons.mozilla.org/en-US/firefox/addon/saml-tracer/)
- [samltool.io decoder](https://samltool.io)
- [OWASP SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)

</div>

<!--
Advance through this slide; key points will reveal as you click. Take questions if anything's unclear.
-->

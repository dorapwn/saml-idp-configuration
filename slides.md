
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
---

# Visualizing the trust triangle
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
---

# Three concepts in 30 seconds
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

</v-clicks>

<!--
Walking through the agenda — 8 chapters, the deck goes deep on the trust foundation and the IDP setup walkthroughs because those are where the real time goes. I'll skip the troubleshooting chapter's details live and refer people to it during Q&A.
-->

---
layout: section
---

# Concept 1 · What SAML actually is
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
---

# Mental model — the parties

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
---

# In one picture
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
  - **Issuer vs SSO URL**: different concepts, often the same hostname. See next slide.

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

# Issuer vs SSO URL — different things, same hostname

The Issuer and the SSO URL **often share a hostname**, but they answer different questions. Conflating them is a common IDP-configuration mistake.

<v-clicks>

- 🏷️ **`Issuer` is a *name*.** "This assertion was issued by `https://idp.example.com`." Same string in metadata (`entityID`), in every assertion, in audit logs. Stable identifier. Not an endpoint.
- 🔗 **`SingleSignOnService` is an *endpoint*.** "Send your AuthnRequest *here*: `https://idp.example.com/sso`." Where the SSO protocol actually runs. Lives inside `<IDPSSODescriptor>` of metadata.
- 🌐 **Same hostname ≠ same thing.** They share `https://idp.example.com`, but:
  - Change your SSO path (`/sso` → `/saml/sso`) — Issuer stays, the endpoint moves. SPs that cache SSO URL need a refresh; SPs that pin Issuer don't.
  - Change your hostname (`idp.example.com` → sso.example.com) — both Issuer and SSO URL change. *Everything* breaks.
  - Add a tenant path (`idp.example.com/tenant-a`) — Issuer becomes `idp.example.com/tenant-a`, SSO URL keeps `idp.example.com/sso`. Multi-tenancy pattern: per-tenant Issuer, single SSO endpoint.
- 🚫 **Don't reuse the SSO URL as the Issuer** unless you're sure. It's the most common copy-paste error. The Issuer should be the IDP's *identity*, not its *address*.

</v-clicks>

<div class="mt-6 grid grid-cols-2 gap-4 text-sm">
<div>

**Issuer (identity)**

```
https://idp.example.com
```

👆 One per IDP. Stable. Federated.

</div>
<div>

**SSO URL (endpoint)**

```
https://idp.example.com/sso
```

👆 One per IDP. May change with deployments.

</div>
</div>

<!--
This is one of the most confusing things for new IDP engineers because both
strings look like URLs. They're not the same kind of URL. Issuer is a name —
it identifies *who* issued the assertion, like a signature on a letter. SSO
URL is an address — it tells the SP *where to send mail*. The same way you
can move offices and keep your name, you can change the SSO path without
changing the Issuer, and vice versa. Three rules of thumb: 1) Issuer is
identity, SSO URL is location. 2) Same hostname is convention, not
requirement. 3) When you change one, audit which SPs cache which. SPs that
pin Issuer need an explicit allowlist update; SPs that pin SSO URL just need
to refresh metadata. The bottom grid shows the typical case where both look
almost identical — the only difference is the trailing path on the SSO URL.
Hit the visual point: in 90% of single-IDP deployments Issuer and SSO URL
share a hostname, and that's fine, but they answer different questions.
-->


---

# How SPs and brokers actually validate the Issuer

The Issuer check is **string equality against an explicit allowlist**. Not hostname matching, not pattern matching, not "is this from a trusted DNS zone." A literal byte-for-byte comparison against a list of known IDP entityIDs.

<v-clicks>

- 🎯 **Algorithm: `assertion.Issuer ∈ trustedIssuers?`** — for every incoming assertion, the SP (or IDP broker) parses the `<saml:Issuer>` element and checks whether that exact string appears in its config. If yes → proceed. If no → reject with "unknown issuer" / "untrusted IdP" / similar.
- 📜 **The trusted list comes from configuration**, not from observation. SPs don't auto-discover IDPs. An admin must explicitly add the IDP's entityID to the SP's trust store (typically via metadata upload or out-of-band URL).
- 🔗 **For a chained IDP (broker / hub)** — same rule, applied recursively:
  - The SP at the edge trusts the broker's Issuer.
  - The broker trusts each upstream IDP's Issuer.
  - An assertion from an unknown upstream IDP is rejected by the broker *before* it ever produces an assertion for the SP.
- 🚫 **What the validator does NOT do:**
  - It doesn't check that the Issuer hostname resolves in DNS.
  - It doesn't check that the Issuer hostname matches the SSO URL hostname.
  - It doesn't fetch the Issuer URL and verify the response.
  - It doesn't infer trust from the signing cert (a cert signed by a known CA is *not* enough).
- ⚠️ **Common false assumptions**:
  - "Our IDP is at `https://sso.acme.com`, so any assertion with that hostname is trusted." — Wrong. Only the literal configured entityID is trusted.
  - "If the signature verifies, the Issuer must be right." — Wrong. Signature validates the *contents*; Issuer validates the *provenance*. Two separate checks.
  - "Per-tenant Issuer strings are fine." — Right, but each one must be explicitly added to the trusted list. A single shared cert doesn't help a multinational.

</v-clicks>

<v-click>

<div class="mt-4 text-center text-sm opacity-70">

Pseudocode of the actual check, in any SAML library:
</div>

```python
def validate(assertion):
    if assertion.issuer not in self.trusted_issuers:  # exact string match
        raise UntrustedIdPError(assertion.issuer)
    if not verify_signature(assertion, lookup_cert(assertion.issuer)):
        raise SignatureError()
    return assertion
```

</v-click>

<!--
This is the slide where the mental model locks in for an IDP admin audience.
The whole question was: "does the Issuer get validated by hostname?" — and
the answer is no, never. SAML's trust model is purely declarative: an admin
curates a list of trusted entityIDs, and the library does string equality.
Three implications worth saying out loud. First: hostname doesn't matter for
trust. If your IDP is at idp.acme.com and an attacker can mint assertions
with Issuer 'https://idp.acme.com' (because they control that domain), the
SP will trust them — that's why DNS and TLS matter as the *transport*
security layer, separate from SAML trust. Second: signature validity does
not imply Issuer trust. They're orthogonal. The signature proves the
assertion wasn't tampered with; the Issuer check proves it came from
someone you trust. Both required. Third: in chained IDP / hub-and-spoke
federation, the same rule applies at each layer. The SP trusts the hub's
Issuer. The hub trusts the upstream IDP's Issuer. An attacker can't sneak
in by going through a different path — the entityID string must match at
every trust boundary.
-->


---
layout: section
---

# Concept 2 · Assertions
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
---

# Concept 3 · Bindings
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
---

# Concept 5 · Authentication flows
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
---

# Concept 6 · Single logout
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
---

# Concept 7 · Configuration handshake
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
---

# Concept 8 · Attribute mapping
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
---

# Concept 9 · Common failure modes
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

# Misconfiguration risks — what the IDP admin can leave open

Most SAML breaches are not protocol-level exploits. They are **doors the admin opened and forgot to close**. This is the setup-time checklist.

<v-clicks>

- ⚠️ **Wildcarded Allowed ACS URLs.** "Make it work" pattern: admin pastes `https://example.com/*` to accept AuthnRequests. Now any path on the host can consume an assertion. **Fix:** exact-match ACS URLs, one per SP.
- ⚠️ **Test endpoints left enabled in production.** `/dev/saml/sso`, `/test/idp`, the staging tenant's endpoint — often live by default after a vendor upgrade. **Fix:** disable all non-production endpoints at the IDP, then verify with `curl -X POST` from outside.
- ⚠️ **Reused signing key across many apps.** One key compromise = every app compromised. **Fix:** separate keypair per app, or at least per trust boundary.
- ⚠️ **Encryption set to "none" or "optional".** Assertions travel over TLS but are decrypted by every proxy in the path. Sensitive attributes (email, role, group memberships) leak at the TLS-terminating layer. **Fix:** require encryption for SPs handling sensitive attributes.
- ⚠️ **NameID format leaks PII.** Default to `emailAddress` and the user's email is now in every audit log on every SP. **Fix:** use `persistent` (opaque ID) when SPs support it; reserve `emailAddress` for SPs that need to display the address.
- ⚠️ **Long assertion validity window.** Default in some IDPs is 60 minutes. **Fix:** 5 minutes for SP-initiated SSO; never more than 30.
- ⚠️ **Unsigned AuthnRequests accepted by default.** "Optional" is the default in most IDPs. **Fix:** require signed AuthnRequests unless the SP cannot sign.
- ⚠️ **IDP-initiated SSO without `InResponseTo`.** IDP pushes an assertion to the SP without a prior AuthnRequest. The SP has no way to bind it to a user session. Common CSRF vector. **Fix:** disable IDP-initiated SSO unless you have a specific use case, and even then validate `InResponseTo` where you can.
- ⚠️ **Self-signed cert with no anchor.** Some IDP vendors generate a self-signed cert but never publish a trust anchor. SPs that "trust everything signed by anyone" become wide open. **Fix:** publish the cert fingerprint explicitly in metadata or to each SP admin out-of-band.
- ⚠️ **Private key on the application server in dev, copy-pasted into prod.** Audit trail disappears. Key never rotates. **Fix:** KMS or HSM from day one, even in dev.
- ⚠️ **Logging assertions to stdout / app logs.** Full assertions in logs that get shipped to Splunk, Datadog, or a log aggregator with broader access than the IDP team. PII and role data in places they shouldn't be. **Fix:** log only the assertion ID, issuer, subject, and timestamp — never attributes.
- ⚠️ **Metadata signing cert mismatch.** IDP admin rotates the signing cert but doesn't rotate the metadata-signing cert, or vice versa. SPs that auto-fetch metadata can't tell the new metadata is genuine. **Fix:** rotate metadata-signing and IDP-signing certs on the same schedule.

</v-clicks>

<v-click>

<div class="mt-4 text-center text-sm">

🚪 **Each of these is a door.** Your security review should walk this list before going live, and again every 6 months. Misconfigurations compound — three small "I'll fix it later" items become a real incident when one of them is the lock that mattered.

</div>

</v-click>

<!--
This is the slide where the audience goes from "I run the IDP" to "I am the
IDP's security perimeter." Most SAML breaches I've seen in postmortem are
not XSW or replay — those get caught by libraries. The breaches are admin-
level mistakes: wildcard ACS URLs, left-enabled test endpoints, encryption
turned off because the vendor UI defaulted to optional, private keys in
/dev mounted into a container that then got pushed to prod. Each item on
this slide has a real incident behind it. The wildcard ACS one is from a
financial-services pen test; the test-endpoint one from a SaaS company
whose preprod IDP was exposed via a forgotten DNS record; the encryption-
disabled one from a healthcare provider whose assertion attributes ended
up in a TLS-terminating WAF's access logs; the PII-in-logs one is
constant, every company I look at has this. The framing is deliberate —
"doors the admin opened and forgot to close" — because it makes the
responsibility local. The IDP engineer owns these doors. Not the SP team.
Not the vendor. You. End on the compounding point. Three small items
that get ignored become a real incident when one of them is the lock that
mattered. Audit cadence: 6 months minimum, on every cert change, on every
vendor upgrade, on every personnel change.
-->

---

# Common SAML attack vectors

Five vectors show up in every SAML penetration test. We survey each one, then dig into mechanics, mitigations, and how to verify your own IDP doesn't ship them.

<v-clicks>

- 🎯 **XML Signature Wrapping (XSW)** — attacker wraps a legitimate assertion inside extra XML elements; the signature validates, but the SP reads the *wrong* assertion.
- 🎯 **Signature stripping** — attacker removes the `<ds:Signature>` and SPs that don't require signed assertions fall for it.
- 🎯 **Replay attacks** — attacker captures a valid assertion and replays it.
- 🎯 **RelayState open redirect / XSS** — RelayState is reflected back to the browser; unvalidated, it's a redirect primitive.
- 🎯 **SSRF via `<AssertionConsumerServiceURL>`** — AuthnRequests with a malicious ACS URL force the IDP to push assertions into attacker territory.

</v-clicks>

<!--
Each of these deserves a slide of its own. Survey the five, then go deep on
each. The audience should leave with two things: the name and the mechanism.
Don't read the bullets out loud — they're the index. Use them to tee up the
five detail slides.
-->

---
layout: two-cols
layoutClass: gap-8
---

# Attack 1 · XML Signature Wrapping (XSW)

The signature on the wire validates. The SP authenticates a user. But the user the SP authenticates is **not** the user the IDP signed.

::right::

## 🛡 At the IDP (your configuration)

- **Always sign the `<Assertion>` itself**, not just the wrapping `<Response>`. Both is best.
- **Publish `WantAssertionsSigned="true"`** in metadata for every SP you publish.
- **Use SHA-256** (`http://www.w3.org/2001/04/xmldsig-more#rsa-sha256`) for the signing algorithm. SHA-1 has no defense value against XSW.
- **Reject `<Response>` with more than one `<Assertion>`** child at the IDP level before signing — if you can't, ensure you sign only the inner assertion (not the wrapper), so any sibling assertion is unsigned by you.
- **Audit sign-event logs**: every assertion your IDP signs should appear in a log line that captures the assertion ID. If a log entry shows two `<Assertion>` elements under one sign event, you have a bug upstream.

## 🛡 At the SP (audit ask, not your config)

- Library must do **signed-assertion-only** parsing — match by `<ds:Reference>` URI, not parser order.
- Library must **reject `<Response>` with multiple `<Assertion>` children**.
- Audit the SP library version against published CVEs (OneLogin ruby-saml ≤ 1.10.x, OpenAM, OpenSAML 2.x).

## 🧪 Test

Capture a valid signed assertion in SAML-tracer. Append a second `<Assertion>` to the `<Response>` (your evil one with attacker-chosen attributes). Replay to your SP. If the SP logs in the attacker user, the SP library is vulnerable — and your published metadata needs `WantAssertionsSigned="true"` *plus* the SP team needs to upgrade.

<!--
XSW is the protocol-level walk-up that goes: "the signature is technically valid
(because the bytes covered are the same), but the SP reads the wrong payload
(because XML structure lets the attacker choose)." Modern libraries fix this;
old ones don't. CVE-2018-19376 (OneLogin ruby-saml) was the canonical example
that rewrote parsers across the industry. From the IDP admin's seat: you can't
prevent the SP from being vulnerable, but you CAN push the requirement onto
them via metadata flags and audit logs. Mention SAML-tracer as the demo tool:
replay the wire, append a second one, see what the SP does. If it logs in the
wrong user, file a ticket with the SP vendor AND add the SP to your quarterly
audit list.
-->

---
layout: two-cols
layoutClass: gap-8
---

# Attack 2 · Signature stripping

The simplest of the five: take the signed assertion, remove the signature, send it unsigned. The SP — if it accepts unsigned assertions — authenticates the user with no integrity check.

::right::

## 🛡 At the IDP (your configuration)

- **Always sign the `<Assertion>` element** (not just the wrapping `<Response>`). Set this in your IDP's signing config — most vendors have a "sign assertions" toggle; turn it on.
- **Publish `WantAssertionsSigned="true"`** in metadata for every SP. The SP's library reads this flag and refuses unsigned assertions.
- **Configure algorithm strength at signing time** — SHA-256 minimum, RSA-2048 minimum key. Vendors default to SHA-1 for "compatibility" — opt out.
- **Sign the response itself** even when assertions are signed. Belt-and-braces: if a misconfigured SP reads only the response signature, you're still covered.
- **Set metadata freshness** — re-publish metadata after every cert change so the SP knows your signing key hasn't quietly changed.

## 🛡 At the SP (audit ask, not your config)

- Library must default to **reject-on-missing-signature**, not allow-on-missing-signature. Audit call: ask the SP team whether their library's default is "permissive" or "strict."
- Library should use `setSignatureRequired(true)` (OpenSAML) or equivalent — explicit code, not config flag.
- Modern SP libraries (post-2018) handle this automatically; older ones don't.

## 🧪 Test

Capture a real signed assertion. Strip the entire `<ds:Signature>` element. Replay to your SP. If the SP logs in the user, the SP library is broken.

## 🔥 Why it's the gateway to XSW

A signature-stripped assertion is easier to mutate. XSW replaces one assertion with another. Modern libraries fix both because the same code path validates signature presence **and** matches the signed bytes to the parsed content. If your SP is XSW-safe, it's almost certainly signature-stripping-safe.

<!--
Signature stripping is the protocol-level walk-up to XSW. If the SP accepts
unsigned assertions, an attacker doesn't even need to forge one — they can
just take a real one, drop the signature, and send it. From the IDP admin's
seat: your config lever is `WantAssertionsSigned="true"` in published metadata
plus signing at the IDP. The SP team needs to fix their default-on-missing
behavior. Test method: capture a real signed assertion, strip the signature
element, replay. Any SP that logs you in is broken.
-->

---
layout: two-cols
layoutClass: gap-8
---

# Attack 3 · Replay attacks

Capture a valid assertion. Replay it. If the SP doesn't track one-time use or bind it to a session, the attacker becomes the user.

::right::

## 🛡 At the IDP (your configuration)

- **Set assertion validity (`NotBefore` → `NotOnOrAfter`) to ≤ 5 minutes** for SP-initiated SSO. ≤ 30 minutes for IDP-initiated. Most IDP admin consoles have a "session lifetime" or "assertion validity window" setting — find it.
- **Always emit `<AudienceRestriction>` with the SP's exact entityID** as the sole `<Audience>` value. Per SP, not per IDP.
- **Always emit a unique `<saml:Assertion ID="...">`** (UUID or similar). Never reuse an assertion ID across SPs or across sessions.
- **For SP-initiated SSO, bind assertions via `<Subject><NameID>` + `<AuthnStatement>`'s `InResponseTo` to the original `<AuthnRequest>` ID.** This is automatic in most IDPs; verify it's enabled for every SP.
- **Disable IDP-initiated SSO unless explicitly needed.** IDP-initiated means the IDP creates an assertion with no prior AuthnRequest — there's nothing to bind it to. Every IDP-initiated SSO is a potential replay vector.
- **Short-lived are best**: the shorter the validity window, the smaller the attack window. Default 60 minutes is too long.

## 🛡 At the SP (audit ask, not your config)

- Library must track **one-time-use** for `<saml:Assertion ID="...">` and reject duplicates.
- Library must validate `<AudienceRestriction>` strictly — reject any assertion where the SP's entityID isn't in the audience list.
- Library must validate `<InResponseTo>` — the AuthnRequest ID should match the assertion's. Otherwise, drop.

## 🧪 Test

Generate an assertion, save the bytes, immediately re-POST them. Then wait 6 minutes and re-POST. Both must be rejected. Then capture a valid assertion for SP-A and POST it to SP-B (different SP, same IDP). SP-B must reject because of `<AudienceRestriction>`.

<!--
Replay is the eternal SAML vulnerability because the protocol's whole
contract is "this assertion is valid for N minutes." That window is the
attack window. From the IDP admin's seat: the lever you control is
NotOnOrAfter (most IDPs expose this as "session lifetime") and the
AudienceRestriction you emit per SP. Cross-service replay is the most
common leak — the same IDP serves 40 SPs but they all accept the same
assertion unless the IDP emits a per-SP audience. Audit call: ask the
SP team whether their library does one-time-use tracking and audience
matching. SAML-tracer doesn't catch this; you need to actually replay
against the SP and watch what it does.
-->

---
layout: two-cols
layoutClass: gap-8
---

# Attack 4 · RelayState open redirect & XSS

RelayState is supposed to be opaque. It's not — most SP libraries reflect it back into the user's browser. That's a redirect primitive.

::right::

## 🛡 At the IDP (your configuration)

**RelayState is almost entirely an SP-side problem.** The IDP's only role is to pass the value through unchanged. What you can do:

- **Treat RelayState as opaque** — pass through verbatim, do not interpret, parse, validate, or modify it.
- **Cap RelayState size** at the IDP level. A 50 KB RelayState is suspicious. Most IDPs have an "input size limit" or per-parameter cap.
- **Audit your IDP's RelayState handling**: if your IDP ever logs RelayState into HTML pages (e.g., error pages, debug pages), file a bug.
- **Disable RelayState entirely** if your SPs don't use it. Many setups don't need it.

## 🛡 At the SP (the real defense)

- **Allowlist validation** — accept only relative paths (`/dashboard`, `/home`) or absolute URLs whose host matches the SP's own host.
- **Reject** any RelayState that doesn't match. 4xx with a clear log entry.
- **Never reflect RelayState into HTML**. Treat as redirect target, not content.
- **Block `javascript:` and `data:` schemes** explicitly.
- Audit the SP library — older ones (pre-2019) had this bug.

## 🧪 Test

Initiate SSO with `RelayState=https://attacker.example.com/phish` and `RelayState=javascript:alert(1)`. SP must reject both. From the IDP side: capture the request, see what your IDP emitted (RelayState should be unchanged) — if the IDP modified or rejected RelayState before passing it to the SP, that's a code smell.

<!--
RelayState is the protocol's design wart — it's a free-form string with no
semantics, intended for the SP's own use (deep-link, return-to URL), but the
spec doesn't say 'validate it'. Most SPs that don't validate it end up with a
straightforward open redirect. From the IDP admin's seat: the IDP can't
prevent the SP bug. The IDP CAN: pass RelayState through unchanged, cap its
size, audit for HTML-reflection bugs. The SP team needs to fix their parser.
From the attacker's perspective this is the cheapest SAML bug: one parameter,
no signature needed. The mitigation is boring: allowlist. Relative paths only,
or absolute URLs that match the SP's host. The javascript: scheme test is the
canary for older libraries.
-->

---
layout: two-cols
layoutClass: gap-8
---

# Attack 5 · SSRF via `<AssertionConsumerServiceURL>`

The IDP-initiated variant of a classic SSRF. The attacker tricks the IDP into sending a valid assertion to a URL they control.

::right::

## 🛡 At the IDP (your configuration)

- **Validate `AssertionConsumerServiceURL` against the SP's metadata** before posting the assertion. Reject the AuthnRequest if the URL doesn't match an `<AssertionConsumerService>` declared in metadata. This is THE primary defense.
- **Pin exactly one ACS URL per SP** in metadata. No wildcards. No multiple URLs (unless you genuinely have multiple legitimate endpoints, in which case document each).
- **Validate the URL is well-formed** and uses HTTPS. Reject `http://`, IP addresses, and unknown schemes.
- **Disable IDP-initiated SSO by default**. It's the mode that makes this attack easiest (no prior AuthnRequest → no InResponseTo binding). Opt-in only for SPs that explicitly need it.
- **Audit log every AuthnRequest rejection** with the offending URL and SP entityID. If your logs show a sudden spike in rejected ACS URLs from one source, you have an active probe.
- **Reject AuthnRequests with missing or malformed `AssertionConsumerServiceURL`** — don't default to "use metadata's ACS URL"; require the SP to specify.

## 🛡 At the SP (audit ask, not your config)

- Bind the AuthnRequest to a known SP entityID before the IDP trusts the URL.
- Maintain a per-SP ACS URL allowlist (one URL per SP, in metadata).
- Don't accept AuthnRequests from new SPs without metadata exchange.

## 🧪 Test

Send an AuthnRequest (mocked via curl) with `AssertionConsumerServiceURL=https://attacker.example/steal`. The IDP must reject before POSTing the assertion. From the IDP admin's seat: this is a one-time setup test you can do per SP. Set up curl tests for the 5 SPs that process the most assertions, automate them in CI.

<!--
SSRF-via-ACS is the IDP-side bug. The protocol's design lets the SP say
'POST it here,' and an SP that's been compromised, or a network attacker who
can intercept the AuthnRequest, can say 'POST it to me.' From the IDP admin's
perspective: your primary defense is metadata-driven URL validation. Every SP
gets exactly one ACS URL pinned in metadata. AuthnRequests that specify a
different URL are rejected. Disable IDP-initiated SSO unless explicitly
needed — it removes the AuthnRequest binding entirely. The SP team needs to
fix their URL hygiene. Test with curl that mocks the AuthnRequest and watch
what the IDP does with a malicious ACS.
-->

---
layout: section
---

# Production readiness
<!--
Chapter divider — pause here, take a breath, advance when ready.
-->

---
layout: center
---

# Recipe for any IDP
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

# Thank you

<div class="text-sm mt-8 opacity-70">

📚 Resources

- [OASIS SAML 2.0 spec](https://docs.oasis-open.org/security/saml/v2.0/)
- [SAML-tracer extension](https://addons.mozilla.org/en-US/firefox/addon/saml-tracer/)
- [samltool.io decoder](https://samltool.io)
- [OWASP SAML Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)

</div>

<!--
End of deck. Pause for questions; if audience wants metadata XML walkthrough live, open samltool.io and decode an assertion side-by-side.
-->

# Configuring an Identity Provider with SAML 2.0

A presentation-as-code Slidev deck covering SAML 2.0 IDP configuration from foundations to operations.

🌐 **Live slides**: https://dorapwn.github.io/saml-idp-configuration/

## Run locally

```bash
npm install
npm run dev          # starts dev server on http://localhost:3030
npm run build        # builds static SPA into ./dist
npm run export       # exports PDF (requires playwright-chromium)
```

## Deck contents

1. Why SAML, why now
2. SAML mental model (actors, assertions)
3. SAML core concepts (bindings, profiles, NameID, metadata)
4. Trust foundation (certs, algorithms)
5. The configuration handshake (the 7 values that must agree)
6. IDP setup walkthroughs (Okta, Entra ID, Keycloak)
7. Attribute mapping & NameID strategies
8. Troubleshooting the 5 most common errors
9. Security hardening checklist
10. When to keep SAML, when to add OIDC

## Deployment

GitHub Pages is wired via `.github/workflows/deploy.yml`. Push to `main`
and the Slides build + deploy automatically. Configured Pages source =
GitHub Actions.

## File layout

```
saml-idp-presentation/
├── slides.md                       # presentation content
├── package.json                    # Slidev deps
├── vite.config.ts                  # Vite config (host 0.0.0.0 for containers)
├── .slidev.json                    # Slidev project metadata
├── .github/workflows/deploy.yml    # Pages deploy workflow
└── README.md                       # this file
```

## Editing tips

- Add a new slide: insert a `---` separator followed by frontmatter
- Use `layout: two-cols` for side-by-side layouts
- Use `layout: section` for chapter dividers
- `<v-click>` elements reveal one-by-one when the user presses the right arrow
- `<v-clicks>` is the bulk version for lists
- Use Mermaid with ```` ```mermaid ```` blocks for diagrams

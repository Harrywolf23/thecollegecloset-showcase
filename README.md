# The College Closet

A storefront for secondhand college apparel — hoodies, crewnecks, and tees resold, exchanged, or
donated between students. Buyers browse a catalog filtered by school; sellers submit items through
an intake form for manual review before anything is listed.

**Live site:** <https://thecollegecloset.com>

## Stack

Static site, no framework and no build step — plain HTML, CSS, and vanilla JavaScript, deployed on
Vercel.

| File | Role |
| --- | --- |
| `products.js` | The catalog. A flat array of item records (school, name, size, price, condition, image, status). |
| `script.js` | Renders the catalog and drives search, school filter, size/condition filters, sorting, and the item-count display. Filters compose against one product list rather than re-querying. |
| `school-page.js` | Renders the per-school landing pages (`ut-austin.html`, `university-of-michigan.html`, `university-of-wisconsin.html`) from the same `products.js` source. |
| `sell.js` | Seller intake form — client-side validation, photo preview, and a summary the seller can email or copy to the clipboard. |
| `style.css` | All styling, hand-written. |
| `vercel.json` | Deploy config, and the site's security headers. |

Purchase inquiries route to a hosted Google Form; the code path for Stripe hosted checkout exists in
`script.js` (`STRIPE_CHECKOUT_PATTERN`) but no catalog item currently carries a payment link, so
every item falls back to manual inquiry.

The catalog holds 52 items across 27 schools.

## Security headers

`vercel.json` sets a strict Content-Security-Policy — `default-src 'self'`, `object-src 'none'`,
`frame-ancestors 'none'`, a SHA-256 hash allowlist for the one inline script, and explicit
`form-action` origins — plus HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
a restrictive `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin`.

## Running locally

```sh
npm run serve   # python3 -m http.server 8080
```

Then open <http://localhost:8080>. There is nothing to build or install.

## My role

Sole developer. I designed and wrote the site, the catalog data model, the filtering and rendering
layer, the seller intake flow, and the deploy and security-header configuration.

## About this repository

This is a showcase copy of the public-facing site, extracted for portfolio review. Business
operations material and internal tooling live in the private working repository and are not
included here. Contact: harrywolf@utexas.edu

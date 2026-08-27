# Chrome Web Store submission

This file is the copy-and-paste source of truth for the Road to VR — Horizon listing.

## Package

- File: `dist/roadtovr-horizon.zip`
- Manifest version: 3
- Extension version: 0.1.7
- Language: English (United States)
- Category: News & Weather

## Store listing

### Name

Road to VR — Horizon

### Summary

A cinematic, modern reading experience for Road to VR.

### Detailed description

Road to VR — Horizon transforms roadtovr.com into a polished, modern editorial reader while preserving the publication's original reporting, links, images, author information, and discussions.

Features include:

- Responsive home, category, and article layouts
- Quick navigation to every major Road to VR section
- Larger article typography and a comfortable reading width
- Author photos, reading progress, and the original Disqus discussion
- Light, dark, and system themes
- Adjustable text size and reading width
- An optional, private saved-story list
- A floating “To the top” control
- Restored artwork for story cards published without visible thumbnails

The extension runs only on Road to VR. It has no advertising, analytics, telemetry, tracking, or remote code. Reader preferences and saved stories stay in Chrome storage.

Road to VR — Horizon is an unofficial reader extension. It is not affiliated with or endorsed by Road to VR.

### URLs

- Homepage: https://github.com/elliotttate/roadtovr-modern
- Support: https://github.com/elliotttate/roadtovr-modern/issues
- Privacy policy: https://github.com/elliotttate/roadtovr-modern/blob/main/PRIVACY.md

## Privacy tab

### Resolve “Unable to publish” warnings

Paste these exact values into the corresponding fields, then select the data-use certification checkbox and click **Save Draft**.

**Single purpose description**

Transform Road to VR pages into a modern, accessible reader while preserving the publisher's original articles, navigation, images, author details, and comments.

**Host permission justification**

Host access is required only on roadtovr.com and www.roadtovr.com so the extension can read and restyle the currently open Road to VR page, preserve its links and discussion, and request featured-image metadata from Road to VR's same-origin WordPress endpoint. Both HTTP and HTTPS are included because Road to VR URLs may be opened with either scheme before redirecting. The extension does not access other websites.

**Remote code justification**

The extension does not use remote code. All JavaScript and CSS are included in the extension package. It does not download, evaluate, or execute remote JavaScript or WebAssembly; its same-origin WordPress request retrieves article metadata only.

**Storage justification**

Chrome storage saves the user's enabled state, theme, text size, and reading width. Local extension storage also keeps the optional saved-story list and a small cache of Road to VR featured-image URLs. No stored data is sent to the developer.

**Data usage certification**

Select the checkbox certifying that the extension's data usage complies with the Chrome Web Store Developer Program Policies, including the Limited Use requirements.

### Single purpose

Replace the presentation of roadtovr.com with a modern, accessible reader while preserving the publisher's original articles, navigation, images, author details, and comments.

### Permission justifications

**storage**

Stores the user's enabled state, theme, text size, and reading width in Chrome synchronized storage. It also keeps the optional saved-story list and a small cache of Road to VR featured-image URLs in local extension storage. No stored data is sent to the developer.

**Host access to roadtovr.com and www.roadtovr.com over HTTP and HTTPS**

Required to run the reader only on Road to VR pages, read the page content that is being restyled, preserve its links and discussion, and query Road to VR's same-origin WordPress endpoint when a published story card has no visible featured image. The extension does not access other websites.

**Remote code**

No. All executable code is included in the extension package. The extension does not download or execute remote JavaScript or WebAssembly.

### Data disclosures

- Website content: processed locally to restyle the currently open Road to VR page and cache Road to VR featured-image URLs.
- User-selected Road to VR story URLs, headlines, image URLs, and save timestamps: stored locally only for the optional saved-story list.
- Reader settings: stored in Chrome synchronized storage so Chrome can apply the user's preferences.
- Browsing history outside Road to VR: not collected.
- Personally identifiable, authentication, financial, health, location, and personal-communication data: not collected.
- Data sold or transferred: no.
- Advertising, analytics, profiling, or credit decisions: no.
- Limited Use certification: yes; the extension's use of Chrome API data complies with the Chrome Web Store User Data Policy.

## Distribution tab

- Visibility: Public
- Pricing: Free
- Regions: All regions
- In-app purchases: None

Use deferred publishing when submitting for review so approval does not automatically make the listing public before a final check.

## Test instructions

No test credentials are required.

1. Install the extension and open https://roadtovr.com/.
2. Confirm that the modern home layout appears without a flash of the legacy layout.
3. Open a story and confirm the article reader, author photo, reading controls, and original Disqus discussion are present.
4. Open the extension toolbar popup and change the theme, text size, or reading width; the page should update immediately.
5. Save a story with the plus control and confirm that the saved-story count appears in the popup.

## Required graphics

- Store icon upload: `store-assets/store-icon-128x128.png` (128×128 PNG)
- Packaged extension icon: `assets/icons/icon-128.png` (the identical icon included in the ZIP)
- Small promotional image: `store-assets/promo-small-440x280.png`
- Marquee promotional image: `store-assets/promo-marquee-1400x560.png`
- Screenshots: every PNG in `store-assets/screenshots/` (1280×800)

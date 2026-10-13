# Fabrice Vil — website draft

Built from the supplied desktop Figma frame using Bootstrap 5.3.8 and GSAP 3.13.0. This is a local review draft, not a published site.

## Included

Hero, À propos, Livres et docus, Réflexions, Expériences, all twelve collaborator logos, Shoutouts, Contact, and footer. Desktop and mobile navigation link to the implemented sections. Footer links use the Instagram, LinkedIn, Substack, and Facebook URLs supplied by the user. Editorial links and email addresses follow Figma.

Shoutouts follows the latest Figma design: a green grid background, six original portrait assets and three circular initiative logos. All nine entries link out in a new tab. Influences navigation leads to this section on desktop and mobile. Vanessa Andreotti's malformed URL in the latest Figma frame uses the valid Substack URL from the earlier design.

## Editing

- index.html: section content, links, images, and navigation.
- styles.css: hero, speech bubble, and shared base styles.
- sections.css: remaining sections and responsive layouts.
- motion.js: reversible scroll lines, motion preference controls, mobile menu, and SVG wrapper scaling.
- assets/: original Figma assets, local fonts, and the supplied character SVG.
- vendor/: locally bundled Bootstrap, GSAP, and ScrollTrigger.

Open index.html directly or serve this directory with any static web server. No package installation or build is necessary. The canonical project is /Users/loogart/Documents/GitHub/fabricevil. All editable files and assets live at its root; the local preview serves this repository.

## Character and motion

Fabrice's SVG is unchanged byte for byte and rendered at its natural proportions. The basketball and its timeline are removed. Character animation will be provided by the user later; data-lottie-slot="character" reserves a future mount, with no Lottie runtime loaded now. Current line motion follows scroll progress in both directions; paper and card motion is reserved for the next review. Manual and operating-system reduced-motion settings disable motion and smooth scrolling.

The speech-bubble tail is a solid white CSS triangle, anchored to the bottom edge with an eight-pixel overlap. Its entire base sits beneath the bubble; both edges stay joined at desktop and mobile sizes.

## Review and verification

Browser checks at widths 320, 390, 768, 1024, 1440, and 1920 found no horizontal overflow, missing image assets, or broken internal anchors. The tail overlaps the bubble at all six widths. Mobile menu navigation and both motion preference controls passed; no script errors were observed. Desktop and mobile layouts were visually reviewed, and the paper-edge crops were corrected. A fresh export repaired one empty collaborator asset.

Mobile layouts adapt the provided desktop composition; no mobile Figma reference was supplied. Character animations remain pending. No CMS, analytics, or deployment has been added.

Next approval gate: review the selective typography, element entrances, and paper settling before extending or publishing the motion system.

Dependency documentation: https://getbootstrap.com/docs/5.3/ and https://gsap.com/docs/v3/Installation/

Typography update: all main prose and publication lists share an 18px body size, 500 font weight, and 1.65 line height. Headings and secondary footer labels retain their hierarchy. The Expériences title icon is removed. The Livres et docus highlight is clipped to its heading box and sits behind the title; it cannot cover the description. Desktop and mobile sizing and separation were checked.

Footer and paper update: the lower torn edge belongs to the Livres et docus sheet and overlaps Réflexions without being clipped at the section boundary. Facebook uses the locally bundled Font Awesome square-facebook brand SVG (https://fontawesome.com/icons/square-facebook?style=brands), colored to match the footer icons. Credit corrected to Loogart and linked to https://loogart.com with target="_blank" and rel="noopener noreferrer".

Shoutouts verification: layouts checked at 1440, 1024, 768, 390, and 320 pixels; all portrait/logo assets loaded, nine links and two navigation anchors are present, and no horizontal overflow or browser errors were observed. Desktop and mobile screenshots were visually reviewed; image positioning was corrected to preserve the frame aspect ratios.

Contact now includes the original Figma silver paperclip asset, cropped and rotated to overlap the upper-right edge of the card. Its size adapts on mobile, it is decorative for screen readers, and it does not intercept clicks. Desktop and mobile placement checked.

Shoutouts portrait refresh: all six portrait files now use the updated Figma images with baked-in papercut edges. No CSS box shadow or drop shadow is applied to the portraits. The old Bayo image crop was removed to match the updated Figma frame. Desktop and mobile images loaded and fit without horizontal overflow.


## Reversible scroll lines

The Livres et docus highlight, Réflexions doodle, Contact email highlight, and footer doodle/rule follow scroll position. They draw on section entry, remain visible through the middle of the section, and erase on exit. Scrolling in either direction reverses the same timeline. The hero highlighter and rule are the exception: they reveal automatically on page load, then remain drawn regardless of scrolling. Adjust HERO_MOTION for their timing. No animation is marked once-only. Adjust LINE_MOTION in motion.js for reveal/hold/erase proportions.

Paper, card, and image entrances are now part of the Story motion exploration described below. All art remains static and fully visible with reduced motion, including the original unmasked Réflexions doodle.

Scroll verification: entry, middle, exit, and reverse positions were checked on desktop and mobile. Five scroll timelines are active; manual reduced motion removes all five and restores complete artwork. The Contact email uses one shared reveal layer for its marker and dark text; a complete light-colored mailto link stays visible underneath.


### Visible drawing timing

Scroll triggers now follow the actual heading, email marker, and Réflexions doodle rather than their entire sections. Drawing begins when the mark reaches 85% of the viewport height and uses approximately 60% of its travel, with 1.1 seconds of smoothing. This keeps the reveal visible, particularly when the mobile Réflexions text precedes the doodle. Scroll reversal is retained. Footer marks finish at the bottom of the page and rewind when scrolling upward. The hero still plays automatically on load, now over 2.2 seconds, with a slower rule reveal.


## Browser and sharing assets

The supplied images are installed without alteration: assets/favicon.png (64×64), assets/webclip.png (512×512), and assets/og-image.png (2400×1260). index.html declares the PNG favicon, Apple touch icon, and Open Graph/Twitter large-image metadata. Canonical and sharing URLs use https://fabricevil.com/. Public social previews become available when this version and its assets are deployed to that domain.


## Story motion exploration

Five short phrases use a typewriter-style glyph reveal: the hero greeting on load, À propos, Réflexions, Shoutouts, and Contact on entering the viewport. Full text stays in the layout, with complete accessible labels; no per-letter markup, looping cursor, or body-paragraph typing is used. A brief cursor appears only during typing.

Book/TV/browser visuals, the collaborator grid, and the three Shoutouts groups enter with an 18px movement and soft opacity reveal. About, collective works, and Contact paper cards settle with a 1.1-degree adjustment toward their original tilt and a one-percent scale change. The hero sheet settles gently on load. Scrolling upward above the entry point reverses the viewport entrances.

Adjust STORY_MOTION in motion.js, or set enabled to false to disable this exploration. Reduced-motion controls restore static cards and complete text. Existing line-reveal timings remain separate and unchanged. Character artwork is not animated or modified.


Contact reveal fix: removed per-frame viewport measurements and separate text clipping. A single email-reveal layer clips the original marker asset and its matching dark text together, with responsive padding in CSS. The underlying light text remains fully readable, clickable, and keyboard accessible at every scroll position. Card transforms and viewport resizing no longer require coordinating two masks.


### Body line reveals

Main prose now enters with a soft line-by-line fade instead of typing characters. Paragraphs and links retain their original DOM, dimensions, and line wrapping; CSS mask bands reveal natural lines with a short stagger. ResizeObserver recalculates the bands for responsive wrapping. Finished paragraphs are unmasked, and both reduced-motion modes display all text immediately. The Contact email keeps its separate shared marker reveal.


## Pacing and mobile polish

Visual entrances now travel 12px. Paper settling is quieter (half-percent scale, 0.4–0.65-degree tilt adjustment), with smaller movement on phones. Text and entrance timelines complete when quick navigation skips their viewport range, while upward exit still reverses them. Body fades receive a short pause to let heading cues lead. Existing scroll line timings are preserved.

Mobile book framing keeps the original Figma crop proportions. The Contact email wraps at the @ boundary instead of splitting its domain; its original marker asset scales vertically to cover all wrapped lines while sharing the text reveal layer. Small-phone paperclip placement clears the title. Mobile navigation controls have at least 44px height.

Hero H1: words appear in place from a subtle 3px blur, with length-sensitive typing intervals and a brief pause before “avocat.” The sequence plays once on load alongside the existing hero lines. Native spaces retain responsive wrapping; a single accessible heading copy stays available. Reduced-motion preferences skip the entrance.

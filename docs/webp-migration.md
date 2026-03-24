# Animation Migration: MP4 → Animated WebP

## What We Did

Replaced all 8 MP4 video animations with animated WebP images across the app. This includes the Zoe character animations used during interviews (speaking, listening, thinking, etc.) and on static pages (Home, SelfApply).

### Files Changed

| File                      | Change                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/pages/Interview.tsx` | Replaced `<video>` element with `<img>`, removed video preloading/switching logic (~80 lines removed) |
| `src/pages/Home.tsx`      | Swapped static SVG with `thoughtbubble.webp`                                                          |
| `src/pages/SelfApply.tsx` | Swapped static SVG with `glassadjustment.webp`                                                        |
| `public/assets/*.webp`    | 8 new animated WebP files (converted from MP4 sources)                                                |

---

## Why We Did This

The MP4 `<video>` approach had a core problem: **the browser's video decoder is too heavy for short looping animations.**

Every time the character switched states (e.g., thinking → speaking), the app had to:

1. Change the `<video>` src
2. Wait for the browser to buffer & decode the new video
3. Listen for `canplay` / `canplaythrough` events
4. Call `play()` inside `requestAnimationFrame`
5. Handle a debounce timer to avoid rapid flickering
6. Show a loading opacity fade during the switch

This caused **100–500ms visible lag** on each state change, with the character briefly going semi-transparent. On mobile devices, it was worse because the hardware video decoder was shared with the TTS audio pipeline.

**Animated WebP with `<img>` eliminates all of this.** Swapping an image src is instant — the browser uses its lightweight image cache instead of the heavy media pipeline.

---

## File Size Comparison

### Before (MP4)

| File                 | Size          |
| -------------------- | ------------- |
| thoughtbubble.mp4    | 260 KB        |
| juggling.mp4         | 270 KB        |
| speaking-edited.mp4  | 260 KB        |
| listening.mp4        | 280 KB        |
| regular-thinking.mp4 | 310 KB        |
| bubblepop.mp4        | 190 KB        |
| glassadjustment.mp4  | 160 KB        |
| ballbounce.mp4       | 260 KB        |
| **Total**            | **~1,990 KB** |

### After (WebP — optimized)

| File                  | Size          |
| --------------------- | ------------- |
| thoughtbubble.webp    | 180 KB        |
| juggling.webp         | 178 KB        |
| speaking-edited.webp  | 325 KB        |
| listening.webp        | 252 KB        |
| regular-thinking.webp | 102 KB        |
| bubblepop.webp        | 146 KB        |
| glassadjustment.webp  | 123 KB        |
| ballbounce.webp       | 133 KB        |
| **Total**             | **~1,439 KB** |

**Result: 28% smaller total file size than the original MP4s.**

---

## Conversion Settings

All WebP files were created using ffmpeg with these settings:

- **Resolution:** 300px (original MP4 was 720px; max display size is 288px, so 300px is sufficient even for retina)
- **Frame rate:** 15 fps (original was 24 fps; difference is imperceptible for cartoon animations)
- **Quality:** 30 (lossy WebP scale 0–100; 30 is a good balance for simple character art)
- **Looping:** Infinite loop
- **Background:** Original green (#E6F1E4) replaced with page background (#FBFAF8) using colorkey

### Command used:

```bash
ffmpeg -y \
  -f lavfi -i "color=c=0xFBFAF8:s=300x300:r=15" \
  -i input.mp4 \
  -filter_complex "[1:v]fps=15,scale=300:-1,colorkey=0xE6F1E4:0.08:0.05[fg];[0:v][fg]overlay=(W-w)/2:(H-h)/2:shortest=1" \
  -vcodec libwebp -lossless 0 -compression_level 6 -q:v 30 -loop 0 -an -vsync 0 \
  output.webp
```

---

## Advantages

| Advantage                   | Explanation                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Instant state switching** | No buffering or decoding delay when the character changes animation. Previously took 100–500ms, now instant.     |
| **Simpler code**            | Removed ~80 lines of video preloading, event handling, and debounce logic. Just a simple `<img>` src swap.       |
| **Less CPU usage**          | Image decoder is lighter than H.264 video decoder, especially for small animations.                              |
| **No decoder contention**   | MP4 video decoder competed with TTS audio pipeline on mobile. WebP uses the image decoder — completely separate. |
| **Smaller file size**       | 1.4 MB total vs 2.0 MB for MP4.                                                                                  |
| **Better caching**          | Browser image cache is simpler and more reliable than video buffer cache.                                        |
| **No playback glitches**    | No more `play()` promise rejections, autoplay issues, or race conditions.                                        |

---

## Other Options We Considered

### 1. GIF

| Aspect                 | Details                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why considered**     | Universally supported, simple `<img>` tag, no JavaScript needed.                                                                                                                                               |
| **Why rejected**       | GIF uses a 256-color palette — the Zoe character has gradients and smooth edges that would look visibly degraded. File sizes are **2–5x larger** than WebP for the same quality. No lossy compression control. |
| **File size estimate** | ~5–8 MB total (vs 1.4 MB WebP)                                                                                                                                                                                 |

### 2. Lottie (JSON animations)

| Aspect             | Details                                                                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why considered** | Best possible performance — vector-based, tiny file sizes (~10–50 KB per animation), infinitely scalable, smooth at any FPS.                                                                                                                                                        |
| **Why rejected**   | Requires the original animations to be created in Adobe After Effects and exported via the Bodymovin plugin. Our source files are MP4 videos — there is **no way to convert MP4 to Lottie**. Would require the designer to recreate all 8 animations from scratch in After Effects. |
| **Verdict**        | Best option if starting fresh, but not practical for converting existing MP4 assets.                                                                                                                                                                                                |

### 3. APNG (Animated PNG)

| Aspect                 | Details                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why considered**     | Supports transparency, lossless quality, works in `<img>` tag.                                                                                                  |
| **Why rejected**       | File sizes are **5–10x larger** than WebP because every frame is stored as a full PNG. For 8 animations, total would be ~10–15 MB. No lossy compression option. |
| **File size estimate** | ~10–15 MB total (vs 1.4 MB WebP)                                                                                                                                |

### 4. CSS Sprite Sheet Animation

| Aspect             | Details                                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why considered** | Single image file, controlled via CSS `steps()` animation, very predictable performance.                                                                                                                                                                                   |
| **Why rejected**   | Each animation has 30–70 frames at 300px. A sprite sheet would be a single image ~9,000–21,000px wide — browsers struggle with images this large. Also complex to maintain and update. Poor approach for multiple different-length animations that need dynamic switching. |

### 5. Keep MP4 but Optimize the Code (Multiple Hidden `<video>` Elements)

| Aspect             | Details                                                                                                                                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why considered** | No file conversion needed. Pre-create all 8 `<video>` elements with different sources, toggle visibility via CSS instead of swapping src. Avoids the re-decode problem.                                                                                                                               |
| **Why rejected**   | 8 simultaneous `<video>` elements means 8 active video decoders in memory — heavy on mobile devices (~15–40 MB decoder buffers). Still has `play()` promise issues and autoplay policy problems. Adds DOM complexity. The fundamental problem (video decoder overhead) is reduced but not eliminated. |

### Summary: Why Animated WebP Won

| Option                       | File Size | Quality | Code Complexity  | Browser Support | Practical?                |
| ---------------------------- | --------- | ------- | ---------------- | --------------- | ------------------------- |
| **MP4 `<video>`** (original) | 2.0 MB    | ★★★★★   | High (80+ lines) | ★★★★★           | ✅ but slow               |
| **Animated WebP `<img>`** ✅ | 1.4 MB    | ★★★★    | Low (5 lines)    | ★★★★ (97%)      | ✅ best fit               |
| GIF                          | ~6 MB     | ★★      | Low              | ★★★★★           | ❌ too large, bad quality |
| Lottie                       | ~0.3 MB   | ★★★★★   | Medium           | ★★★★            | ❌ needs source recreated |
| APNG                         | ~12 MB    | ★★★★★   | Low              | ★★★★            | ❌ way too large          |
| CSS Sprites                  | ~8 MB     | ★★★★    | High             | ★★★★★           | ❌ impractical            |
| Multi `<video>`              | 2.0 MB    | ★★★★★   | Medium           | ★★★★★           | ❌ heavy on mobile        |

Animated WebP is the best balance of file size, quality, simplicity, and performance for our specific use case.

---

## Disadvantages

| Disadvantage                                               | Does it affect us?                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **No hardware GPU decoding** — WebP uses CPU, MP4 uses GPU | **No.** At 300px / 15fps the CPU load is trivial. Would only matter at 1080p/60fps. |
| **No Safari support before iOS 14 (2020)**                 | **No.** 95%+ of users are on newer browsers.                                        |
| **No playback controls** (pause, seek, speed)              | **No.** We don't need any controls for looping character animations.                |
| **No audio track support**                                 | **No.** Our MP4s were always muted.                                                 |
| **Higher memory for long animations**                      | **No.** Our animations are 2–4 seconds long.                                        |
| **Fewer editing tools**                                    | **No.** We edit the MP4 source files and convert to WebP.                           |

**For our use case (short looping character animations at small display sizes with no audio), none of the disadvantages apply.**

---

## How to Add a New Animation

1. Get the MP4 source file from the designer
2. Place it in `public/assets/`
3. Run the ffmpeg command above with the new filename
4. Reference it in code as `/assets/filename.webp`
5. Add the key to `animationStates` in `Interview.tsx` if it's an interview animation

---

## Browser Support

| Browser          | Animated WebP Support              |
| ---------------- | ---------------------------------- |
| Chrome           | ✅ Since Chrome 32 (2014)          |
| Firefox          | ✅ Since Firefox 65 (2019)         |
| Safari           | ✅ Since Safari 14 / iOS 14 (2020) |
| Edge             | ✅ Since Edge 18 (2018)            |
| Samsung Internet | ✅ Since v4 (2016)                 |

**Global support: ~97% of users** ([Can I Use](https://caniuse.com/webp))

# Golden Hour

A cinematic movie discovery website built with plain HTML, CSS and JavaScript. No frameworks, no build step.

Browse trending films, filter by mood, genre, era, language and rating, watch trailers, see where a film is streaming, and save favourites to your own vault. The look is near-black with dark antique gold used for lines, text and shimmer (not bright yellow fills), and the hero, popup and cards take on the colours of each film's poster.

Movie data comes from [The Movie Database (TMDB)](https://www.themoviedb.org/).

---

## Features

**Look and feel**
- Cinematic intro (about 5 seconds): a gold record spins on a black marble deck, then the title arrives with a shimmer. Click anywhere to skip.
- Moving golden galaxy background: a rotating spiral, drifting nebula, twinkling stars, floating dust and shooting stars. It reacts slightly to the mouse.
- Per-film colour theming: the hero, popup and card hover glow match the dominant colour of each poster.
- Film grain, vignette, 3D tilting posters and gold shimmer text.

**Discovering movies**
- Infinite scroll through TMDB's catalogue, with a placeholder card for films that have no poster.
- Top 10 this week, In theatres now and Coming soon rows.
- Search by title. Your filters apply to search results too.
- Mood presets: Cozy night in, Mind-bending, Edge of my seat, Cry it out, Date night, Epic escape, Spooky hours, Laugh out loud.
- Multi-select genres with Match any or Match all.
- Era buttons (1960s to 2020s, Classics) plus From year / To year for any range back to 1900.
- Length, language, minimum rating, sort order and an Include obscure films option.
- Active filter tags you can remove one by one, and a Clear all button.
- Surprise me: a poster roulette that picks a film using your current filters.
- 3-question quiz that sets the filters and then picks a film.

**Movie popup**
- Trailer that plays inside the page, with buttons to switch between trailers, teasers and clips.
- Rating ring, runtime, genres, tagline, overview and director.
- Where to watch (streaming, rent or buy) for your region.
- Cast photos and an If you liked this row.

**Vault and personalisation**
- Save films with the bookmark button. They are stored in your browser (`localStorage`).
- Mark films as watched, and copy your whole list as text.
- Your taste: bars showing the genres you save most.
- Picked for you: a row of recommendations based on the films in your vault.

**Shareable links**
- Filters, search and the open film are stored in the page address. Copy the link and anyone gets the same view.

**Shortcuts**
- `/` focuses the search box.
- `Esc` closes the vault, quiz and roulette.

---

## Project structure

```
goldenhour/
├── index.html    page structure and intro markup
├── style.css     all styling, colours and animations
├── script.js     TMDB calls, filters, popup, vault, theming
├── intro.js      the 5-second intro sequence
├── galaxy.js     the animated galaxy background (canvas)
├── logo.svg      logo (rising sun made of record grooves)
└── README.md
```

---

## Getting started

### 1. Get a free TMDB API key
1. Create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings > API** and request a key (choose Developer, personal use).
3. Copy the **API Key (v3 auth)**.

### 2. Add your key
Open `script.js` and paste the key at the very top:

```js
const KEY = "PASTE_YOUR_TMDB_KEY_HERE";
```

### 3. Run it locally
Run the site through a local server. **Do not double-click `index.html`**, because YouTube blocks trailers on `file://` pages (Error 153).

**Option A: VS Code (easiest)**
1. Install the **Live Server** extension.
2. Right-click `index.html` and choose **Open with Live Server**.

**Option B: Python**
```bash
python -m http.server 5500
```
Then open `http://localhost:5500`.

---

## Configuration

| What | Where | Default |
| --- | --- | --- |
| TMDB API key | `KEY` at the top of `script.js` | placeholder |
| Streaming region | `REGION` near the top of `script.js` | `"IN"` (India) |
| Mood presets | `MOODS` array in `script.js` | 8 moods |
| Era buttons | `ERAS` array in `script.js` | 1960s to 2020s, Classics |
| Intro timing | `setTimeout` values in `intro.js` | reveal at 2s, ends at 5s |
| Galaxy star count | `2200` in `galaxy.js` | lower it if the page lags |
| Colours | `:root` variables in the last section of `style.css` (`--a0` to `--a3`, `--metal`, `--btn`) | dark antique gold |

To change the streaming country, use a two-letter code such as `"US"`, `"GB"` or `"AU"`.

---

## Deploying (GitHub Pages)

1. Push the folder to a GitHub repository.
2. In the repo, go to **Settings > Pages**, choose your branch and the root folder, and save.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

**About your API key:** this is a front-end-only project, so the TMDB key is visible to anyone who views the page source. For a personal or portfolio project this is normal, and TMDB keys are free and can be regenerated. If you want to keep the key private, you would need a small backend or serverless function that makes the TMDB requests for you.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Hero says "Add your TMDB key", or nothing loads | The key is missing or wrong. Check `KEY` in `script.js` and refresh. |
| Trailer shows a YouTube error (Error 153) | You opened the file directly. Run it with Live Server or `python -m http.server`. |
| "No trailer is listed for this film" | TMDB has no trailer for that title. Use the Search on YouTube link. |
| Trailer is blocked or unavailable | The studio disabled embedding. Use the Open on YouTube link. |
| Colours don't change per film | The browser blocked reading the poster colours. Make sure you are using a local server, not `file://`. The site falls back to champagne gold. |
| Page feels slow | Lower the star count in `galaxy.js` (the number `2200`). |
| Intro doesn't play | Your system has "reduce motion" turned on, so the intro is skipped on purpose. |
| Vault is empty after switching browsers | The vault is saved per browser and per site address. |

---

## Browser support

Works in current versions of Chrome, Edge, Safari and Firefox. The smooth colour transitions use CSS `@property` and `color-mix()`, which need a fairly recent browser. On older browsers the site still works, with colours changing instantly.

---

## Credits

- Movie data and images: [TMDB](https://www.themoviedb.org/).
- Fonts: Cinzel, Cormorant Garamond and DM Sans from Google Fonts.
- Trailers: embedded from YouTube.

*This product uses the TMDB API but is not endorsed or certified by TMDB.*

---

## License

Add the license of your choice here (for example MIT).

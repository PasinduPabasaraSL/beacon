# Beacon website

The public landing site for [Beacon](https://github.com/PasinduPabasaraSL/beacon), built with Vite, React and Tailwind CSS. It is a static site with no backend.

## Develop

```bash
npm install
npm run dev       # http://localhost:5180
```

```bash
npm run lint
npm run format    # Prettier with the Tailwind class sorter
npm run build     # outputs to dist/
npm run preview
```

## Deploy on Vercel

1. Import the repository in Vercel.
2. Set **Root Directory** to `website`.
3. Keep the detected Vite preset (build command `npm run build`, output directory `dist`).

The site is a single page with anchor links, so no rewrites are needed.

## Screenshots

The images in `src/assets/screens/` are captures of the Beacon app running the seeded demo workspace. Retake them after visible UI changes so the site stays accurate.

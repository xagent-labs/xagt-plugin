// Explicit, minimal PostCSS config so Next.js does not auto-probe for
// Tailwind. This project uses plain hand-written CSS.
module.exports = {
  plugins: {
    autoprefixer: {},
  },
};

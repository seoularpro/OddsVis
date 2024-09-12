/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
    
  ],
  daisyui: {
    themes: ["light", "dark", "cupcake", "night", "luxury", "sunset", "dim", "halloween", "autumn", "synthwave", "cyberpunk", "aqua", "forest"],
  },
}


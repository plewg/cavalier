/** @satisfies {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-atkinson)"],
                // mono: ["var(--font-inconsolata)"],
            },
        },
    },
    plugins: [],
};

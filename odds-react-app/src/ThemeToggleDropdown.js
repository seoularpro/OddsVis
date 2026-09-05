import React, { useState } from "react";
import { useTheme } from './ThemeProvider'; // Import the custom hook

const ThemeToggleDropdown = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'sunset');

    const themes = ["autumn", "dark", "cupcake", "night", "luxury", "sunset", "dim", "halloween", "light", "synthwave", "cyberpunk", "aqua", "forest"];

    const handleThemeChange = (event) => {
        const newTheme = event.target.value;
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <div style={{ display: "inline-flex" }}>
            <select
                className="vl-select"
                value={theme}
                onChange={handleThemeChange}
            >
                {themes.map((t) => (
                    <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default ThemeToggleDropdown;

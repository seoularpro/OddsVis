import React, { createContext, useState, useEffect, useContext } from 'react';

// Create a Theme Context
const ThemeContext = createContext();

// Create a Theme Provider component
export const ThemeProvider = ({ children }) => {
  // State to manage the current theme, defaulting to 'autumn'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'autumn');

  // Apply the theme to the `html` or `body` element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Function to toggle or set a theme
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme); // Persist the theme in localStorage
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

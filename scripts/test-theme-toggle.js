console.log('Theme Diagnostics:');
console.log('==================');

// Check localStorage
const storedTheme = localStorage.getItem('ui-theme');
console.log('Stored theme in localStorage:', storedTheme);

// Check HTML element
const htmlElement = document.documentElement;
console.log('HTML classes:', htmlElement.className);
console.log('Has dark class:', htmlElement.classList.contains('dark'));
console.log('Has light class:', htmlElement.classList.contains('light'));

// Check computed styles
const bgColor = window.getComputedStyle(htmlElement).backgroundColor;
console.log('Background color:', bgColor);

// Test toggle
console.log('\nAttempting to toggle theme...');

// Simulate theme toggle
const currentTheme = storedTheme || 'system';
let newTheme;

if (currentTheme === 'system') {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  newTheme = isDark ? 'light' : 'dark';
} else {
  newTheme = currentTheme === 'light' ? 'dark' : 'light';
}

console.log('Current theme:', currentTheme);
console.log('Would switch to:', newTheme);

// Apply the theme
localStorage.setItem('ui-theme', newTheme);
htmlElement.classList.remove('light', 'dark');
htmlElement.classList.add(newTheme);

console.log('\nAfter toggle:');
console.log('HTML classes:', htmlElement.className);
console.log('Stored theme:', localStorage.getItem('ui-theme'));

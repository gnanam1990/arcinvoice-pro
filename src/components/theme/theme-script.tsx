/**
 * Inline blocking script to prevent flash of incorrect theme before hydration.
 */
export function ThemeScript() {
  const code = `(function(){try{var k='arcinvoice-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();`;

  return (
    <script
      // Runs before paint when placed early in <body>
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

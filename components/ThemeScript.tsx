// Runs before paint so a stored theme never flashes the wrong colours.
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

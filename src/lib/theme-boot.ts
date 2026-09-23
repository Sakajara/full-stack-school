export const THEME_KEY = "chuo-theme";

// Runs before the page paints (inlined in the root layout), so the right
// theme shows on first load with no flash.
export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;


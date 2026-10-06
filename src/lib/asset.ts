/** Prefixa um caminho de /public com a base do site (ex.: /axio/ no GitHub Pages). */
export function asset(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
}

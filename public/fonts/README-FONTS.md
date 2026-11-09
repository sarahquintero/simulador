# Integración de la Fuente Tipográfica Principal: Corinthian Bold Regular

## Estado en el entorno
Durante la inspección del sistema (`C:\Windows\Fonts` y carpeta del proyecto):
- **Calibri** (`calibri.ttf`, `calibrib.ttf`) se encuentra instalada nativamente en el sistema operativo y se carga directamente.
- **Corinthian Bold Regular** no se encontró preinstalada como archivo local en el sistema.

## Cómo incorporar el archivo original de Corinthian Bold Regular
La hoja de estilos `src/styles/index.css` ya incluye la declaración `@font-face` configurada para cargar automáticamente la fuente local sin necesidad de tocar el código:

1. Copia el archivo de la fuente en esta carpeta (`public/fonts/`) con cualquiera de los siguientes nombres:
   - `public/fonts/Corinthian-Bold-Regular.woff2` (recomendado)
   - `public/fonts/Corinthian-Bold-Regular.ttf`
2. Recarga el navegador. La regla `@font-face` detectará el archivo local inmediatamente y lo aplicará a todos los títulos principales, encabezados, nombres de secciones y elementos destacados (`--font-heading`).
3. Mientras el archivo no esté presente en `public/fonts/`, el sistema utiliza una pila tipográfica de respaldo compatible con todos los caracteres matemáticos y latinos.

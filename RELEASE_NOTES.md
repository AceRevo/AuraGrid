# ⚡ AuraGrid v2.0.0 — Next-Gen Bento Desktop HUD & Kinetic Ambilight

Bienvenido a la primera versión oficial estable y empaquetada de **AuraGrid**, la suite de widgets de escritorio flotantes con estética **Bento Box**, aceleración por hardware con soporte **DirectComposition** y motor de reactividad cinética de audio.

---

## 🚀 ¿Qué hay de nuevo en la v2.0.0?

### 🧩 1. Bento SnapEngine & Kinetic Ambilight
* **DirectComposition 100% Transparente:** Interfaz limpia sin marcos, barras de título ni bordes opacos de Windows, integrándose de forma orgánica con cualquier fondo de pantalla.
* **Modo Draggable / Modo Bloqueo (`Ctrl + L`):** Arrastra y recoloca tus cubos libremente o bloquéalos en su sitio con un solo atajo.
* **Click-Through Toggle (`Ctrl + Shift + T`):** Haz que los widgets sean completamente intangibles para trabajar o jugar sin interferencias.

### 📊 2. 12 Widgets Bento Esenciales Integrados
1. **Reloj & Clima Dinámico:** Hora digital sincronizada, estado meteorológico en tiempo real (vía Open-Meteo API), previsión a 3 días y geolocalización automática.
2. **Reproductor Katana & Visualizador CAVA (60 FPS):** Soporte de audio local y captura de audio del sistema (WASAPI loopback) con espectro reactivo cinematográfico a 60 FPS.
3. **Hardware Telemetry HUD:** Monitor de CPU, RAM, GPU y latencia con gráficas dinámicas SVG en tiempo real.
4. **Batería & Accesos Rápidos:** Estado de carga AC/Batería y botones de lanzamiento rápido personalizables (GitHub, YouTube, Spotify, etc.).
5. **Pomodoro & Cronómetro de Enfoque:** Temporizador de intervalos de trabajo/descanso con notificaciones visuales.
6. **World Clock:** Visualización simultánea de múltiples husos horarios internacionales.
7. **Bento Notes:** Bloc de notas rápido con persistencia local (`localStorage`).
8. **Crypto & Market Pulse:** Seguimiento en vivo de criptomonedas y tipos de cambio.
9. **Network Bandwidth Monitor:** Velocidad de descarga y subida en tiempo real.
10. **Inspirational Quotes:** Frases dinámicas diarias sobre desarrollo y diseño.
11. **Process Task Watcher:** Monitor de procesos activos de alto impacto en Windows.
12. **Ambience Generator:** Sonidos ambientales binaurales (lluvia, café, ruido blanco) para concentración.

### 🎨 3. 5 Arquetipos de Ricing Preconfigurados
* **Tokyo Dark:** Tonos oscuros, negros carbón y acentos carmesí katana.
* **Cyberpunk Neon:** Cian eléctrico, magenta vibrante y resplandores de neón.
* **Nordic Frost:** Blancos gélidos, azules nórdicos y estética minimalista.
* **Sunset Cyber:** Gradientes cálidos violeta, ámbar y naranja atardecer.
* **Emerald Matrix:** Verdes terminal retro y fosforescencia limpia.

### 🎮 4. Game Occlusion & Rendimiento Zero-CPU
* **Optimización en Reposo:** Pausa de renderizado y CAVA cuando no hay actividad de audio o cuando una aplicación a pantalla completa (juegos, películas) está en foco.
* **Consumo Mínimo:** Consumo de recursos extremadamente bajo (<1% de CPU en reposo).

---

## 📦 Contenido del Paquete Portable (`AuraGrid-v2.0.0-win32-x64.zip`)

El archivo descargable es un paquete **100% portable para Windows (x64)** que no requiere instalación previa ni de Node.js ni de dependencias externas:

| Archivo / Componente | Descripción |
| :--- | :--- |
| **`AuraGrid.exe`** | Ejecutable nativo directo de 64 bits con soporte DirectComposition. |
| **`Lanzar-AuraGrid.bat`** | Lanzador inteligente con auto-detección y diagnósticos. |
| **`resources/app.asar`** | Núcleo del programa empaquetado y optimizado. |
| **Librerías Chromium / Vulkan** | Runtime completo independiente incluido. |

---

## 🛠️ Cómo Iniciar

1. Descarga el archivo adjunto **`AuraGrid-v2.0.0-win32-x64.zip`** desde la sección de assets abajo.
2. Descomprímelo en la carpeta de tu preferencia (por ejemplo, `C:\Program Files\AuraGrid` o en tu carpeta de usuario).
3. Haz doble clic en **`AuraGrid.exe`** o en **`Lanzar-AuraGrid.bat`**.
4. ¡Listo! Presiona `Ctrl + ,` en cualquier momento para abrir el panel de configuración y personalizar tus widgets.

---

## ⌨️ Atajos de Teclado Globales

* **`Ctrl + L`**: Bloquear / Desbloquear arrastre de widgets.
* **`Ctrl + H`**: Ocultar / Mostrar widgets (Modo Zen).
* **`Ctrl + Shift + T`**: Alternar modo Click-Through (traspasable con el ratón).
* **`Ctrl + ,`**: Abrir panel de Ajustes y Arquetipos.

---

**Desarrollado y mantenido por:** [@AceRevo](https://github.com/AceRevo)  
**Código Fuente:** [github.com/AceRevo/AuraGrid](https://github.com/AceRevo/AuraGrid)

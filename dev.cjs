// Запуск dev-сервера из любой папки: Tailwind ищет content относительно cwd
process.chdir(__dirname);
process.argv.push("--port", "5178", "--strictPort");
import("./node_modules/vite/bin/vite.js");

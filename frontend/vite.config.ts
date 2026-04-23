import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	build: {
		outDir: path.resolve(__dirname, '../backend/static'),
		emptyOutDir: true,
	},
	server: {
		proxy: {
			'/api': 'http://localhost:5000'
		}
	}
})
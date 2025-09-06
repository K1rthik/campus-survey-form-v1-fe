import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    host:"172.30.6.7",
    port:"3057", 
 
    proxy:{
      "/api":{
        target:"http://172.30.6.7:3057",
        changeOrigin: true
      }
    }
  }, 
})

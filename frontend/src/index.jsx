import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)


import React from 'react'
import ReactDOM from 'react-dom/client'
import { LabSlotApp } from '../components/labslot/labslot-app'
import { LabSlotProvider } from '../components/labslot/store'
import { AuthProvider } from './context/AuthContext'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <LabSlotProvider>
        <LabSlotApp />
      </LabSlotProvider>
    </AuthProvider>
  </React.StrictMode>,
)

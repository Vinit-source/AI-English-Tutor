import { useState } from 'react'
import { 
  createBrowserRouter, 
  RouterProvider, 
  Route, 
  createRoutesFromElements 
} from 'react-router-dom'
import './App.css'
import HomePage from './components/HomePage'
import ChatInterface from './components/ChatInterface'
import LearnedWords from './components/LearnedWords'

function App() {
  // Create a router with the future flags enabled to prevent warnings
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat/:scenario" element={<ChatInterface />} />
        <Route path="/learned-words" element={<LearnedWords />} />
      </>
    ),
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }
    }
  );

  return (
    <div className="app-container">
      <RouterProvider router={router} />
    </div>
  )
}

export default App

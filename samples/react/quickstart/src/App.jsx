import { createBrowserRouter, RouterProvider } from 'react-router'
import { ProtectedRoute, CallbackRoute } from '@thunderid/react-router'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import TokenDebugPage from './pages/TokenDebugPage'
import './App.css'

const router = createBrowserRouter([
  {
    element: <Nav />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      { path: '/token', element: <ProtectedRoute><TokenDebugPage /></ProtectedRoute> },
      { path: '/callback', element: <CallbackRoute /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

import { createBrowserRouter, RouterProvider } from 'react-router'
import { ProtectedRoute } from '@thunderid/react-router'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import TokenDebugPage from './pages/TokenDebugPage'
import './App.css'

const router = createBrowserRouter([
  {
    element: <Nav />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/token', element: <ProtectedRoute><TokenDebugPage /></ProtectedRoute> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

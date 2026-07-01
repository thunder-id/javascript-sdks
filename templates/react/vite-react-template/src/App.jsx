import { createBrowserRouter, RouterProvider } from 'react-router'
import { ProtectedRoute } from '@thunderid/react-router'
import Home from './Home.jsx'
import Dashboard from './Dashboard.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute redirectTo="/">
        <Dashboard />
      </ProtectedRoute>
    ),
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

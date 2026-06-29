import { createBrowserRouter, RouterProvider } from 'react-router'
import { CallbackRoute } from '@thunderid/react-router'
import Home from './Home.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/callback', element: <CallbackRoute /> },
])

export default function App() {
  return <RouterProvider router={router} />
}

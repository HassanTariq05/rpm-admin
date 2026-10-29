import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@heroui/react'
import { ThemeProvider, useTheme } from './src/contexts/theme-context'
import { ThemePicker } from './src/app/components/theme-picker'
import { router } from './src/router'
import { queryClient } from './src/lib/query-client'
import './src/styles.css'
router.update({history:createMemoryHistory({initialEntries:['/login']})})
function Preview(){const {theme,toggleTheme}=useTheme();const[show,setShow]=useState(true);return <>{show&&<div className="fixed right-3 top-3 z-50 flex gap-2 rounded-xl border border-border bg-surface p-2"><ThemePicker/><Button aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`} onPress={toggleTheme}>{theme==='dark'?'Light':'Dark'}</Button><Button onPress={()=>setShow(false)}>Hide preview tools</Button></div>}<RouterProvider router={router}/></>}
createRoot(document.getElementById('root')!).render(<ThemeProvider><QueryClientProvider client={queryClient}><Preview/></QueryClientProvider></ThemeProvider>)

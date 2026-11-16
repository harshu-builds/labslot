import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LabSlotProvider } from './store'
import { LandingPage, LoginScreen, RegistrationScreen, RoleSelection } from './landing'
import { PortalShell } from './portal-shell'
import { AdminStudentsPage, AssistantPage, BookingsPage, BookingPage, DashboardPage, EquipmentPage, ProfilePage } from './portal-pages'

function LabSlotRouter() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const path = location.pathname + location.search
  const [role,setRole]=useState<'student'|'admin'>(()=>window.localStorage.getItem('labslot-role')==='admin'?'admin':'student')
  const [toast,setToast]=useState('')
  const navigate=useCallback((next:string)=>{routerNavigate(next);window.scrollTo({top:0,behavior:'smooth'})},[routerNavigate])
  const notify=useCallback((message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),3200)},[])
  const signIn=(nextRole:'student'|'admin')=>{setRole(nextRole);window.localStorage.setItem('labslot-role',nextRole);navigate(`/${nextRole}/dashboard`);notify(`Welcome to your ${nextRole} portal.`)}
  const logout=()=>{window.localStorage.removeItem('labslot-role');setRole('student');navigate('/');notify('You have been signed out.')}
  const register=(name:string,email:string)=>{setRole('student');window.localStorage.setItem('labslot-role','student');window.localStorage.setItem('labslot-demo-user',JSON.stringify({name,email}));navigate('/student/dashboard');notify(`Welcome to LabSlot, ${name.split(' ')[0]}.`)}
  const cleanPath=path.split('?')[0]
  if(cleanPath==='/')return <><LandingPage navigate={navigate}/>{toast&&<div className="toast-message">{toast}</div>}</>
  if(cleanPath==='/get-started'||cleanPath==='/roles')return <><RoleSelection navigate={navigate}/>{toast&&<div className="toast-message">{toast}</div>}</>
  if(cleanPath==='/login')return <><LoginScreen navigate={navigate} role={new URLSearchParams(path.split('?')[1]??'').get('role')==='admin'?'admin':'student'} onLogin={signIn}/>{toast&&<div className="toast-message">{toast}</div>}</>
  if(cleanPath==='/register')return <RegistrationScreen navigate={navigate} onRegister={register}/>
  const isAdmin=cleanPath.startsWith('/admin')
  const routeRole=isAdmin?'admin':'student'
  if(isAdmin&&role!=='admin')return <Navigate to="/login?role=admin" replace/>
  const screen=cleanPath.split('/')[2]??'dashboard'
  let page
  if(screen==='dashboard')page=<DashboardPage role={routeRole} navigate={navigate} notify={notify}/>
  else if(screen==='equipment')page=<EquipmentPage role={routeRole} navigate={navigate} notify={notify}/>
  else if(screen==='book')page=<BookingPage navigate={navigate} notify={notify} search={path.split('?')[1]??''}/>
  else if(screen==='bookings'||screen==='requests'||screen==='reservations')page=<BookingsPage role={routeRole} notify={notify}/>
  else if(screen==='history')page=<BookingsPage role={routeRole} historyOnly notify={notify}/>
  else if(screen==='assistant')page=<AssistantPage notify={notify}/>
  else if(screen==='students')page=<AdminStudentsPage notify={notify}/>
  else if(screen==='profile')page=<ProfilePage role={routeRole} notify={notify}/>
  else page=<DashboardPage role={routeRole} navigate={navigate} notify={notify}/>
  return <><PortalShell role={routeRole} path={path} navigate={navigate} onLogout={logout}>{page}</PortalShell>{toast&&<div className="toast-message"><span className="toast-check">✓</span>{toast}</div>}</>
}

export function LabSlotApp() {
  return <BrowserRouter><LabSlotProvider><LabSlotRouter/></LabSlotProvider></BrowserRouter>
}

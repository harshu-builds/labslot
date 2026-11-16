'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bell, CalendarDays, ChevronDown, FlaskConical, LayoutDashboard, LogOut, Menu, Microscope, MessageCircle, Users, X, UserRound, History, Boxes, ClipboardCheck } from 'lucide-react'
import { Brand } from './landing'

const studentNav = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Explore Equipment', path: '/student/equipment', icon: Microscope },
  { label: 'Book a Slot', path: '/student/book', icon: CalendarDays },
  { label: 'My Bookings', path: '/student/bookings', icon: ClipboardCheck },
  { label: 'Booking History', path: '/student/history', icon: History },
  { label: 'AI Assistant', path: '/student/assistant', icon: MessageCircle },
  { label: 'Profile', path: '/student/profile', icon: UserRound },
]
const adminNav = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Equipment', path: '/admin/equipment', icon: Boxes },
  { label: 'Booking Requests', path: '/admin/requests', icon: ClipboardCheck },
  { label: 'Reservations', path: '/admin/reservations', icon: CalendarDays },
  { label: 'Students', path: '/admin/students', icon: Users },
  { label: 'Usage History', path: '/admin/history', icon: History },
  { label: 'Profile', path: '/admin/profile', icon: UserRound },
]

export function PortalShell({ role, path, navigate, onLogout, children }: { role: 'student'|'admin'; path: string; navigate:(path:string)=>void; onLogout:()=>void; children:ReactNode }) {
  const isAdmin = role === 'admin'
  const nav = isAdmin ? adminNav : studentNav
  const current = path.split('?')[0]
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pageTitle = nav.find((item)=>item.path===current)?.label ?? 'Dashboard'
  return <div className="portal-frame">
    {drawerOpen && <button className="drawer-scrim" aria-label="Close navigation" onClick={()=>setDrawerOpen(false)}/>}
    <aside className={`sidebar ${drawerOpen?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand compact/><button className="sidebar-close icon-button" aria-label="Close menu" onClick={()=>setDrawerOpen(false)}><X size={18}/></button></div>
      <div className="sidebar-section-label">{isAdmin?'ADMIN':'STUDENT'} PORTAL</div>
      <nav className="side-nav" aria-label={`${role} navigation`}>{nav.map(({label,path:target,icon:Icon})=><button key={target} className={`side-link ${current===target?'side-link-active':''}`} onClick={()=>{navigate(target);setDrawerOpen(false)}}><Icon size={16}/><span>{label}</span>{label==='Booking Requests'&&isAdmin&&<i className="nav-count">3</i>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-symbol"><FlaskConical size={17}/></div><strong>Need a hand?</strong><span>Our lab team is here to help.</span><button onClick={()=>navigate(isAdmin?'/admin/profile':'/student/assistant')}>Get help <span>↗</span></button></div><button className="side-link logout-link" onClick={onLogout}><LogOut size={16}/><span>Log out</span></button></div>
    </aside>
    <div className="portal-content">
      <header className="portal-topbar"><button className="icon-button mobile-menu portal-menu" aria-label="Open navigation" onClick={()=>setDrawerOpen(true)}><Menu size={20}/></button><div className="topbar-breadcrumb"><span>{isAdmin?'Admin':'Student'} portal</span><b>/</b><strong>{pageTitle}</strong></div><label className="global-search"><span className="search-glyph">⌕</span><input aria-label="Search LabSlot" placeholder="Search equipment, bookings..." onKeyDown={(event)=>{if(event.key==='Enter')navigate(isAdmin?'/admin/equipment':'/student/equipment')}}/><kbd>⌘ K</kbd></label><div className="topbar-actions"><div className="notification-wrap"><button className={`icon-button notification-button ${notificationsOpen?'active':''}`} aria-label="Notifications" onClick={()=>setNotificationsOpen(!notificationsOpen)}><Bell size={17}/><i/></button>{notificationsOpen&&<div className="notification-popover"><div className="popover-title">Notifications <span>2 new</span></div><div className="notification-item"><span className="notification-dot"/><p><b>Booking approved</b><small>Your microscope booking is confirmed.</small></p><time>2h</time></div><div className="notification-item"><span className="notification-dot notification-dot-blue"/><p><b>Reminder: upcoming slot</b><small>Biology Lab · Thursday at 10 AM.</small></p><time>1d</time></div><button className="popover-footer" onClick={()=>setNotificationsOpen(false)}>Mark all as read</button></div>}</div><div className="topbar-divider"/><button className="user-menu" onClick={()=>navigate(isAdmin?'/admin/profile':'/student/profile')}><span className="avatar avatar-cyan">{isAdmin?'AD':'HG'}</span><span className="user-meta"><strong>{isAdmin?'Admin':'Harshita Gupta'}</strong><small>{isAdmin?'Administrator':'Student'}</small></span><ChevronDown size={14}/></button></div></header>
      <main className="portal-main">{children}</main>
    </div>
  </div>
}


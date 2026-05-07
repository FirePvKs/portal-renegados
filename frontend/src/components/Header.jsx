import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { cldPresets } from '../lib/cloudinary.js';
import Logo from './Logo.jsx';
import RoleBadge from './RoleBadge.jsx';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavigate = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <header className="relative bg-ink-800 border-b border-bone-100/15 z-30">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[14px] scroll-band pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 text-bone-100 hover:text-bone-50 transition-colors"
        >
          <Logo size={48} />
          <span className="font-display text-2xl tracking-widest hidden sm:inline">
            RENEGADOS
          </span>
        </Link>

        {user && (
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-bone-100/10 transition-colors group"
              aria-expanded={open}
              aria-label="Menú de usuario"
            >
              <span className="hidden md:block text-sm font-mono text-bone-100/80 group-hover:text-bone-100">
                {user.username}
              </span>

              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-bone-100/20 group-hover:border-bone-100/50 transition-all bg-ink-700">
                {user.avatar_url ? (
                  <img
                    src={cldPresets.avatarSmall(user.avatar_url)}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-lg text-bone-100">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <svg
                className={`w-3 h-3 text-bone-100/60 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {open && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-3 w-64 bg-ink-800 border border-bone-100/15 rounded-xl shadow-2xl overflow-hidden fade-in-up"
                style={{ animationDuration: '0.15s' }}
              >
                <div className="px-5 py-4 border-b border-bone-100/10 bg-ink-700/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-bone-100/20 bg-ink-600 flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={cldPresets.avatarSmall(user.avatar_url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-xl text-bone-100">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-bone-100 truncate">
                        {user.username}
                      </div>
                      <div className="mt-1">
                        <RoleBadge role={user.role} />
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="py-2">
                  <MenuItem
                    icon={<UserIcon />}
                    label="Mi Perfil"
                    onClick={() => handleNavigate(`/profile/${user.username}`)}
                  />

                  {isAdmin && (
                    <MenuItem
                      icon={<AdminIcon />}
                      label="Panel de Administrador"
                      onClick={() => handleNavigate('/admin')}
                    />
                  )}

                  <div className="my-2 border-t border-bone-100/10" />

                  <MenuItem
                    icon={<LogoutIcon />}
                    label="Salir"
                    onClick={handleLogout}
                    danger
                  />
                </nav>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-5 py-2.5 flex items-center gap-3 text-left text-sm transition-colors
        ${danger
          ? 'text-blood/90 hover:bg-blood/10 hover:text-blood'
          : 'text-bone-100/80 hover:bg-bone-100/5 hover:text-bone-100'
        }`}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1l6 3v4c0 4-2.5 6.5-6 7-3.5-.5-6-3-6-7V4l6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 5l3 3-3 3M14 8H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

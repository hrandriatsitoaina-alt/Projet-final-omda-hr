// src/components/Header.jsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  Home, LayoutDashboard, Users, CreditCard, Settings,
  Bell, UserCircle, LogOut, Menu, X,
  Bot, UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/App.css';
import { useT } from '../hooks/useT';

const Header = ({ onLogout, user }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useT();

  const navItems = useMemo(() => [
    { icon: Home,            label: t('Accueil',        'Fandraisana',   'Home'),       path: '/dashboard' },
    { icon: LayoutDashboard, label: t('Tableau de bord','Tabilao',       'Dashboard'),  path: '/tableau-db' },
    { icon: Users,           label: t('Gestion',        'Fitandremana',  'Management'), path: '/gere-dossier' },
    { icon: CreditCard,      label: t('Paiements',      'Fandoavana',    'Payments'),   path: '/billan' },
    { icon: Settings,        label: t('Paramètres',     'Fandrindrana',  'Settings'),   path: '/Parametre_global' },
  ], [t]);

  const mobileItems = useMemo(() => [
    { icon: Home,            label: t('Accueil',        'Fandraisana',   'Home'),       path: '/dashboard' },
    { icon: LayoutDashboard, label: t('Tableau de bord','Tabilao',       'Dashboard'),  path: '/tableau-db' },
    { icon: Users,           label: t('Gestion',        'Fitandremana',  'Management'), path: '/gere-dossier' },
    { icon: CreditCard,      label: t('Paiements',      'Fandoavana',    'Payments'),   path: '/billan' },
    { icon: Settings,        label: t('Paramètres',     'Fandrindrana',  'Settings'),   path: '/Parametre_global' },
  ], [t]);

  const mobileActions = useMemo(() => [
    { icon: Bot,       label: t('Assistant IA',  'Mpanampy IA',     'AI Assistant'), path: '/diagnostique' },
    { icon: UserCheck, label: t('Vérification',  'Fanamarinana',    'Verify'),       path: '/verification-usager' },
    { icon: Bell,      label: t('Notifications', 'Fampahafantarana','Notifications'),path: '/notification_admin' },
    { icon: UserCircle,label: t('Profil',        'Momba ahy',       'Profile'),      path: '/profil' },
  ], [t]);

  const handleNavigation = useCallback((path) => {
    navigate(path);
    setMenuOpen(false);
  }, [navigate]);

  // ============================================================
  // ✅ LOGOUT FLUIDE — navigation SPA sans rechargement de page
  // ============================================================
  const handleLogout = useCallback(() => {
    // 1. Nettoyage COMPLET du localStorage
    try { localStorage.clear(); } catch (e) { /* ignore */ }

    // 2. Nettoyage COMPLET du sessionStorage
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }

    // 3. Marquer qu'on vient de se déconnecter (pour le nettoyage côté Auth)
    try { sessionStorage.setItem('just_logged_out', 'true'); } catch (e) { /* ignore */ }

    // 4. Callback parent si fourni
    if (onLogout) {
      try { onLogout(); } catch (e) { console.warn(e); }
    }

    // 5. Fermer le menu mobile
    setMenuOpen(false);

    // 6. ✅ Navigation SPA fluide avec resetKey → force le remontage d'Auth
    //    PAS de window.location.href → pas de page blanche
    navigate('/', { replace: true, state: { resetKey: Date.now() } });
  }, [navigate, onLogout]);

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo + Nom */}
        <div className="header-logo">
          <div className="logo-image" aria-label="Logo OMDA" />
          <span className="logo-text">OMDA</span>
        </div>

        {/* Navigation principale (desktop) */}
        <nav className="header-nav">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.path}
                className={`nav-link ${item.path === '/dashboard' ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(item.path);
                }}
              >
                <Icon size={20} /> {item.label}
              </a>
            );
          })}
        </nav>

        {/* Actions utilisateur */}
        <div className="header-actions">
          <button
            className="icon-btn"
            aria-label={t('Assistant IA', 'Mpanampy IA', 'AI Assistant')}
            onClick={() => handleNavigation('/diagnostique')}
          >
            <Bot size={22} />
          </button>

          <button
            className="icon-btn"
            aria-label={t('Notifications', 'Fampahafantarana', 'Notifications')}
            onClick={() => handleNavigation('/notification_admin')}
          >
            <Bell size={22} />
          </button>

          <button
            className="icon-btn"
            aria-label={t('Profil', 'Momba ahy', 'Profile')}
            onClick={() => handleNavigation('/profil')}
          >
            <UserCircle size={22} />
          </button>

          <button
            className="icon-btn logout-btn"
            onClick={handleLogout}
            aria-label={t('Déconnexion', 'Fivoahana', 'Logout')}
            title={t('Se déconnecter', 'Hivoaka', 'Logout')}
          >
            <LogOut size={22} />
          </button>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Navigation mobile */}
      {menuOpen && (
        <div className="mobile-nav">
          {mobileItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.path}
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(item.path);
                }}
              >
                <Icon size={20} /> {item.label}
              </a>
            );
          })}

          <hr className="mobile-divider" />

          {mobileActions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className="mobile-logout"
                onClick={() => handleNavigation(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                }}
              >
                <Icon size={20} /> {item.label}
              </button>
            );
          })}

          <button className="mobile-logout" onClick={handleLogout}>
            <LogOut size={20} /> {t('Déconnexion', 'Fivoahana', 'Logout')}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
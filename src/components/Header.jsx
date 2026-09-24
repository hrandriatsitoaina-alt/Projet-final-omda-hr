import React, { useState, useCallback, useMemo } from 'react';
import {
  Home, LayoutDashboard, Users, CreditCard, Settings,
  Bell, UserCircle, LogOut, Menu, X,
  Bot, UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/App.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const Header = ({ onLogout, user }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  // ✅ Items de navigation mémoïsés
  const navItems = useMemo(() => [
    { icon: Home,            label: t('Accueil',        'Fandraisana',   'Home'),       path: '/dashboard' },
    { icon: LayoutDashboard, label: t('Tableau de bord','Tabilao',       'Dashboard'),  path: '/tableau-db' },
    { icon: Users,           label: t('Gestion',        'Fitandremana',  'Management'), path: '/gere-dossier' },
    { icon: CreditCard,      label: t('Paiements',      'Fandoavana',    'Payments'),   path: '/billan' },
    { icon: Settings,        label: t('Paramètres',     'Fandrindrana',  'Settings'),   path: '/Parametre_global' },
  ], [t]);

  // ✅ Items du menu mobile
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

  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    }
    navigate('/', { replace: true });
    setMenuOpen(false);
  }, [onLogout, navigate]);

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
          {/* Bouton Assistant IA */}
          <button
            className="icon-btn"
            aria-label={t('Assistant IA', 'Mpanampy IA', 'AI Assistant')}
            onClick={() => handleNavigation('/diagnostique')}
          >
            <Bot size={22} />
          </button>

          {/* Bouton Notifications */}
          <button
            className="icon-btn"
            aria-label={t('Notifications', 'Fampahafantarana', 'Notifications')}
            onClick={() => handleNavigation('/notification_admin')}
          >
            <Bell size={22} />
          </button>

          {/* Bouton Profil */}
          <button
            className="icon-btn"
            aria-label={t('Profil', 'Momba ahy', 'Profile')}
            onClick={() => handleNavigation('/profil')}
          >
            <UserCircle size={22} />
          </button>

          {/* Bouton Déconnexion */}
          <button
            className="icon-btn logout-btn"
            onClick={handleLogout}
            aria-label={t('Déconnexion', 'Fivoahana', 'Logout')}
          >
            <LogOut size={22} />
          </button>

          {/* Menu hamburger pour mobile */}
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

          {/* Actions du menu mobile */}
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

          {/* Bouton Déconnexion dans le menu mobile */}
          <button className="mobile-logout" onClick={handleLogout}>
            <LogOut size={20} /> {t('Déconnexion', 'Fivoahana', 'Logout')}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
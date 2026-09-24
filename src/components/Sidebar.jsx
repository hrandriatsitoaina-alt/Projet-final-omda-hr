import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, UserPlus, Search, CreditCard,
  FileText, BarChart, CalendarPlus, Download, Upload,
  Users, DollarSign, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import '../styles/Sidebar.css';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const Sidebar = ({ isOpen, toggleSidebar, isCollapsed, toggleCollapse }) => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // ✅ Titres de sections traduits (mémoïsés)
  const sectionTitles = useMemo(() => ({
    usagers:   t('Usagers',          'Mpampiasa',            'Users'),
    paiements: t('Paiements',        'Fandoavana',          'Payments'),
    outils:    t('Outils',           'Fitaovana',           'Tools'),
    bd:        t('Gestion de bd',    'Fitantanana angona',  'Database'),
  }), [t]);

  // ✅ Items de navigation (mémoïsés)
  const navItems = useMemo(() => [
    { icon: LayoutDashboard, label: t('Accueil',    'Fandraisana',  'Home'),       path: '/dashboard' },
    { icon: FolderOpen,      label: t('Catégories', 'Sokajy',       'Categories'), path: '/autre-usager' },
  ], [t]);

  const usagerItems = useMemo(() => [
    { icon: UserPlus, label: t('Ajouter un usager',   'Manampy mpampiasa',  'Add user'),     path: '/ajout-usager' },
    { icon: Search,   label: t('Vérifier le statut',  'Hanamarina ny sata', 'Check status'), path: '/verification-usager' },
  ], [t]);

  const paiementItems = useMemo(() => [
    { icon: CreditCard, label: t('Gestion des paiements', 'Fitantanana fandoavana', 'Payment management'), path: '/billan' },
    { icon: FileText,   label: t('Factures',              'Faktiora',               'Invoices'),           path: '/facture-usager' },
  ], [t]);

  const outilsItems = useMemo(() => [
    { icon: BarChart,     label: t('Statistiques', 'Statistika',    'Statistics'),   path: '/tableau-db' },
    { icon: CalendarPlus, label: t('Assistant IA', 'Mpanampy IA',   'AI Assistant'), path: '/diagnostique' },
  ], [t]);

  const bdItems = useMemo(() => [
    { icon: Download, label: t('Collecter', 'Manangona', 'Collect'), path: '/base-de-donnees' },
    { icon: Upload,   label: t('Recevoir',  'Mandefa',   'Receive'), path: '/base-de-donnees' },
  ], [t]);

  // ✅ Tous les items pour le tooltip (mémoïsé)
  const allItems = useMemo(
    () => [...usagerItems, ...paiementItems, ...outilsItems, ...bdItems],
    [usagerItems, paiementItems, outilsItems, bdItems]
  );

  const handleMouseEnter = useCallback((e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
    });
    setHoveredItem(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  const renderNavItem = useCallback((item, index) => (
    <li key={index}>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); navigate(item.path); }}
        className={`nav-item ${item.path === '/dashboard' ? 'active' : ''}`}
        onMouseEnter={(e) => handleMouseEnter(e, index)}
        onMouseLeave={handleMouseLeave}
      >
        <span className="nav-icon-wrapper">
          <item.icon size={isCollapsed ? 22 : 20} />
        </span>
        {!isCollapsed && <span className="nav-label">{item.label}</span>}
      </a>
    </li>
  ), [isCollapsed, navigate, handleMouseEnter, handleMouseLeave]);

  const renderSection = useCallback((title, icon, items) => (
    <div className="nav-section">
      <div className="section-title">
        <span className="section-icon-wrapper">{icon}</span>
        {!isCollapsed && <span className="section-label">{title}</span>}
      </div>
      <ul className="nav-list">
        {items.map((item, idx) => renderNavItem(item, idx + 100))}
      </ul>
    </div>
  ), [isCollapsed, renderNavItem]);

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
        {/* En-tête avec OMDA */}
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <span className="brand">{!isCollapsed ? 'OMDA' : 'O'}</span>
            {!isCollapsed && <span className="brand-dot">•</span>}
          </div>
          {!isCollapsed && (
            <div className="sub-brand">
              {t(
                "Office Malagasy du Droit d'Auteur",
                "Birao Malagasy misahana ny Zon'ny Mpanoratra",
                "Malagasy Copyright Office"
              )}
            </div>
          )}
          {/* Bouton de collapse */}
          <button
            className="collapse-btn"
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? t('Agrandir', 'Halehibe', 'Expand')
                : t('Réduire', 'Hakelezina', 'Collapse')
            }
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* Accueil et Catégories */}
          <ul className="nav-list nav-list-main">
            {navItems.map((item, idx) => renderNavItem(item, idx))}
          </ul>

          {/* Usagers */}
          {renderSection(sectionTitles.usagers, <Users size={16} />, usagerItems)}

          {/* Paiements */}
          {renderSection(sectionTitles.paiements, <DollarSign size={16} />, paiementItems)}

          {/* Outils */}
          {renderSection(sectionTitles.outils, <Settings size={16} />, outilsItems)}

          {/* Gestion BD */}
          {renderSection(sectionTitles.bd, <Download size={16} />, bdItems)}
        </nav>

        <footer className="sidebar-footer">
          {!isCollapsed ? (
            <>
              <span className="footer-email">
                {t('Omda', 'Omda', 'Omda')}
              </span>
            </>
          ) : (
            <span className="footer-icon">©</span>
          )}
        </footer>
      </aside>

      {/* Tooltip flottant pour le mode réduit */}
      {isCollapsed && hoveredItem !== null && (
        <div
          className="sidebar-tooltip"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateY(-50%)',
          }}
        >
          {hoveredItem < 100
            ? navItems[hoveredItem]?.label
            : allItems[hoveredItem - 100]?.label}
        </div>
      )}
    </>
  );
};

export default Sidebar;
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Trash2,
  XCircle,
  Pencil,
  Mail,
  CheckCheck,
  RefreshCw,
  ArrowLeft,
  Inbox,
  Sparkles,
  Store,
  Bus,
  Music,
  Tv,
  Hotel,
  ClipboardList,
  User,
  Phone,
  Mail as MailIcon,
  MapPin,
  Home,
  DollarSign,
  BarChart3,
  TrendingUp,
  Eye,
  AlertCircle
} from 'lucide-react';
import '../styles/notification_admin.css';
import MiniSidebar from '../components/MiniSidebar';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const NotificationAdmin = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [allUsagers, setAllUsagers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    nonLues: 0,
    modifications: 0,
    suppressions: 0,
    demandes: 0,
  });

  useEffect(() => {
    let storedToken = localStorage.getItem('adminToken');
    console.log('🔑 Token récupéré:', storedToken || 'Absent');

    if (!storedToken) {
      storedToken = 'super_admin_secret_2026';
      localStorage.setItem('adminToken', storedToken);
      console.log('✅ Token par défaut créé');
    }

    setToken(storedToken);
    fetchAllUsagers(storedToken);
    fetchNotifications(storedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllUsagers = async (currentToken) => {
    try {
      const response = await fetch('http://localhost:3001/api/usagers', {
        headers: {
          'adminToken': currentToken,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllUsagers(data);
        console.log('✅ Usagers chargés:', data.length);
      }
    } catch (error) {
      console.error('Erreur fetch usagers:', error);
    }
  };

  const fetchNotifications = async (currentToken) => {
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Récupération des notifications avec token:', currentToken);

      const response = await fetch('http://localhost:3001/api/notifications', {
        method: 'GET',
        headers: {
          'adminToken': currentToken,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Statut réponse:', response.status);

      let data;
      if (response.status === 403) {
        console.log('⚠️ Token invalide, essai sans token...');
        const retryResponse = await fetch('http://localhost:3001/api/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        data = await retryResponse.json();
      } else {
        data = await response.json();
      }

      console.log('📋 Notifications reçues:', data);

      if (data.success) {
        const notifs = data.notifications || [];
        setNotifications(notifs);

        setStats({
          total: notifs.length,
          nonLues: notifs.filter(n => !n.read).length,
          modifications: notifs.filter(n => n.type === 'update').length,
          suppressions: notifs.filter(n => n.type === 'delete_completed').length,
          demandes: notifs.filter(n => n.type === 'delete_request').length,
        });

        setError(null);
      } else {
        console.error('❌ Erreur API:', data);
        setError(data.message || t('Erreur de chargement', 'Nisy olana tamin\'ny fakana', 'Loading error'));
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Erreur fetchNotifications:', error);
      setError(t('Erreur de connexion au serveur', 'Nisy olana tamin\'ny fifandraisana', 'Server connection error'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getUsagerDetails = (usagerId) => {
    if (!usagerId) return null;
    return allUsagers.find(u => u.id === parseInt(usagerId));
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'adminToken': token || 'super_admin_secret_2026',
          'Content-Type': 'application/json',
        },
      });
      fetchNotifications(token);
    } catch (error) {
      console.error('❌ Erreur markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
    fetchNotifications(token);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'delete_request': return <Trash2 size={20} />;
      case 'delete_completed': return <Trash2 size={20} />;
      case 'delete_rejected': return <XCircle size={20} />;
      case 'update': return <Pencil size={20} />;
      default: return <Mail size={20} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'delete_request':
        return t('Demande de suppression', 'Fangatahana famafana', 'Deletion request');
      case 'delete_completed':
        return t('Suppression effectuée', 'Vita ny famafana', 'Deletion completed');
      case 'delete_rejected':
        return t('Rejetée', 'Nolavina', 'Rejected');
      case 'update':
        return t('Modification', 'Fanovana', 'Update');
      default:
        return t('Information', 'Fampahalalana', 'Information');
    }
  };

  const getTypeClass = (type) => {
    switch (type) {
      case 'delete_request': return 'badge-warning';
      case 'delete_completed': return 'badge-danger';
      case 'delete_rejected': return 'badge-secondary';
      case 'update': return 'badge-primary';
      default: return 'badge-info';
    }
  };

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'OCC': return <Sparkles size={18} />;
      case 'Grand Surface': return <Store size={18} />;
      case 'Bus': return <Bus size={18} />;
      case 'Night club': return <Music size={18} />;
      case 'Télé/Radio': return <Tv size={18} />;
      case 'Hôtel': return <Hotel size={18} />;
      default: return <ClipboardList size={18} />;
    }
  };

  if (loading) {
    return (
      <>
        <MiniSidebar />
        <main className="notification-admin-container">
          <div className="notification-admin-loading">
            <div className="spinner"></div>
            <p>{t('Chargement des notifications...', 'Maka ny fampandrenesana...', 'Loading notifications...')}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <MiniSidebar />
      <main className="notification-admin-container">
        <div className="notification-admin-header">
          <div className="header-left">
            <h1>
              <Bell size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
              {t('Centre de Notifications', 'Foibe fampandrenesana', 'Notification Center')}
            </h1>
            <p>
              {t(
                'Historique des modifications et suppressions',
                'Tantaran\'ny fanovana sy famafana',
                'History of updates and deletions'
              )}
            </p>
          </div>
          <div className="header-right">
            <button className="btn-back-dashboard" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} style={{ marginRight: '6px' }} />
              {t('Retour au Dashboard', 'Hiverina any amin\'ny Fandraisana', 'Back to Dashboard')}
            </button>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div className="notification-admin-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">{t('Total', 'Totaly', 'Total')}</div>
          </div>
          <div className="stat-card stat-unread">
            <div className="stat-number">{stats.nonLues}</div>
            <div className="stat-label">{t('Non lues', 'Tsy mbola vakiana', 'Unread')}</div>
          </div>
          <div className="stat-card stat-update">
            <div className="stat-number">{stats.modifications}</div>
            <div className="stat-label">{t('Modifications', 'Fanovana', 'Updates')}</div>
          </div>
          <div className="stat-card stat-delete">
            <div className="stat-number">{stats.suppressions}</div>
            <div className="stat-label">{t('Suppressions', 'Famafana', 'Deletions')}</div>
          </div>
          <div className="stat-card stat-request">
            <div className="stat-number">{stats.demandes}</div>
            <div className="stat-label">{t('Demandes', 'Fangatahana', 'Requests')}</div>
          </div>
        </div>

        {/* ACTIONS */}


        {/* LISTE DES NOTIFICATIONS */}
        {error ? (
          <div className="notification-admin-error">
            <p>
              <AlertCircle size={18} style={{ marginRight: '8px' }} />
              {error}
            </p>
            <button className="btn-retry" onClick={() => fetchNotifications(token || 'super_admin_secret_2026')}>
              {t('Réessayer', 'Andramo indray', 'Retry')}
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-admin-empty">
            <span className="empty-icon"><Inbox size={48} /></span>
            <p>{t('Aucune notification', 'Tsy misy fampandrenesana', 'No notifications')}</p>
            <small>
              {t(
                'Les modifications et suppressions apparaitront ici',
                'Hiseho eto ny fanovana sy famafana',
                'Updates and deletions will appear here'
              )}
            </small>
          </div>
        ) : (
          <div className="notification-admin-list">
            {notifications.map(notif => {
              const usager = getUsagerDetails(notif.usager_id);
              return (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notif-icon">{getIcon(notif.type)}</div>
                  <div className="notif-content">
                    <div className="notif-title">{notif.message}</div>
                    <div className="notif-meta">
                      <span className={`badge ${getTypeClass(notif.type)}`}>
                        {getTypeLabel(notif.type)}
                      </span>
                      <span className="notif-date">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>

                    {/* DÉTAILS COMPLETS DE L'USAGER */}
                    {usager && (
                      <div className="usager-details-card">
                        <div className="usager-header-info">
                          <span className="usager-type-icon">{getTypeIcon(usager.type_usager)}</span>
                          <span className="usager-type-name">{usager.type_usager}</span>
                          <span className="usager-id">ID: #{usager.id}</span>
                        </div>
                        <div className="usager-details-grid">
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <Store size={14} style={{ marginRight: '4px' }} />
                              {t('Dénomination:', 'Anarana:', 'Name:')}
                            </span>
                            <span className="detail-value">{usager.denomination || 'N/A'}</span>
                          </div>
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <User size={14} style={{ marginRight: '4px' }} />
                              {t('Demandeur:', 'Mpanao fangatahana:', 'Applicant:')}
                            </span>
                            <span className="detail-value">{usager.demandeur || 'N/A'}</span>
                          </div>
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <Phone size={14} style={{ marginRight: '4px' }} />
                              {t('Téléphone:', 'Finday:', 'Phone:')}
                            </span>
                            <span className="detail-value">{usager.telephone || 'N/A'}</span>
                          </div>
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <MailIcon size={14} style={{ marginRight: '4px' }} />
                              {t('Email:', 'Mailaka:', 'Email:')}
                            </span>
                            <span className="detail-value">{usager.email || 'N/A'}</span>
                          </div>
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <MapPin size={14} style={{ marginRight: '4px' }} />
                              {t('Région:', 'Faritra:', 'Region:')}
                            </span>
                            <span className="detail-value">{usager.region || 'N/A'}</span>
                          </div>
                          <div className="usager-detail-item">
                            <span className="detail-label">
                              <Home size={14} style={{ marginRight: '4px' }} />
                              {t('Adresse:', 'Adiresy:', 'Address:')}
                            </span>
                            <span className="detail-value">{usager.adresse || usager.adresse_siege || 'N/A'}</span>
                          </div>
                          {usager.frais_dossier > 0 && (
                            <div className="usager-detail-item">
                              <span className="detail-label">
                                <DollarSign size={14} style={{ marginRight: '4px' }} />
                                {t('Frais dossier:', 'Saram-pandraharahana:', 'File fees:')}
                              </span>
                              <span className="detail-value">
                                {usager.frais_dossier.toLocaleString(locale)} Ar
                              </span>
                            </div>
                          )}
                          {usager.montant_mensuel > 0 && (
                            <div className="usager-detail-item">
                              <span className="detail-label">
                                <BarChart3 size={14} style={{ marginRight: '4px' }} />
                                {t('Montant mensuel:', 'Vola isam-bolana:', 'Monthly amount:')}
                              </span>
                              <span className="detail-value">
                                {usager.montant_mensuel.toLocaleString(locale)} Ar
                              </span>
                            </div>
                          )}
                          {usager.soit_total > 0 && (
                            <div className="usager-detail-item">
                              <span className="detail-label">
                                <TrendingUp size={14} style={{ marginRight: '4px' }} />
                                {t('Soit total:', 'Totaly:', 'Total:')}
                              </span>
                              <span className="detail-value">
                                {usager.soit_total.toLocaleString(locale)} Ar
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!notif.read && (
                      <div className="notif-unread-dot">
                        <Eye size={12} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default NotificationAdmin;
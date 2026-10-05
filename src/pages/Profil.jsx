// src/pages/Profil.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User, Mail, Key, Calendar,
  Edit2, Save, X, CheckCircle,
  UserCircle, Clock, Award, LayoutDashboard,
  Home, Shield, Sparkles, Heart,
  FileText, TrendingUp, Bell, Globe,
  BookOpen, Zap, Star, Activity,
  ChevronRight, Info, Settings, Users,
  Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';
import '../styles/Profil.css';

const Profil = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage (mg → fr-MG, pas mg-MG)
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    mot_de_passe: '',
    confirm_mot_de_passe: '',
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // ✅ États pour afficher/masquer les mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ NOUVEAU : État pour l'erreur "mots de passe non identiques"
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NOUVEAU : Vérification en temps réel de la correspondance des mots de passe
  useEffect(() => {
    if (
      formData.mot_de_passe &&
      formData.confirm_mot_de_passe &&
      formData.mot_de_passe !== formData.confirm_mot_de_passe
    ) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [formData.mot_de_passe, formData.confirm_mot_de_passe]);

  const fetchProfile = async () => {
    try {
      let userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');

      if (!userId) {
        try {
          const currentUserRes = await axios.get('http://localhost:3001/api/auth/current-user');
          if (currentUserRes.data.success) {
            const user = currentUserRes.data.user;
            userId = user.id;
            localStorage.setItem('userId', userId);
            localStorage.setItem('userName', user.nom);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userRole', user.role);
          }
        } catch (err) {
          console.error('Erreur current-user:', err);
        }
      }

      if (!userId) {
        setMessage({
          text: t(
            'Utilisateur non identifié. Veuillez vous reconnecter.',
            'Tsy fantatra ny mpampiasa. Mifandraisa indray.',
            'User not identified. Please log in again.'
          ),
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const response = await axios.get(`http://localhost:3001/api/profile/${userId}`);

      if (response.data.success) {
        const user = response.data.user;
        setUserData(user);
        setFormData({
          nom: user.nom || '',
          email: user.email || '',
          mot_de_passe: '',
          confirm_mot_de_passe: '',
        });
      } else {
        setMessage({
          text: response.data.message || t(
            'Erreur lors du chargement',
            "Nisy olana tamin'ny fakana",
            'Loading error'
          ),
          type: 'error',
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
      setMessage({
        text: error.response?.data?.message || t(
          'Erreur lors du chargement du profil',
          "Nisy olana tamin'ny fakana ny mombamomba",
          'Error loading profile'
        ),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mot_de_passe' || name === 'confirm_mot_de_passe') {
      setFormData(prev => ({
        ...prev,
        [name]: value.slice(0, 4),
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (formData.mot_de_passe && formData.mot_de_passe !== formData.confirm_mot_de_passe) {
      setMessage({
        text: t(
          'Les mots de passe ne correspondent pas',
          'Tsy mifanaraka ny teny miafina',
          "Passwords don't match"
        ),
        type: 'error',
      });
      return;
    }

    if (formData.mot_de_passe && formData.mot_de_passe.length !== 4) {
      setMessage({
        text: t(
          'Le mot de passe doit contenir exactement 4 caractères',
          'Tsy maintsy misy litera 4 marina ny teny miafina',
          'Password must contain exactly 4 characters'
        ),
        type: 'error',
      });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (!userId) {
        setMessage({
          text: t('Utilisateur non identifié', 'Tsy fantatra ny mpampiasa', 'User not identified'),
          type: 'error',
        });
        setSaving(false);
        return;
      }

      const updateData = {
        nom: formData.nom,
        email: formData.email,
      };

      if (formData.mot_de_passe) {
        updateData.mot_de_passe = formData.mot_de_passe;
      }

      const response = await axios.put(`http://localhost:3001/api/profile/${userId}`, updateData);

      if (response.data.success) {
        setMessage({
          text: t(
            '✅ Profil mis à jour avec succès !',
            '✅ Voavaozina soa aman-tsara ny mombamomba !',
            '✅ Profile updated successfully!'
          ),
          type: 'success',
        });
        setEditMode(false);
        const updatedUser = response.data.user;
        setUserData(prev => ({
          ...prev,
          nom: updatedUser.nom,
          email: updatedUser.email,
        }));
        localStorage.setItem('userName', updatedUser.nom);
        localStorage.setItem('userEmail', updatedUser.email);
        setFormData(prev => ({
          ...prev,
          mot_de_passe: '',
          confirm_mot_de_passe: '',
        }));
        // ✅ Réinitialiser les yeux
        setShowPassword(false);
        setShowConfirmPassword(false);
        setPasswordMismatch(false);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      setMessage({
        text: error.response?.data?.message || t(
          'Erreur lors de la mise à jour',
          "Nisy olana tamin'ny fanavaozana",
          'Update error'
        ),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      nom: userData?.nom || '',
      email: userData?.email || '',
      mot_de_passe: '',
      confirm_mot_de_passe: '',
    });
    // ✅ Réinitialiser les yeux
    setShowPassword(false);
    setShowConfirmPassword(false);
    // ✅ Réinitialiser l'erreur de correspondance
    setPasswordMismatch(false);
    setMessage({ text: '', type: '' });
  };

  // ✅ formatDate avec locale dynamique
  const formatDate = useCallback((dateString) => {
    if (!dateString) return t('Jamais', 'Tsy mbola', 'Never');
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale, t]);

  const getRoleLabel = (role) => {
    const roles = {
      'super_admin': t('Super Administrateur', 'Mpandrindra ambony', 'Super Administrator'),
      'admin': t('Administrateur', 'Mpandrindra', 'Administrator'),
      'daf': t('Directeur Administratif et Financier', 'Tale ara-pitantanana sy ara-bola', 'Administrative and Financial Director'),
      'user': t('Utilisateur', 'Mpampiasa', 'User'),
    };
    return roles[role] || role;
  };

  const getStatusBadge = (statut) => {
    const statusMap = {
      'actif':    { label: t('Actif', 'Mavitrika', 'Active'),          class: 'status-active' },
      'inactif':  { label: t('Inactif', 'Tsy mavitrika', 'Inactive'),  class: 'status-inactive' },
      'suspendu': { label: t('Suspendu', 'Voasakana', 'Suspended'),    class: 'status-suspended' },
    };
    return statusMap[statut] || { label: statut, class: 'status-default' };
  };

  // ✅ Langue affichée pour les préférences
  const langueLabel = useMemo(() => {
    if (langue === 'en') return '🇬🇧 English';
    if (langue === 'mg') return '🇲🇬 Malagasy';
    return '🇫🇷 Français';
  }, [langue]);

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '22px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #e8e0d8',
    marginBottom: '24px',
  };

  const cardTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 18px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #e8e0d8',
  };

  const mutedStyle = {
    fontSize: '13px',
    color: '#8a8a9e',
    margin: 0,
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>{t('Chargement de votre profil...', 'Maka ny mombamomba anao...', 'Loading your profile...')}</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="profile-wrapper">
        <header className="profile-header-main">
          <a href="/dashboard" className="header-brand">
            <div className="brand-icon">📋</div>
            <div className="brand-text">OMDA <span>{t('Profil', 'Mombamomba', 'Profile')}</span></div>
          </a>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-header">
              <Home size={18} /> {t('Accueil', 'Fandraisana', 'Home')}
            </button>
          </div>
        </header>

        <div className="profile-container">
          <div className="profile-message error">
            <X size={18} />
            <span>
              {message.text || t(
                'Impossible de charger le profil',
                'Tsy afaka maka ny mombamomba',
                'Unable to load profile'
              )}
            </span>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <button onClick={() => navigate('/login')} className="btn-edit">
              {t('Se reconnecter', 'Mifandraisa indray', 'Log in again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(userData.statut);

  return (
    <div className="profile-wrapper">
      {/* HEADER */}
      <header className="profile-header-main">
        <a href="/dashboard" className="header-brand">
          <div className="brand-icon">📋</div>
          <div className="brand-text">OMDA <span>{t('Profil', 'Mombamomba', 'Profile')}</span></div>
        </a>
        <div className="header-actions">
          <div className="user-badge">
            <div className="avatar-mini">
              {userData.prefix || userData.nom?.substring(0, 2).toUpperCase()}
            </div>
            <span className="user-name">{userData.nom}</span>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-header">
            <Home size={18} /> <span>{t('Accueil', 'Fandraisana', 'Home')}</span>
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="profile-container">
        {/* EN-TÊTE DE PAGE */}
        <div className="profile-page-header">
          <div className="page-title">
            <div className="title-icon">
              <UserCircle size={24} />
            </div>
            <h1>
              👤 <span className="highlight">{t('Mon Profil', 'Ny Mombamomba Ahy', 'My Profile')}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard')} className="btn-back">
              <LayoutDashboard size={18} /> {t('Tableau de bord', 'Fandraisana', 'Dashboard')}
            </button>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="btn-edit">
                <Edit2 size={18} /> {t('Modifier le profil', 'Ovay ny mombamomba', 'Edit profile')}
              </button>
            ) : (
              <button onClick={handleCancel} className="btn-edit-cancel">
                <X size={18} /> {t('Annuler', 'Foanana', 'Cancel')}
              </button>
            )}
          </div>
        </div>

        {/* MESSAGE */}
        {message.text && (
          <div className={`profile-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ============ DIV 1 : CARTE AVATAR ============ */}
        <div className="profile-card profile-avatar-card">
          <div className="avatar-container">
            <div className="avatar-circle">
              <div className="avatar-ring"></div>
              <span className="avatar-prefix">
                {userData.prefix || userData.nom?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="avatar-status">
              <span className={`status-badge ${statusInfo.class}`}>
                <Shield size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {statusInfo.label}
              </span>
            </div>
          </div>
          <div className="avatar-info">
            <h2>{userData.nom}</h2>
            <p className="user-email">
              <Mail size={16} /> {userData.email}
            </p>
            <p className="user-role">
              <Award size={16} />
              {getRoleLabel(userData.role)}
            </p>
          </div>
        </div>

        {/* ============ DIV 2 : INFORMATIONS PERSONNELLES ============ */}
        <div className="profile-card">
          <h3 className="card-title">
            <User size={20} />
            {t('Informations personnelles', 'Fampahalalana manokana', 'Personal information')}
          </h3>

          {editMode ? (
            <div className="form-grid">
              <div className="full-width">
                <div className="info-row">
                  <label>{t('Nom complet', 'Anarana feno', 'Full name')}</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder={t('Votre nom complet', 'Ny anaranao feno', 'Your full name')}
                  />
                </div>
              </div>
              <div className="full-width">
                <div className="info-row">
                  <label>{t('Adresse email', 'Adiresy mailaka', 'Email address')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-row">
                <label>{t('Nom complet', 'Anarana feno', 'Full name')}</label>
                <p className="info-value">{userData.nom}</p>
              </div>
              <div className="info-row">
                <label>{t('Adresse email', 'Adiresy mailaka', 'Email address')}</label>
                <p className="info-value"><Mail size={16} /> {userData.email}</p>
              </div>
              <div className="info-row">
                <label>{t('Rôle', 'Andraikitra', 'Role')}</label>
                <p className="info-value">
                  <span className="role-badge">
                    <Shield size={14} style={{ marginRight: '4px' }} />
                    {getRoleLabel(userData.role)}
                  </span>
                </p>
              </div>
              <div className="info-row">
                <label>{t('Statut', 'Toe-javatra', 'Status')}</label>
                <p className="info-value">
                  <span className={`status-badge ${statusInfo.class}`}>
                    <Heart size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {statusInfo.label}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ============ DIV 3 : CHANGER LE MOT DE PASSE ============ */}
        {editMode && (
          <div className="profile-card">
            <h3 className="card-title">
              <Key size={20} />
              {t('Changer le mot de passe', 'Hanova ny teny miafina', 'Change password')}
            </h3>
            <div className="form-grid">
              <div className="full-width">
                <div className="info-row">
                  <label>{t('Nouveau mot de passe', 'Teny miafina vaovao', 'New password')}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="mot_de_passe"
                      value={formData.mot_de_passe}
                      onChange={handleInputChange}
                      className="profile-input"
                      placeholder={t('4 caractères', 'Litera 4', '4 characters')}
                      maxLength={4}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      title={showPassword
                        ? t('Masquer le mot de passe', 'Afeno ny teny miafina', 'Hide password')
                        : t('Afficher le mot de passe', 'Asehoy ny teny miafina', 'Show password')}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="full-width">
                <div className="info-row">
                  <label>{t('Confirmer le mot de passe', 'Hamafiso ny teny miafina', 'Confirm password')}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirm_mot_de_passe"
                      value={formData.confirm_mot_de_passe}
                      onChange={handleInputChange}
                      className="profile-input"
                      placeholder={t('Confirmer 4 caractères', 'Hamafiso litera 4', 'Confirm 4 characters')}
                      maxLength={4}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                      title={showConfirmPassword
                        ? t('Masquer le mot de passe', 'Afeno ny teny miafina', 'Hide password')
                        : t('Afficher le mot de passe', 'Asehoy ny teny miafina', 'Show password')}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* ✅ NOUVEAU : Message d'erreur en temps réel si les mots de passe ne correspondent pas */}
                  {passwordMismatch && (
                    <div className="password-mismatch-error">
                      <AlertCircle size={15} />
                      <span>
                        {t(
                          'Les mots de passe ne sont pas identiques',
                          'Tsy mitovy ny teny miafina',
                          "Passwords don't match"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="full-width">
                <p className="password-hint">
                  <Sparkles size={14} style={{ marginRight: '4px', color: 'var(--p-primary)' }} />
                  {t(
                    'Le mot de passe doit contenir exactement 4 caractères. Laissez vide pour le conserver.',
                    'Tsy maintsy misy litera 4 marina ny teny miafina. Avelao foana raha te hitazona azy.',
                    'Password must contain exactly 4 characters. Leave empty to keep it.'
                  )}
                </p>
              </div>
              <div className="full-width form-actions">
                <button onClick={handleCancel} className="btn-cancel-form" disabled={saving}>
                  <X size={18} /> {t('Annuler', 'Foanana', 'Cancel')}
                </button>
                <button onClick={handleSave} className="btn-save-form" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-small"></span> {t('Enregistrement...', 'Mitahiry...', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <Save size={18} /> {t('Enregistrer les modifications', 'Tehirizo ny fanovana', 'Save changes')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============ DIV 4 : ACTIVITÉ RÉCENTE ============ */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            <Activity size={20} color="#D4AF37" />
            {t('Activité récente', 'Hetsika vao haingana', 'Recent activity')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: CheckCircle, color: '#2ecc71',
                fr: 'Connexion réussie', mg: 'Niditra soa aman-tsara', en: 'Successful login' },
              { icon: FileText, color: '#3498db',
                fr: 'Consultation du profil', mg: 'Nijery ny mombamomba', en: 'Profile viewed' },
              { icon: Shield, color: '#9b59b6',
                fr: 'Vérification de sécurité OK', mg: 'Voamarina ny fiarovana', en: 'Security check OK' },
              { icon: Sparkles, color: '#f39c12',
                fr: 'Préférences appliquées', mg: 'Nampiharina ny safidy', en: 'Preferences applied' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f9f7f4',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${item.color}`,
                  }}
                >
                  <Icon size={18} color={item.color} />
                  <span style={{ flex: 1, fontSize: '14px', color: '#4a4a5e' }}>
                    {t(item.fr, item.mg, item.en)}
                  </span>
                  <ChevronRight size={16} color="#b8b8c8" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ DIV 5 : PRÉFÉRENCES UTILISATEUR ============ */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            <Settings size={20} color="#3498db" />
            {t('Préférences', 'Safidy', 'Preferences')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#f9f7f4', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Globe size={16} color="#3498db" />
                <span style={{ fontSize: '12px', color: '#6c6e8a', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('Langue', 'Fiteny', 'Language')}
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {langueLabel}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#f9f7f4', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Bell size={16} color="#f39c12" />
                <span style={{ fontSize: '12px', color: '#6c6e8a', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('Notifications', 'Fampandrenesana', 'Notifications')}
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {t('Activées', 'Mavitrika', 'Enabled')}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#f9f7f4', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Zap size={16} color="#2ecc71" />
                <span style={{ fontSize: '12px', color: '#6c6e8a', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('Compte', 'Kaonty', 'Account')}
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {statusInfo.label}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#f9f7f4', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Star size={16} color="#D4AF37" />
                <span style={{ fontSize: '12px', color: '#6c6e8a', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('Rôle', 'Andraikitra', 'Role')}
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {getRoleLabel(userData.role)}
              </div>
            </div>
          </div>
        </div>

        {/* ============ DIV 6 : INFORMATIONS SYSTÈME ============ */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            <BookOpen size={20} color="#9b59b6" />
            {t('Informations système', 'Fampahalalana momba ny rafitra', 'System information')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0ebe5' }}>
              <span style={mutedStyle}>{t('Application', 'Rindranasa', 'Application')}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>OMDA App v1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0ebe5' }}>
              <span style={mutedStyle}>{t('Version', 'Dikan-teny', 'Version')}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0ebe5' }}>
              <span style={mutedStyle}>{t('Date du jour', 'Daty androany', 'Current date')}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>
                {new Date().toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={mutedStyle}>{t('Support', 'Fanampiana', 'Support')}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#3498db' }}>support@omda.mg</span>
            </div>
          </div>
        </div>

        {/* ============ DIV 7 : AIDE ET RACCOURCIS ============ */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            <Info size={20} color="#2ecc71" />
            {t('Aide et raccourcis', 'Fanampiana sy hitsiky', 'Help & shortcuts')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {[
              { icon: Home, color: '#3498db', path: '/dashboard',
                fr: 'Tableau de bord', mg: 'Fandraisana', en: 'Dashboard' },
              { icon: Users, color: '#2ecc71', path: '/gere-dossier',
                fr: 'Gestion des dossiers', mg: 'Fitantanana rakitra', en: 'File management' },
              { icon: FileText, color: '#f39c12', path: '/facture-usager',
                fr: 'Factures', mg: 'Faktiora', en: 'Invoices' },
              { icon: TrendingUp, color: '#e74c3c', path: '/billan',
                fr: 'Bilan financier', mg: 'Tabilaom-bola', en: 'Financial report' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: '#f9f7f4',
                    border: '1px solid #e8e0d8',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    fontSize: '14px',
                    color: '#4a4a5e',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0ebe5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9f7f4';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${item.color}15`,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <span style={{ flex: 1 }}>{t(item.fr, item.mg, item.en)}</span>
                  <ChevronRight size={14} color="#b8b8c8" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ DIV 8 : INFORMATIONS DU COMPTE ============ */}
        <div className="profile-card">
          <h3 className="card-title">
            <Clock size={20} />
            {t('Informations du compte', 'Fampahalalana momba ny kaonty', 'Account information')}
          </h3>
          <div className="account-grid">
            <div className="info-row">
              <label>{t('Date de création', 'Daty namoronana', 'Creation date')}</label>
              <p className="info-value">
                <Calendar size={16} /> {formatDate(userData.created_at)}
              </p>
            </div>
            <div className="info-row">
              <label>{t('Dernière connexion', 'Fifandraisana farany', 'Last login')}</label>
              <p className="info-value">
                <Clock size={16} /> {formatDate(userData.derniere_connexion)}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="profile-footer">
        <div className="footer-content">
          <div className="footer-brand">OMDA <span>{t('Profil', 'Mombamomba', 'Profile')}</span></div>
          <div className="footer-links">
            <a href="/dashboard">{t('Accueil', 'Fandraisana', 'Home')}</a>
            <a href="/support">{t('Support', 'Fanampiana', 'Support')}</a>
            <a href="/contact">{t('Contact', 'Fifandraisana', 'Contact')}</a>
            <a href="/about">{t('À propos', 'Mombamomba', 'About')}</a>
          </div>
          <div className="footer-copy">
            © 2026 OMDA — {t('Tous droits réservés', 'Zo rehetra voatokana', 'All rights reserved')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Profil;
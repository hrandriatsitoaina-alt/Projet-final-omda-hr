// src/pages/Authentification.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Authentification.css';
import AdminPanel from './AdminPanel';
import omdaLogo from '../assets/imagesOMDA.png';
import { useToast, forceReflow } from '../components/Toast';
import {
  Lock, User, Eye, EyeOff, Crown, LogIn,
  Menu, X, AlertCircle, Mail, ShieldCheck, Loader2, CheckCircle2
} from 'lucide-react';
import { useT } from '../hooks/useT';

const ALLOWED_ADMIN_ROLES = ['super_admin', 'daf', 'admin'];
const API = 'http://localhost:3001';

const Authentification = () => {
  const navigate = useNavigate();

  let showToast;
  try {
    showToast = useToast();
  } catch (err) {
    showToast = (msg, type = 'error') => console.log(`[Toast ${type}]`, msg);
  }
  if (typeof showToast !== 'function') {
    showToast = (msg, type = 'error') => console.log(`[Toast ${type}]`, msg);
  }

  const { t } = useT();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ====== MODAL SUPER ADMIN (2 étapes) ======
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminStep, setAdminStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminVerifiedUser, setAdminVerifiedUser] = useState(null);
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [verifyProgress, setVerifyProgress] = useState(0);

  // ====== BOOTSTRAP (1er Super Admin) ======
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapData, setBootstrapData] = useState({
    nom: '', email: '', mot_de_passe: '', confirm: '',
  });
  const [bootstrapError, setBootstrapError] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const [adminToken, setAdminToken] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const isMountedRef = useRef(true);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const bootstrapFirstInputRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const wasJustRegistered = sessionStorage.getItem('just_registered');
    if (wasJustRegistered === 'true') {
      sessionStorage.removeItem('just_registered');
      setUsername('');
      setPassword('');
      setIsLoading(false);
      setIsFormValid(false);
    }
  }, []);

  useEffect(() => {
    if (!showAdminPanel) {
      setIsLoading(false);
      setIsAdminVerifying(false);
    }
  }, [showAdminPanel]);

  useEffect(() => {
    setIsFormValid(username.trim() !== '' && password.trim() !== '');
  }, [username, password]);

  useEffect(() => {
    if (showAdminModal && adminStep === 1) {
      const id = setTimeout(() => emailInputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
    if (showAdminModal && adminStep === 2) {
      const id = setTimeout(() => passwordInputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [showAdminModal, adminStep]);

  useEffect(() => {
    if (showBootstrapModal) {
      const id = setTimeout(() => bootstrapFirstInputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [showBootstrapModal]);

  const handleUsernameChange = useCallback((e) => setUsername(e.target.value), []);
  const handlePasswordChange = useCallback((e) => setPassword(e.target.value), []);

  // ── LOGIN ──
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'), 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.success) {
        localStorage.setItem('adminToken', data.adminToken || ('user_' + data.user.id + '_' + Date.now()));
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.nom);
        localStorage.setItem('userId', data.user.id);
        showToast(t('Connexion réussie', 'Nifandray', 'Login successful'), 'success');
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        showToast(data.message || t('Identifiants incorrects', 'Diso ny mombamomba', 'Incorrect credentials'), 'error');
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      if (!isMountedRef.current) return;
      showToast(t('Erreur de connexion au serveur.', 'Nisy olana', 'Server connection error.'), 'error');
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // OUVERTURE DU MODAL SUPER ADMIN
  //  ⚠️ IMPORTANT : à chaque clic, on vérifie D'ABORD le bootstrap.
  //     Si base vide → modal création.
  //     Sinon → modal 2 étapes (email → code).
  //     ON NE RÉUTILISE PAS la session existante.
  // ═══════════════════════════════════════════════════════════
  const openAdminModal = useCallback(async () => {
    console.log('🔘 openAdminModal déclenché');

    // ✅ Nettoyer TOUTE session précédente pour forcer la vérification
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminAccessRole');
    setAdminToken(null);

    // A) Vérifier si bootstrap nécessaire
    try {
      const bsRes = await fetch(`${API}/api/admin/bootstrap-status`)
        .then(r => r.json())
        .catch(() => null);

      console.log('📡 bootstrap-status →', bsRes);

      if (bsRes && bsRes.success && bsRes.needsBootstrap) {
        console.log('🆕 Aucun Super Admin → ouverture modal bootstrap');
        setShowBootstrapModal(true);
        setBootstrapData({ nom: '', email: '', mot_de_passe: '', confirm: '' });
        setBootstrapError('');
        return;
      }
    } catch (e) {
      console.warn('❌ bootstrap-status error:', e);
    }

    // B) Sinon → modal 2 étapes
    console.log('🔐 Ouverture modal 2 étapes');
    setShowAdminModal(true);
    setAdminStep(1);
    setAdminEmail('');
    setAdminPassword('');
    setAdminVerifiedUser(null);
    setAdminError('');
    setVerifyProgress(0);
    setIsAdminVerifying(false);
    setShowAdminPassword(false);
  }, []);

  // ── CRÉATION DU PREMIER SUPER ADMIN ──
  const handleBootstrap = async (e) => {
    e.preventDefault();
    setBootstrapError('');

    if (!bootstrapData.nom.trim() || !bootstrapData.email.trim() || !bootstrapData.mot_de_passe) {
      setBootstrapError(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'));
      return;
    }
    if (bootstrapData.mot_de_passe.length !== 4) {
      setBootstrapError(t('Le code doit contenir 4 caractères', '4 litera', 'Code must be 4 chars'));
      return;
    }
    if (bootstrapData.mot_de_passe !== bootstrapData.confirm) {
      setBootstrapError(t('Les codes ne correspondent pas', 'Tsy mifanaraka', 'Codes do not match'));
      return;
    }

    setIsBootstrapping(true);
    try {
      const res = await fetch(`${API}/api/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: bootstrapData.nom.trim(),
          email: bootstrapData.email.trim().toLowerCase(),
          mot_de_passe: bootstrapData.mot_de_passe,
        }),
      });
      const data = await res.json();
      if (!isMountedRef.current) return;

      if (data.success && data.token && data.user) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('adminName', data.user.nom);
        localStorage.setItem('adminEmail', data.user.email);
        localStorage.setItem('adminRole', data.user.role);
        localStorage.setItem('adminAccessRole', data.user.role);
        setAdminToken(data.token);
        setShowBootstrapModal(false);
        showToast(t('Super Admin créé ✅', 'Vita ✅', 'Super Admin created ✅'), 'success');
        setShowAdminPanel(true);
      } else {
        setBootstrapError(data.message || t('Erreur création', 'Olana', 'Creation error'));
      }
    } catch (err) {
      console.error('bootstrap error:', err);
      if (!isMountedRef.current) return;
      setBootstrapError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      if (isMountedRef.current) setIsBootstrapping(false);
    }
  };

  const closeAdminModal = useCallback(() => {
    setShowAdminModal(false);
    setAdminStep(1);
    setAdminEmail('');
    setAdminPassword('');
    setAdminVerifiedUser(null);
    setAdminError('');
    setVerifyProgress(0);
    setIsAdminVerifying(false);
    setShowAdminPassword(false);
    forceReflow();
  }, []);

  const closeBootstrapModal = useCallback(() => {
    setShowBootstrapModal(false);
    setBootstrapData({ nom: '', email: '', mot_de_passe: '', confirm: '' });
    setBootstrapError('');
    forceReflow();
  }, []);

  const runVerifyAnimation = () => new Promise((resolve) => {
    setVerifyProgress(0);
    const duration = 1500;
    const interval = 50;
    const steps = duration / interval;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      const pct = Math.min(100, Math.round((current / steps) * 100));
      if (isMountedRef.current) setVerifyProgress(pct);
      if (current >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });

  const verifyAdminEmail = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) {
      setAdminError(t('Veuillez saisir un email', 'Ampidiro mailaka', 'Please enter an email'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminError(t("Format d'email invalide", "Diso ny endrik'ny mailaka", 'Invalid email format'));
      return;
    }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      const serverRes = await fetch(`${API}/api/admin/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, scope: 'admin-panel' }),
      }).then(r => r.json()).catch(() => null);

      await Promise.all([Promise.resolve(), runVerifyAnimation()]);

      if (!isMountedRef.current) return;

      if (serverRes && serverRes.success && serverRes.user) {
        setAdminVerifiedUser(serverRes.user);
        setIsAdminVerifying(false);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setAdminStep(2);
          setVerifyProgress(0);
        }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(serverRes?.message || t(
          "Accès refusé. Cet email n'est pas autorisé.",
          'Tsy nahazo alalana.',
          'Access denied.'
        ));
      }
    } catch (error) {
      console.error('verifyAdminEmail error:', error);
      if (!isMountedRef.current) return;
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword || adminPassword.length !== 4) {
      setAdminError(t('Veuillez entrer un code à 4 caractères', 'Ampidiro kaody 4 isa', 'Please enter a 4-character code'));
      return;
    }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      const serverRes = await fetch(`${API}/api/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          email: adminVerifiedUser?.email,
          scope: 'admin-panel',
        }),
      }).then(r => r.json()).catch(() => null);

      await Promise.all([Promise.resolve(), runVerifyAnimation()]);

      if (!isMountedRef.current) return;

      if (serverRes && serverRes.success) {
        localStorage.setItem('adminToken', serverRes.token);
        setAdminToken(serverRes.token);
        if (serverRes.user) {
          localStorage.setItem('adminUser', JSON.stringify(serverRes.user));
          localStorage.setItem('adminName', serverRes.user.nom);
          localStorage.setItem('adminEmail', serverRes.user.email);
          localStorage.setItem('adminRole', serverRes.user.role);
          localStorage.setItem('adminAccessRole', serverRes.user.role);
        } else if (adminVerifiedUser) {
          localStorage.setItem('adminUser', JSON.stringify(adminVerifiedUser));
          localStorage.setItem('adminName', adminVerifiedUser.nom);
          localStorage.setItem('adminEmail', adminVerifiedUser.email);
          localStorage.setItem('adminRole', adminVerifiedUser.role);
          localStorage.setItem('adminAccessRole', adminVerifiedUser.role);
        }

        showToast(serverRes.message || t('Accès autorisé ✅', 'Nahazo alalana ✅', 'Access granted ✅'), 'success');

        setIsAdminVerifying(false);

        setTimeout(() => {
          if (!isMountedRef.current) return;
          closeAdminModal();
          setShowAdminPanel(true);
        }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(serverRes?.message || t('Code incorrect ❌', 'Diso ny kaody ❌', 'Incorrect code ❌'));
        setAdminPassword('');
      }
    } catch (error) {
      console.error('verifyAdminPassword error:', error);
      if (!isMountedRef.current) return;
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    }
  };

  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminAccessRole');
    setAdminToken(null);
    setIsAdminVerifying(false);
    forceReflow();
  }, []);

  const goToRegister = useCallback(() => {
    sessionStorage.setItem('just_registered', 'true');
    navigate('/register');
  }, [navigate]);

  const sectionContent = useMemo(() => ({
    home: {
      title: t("Bienvenue à l'OMDA", "Tongasoa eto amin'ny OMDA", 'Welcome to OMDA'),
      description: t(
        "L'Office Malagasy du Droit d'Auteur est l'institution publique chargée de la gestion et de la protection des droits d'auteur à Madagascar.",
        "Ny Birao Malagasy momba ny Zon'ny Mpanoratra dia andrim-panjakana miandraikitra ny fitantanana sy fiarovana ny zon'ny mpanoratra eto Madagasikara.",
        "The Malagasy Copyright Office is the public institution responsible for managing and protecting copyright in Madagascar."
      ),
      subtext: t(
        "Notre mission : protéger les œuvres, collecter et répartir les droits.",
        "Ny iraka ataonay: miaro ny sanganasa, manangona sy mizara ny zo.",
        "Our mission: protect works, collect and distribute royalties."
      ),
    },
    features: {
      title: t('Nos services', 'Ny serivisinay', 'Our services'),
      description: t("L'OMDA propose une gamme de services dédiés aux auteurs.", "Manolotra serivisy isan-karazany ny OMDA.", 'OMDA offers a range of services.'),
      subtext: t("Nous accompagnons les créateurs.", "Manaraka ny mpamorona izahay.", "We support creators."),
    },
    about: {
      title: t("À propos de l'OMDA", "Momba ny OMDA", 'About OMDA'),
      description: t("Créé en 1984, l'OMDA est un EPIC.", "Natsangana tamin'ny 1984 ny OMDA.", 'Created in 1984, OMDA is an EPIC.'),
      subtext: t("Notre équipe est dédiée.", "Ny ekipanay dia natokana.", "Our team is dedicated."),
    },
    service: {
      title: t('Nos prestations', 'Ny tolotray', 'Our services'),
      description: t("Nous offrons des prestations sur mesure.", "Manolotra tolotra manokana izahay.", "We offer tailor-made services."),
      subtext: t("Nous mettons à disposition des outils.", "Manolotra fitaovana izahay.", "We provide tools."),
    },
    contact: {
      title: t('Contactez-nous', 'Mifandraisa aminay', 'Contact us'),
      description: t("Nous sommes à votre écoute.", "Vonona hihaino anao izahay.", "We are here to answer."),
      subtext: t(
        "Adresse : Lot II F 62, Antaninandro, Antananarivo 101.",
        "Adiresy : Lot II F 62, Antaninandro, Antananarivo 101.",
        "Address: Lot II F 62, Antaninandro, Antananarivo 101."
      ),
    },
  }), [t]);

  const currentContent = sectionContent[activeSection] || sectionContent.home;

  if (showAdminPanel) {
    return (
      <AdminPanel
        onClose={handleCloseAdminPanel}
        adminToken={adminToken}
      />
    );
  }

  return (
    <div className="auth-landing">
      <div className="landing-bg"></div>

      <div className="landing-container">
        <header className="landing-header">
          <div className="header-left">
            <img src={omdaLogo} alt="OMDA" className="logo" />
            <span className="brand-name">OMDA</span>
          </div>
          <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveSection('home'); }} className={activeSection === 'home' ? 'active' : ''}>{t('Accueil', 'Fandraisana', 'Home')}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveSection('features'); }} className={activeSection === 'features' ? 'active' : ''}>{t('Fonctionnalités', 'Endri-javatra', 'Features')}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveSection('about'); }} className={activeSection === 'about' ? 'active' : ''}>{t('À propos', 'Momba', 'About')}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveSection('service'); }} className={activeSection === 'service' ? 'active' : ''}>{t('Services', 'Serivisy', 'Services')}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveSection('contact'); }} className={activeSection === 'contact' ? 'active' : ''}>{t('Contact', 'Fifandraisana', 'Contact')}</a>
          </nav>
          <div className="header-right">
            <button className="mobile-menu-btn" type="button" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        <main className="landing-main">
          <div className="landing-content">
            <div className="hero-text">
              <h1 className="hero-title">{currentContent.title}</h1>
              <p className="hero-description">{currentContent.description}</p>
              <p className="hero-subtext">{currentContent.subtext}</p><br />
              <div className="admin-link">
                <button className="admin-trigger" type="button" onClick={openAdminModal}>
                  <Crown size={14} /> {t('Accès Super Admin', 'Fidirana Super Admin', 'Super Admin Access')}
                </button>
              </div>
            </div>

            <div className="login-panel">
              <div className="login-card">
                <div className="login-card-header">
                  <Lock size={24} className="login-icon" />
                  <h2>{t('Authentification', 'Fanamarinana', 'Authentication')}</h2>
                  <p className="login-subtitle">
                    {t('Connectez-vous à votre espace', "Mifandraisa amin'ny sehatrao", 'Log in to your space')}
                  </p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label><User size={14} /> {t('Identifiant', 'Mpampiasa', 'Username')}</label>
                    <input
                      ref={usernameInputRef}
                      type="text"
                      placeholder={t('Votre email', 'Ny mailakao', 'Your email')}
                      className="input-field"
                      value={username}
                      onChange={handleUsernameChange}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                  </div>

                  <div className="form-group">
                    <label><Lock size={14} /> {t('Mot de passe', 'Teny miafina', 'Password')}</label>
                    <div className="password-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('Votre mot de passe', 'Ny teny miafinao', 'Your password')}
                        className="input-field"
                        value={password}
                        onChange={handlePasswordChange}
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`login-btn ${(!isFormValid || isLoading) ? 'disabled' : ''}`}
                    disabled={!isFormValid || isLoading}
                  >
                    {isLoading
                      ? t('Connexion en cours…', 'Mandefa…', 'Logging in…')
                      : (<><LogIn size={18} /> {t('CONNEXION', 'HIDITRA', 'LOGIN')}</>)}
                  </button>

                  <button className="create-account-btn" onClick={goToRegister} type="button">
                    {t('Créer un compte', 'Hamorona kaonty', 'Create account')}
                  </button>
                </form>

                <div className="login-footer">
                  <div className="help-row">
                    <AlertCircle size={14} />
                    <span>{t("Besoin d'aide ?", 'Mila fanampiana ?', 'Need help?')}</span>
                    <a href="mailto:omda@moov.mg">omda@moov.mg</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="landing-footer">
          <p>
            &copy; 2026 OMDA – {t(
              "Office Malagasy du Droit d'Auteur",
              "Birao Malagasy momba ny Zon'ny Mpanoratra",
              'Malagasy Copyright Office'
            )}
          </p>
        </footer>
      </div>

      {/* ============ MODAL BOOTSTRAP : 1er SUPER ADMIN ============ */}
      {showBootstrapModal && (
        <div
          className="modal-overlay admin-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isBootstrapping) closeBootstrapModal();
          }}
        >
          <div className="admin-pro-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-pro-header">
              <div className="admin-pro-badge"><Crown size={18} /></div>
              <div className="admin-pro-header-text">
                <h3>{t('Création du premier Super Admin', 'Famoronana Super Admin voalohany', 'Create first Super Admin')}</h3>
                <p>{t('Aucun compte Super Admin en base', 'Tsy misy Super Admin', 'No Super Admin in database')}</p>
              </div>
              <button
                type="button"
                className="admin-pro-close"
                onClick={closeBootstrapModal}
                disabled={isBootstrapping}
              >✕</button>
            </div>

            <form className="admin-pro-body" onSubmit={handleBootstrap}>
              <div className="admin-pro-field">
                <label><User size={14} /> {t('Nom complet', 'Anarana', 'Full name')}</label>
                <input
                  ref={bootstrapFirstInputRef}
                  type="text"
                  className="admin-pro-input"
                  value={bootstrapData.nom}
                  onChange={(e) => setBootstrapData(p => ({ ...p, nom: e.target.value }))}
                  disabled={isBootstrapping}
                  autoComplete="off"
                />
              </div>

              <div className="admin-pro-field">
                <label><Mail size={14} /> {t('Email', 'Mailaka', 'Email')}</label>
                <input
                  type="email"
                  className="admin-pro-input"
                  value={bootstrapData.email}
                  onChange={(e) => setBootstrapData(p => ({ ...p, email: e.target.value }))}
                  disabled={isBootstrapping}
                  autoComplete="off"
                />
              </div>

              <div className="admin-pro-field">
                <label><Lock size={14} /> {t('Code (4 caractères)', 'Kaody (4 isa)', 'Code (4 chars)')}</label>
                <input
                  type="text"
                  maxLength="4"
                  className="admin-pro-input"
                  value={bootstrapData.mot_de_passe}
                  onChange={(e) => setBootstrapData(p => ({ ...p, mot_de_passe: e.target.value.slice(0, 4) }))}
                  disabled={isBootstrapping}
                  autoComplete="off"
                />
              </div>

              <div className="admin-pro-field">
                <label><Lock size={14} /> {t('Confirmer le code', 'Hamafiso ny kaody', 'Confirm code')}</label>
                <input
                  type="text"
                  maxLength="4"
                  className="admin-pro-input"
                  value={bootstrapData.confirm}
                  onChange={(e) => setBootstrapData(p => ({ ...p, confirm: e.target.value.slice(0, 4) }))}
                  disabled={isBootstrapping}
                  autoComplete="off"
                />
              </div>

              {bootstrapError && (
                <div className="admin-error">⚠️ {bootstrapError}</div>
              )}

              <div className="admin-pro-actions">
                <button
                  type="submit"
                  className="admin-btn-validate"
                  disabled={isBootstrapping}
                >
                  {isBootstrapping
                    ? <><Loader2 size={16} className="spin" /> {t('Création…', 'Manamboatra…', 'Creating…')}</>
                    : <><ShieldCheck size={16} /> {t('Créer le Super Admin', 'Hamorona', 'Create Super Admin')}</>}
                </button>
                <button
                  type="button"
                  className="admin-btn-cancel"
                  onClick={closeBootstrapModal}
                  disabled={isBootstrapping}
                >
                  {t('Annuler', 'Foanana', 'Cancel')}
                </button>
              </div>
            </form>

            <div className="admin-pro-footer">
              <ShieldCheck size={14} />
              <span>{t('Premier démarrage — création obligatoire', 'Fanombohana — famoronana tsy maintsy atao', 'First start — mandatory creation')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL SUPER ADMIN (2 étapes) ============ */}
      {showAdminModal && (
        <div
          className="modal-overlay admin-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isAdminVerifying) closeAdminModal();
          }}
        >
          <div className="admin-pro-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="admin-pro-header">
              <div className="admin-pro-badge"><Crown size={18} /></div>
              <div className="admin-pro-header-text">
                <h3>{t('Espace Réservé', 'Sehatra Voatokana', 'Restricted Area')}</h3>
                <p>{t('Super Admin / Admin uniquement', 'Super Admin / Admin ihany', 'Super Admin / Admin only')}</p>
              </div>
              <button
                type="button"
                className="admin-pro-close"
                onClick={closeAdminModal}
                disabled={isAdminVerifying}
              >✕</button>
            </div>

            <div className="admin-steps">
              <div className={`admin-step ${adminStep === 1 ? 'active' : ''} ${adminStep > 1 ? 'done' : ''}`}>
                <div className="admin-step-circle">
                  {adminStep > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span>{t('Email', 'Mailaka', 'Email')}</span>
              </div>
              <div className={`admin-step-line ${adminStep > 1 ? 'done' : ''}`}></div>
              <div className={`admin-step ${adminStep === 2 ? 'active' : ''}`}>
                <div className="admin-step-circle">2</div>
                <span>{t('Mot de passe', 'Teny miafina', 'Password')}</span>
              </div>
            </div>

            <div className="admin-pro-body">
              {adminStep === 1 && (
                <>
                  <div className="admin-pro-field">
                    <label><Mail size={14} /> {t('Adresse email', 'Adiresy mailaka', 'Email address')}</label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      className="admin-pro-input"
                      placeholder={t('ex: votre@omda.mg', 'oh: votre@omda.mg', 'e.g. your@omda.mg')}
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminEmail(); }}
                      disabled={isAdminVerifying}
                      autoComplete="email"
                    />
                  </div>

                  {isAdminVerifying && (
                    <div className="admin-verify-anim">
                      <div className="admin-verify-spinner">
                        <Loader2 size={18} className="spin" />
                        <span>{t('Vérification en cours…', 'Manamarina…', 'Verifying…')}</span>
                      </div>
                      <div className="admin-verify-bar">
                        <div className="admin-verify-bar-fill" style={{ width: `${verifyProgress}%` }}></div>
                      </div>
                      <div className="admin-verify-pct">{verifyProgress}%</div>
                    </div>
                  )}

                  {adminError && !isAdminVerifying && (
                    <div className="admin-error">⚠️ {adminError}</div>
                  )}

                  <div className="admin-pro-actions">
                    <button
                      type="button"
                      className="admin-btn-validate"
                      onClick={verifyAdminEmail}
                      disabled={isAdminVerifying || !adminEmail.trim()}
                    >
                      {isAdminVerifying
                        ? <><Loader2 size={16} className="spin" /> {t('Vérification…', 'Manamarina…', 'Verifying…')}</>
                        : <><ShieldCheck size={16} /> {t('Vérifier', 'Hamarino', 'Verify')}</>}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-cancel"
                      onClick={closeAdminModal}
                      disabled={isAdminVerifying}
                    >
                      {t('Annuler', 'Foanana', 'Cancel')}
                    </button>
                  </div>
                </>
              )}

              {adminStep === 2 && (
                <>
                  <div className="admin-verified-user">
                    <CheckCircle2 size={16} className="ok" />
                    <div>
                      <strong>{adminVerifiedUser?.nom}</strong>
                      <span>{adminVerifiedUser?.email}</span>
                      <em className={`admin-role-tag role-${adminVerifiedUser?.role}`}>
                        {adminVerifiedUser?.role === 'super_admin' ? '⭐ Super Admin' : '👑 Admin'}
                      </em>
                    </div>
                  </div>

                  <div className="admin-pro-field">
                    <label><Lock size={14} /> {t('Code (4 caractères)', 'Kaody (4 isa)', 'Code (4 characters)')}</label>
                    <div className="admin-password-wrapper">
                      <input
                        ref={passwordInputRef}
                        type={showAdminPassword ? 'text' : 'password'}
                        maxLength="4"
                        autoComplete="off"
                        className="admin-pro-input"
                        placeholder="• • • •"
                        value={adminPassword}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminPassword(); }}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 4);
                          setAdminPassword(v);
                          setAdminError('');
                        }}
                        disabled={isAdminVerifying}
                      />
                      <button
                        type="button"
                        className="toggle-admin-password"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        tabIndex={-1}
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {isAdminVerifying && (
                    <div className="admin-verify-anim">
                      <div className="admin-verify-spinner">
                        <Loader2 size={18} className="spin" />
                        <span>{t('Vérification en cours…', 'Manamarina…', 'Verifying…')}</span>
                      </div>
                      <div className="admin-verify-bar">
                        <div className="admin-verify-bar-fill" style={{ width: `${verifyProgress}%` }}></div>
                      </div>
                      <div className="admin-verify-pct">{verifyProgress}%</div>
                    </div>
                  )}

                  {adminError && !isAdminVerifying && (
                    <div className="admin-error">⚠️ {adminError}</div>
                  )}

                  <div className="admin-pro-actions">
                    <button
                      type="button"
                      className="admin-btn-validate"
                      onClick={verifyAdminPassword}
                      disabled={isAdminVerifying || adminPassword.length !== 4}
                    >
                      {isAdminVerifying
                        ? <><Loader2 size={16} className="spin" /> {t('Vérification…', 'Manamarina…', 'Verifying…')}</>
                        : <><ShieldCheck size={16} /> {t('Accéder', 'Hiditra', 'Access')}</>}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-back"
                      onClick={() => {
                        setAdminStep(1);
                        setAdminPassword('');
                        setAdminError('');
                        setVerifyProgress(0);
                      }}
                      disabled={isAdminVerifying}
                    >
                      ← {t('Retour', 'Hiverina', 'Back')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="admin-pro-footer">
              <ShieldCheck size={14} />
              <span>{t('Connexion sécurisée — OMDA', 'Fifandraisana voaro — OMDA', 'Secure connection — OMDA')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authentification;
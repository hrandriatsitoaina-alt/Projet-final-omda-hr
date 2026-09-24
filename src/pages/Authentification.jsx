// src/pages/Authentification.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Authentification.css';
import AdminPanel from './AdminPanel';
import omdaLogo from '../assets/imagesOMDA.png';
import { useToast } from '../components/Toast';
import {
  Lock, User, Eye, EyeOff, Crown, LogIn,
  Menu, X, AlertCircle, Mail, ShieldCheck, Loader2, CheckCircle2
} from 'lucide-react';
import { useT } from '../hooks/useT';

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

  // ====== ÉTAT MODAL SUPER ADMIN (2 ÉTAPES) ======
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminStep, setAdminStep] = useState(1); // 1 = email, 2 = password
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminVerifiedUser, setAdminVerifiedUser] = useState(null);
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);
  const [adminError, setAdminError] = useState('');
  // progress: 0 -> 100
  const [verifyProgress, setVerifyProgress] = useState(0);

  const [adminToken, setAdminToken] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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

  const handleUsernameChange = useCallback((e) => setUsername(e.target.value), []);
  const handlePasswordChange = useCallback((e) => setPassword(e.target.value), []);

  // ── LOGIN ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showToast(t('Veuillez remplir tous les champs', 'Fenoy ny saha rehetra', 'Please fill all fields'), 'error');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
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
        showToast(t('Connexion réussie', 'Nifandray soa aman-tsara', 'Login successful'), 'success');
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        showToast(
          data.message || t('Identifiants incorrects', 'Diso ny mombamomba', 'Incorrect credentials'),
          'error'
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      if (!isMountedRef.current) return;
      showToast(
        t('Erreur de connexion au serveur.', 'Nisy olana tamin\'ny fifandraisana.', 'Server connection error.'),
        'error'
      );
      setIsLoading(false);
    }
  };

  // ── SUPER ADMIN : ouvrir le modal ──
  const openAdminModal = useCallback(() => {
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

  // ── Fermer le modal ──
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
  }, []);

  // ── Animation de progression 5 secondes ──
  const runVerifyAnimation = () => new Promise((resolve) => {
    setVerifyProgress(0);
    const duration = 5000;
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

  // ── ÉTAPE 1 : vérifier l'email (super_admin ou admin seulement) ──
  const verifyAdminEmail = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) {
      setAdminError(t('Veuillez saisir un email', 'Ampidiro mailaka', 'Please enter an email'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminError(t('Format d\'email invalide', 'Diso ny endrik\'ny mailaka', 'Invalid email format'));
      return;
    }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      // Lancer en parallèle : vérification serveur + animation 5s
      const [serverRes] = await Promise.all([
        fetch('http://localhost:3001/api/admin/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).then(r => r.json()).catch(() => ({ success: false })),
        runVerifyAnimation(),
      ]);

      if (!isMountedRef.current) return;

      // Si le serveur ne connaît pas la route, on fait un fallback côté client
      let isValid = false;
      let userInfo = null;

      if (serverRes && serverRes.success && serverRes.user) {
        isValid = true;
        userInfo = serverRes.user;
      } else if (serverRes && serverRes.success === false && serverRes.notFound !== true) {
        isValid = false;
      } else {
        // Fallback : vérifier via /api/auth/users
        try {
          const resp = await fetch('http://localhost:3001/api/auth/users');
          const data = await resp.json();
          const users = data.users || [];
          const found = users.find(u =>
            (u.email || '').toLowerCase() === email &&
            (u.role === 'super_admin' || u.role === 'admin') &&
            u.statut === 'actif'
          );
          if (found) {
            isValid = true;
            userInfo = { id: found.id, nom: found.nom, email: found.email, role: found.role };
          }
        } catch (e) {
          console.warn('Fallback verify email error:', e);
        }
      }

      if (isValid) {
        setAdminVerifiedUser(userInfo);
        setIsAdminVerifying(false);
        // Petite pause pour montrer 100%
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setAdminStep(2);
          setVerifyProgress(0);
        }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(t(
          'Accès refusé. Cet email n\'est pas autorisé.',
          'Tsy nahazo alalana. Tsy azo ekena ity mailaka ity.',
          'Access denied. This email is not authorized.'
        ));
      }
    } catch (error) {
      console.error('verifyAdminEmail error:', error);
      if (!isMountedRef.current) return;
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  // ── ÉTAPE 2 : vérifier le mot de passe ──
  const verifyAdminPassword = async () => {
    if (!adminPassword || adminPassword.length !== 4) {
      setAdminError(t(
        'Veuillez entrer un code à 4 chiffres',
        'Ampidiro kaody 4 isa',
        'Please enter a 4-digit code'
      ));
      return;
    }

    setAdminError('');
    setIsAdminVerifying(true);

    try {
      const [serverRes] = await Promise.all([
        fetch('http://localhost:3001/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: adminPassword,
            email: adminVerifiedUser?.email,
          }),
        }).then(r => r.json()).catch(() => ({ success: false })),
        runVerifyAnimation(),
      ]);

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

        showToast(
          serverRes.message || t('Accès autorisé ✅', 'Nahazo alalana ✅', 'Access granted ✅'),
          'success'
        );

        setIsAdminVerifying(false);

        setTimeout(() => {
          if (!isMountedRef.current) return;
          closeAdminModal();
          setShowAdminPanel(true);
        }, 400);
      } else {
        setIsAdminVerifying(false);
        setAdminError(t(
          'Mot de passe incorrect ❌',
          'Diso ny teny miafina ❌',
          'Incorrect password ❌'
        ));
        setAdminPassword('');
      }
    } catch (error) {
      console.error('verifyAdminPassword error:', error);
      if (!isMountedRef.current) return;
      setIsAdminVerifying(false);
      setAdminError(t('Erreur de connexion', 'Nisy olana tamin\'ny fifandraisana', 'Connection error'));
    }
  };

  // ── Fermeture propre du AdminPanel ──
  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdminVerifying(false);
  }, []);

  const goToRegister = useCallback(() => {
    sessionStorage.setItem('just_registered', 'true');
    navigate('/register');
  }, [navigate]);

  const sectionContent = useMemo(() => ({
    home: {
      title: t("Bienvenue à l'OMDA", "Tongasoa eto amin'ny OMDA", 'Welcome to OMDA'),
      description: t(
        "L'Office Malagasy du Droit d'Auteur est l'institution publique chargée de la gestion et de la protection des droits d'auteur à Madagascar. Créé en 1984, il œuvre pour la reconnaissance et la rémunération des créateurs.",
        "Ny Birao Malagasy momba ny Zon'ny Mpanoratra dia andrim-panjakana miandraikitra ny fitantanana sy fiarovana ny zon'ny mpanoratra eto Madagasikara. Natsangana tamin'ny 1984 izy, miasa ho fanekena sy valisoa ny mpamorona.",
        "The Malagasy Copyright Office is the public institution responsible for managing and protecting copyright in Madagascar. Founded in 1984, it works for the recognition and remuneration of creators."
      ),
      subtext: t(
        "Notre mission : protéger les œuvres, collecter et répartir les droits, sensibiliser le public et lutter contre la contrefaçon.",
        "Ny iraka ataonay: miaro ny sanganasa, manangona sy mizara ny zo, mampahafantatra ny besinimaro ary miady amin'ny hosoka.",
        "Our mission: protect works, collect and distribute royalties, raise public awareness and fight counterfeiting."
      ),
    },
    features: {
      title: t('Nos services', 'Ny serivisinay', 'Our services'),
      description: t(
        "L'OMDA propose une gamme de services dédiés aux auteurs, artistes et créateurs malgaches : enregistrement des œuvres, perception des droits, conseil juridique, et bien plus.",
        "Manolotra serivisy isan-karazany ho an'ny mpanoratra, mpanakanto ary mpamorona malagasy ny OMDA: firaketana sanganasa, fanangonana zo, torohevitra ara-dalàna, sy ny maro hafa.",
        "OMDA offers a range of services dedicated to Malagasy authors, artists and creators: work registration, royalty collection, legal advice, and much more."
      ),
      subtext: t(
        "Nous accompagnons les créateurs à chaque étape de leur carrière, de la protection de leurs œuvres à la perception des redevances.",
        "Manaraka ny mpamorona amin'ny dingana rehetra amin'ny asany izahay, manomboka amin'ny fiarovana ny sanganasany ka hatramin'ny fahazoana ny vola miditra.",
        "We support creators at every stage of their career, from protecting their works to collecting royalties."
      ),
    },
    about: {
      title: t("À propos de l'OMDA", "Momba ny OMDA", 'About OMDA'),
      description: t(
        "Créé en 1984 par le décret n°84-389, l'OMDA est un Établissement Public à Caractère Industriel et Commercial (EPIC). Placé sous la tutelle du Ministère de la Communication et de la Culture, il est un acteur clé du paysage culturel malgache.",
        "Natsangana tamin'ny 1984 tamin'ny didim-panjakana n°84-389 ny OMDA, ary andrim-panjakana ara-indostria sy ara-barotra (EPIC) izy. Eo ambany fiahian'ny Ministeran'ny Fifandraisana sy ny Kolontsaina izy, ary mpilalao fototra amin'ny tontolon'ny kolontsaina malagasy.",
        "Created in 1984 by decree No. 84-389, OMDA is a Public Industrial and Commercial Establishment (EPIC). Under the supervision of the Ministry of Communication and Culture, it is a key player in the Malagasy cultural landscape."
      ),
      subtext: t(
        "Notre équipe est dédiée à la promotion et à la défense des droits des auteurs, et nous collaborons avec des partenaires nationaux et internationaux pour renforcer notre action.",
        "Ny ekipanay dia natokana ho fampiroboroboana sy fiarovana ny zon'ny mpanoratra, ary miara-miasa amin'ny mpiara-miombon'antoka eo an-toerana sy iraisam-pirenena izahay hanamafisana ny asanay.",
        "Our team is dedicated to promoting and defending authors' rights, and we collaborate with national and international partners to strengthen our action."
      ),
    },
    service: {
      title: t('Nos prestations', 'Ny tolotray', 'Our services'),
      description: t(
        "Nous offrons des prestations sur mesure pour les auteurs, les éditeurs, les producteurs et les utilisateurs d'œuvres. Enregistrement, gestion des contrats, médiation, formation.",
        "Manolotra tolotra manokana ho an'ny mpanoratra, mpamoaka boky, mpamokatra ary mpampiasa sanganasa izahay. Firaketana, fitantanana fifanarahana, fanelanelanana, fiofanana.",
        "We offer tailor-made services for authors, publishers, producers and users of works. Registration, contract management, mediation, training."
      ),
      subtext: t(
        "Nous mettons à disposition des outils et des conseils pour vous aider à protéger et valoriser votre création.",
        "Manolotra fitaovana sy torohevitra izahay hanampiana anao hiaro sy hanandratra ny sanganasanao.",
        "We provide tools and advice to help you protect and enhance your creation."
      ),
    },
    contact: {
      title: t('Contactez-nous', 'Mifandraisa aminay', 'Contact us'),
      description: t(
        "Nous sommes à votre écoute pour toute question relative au droit d'auteur. N'hésitez pas à nous contacter par téléphone, email ou en visitant nos locaux.",
        "Vonona hihaino anao izahay amin'ny fanontaniana rehetra momba ny zon'ny mpanoratra. Aza misalasala mifandray aminay amin'ny finday, mailaka na mitsidika ny biraonay.",
        "We are here to answer any questions you may have about copyright. Feel free to contact us by phone, email or by visiting our offices."
      ),
      subtext: t(
        "Adresse : Lot II F 62, Rue Fredy Rajaofera, Antaninandro, Antananarivo 101. Tél : 261 20 22 610 19. Email : omda@moov.mg",
        "Adiresy : Lot II F 62, Rue Fredy Rajaofera, Antaninandro, Antananarivo 101. Finday : 261 20 22 610 19. Mailaka : omda@moov.mg",
        "Address: Lot II F 62, Rue Fredy Rajaofera, Antaninandro, Antananarivo 101. Phone: 261 20 22 610 19. Email: omda@moov.mg"
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
                    {t('Connectez-vous à votre espace', 'Mifandraisa amin\'ny sehatrao', 'Log in to your space')}
                  </p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label><User size={14} /> {t('Identifiant', 'Mpampiasa', 'Username')}</label>
                    <input
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
                    <span>{t('Besoin d\'aide ?', 'Mila fanampiana ?', 'Need help?')}</span>
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

      {/* ============ MODAL SUPER ADMIN PRO (2 ÉTAPES) ============ */}
      {showAdminModal && (
        <div className="modal-overlay admin-modal-overlay">
          <div className="admin-pro-modal">
            {/* En-tête */}
            <div className="admin-pro-header">
              <div className="admin-pro-badge">
                <Crown size={18} />
              </div>
              <div className="admin-pro-header-text">
                <h3>{t('Espace Réservé', 'Sehatra Voatokana', 'Restricted Area')}</h3>
                <p>{t(
                  'Super Administrateur / Administrateur uniquement',
                  'Super Administrateur / Administrateur ihany',
                  'Super Administrator / Administrator only'
                )}</p>
              </div>
              <button
                type="button"
                className="admin-pro-close"
                onClick={closeAdminModal}
                disabled={isAdminVerifying}
                aria-label="Fermer"
              >✕</button>
            </div>

            {/* Indicateur d'étapes */}
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

            {/* Corps */}
            <div className="admin-pro-body">
              {adminStep === 1 && (
                <>
                  <div className="admin-pro-field">
                    <label><Mail size={14} /> {t('Adresse email', 'Adiresy mailaka', 'Email address')}</label>
                    <input
                      type="email"
                      className="admin-pro-input"
                      placeholder={t('ex: entre votre mail', 'oh: ampidiro ny Mail', 'e.g. add mail')}
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminEmail(); }}
                      disabled={isAdminVerifying}
                      autoFocus
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
                    <label><Lock size={14} /> {t('Code à 4 chiffres', 'Kaody 4 isa', '4-digit code')}</label>
                    <div className="admin-password-wrapper">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        maxLength="4"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="admin-pro-input"
                        placeholder="• • • •"
                        value={adminPassword}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          setAdminPassword(v);
                          setAdminError('');
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminVerifying) verifyAdminPassword(); }}
                        disabled={isAdminVerifying}
                        autoFocus
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
              <span>{t(
                'Connexion sécurisée — OMDA',
                'Fifandraisana voaro — OMDA',
                'Secure connection — OMDA'
              )}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authentification;
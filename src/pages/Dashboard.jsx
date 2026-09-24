import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Home, Users, DollarSign, BarChart, User, MapPin, Menu, X,
  Award, Shield, Clock, CheckCircle, TrendingUp,
  CreditCard, Settings, Bell, Search,
  FileText, Calendar, Mail, Phone, Globe, Star,
  Activity, Zap, BookOpen, Bot, Send, MessageSquare,
  Loader2, AlertCircle, Minimize2, Target, Lightbulb,
  Trophy, ClipboardList, AlertTriangle, Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MiniSidebar from '../components/MiniSidebar';
import ParamCards from '../components/ParamCards';
import MainCards from '../components/MainCards';
import PaymentSection from '../components/PaymentSection';
import BilanCards from '../components/BilanCards';
import RegionListe from '../components/regionListe';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';
import '../styles/Dashboard.css';

const API_BASE = 'http://localhost:3001/api';

function Dashboard() {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  // ✅ Locale pour formatage
  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [userName, setUserName] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 994);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaAlertCount, setIaAlertCount] = useState(0);
  const chatMessagesRef = useRef(null);

  // ===== CHAT IA =====
  const envoyerMessageIA = async (texte) => {
    const message = (texte ?? userInput).trim();
    if (!message) return;

    setUserInput('');
    setShowChat(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIaLoading(true);

    try {
      // ✅ Envoi de la langue au backend
      const res = await axios.post(`${API_BASE}/ia/chat`, { message, langue });
      const reponse = res.data.success
        ? res.data.reponse
        : `⚠️ ${res.data.message || t('Je n\'ai pas pu traiter cette demande.', 'Tsy afaka namaly aho.', 'I could not process this request.')}`;
      setChatHistory(prev => [...prev, { role: 'assistant', content: reponse }]);
    } catch (err) {
      console.error('❌ Erreur chat IA:', err);
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: t(
          '⚠️ Le service IA est momentanément indisponible. Réessayez dans un instant.',
          '⚠️ Tsy misy ny serivisy IA. Andramo indray rehefa afaka kelikely.',
          '⚠️ IA service is temporarily unavailable. Please try again later.'
        )},
      ]);
    } finally {
      setIaLoading(false);
    }
  };

  const handleKeyPressIA = (e) => {
    if (e.key === 'Enter' && !iaLoading && userInput.trim()) {
      envoyerMessageIA();
    }
  };

  // ===== ALERTES IA =====
  useEffect(() => {
    const fetchAlertes = async () => {
      try {
        const res = await axios.get(`${API_BASE}/ia/diagnostic`);
        if (res.data.success && res.data.diagnostic) {
          setIaAlertCount(res.data.diagnostic.alertes?.length || 0);
        }
      } catch (err) {
        console.error('Erreur récupération alertes IA:', err);
      }
    };
    fetchAlertes();
    const interval = setInterval(fetchAlertes, 300000);
    return () => clearInterval(interval);
  }, []);

  // ===== AUTO-SCROLL CHAT =====
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory, iaLoading]);

  // ===== PRÉNOM =====
  const getFirstName = (fullName) => {
    if (!fullName) return t('Utilisateur', 'Mpampiasa', 'User');
    const nameParts = fullName.trim().split(' ');
    return nameParts[0] || t('Utilisateur', 'Mpampiasa', 'User');
  };

  // ===== RESPONSIVE + HORLOGE =====
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 994;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // ===== UTILISATEUR CONNECTÉ =====
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn || !userData) {
      navigate('/authentification');
      return;
    }
    try {
      const user = JSON.parse(userData);
      const fullName = user.nom || t('Utilisateur', 'Mpampiasa', 'User');
      setUserName(fullName);
      setUserFirstName(getFirstName(fullName));
      setUserRole(user.role || 'user');
    } catch (error) {
      console.error('Erreur:', error);
      navigate('/authentification');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ✅ Date formatée avec locale
  const formattedDate = useMemo(() => {
    return currentDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentDate, locale]);

  // ===== RENDU CHAT =====
  const renderChat = () => (
    <div className={`ia-chat-container ${showChat ? 'active' : ''}`}>
      <div className="ia-chat-header">
        <div className="ia-chat-header-left">
          <Bot size={20} />
          <span>{t('Assistant IA OMDA', 'Mpanampy IA OMDA', 'AI Assistant OMDA')}</span>
          <span className="ia-online-badge">● {t('En ligne', "Amin'ny aterineto", 'Online')}</span>
        </div>
        <div className="ia-chat-header-actions">
          <button className="ia-chat-close" onClick={() => setShowChat(false)} title={t('Fermer', 'Hidy', 'Close')}>
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="ia-chat-messages" ref={chatMessagesRef}>
        {chatHistory.length === 0 ? (
          <div className="ia-chat-empty">
            <Bot size={48} />
            <p>
              {t(
                'Bonjour ! Je suis votre assistant IA OMDA.',
                'Miarahaba ! Izaho no mpanampy IA OMDA anao.',
                'Hello! I am your OMDA AI assistant.'
              )}
            </p>
            <p className="ia-chat-empty-sub">
              {t(
                'Posez-moi une question sur vos données',
                'Apetraho amiko ny fanontanianao momba ny data anao',
                'Ask me a question about your data'
              )}
            </p>
            <div className="ia-chat-quick-actions">
              <button onClick={() => envoyerMessageIA(t('Quelle est la performance globale ?', 'Inona ny fahombiazan\'ny ankapobeny ?', 'What is the overall performance?'))}>
                <Target size={14} /> {t('Performance', 'Fahombiazana', 'Performance')}
              </button>
              <button onClick={() => envoyerMessageIA(t('Voir les alertes', 'Hijery ny fampitandremana', 'View alerts'))}>
                <AlertCircle size={14} /> {t('Alertes', 'Fampitandremana', 'Alerts')}
              </button>
              <button onClick={() => envoyerMessageIA(t('Suggestions IA', 'Soso-kevitra IA', 'AI Suggestions'))}>
                <Lightbulb size={14} /> {t('Suggestions', 'Soso-kevitra', 'Suggestions')}
              </button>
              <button onClick={() => envoyerMessageIA(t('Prévisions des revenus', 'Faminaniana momba ny fidiram-bola', 'Revenue forecasts'))}>
                <TrendingUp size={14} /> {t('Prévisions', 'Faminaniana', 'Forecasts')}
              </button>
              <button onClick={() => envoyerMessageIA(t('Quels sont les succès ?', 'Inona ny fahombiazana ?', 'What are the successes?'))}>
                <Trophy size={14} /> {t('Succès', 'Fahombiazana', 'Successes')}
              </button>
              <button onClick={() => envoyerMessageIA(t("Donne-moi le plan d'action", "Omeo ahy ny drafitry ny hetsika", 'Give me the action plan'))}>
                <ClipboardList size={14} /> {t("Plan d'action", "Draffitry ny hetsika", 'Action plan')}
              </button>
            </div>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className={`ia-chat-msg ${msg.role}`}>
              <div className={`ia-chat-avatar ${msg.role}`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`ia-chat-bubble ${msg.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {iaLoading && (
          <div className="ia-chat-msg assistant">
            <div className="ia-chat-avatar assistant">
              <Bot size={16} />
            </div>
            <div className="ia-chat-bubble assistant">
              <Loader2 size={16} className="spinning" />{' '}
              {t('Réflexion en cours...', 'Mieritreritra...', 'Thinking...')}
            </div>
          </div>
        )}
      </div>
      <div className="ia-chat-input">
        <input
          type="text"
          placeholder={t('Posez une question...', 'Mametraha fanontaniana...', 'Ask a question...')}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPressIA}
        />
        <button onClick={() => envoyerMessageIA()} disabled={iaLoading || !userInput.trim()}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );

  // ===== RENDU NOTIFICATION =====
  const renderNotification = () => (
    <button
      onClick={() => setShowChat(!showChat)}
      className={`ia-notification ${showChat ? 'active' : ''}`}
      title={t('Assistant IA', 'Mpanampy IA', 'AI Assistant')}
    >
      <MessageSquare size={24} />
      {iaAlertCount > 0 && !showChat && (
        <span className="ia-notification-badge">{iaAlertCount}</span>
      )}
      <span className="ia-notification-label">
        {t('IA Assistant', 'Mpanampy IA', 'AI Assistant')}
      </span>
    </button>
  );

  if (loading) {
    return (
      <>
        <Header />
        <Sidebar isOpen={false} isCollapsed={false} />
        <main className={`contenu ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <div className="loading-spinner"></div>
            <p style={{ color: '#2196F3', fontSize: '16px' }}>
              <Clock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              {t('Chargement...', 'Mandrindra...', 'Loading...')}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <MiniSidebar />
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      <main className={`contenu ${isCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {sidebarOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <section className="dashboard-header-section">
          <div className="dashboard-header-unified">
            <div className="header-left">
              <div className="omda-brand">
                <div className="omda-icon">
                  <BookOpen size={32} color="#FFFF" />
                </div>
                <div className="omda-brand-text">
                  <h1 className="omda-title" style={{ color: '#fff' }}>OMDA</h1>
                  <span className="omda-subtitle">
                    {t(
                      "OFFICE MALAGASY DU DROIT D'AUTEUR",
                      "OMDA office Malagasy",
                      'MALAGASY OFFICE OF COPYRIGHT'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="header-right">
              <div className="user-info-card">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <div className="user-name">{userFirstName}</div>
                  <div className="user-status">
                    <Shield size={12} />
                    <span>
                      {userRole === 'admin'
                        ? t('Administrateur', 'Mpandrindra', 'Administrator')
                        : t('Utilisateur', 'Mpampiasa', 'User')}
                    </span>
                    <span className="status-dot"></span>
                    <span className="status-text">
                      {t('En ligne', "Amin'ny aterineto", 'Online')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="date-time-card">
                <Calendar size={18} />
                <span className="date-text">{formattedDate}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <fieldset className="dashboard-fieldset">
            <legend className="dashboard-legend">
              <User size={18} strokeWidth={2} />
              {t('Perception OMDA :', 'Fandraisana OMDA :', 'OMDA Reception :')} {userFirstName}
              <span className="legend-badge">
                <Activity size={14} />
                {t('Actif', 'Mavitrika', 'Active')}
              </span>
            </legend>

            <div className="dashboard-content">
              <ParamCards />

              <h2 className="section-title-compact section-title-blue">
                <Users size={18} strokeWidth={2} />
                {t('Ajout et vérification', 'Fampidirana sy fanamarinana', 'Add and verify')}
                <span className="section-badge">
                  <Search size={13} />
                  {t('Rechercher', 'Tadiavo', 'Search')}
                </span>
              </h2>
              <MainCards />

              <h2 className="section-title-compact section-title-green">
                <DollarSign size={18} strokeWidth={2} />
                {t('Gestion des paiements', 'Fitandremana ny fandoavana', 'Payment management')}
                <span className="section-badge">
                  <CreditCard size={13} />
                  {t('Transactions', 'Fifanakalozana', 'Transactions')}
                </span>
              </h2>
              <PaymentSection />

              <h2 className="section-title-compact section-title-orange">
                <MapPin size={18} strokeWidth={2} />
                {t('Gestion des régions', 'Fitandremana ny faritra', 'Region management')}
                <span className="section-badge">
                  <Globe size={13} />
                  {t('5 régions', '5 faritra', '5 regions')}
                </span>
              </h2>
              <RegionListe />

              <h2 className="section-title-compact section-title-pink">
                <BarChart size={18} strokeWidth={2} />
                {t('Bilan et diagnostic', 'Famerenana sy diagnostika', 'Assessment and diagnosis')}
                <span className="section-badge">
                  <TrendingUp size={13} />
                  {t('Analyse', 'Famakafakana', 'Analysis')}
                </span>
              </h2>
              <BilanCards />
            </div>
          </fieldset>
        </section>

        <footer className="dashboard-footer">
          <span>
            <Mail size={14} />
            contact@omda.mg
          </span>
          <span>
            <Phone size={14} />
            +261 34 05 533 70
          </span>
          <span>
            <Globe size={14} />
            www.omda.mg
          </span>
          <span>
            © {new Date().getFullYear()} OMDA -{' '}
            {t('Tous droits réservés', 'Zo rehetra voatokana', 'All rights reserved')}
          </span>
        </footer>
      </main>

      {renderChat()}
      {renderNotification()}
    </>
  );
}

export default Dashboard;
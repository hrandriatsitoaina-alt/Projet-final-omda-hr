// src/pages/diagnostique.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Brain, TrendingUp, AlertTriangle, Clock, DollarSign, Users, MapPin,
  Activity, PieChart, Target, RefreshCw, Loader2, X, Lightbulb,
  AlertCircle, LineChart as LineChartIcon, Sparkles, Bot, Send,
  ChevronRight, ChevronDown, Compass, Globe, User, ClipboardList,
  Trophy, FileWarning, BarChart3, ArrowUp, ArrowDown, Minus, Home,
  CheckCircle, Zap, MessageSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Area, Cell,
  PieChart as RePieChart, Pie
} from 'recharts';

import '../styles/diagnostique.css';
import { useT } from '../hooks/useT';

const API_BASE = 'http://localhost:3001/api';

const PRIORITY_ICON = { haute: '🔴', moyenne: '🟡', basse: '🟢' };
const COLORS = ['#3d99f5', '#6bc1ff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ff9800'];

// Couleurs par région (cyclique)
const REGION_COLORS = [
  '#3d99f5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
};

const nettoyerReponse = (texte) => {
  if (!texte) return '';
  return texte
    .replace(/^<pre>/i, '')
    .replace(/<\/pre>$/i, '')
    .trim();
};

const Diagnostique = () => {
  const navigate = useNavigate();
  const { t, langue } = useT();

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('Toutes');

  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);

  const chatMessagesRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => { fetchDiagnostic(); }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory, iaLoading]);

  const fetchDiagnostic = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/ia/diagnostic`);
      if (res.data.success) setDiagnostic(res.data.diagnostic);
      else setError(res.data.message || t('Erreur', 'Olana', 'Error'));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const envoyerMessage = async (texte) => {
    const message = (texte ?? userInput).trim();
    if (!message) return;

    setUserInput('');
    setShowChat(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIaLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/ia/chat`, { message, langue });
      const reponse = res.data.success
        ? nettoyerReponse(res.data.reponse)
        : `⚠️ ${res.data.message || t('Erreur', 'Olana', 'Error')}`;
      setChatHistory(prev => [...prev, { role: 'assistant', content: reponse }]);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t(
          '⚠️ Service IA indisponible. Réessayez.',
          '⚠️ Tsy misy ny serivisy IA. Andramo indray.',
          '⚠️ AI service unavailable. Try again.'
        )
      }]);
    } finally {
      setIaLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !iaLoading && userInput.trim()) envoyerMessage();
  };

  const toggleExpand = (alertId) => {
    setExpandedAlert(prev => (prev === alertId ? null : alertId));
  };

  const handleAlertAction = (alert) => {
    if (alert.action === 'voir-usagers' && alert.categorie) {
      navigate(`/verification-usager?type=${alert.categorie}`);
      return;
    }
    if (alert.action === 'voir-quittances') { navigate('/quitance'); return; }

    let requete = t(
      `Explique-moi comment résoudre : ${alert.titre}`,
      `Hazavao ahy ny fomba hamahana : ${alert.titre}`,
      `Explain how to resolve: ${alert.titre}`
    );
    if (alert.action === 'mission' && alert.region) {
      requete = t(
        `Planifier une mission de prospection dans la région ${alert.region}`,
        `Handamina iraka fikarohana ao amin'ny faritra ${alert.region}`,
        `Plan a prospecting mission in region ${alert.region}`
      );
    } else if (alert.action === 'relance-globale') {
      requete = t(
        'Je veux lancer une campagne de relance pour les usagers en retard',
        'Te hanomboka fanentanana ho an\'ny mpampiasa tara aho',
        'I want to launch a reminder campaign for late users'
      );
    } else if (alert.action === 'analyser-tendance') {
      requete = t(
        'Analyser les causes de la baisse des revenus',
        'Fandinihana ny anton\'ny fihenan\'ny vola miditra',
        'Analyze the causes of declining revenue'
      );
    }
    envoyerMessage(requete);
  };

  const renderChat = () => (
    <>
      {showChat && <div className="ia-chat-overlay" onClick={() => setShowChat(false)} />}
      <div className={`ia-chat-container ${showChat ? 'active' : ''}`} ref={chatContainerRef}>
        <div className="ia-chat-header">
          <div className="ia-chat-header-left">
            <div className="ia-chat-header-avatar"><Bot size={18} /></div>
            <div className="ia-chat-header-info">
              <span className="ia-chat-title">
                {t('Assistant IA OMDA', 'Mpanampy IA OMDA', 'OMDA AI Assistant')}
              </span>
              <span className="ia-online-badge">
                ● {t('En ligne', 'Mifandray', 'Online')}
              </span>
            </div>
          </div>
          <button
            className="ia-chat-close"
            onClick={() => setShowChat(false)}
            title={t('Fermer', 'Hidio', 'Close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="ia-chat-messages" ref={chatMessagesRef}>
          {chatHistory.length === 0 ? (
            <div className="ia-chat-empty">
              <div className="ia-chat-empty-icon"><Bot size={40} /></div>
              <p className="ia-chat-empty-title">
                {t(
                  'Bonjour ! Je suis votre assistant IA OMDA.',
                  'Manao ahoana ! Izaho no mpanampy IA OMDA.',
                  'Hello! I am your OMDA AI assistant.'
                )}
              </p>
              <p className="ia-chat-empty-sub">
                {t(
                  'Posez-moi une question sur vos données ou choisissez une action rapide',
                  'Manontania momba ny angona na misafidiana hetsika haingana',
                  'Ask me a question about your data or choose a quick action'
                )}
              </p>
              <div className="ia-chat-quick-actions">
                <button onClick={() => envoyerMessage(t(
                  'Quelle est la performance globale ?',
                  'Manao ahoana ny fahombiazana ankapobeny ?',
                  'What is the overall performance?'
                ))}>
                  <Target size={14} /> {t('Performance', 'Fahombiazana', 'Performance')}
                </button>
                <button onClick={() => envoyerMessage(t(
                  'Voir les alertes',
                  'Jereo ny fampandrenesana',
                  'Show alerts'
                ))}>
                  <AlertCircle size={14} /> {t('Alertes', 'Fampandrenesana', 'Alerts')}
                </button>
                <button onClick={() => envoyerMessage(t(
                  'Suggestions IA',
                  'Soso-kevitra IA',
                  'AI suggestions'
                ))}>
                  <Lightbulb size={14} /> {t('Suggestions', 'Soso-kevitra', 'Suggestions')}
                </button>
                <button onClick={() => envoyerMessage(t(
                  'Prévisions des revenus',
                  'Vinavina ny vola miditra',
                  'Revenue forecast'
                ))}>
                  <TrendingUp size={14} /> {t('Prévisions', 'Vinavina', 'Forecast')}
                </button>
                <button onClick={() => envoyerMessage(t(
                  'Usagers en retard',
                  'Mpampiasa tara',
                  'Late users'
                ))}>
                  <Users size={14} /> {t('Usagers', 'Mpampiasa', 'Users')}
                </button>
                <button onClick={() => envoyerMessage(t(
                  "Donne-moi le plan d'action",
                  'Omeo ahy ny tetikasa',
                  'Give me the action plan'
                ))}>
                  <ClipboardList size={14} /> {t("Plan d'action", 'Tetikasa', 'Action plan')}
                </button>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`ia-chat-msg ${msg.role}`}>
                <div className={`ia-chat-avatar ${msg.role}`}>
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>

                {msg.role === 'assistant' ? (
                  <div className={`ia-chat-bubble ${msg.role}`}>
                    <div className="ia-texte-structure">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`ia-chat-bubble ${msg.role}`}
                    dangerouslySetInnerHTML={{ __html: escapeHtml(msg.content) }}
                  />
                )}
              </div>
            ))
          )}
          {iaLoading && (
            <div className="ia-chat-msg assistant">
              <div className="ia-chat-avatar assistant"><Bot size={16} /></div>
              <div className="ia-chat-bubble assistant loading">
                <Loader2 size={16} className="spinning" />
                <span>{t('Réflexion en cours...', 'Mieritreritra...', 'Thinking...')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="ia-chat-input">
          <input
            type="text"
            placeholder={t("Posez une question à l'IA...", 'Manontania ny IA...', 'Ask the AI a question...')}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={iaLoading}
          />
          <button
            onClick={() => envoyerMessage()}
            disabled={iaLoading || !userInput.trim()}
            title={t('Envoyer', 'Alefa', 'Send')}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );

  const renderNotification = () => (
    <button
      onClick={() => setShowChat(!showChat)}
      className={`ia-notification ${showChat ? 'active' : ''}`}
      title={showChat
        ? t('Fermer le chat', 'Hidio ny resaka', 'Close chat')
        : t("Ouvrir l'assistant IA", 'Hanokatra ny mpanampy IA', 'Open AI assistant')}
    >
      <MessageSquare size={24} />
      {diagnostic?.alertes?.length > 0 && !showChat && (
        <span className="ia-notification-badge">{diagnostic.alertes.length}</span>
      )}
      <span className="ia-notification-label">IA</span>
    </button>
  );

  if (loading) {
    return (
      <div className="diagnostique-loading">
        <div className="spinner"></div>
        <div className="loading-text">
          {t('Analyse IA des données en cours...', 'Fandinihana IA ny angona...', 'AI data analysis in progress...')}
        </div>
        <div className="loading-sub">
          {t('Cela peut prendre quelques secondes', 'Mety haharitra segondra vitsy', 'This may take a few seconds')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diagnostique-error">
        <div className="error-icon-wrap"><AlertCircle size={48} /></div>
        <h2>{t('Impossible de charger le diagnostic', 'Tsy afaka maka ny fandalinana', 'Unable to load diagnostic')}</h2>
        <p>{error}</p>
        <button onClick={() => fetchDiagnostic()}>
          <RefreshCw size={16} /> {t('Réessayer', 'Andramo indray', 'Retry')}
        </button>
      </div>
    );
  }

  if (!diagnostic) return null;

  const { global, categories, tendance, forecast, parRegion, historique, alertes, succes, suggestions } = diagnostic;

  const regionsDisponibles = [
    t('Toutes', 'Rehetra', 'All'),
    ...(parRegion || []).map(r => r.region)
  ];
  const regionsAffichees = selectedRegion === 'Toutes'
    ? (parRegion || [])
    : (parRegion || []).filter(r => r.region === selectedRegion);

  // ✅ Total pour calculer les pourcentages
  const totalParRegion = regionsAffichees.reduce((s, r) => s + (r.montant || 0), 0);
  const maxMontantRegion = regionsAffichees.reduce((m, r) => Math.max(m, r.montant || 0), 0);

  const dateGeneration = new Date(diagnostic.genereLe).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ✅ Bar data pour Taux par catégorie (BarChart horizontal)
  const tauxBarData = Object.entries(categories || {})
    .map(([key, c]) => ({
      name: c.label,
      value: c.tauxPaiement,
      payes: c.payes,
      total: c.total,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  const barData = Object.entries(categories || {}).map(([, c]) => ({ name: c.label, payes: c.payes, nonPayes: c.nonPayes }));

  const forecastData = (forecast || []).map((v, i) => ({
    mois: `M${i + 1}`,
    valeur: v.valeur !== undefined ? v.valeur : v,
    borneInf: v.borneInf !== undefined ? v.borneInf : null,
    borneSup: v.borneSup !== undefined ? v.borneSup : null,
  }));

  const getTendanceIcon = () => {
    if (!tendance) return <Minus size={16} />;
    if (tendance.direction === 'croissance') return <ArrowUp size={16} />;
    if (tendance.direction === 'décroissance') return <ArrowDown size={16} />;
    return <Minus size={16} />;
  };

  const getTendanceColor = () => {
    if (!tendance) return '#6b8a9a';
    if (tendance.direction === 'croissance') return '#22c55e';
    if (tendance.direction === 'décroissance') return '#ef4444';
    return '#f59e0b';
  };

  const labelPayes = t('Payés', 'Nandoa', 'Paid');
  const labelNonPayes = t('Non payés', 'Tsy nandoa', 'Unpaid');
  const labelActuel = t('Actuel', 'Ankehitriny', 'Current');
  const labelPrevu = t('Prévu', 'Vinavina', 'Forecast');

  return (
    <div className="diagnostique-page">
      {/* HEADER */}
      <div className="diagnostique-header">
        <div className="header-left">
          <div className="header-icon-wrap"><Brain size={26} /></div>
          <div className="header-titles">
            <h1>{t('Diagnostic IA', 'Fandinihana IA', 'AI Diagnostic')}</h1>
            <span className="subtitle">
              {t('Analyse avancée des données OMDA', 'Fanadihadiana lalina ny angona OMDA', 'Advanced OMDA data analysis')}
            </span>
          </div>
          <span className="ia-badge"><Sparkles size={14} /> {t('IA Actif', 'IA Mavitrika', 'AI Active')}</span>
        </div>
        <div className="header-right">
          <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="filter-select">
            {regionsDisponibles.map(region => (<option key={region} value={region}>{region}</option>))}
          </select>
          <button onClick={() => navigate('/dashboard')} className="btn-header btn-dashboard">
            <Home size={16} /> {t('Accueil', 'Tabilao', 'Dashboard')}
          </button>
        </div>
      </div>

      {/* BANDEAU IA */}
      <div className="ia-header-banner">
        <div className="ia-header-content">
          <div className="ia-header-avatar"><Bot size={28} /></div>
          <div>
            <h3>
              {t('Assistant IA', 'Mpanampy IA', 'AI Assistant')} — {t('Diagnostic IA', 'Fandinihana IA', 'AI Diagnostic')}
            </h3>
            <p>{t('Dernière analyse', 'Fanadihadiana farany', 'Last analysis')} : {dateGeneration}</p>
          </div>
        </div>
        <div className="ia-header-stats">
          <div className="ia-stat">
            <Activity size={16} />
            <span>{global.totalUsagers} {t('usagers', 'mpampiasa', 'users')}</span>
          </div>
          <div className="ia-stat">
            <DollarSign size={16} />
            <span>{global.totalUsagersPayes} {t('à jour', 'voaloa', 'up to date')}</span>
          </div>
          <div className="ia-stat highlight">
            <Target size={16} />
            <span>{global.tauxGlobal}% {t('taux', 'taham', 'rate')}</span>
          </div>
        </div>
      </div>

      {/* SUGGESTIONS */}
      {suggestions?.length > 0 && (
        <div className="ia-suggestions-container">
          <div className="section-header">
            <h4><Lightbulb size={18} /> {t('Suggestions IA', 'Soso-kevitra IA', 'AI Suggestions')}</h4>
            <span className="section-count">{suggestions.length}</span>
          </div>
          <div className="ia-suggestions-grid">
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                className={`ia-suggestion-item ${sug.priorite || 'basse'}`}
                onClick={() => envoyerMessage(sug.texte)}
              >
                <div className="suggestion-icon"><Zap size={15} /></div>
                <span className="suggestion-text">{sug.texte}</span>
                <span className="ia-suggestion-priority">{PRIORITY_ICON[sug.priorite] || '🟢'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="diagnostique-stats">
        <div className="stat-card">
          <div className="stat-icon users"><Users size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{global.totalUsagers}</span>
            <span className="stat-label">{t('Usagers', 'Mpampiasa', 'Users')}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><DollarSign size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{global.totalUsagersPayes}</span>
            <span className="stat-label">{t('À jour', 'Voaloa', 'Up to date')}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary"><Activity size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{global.tauxGlobal}%</span>
            <span className="stat-label">{t('Taux de paiement', 'Taham fandoavana', 'Payment rate')}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Clock size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{global.quittancesNonValidees}</span>
            <span className="stat-label">{t('Quittances à valider', 'Taratasy hamarinina', 'Receipts to validate')}</span>
          </div>
        </div>
      </div>

      {/* ALERTES */}
      {alertes?.length > 0 && (
        <div className="alerts-container">
          <div className="alerts-header">
            <h4><AlertTriangle size={18} /> {t('Alertes IA', 'Fampandrenesana IA', 'AI Alerts')}</h4>
            <span className="alerts-count">
              {alertes.length} {t('alerte', 'fampandrenesana', 'alert')}{alertes.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="alerts-list">
            {alertes.map((alert) => (
              <div key={alert.id} className={`alert-item-simple ${alert.type}`}>
                <div className="alert-icon-simple">
                  {alert.type === 'critique' ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="alert-content-simple">
                  <div className="alert-header-simple">
                    <span className="alert-title-simple">{alert.titre}</span>
                    <span className={`alert-badge-simple ${alert.type}`}>
                      {alert.type === 'critique'
                        ? t('Critique', 'Mafy', 'Critical')
                        : alert.type === 'warning'
                        ? t('Avertissement', 'Fampitandremana', 'Warning')
                        : t('Info', 'Vaovao', 'Info')}
                    </span>
                  </div>
                  <div className="alert-message-simple">{alert.message}</div>
                </div>
                <div className="alert-actions-simple">
                  <button className="alert-action-simple" onClick={() => toggleExpand(alert.id)}>
                    {expandedAlert === alert.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {t('Plan', 'Tetikasa', 'Plan')}
                  </button>
                  <button className="alert-action-simple secondary" onClick={() => handleAlertAction(alert)}>
                    <Bot size={14} /> IA
                  </button>
                  {alert.action === 'voir-usagers' && (
                    <button
                      className="alert-action-simple outline"
                      onClick={() => navigate(`/verification-usager?type=${alert.categorie}`)}
                    >
                      <Users size={14} /> {t('Usagers', 'Mpampiasa', 'Users')}
                    </button>
                  )}
                  {alert.action === 'voir-quittances' && (
                    <button className="alert-action-simple outline" onClick={() => navigate('/quitance')}>
                      <FileWarning size={14} /> {t('Quittances', 'Taratasy', 'Receipts')}
                    </button>
                  )}
                </div>
                {expandedAlert === alert.id && alert.plan && (
                  <div className="alert-plan-simple">
                    <ul>
                      {alert.plan.map((p, i) => (
                        <li key={i}>
                          <span className="step-num">{i + 1}</span>
                          <span className="step-text">{p.etape}</span>
                          <span className="delai">— {p.delai}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUCCÈS */}
      {succes?.length > 0 && (
        <div className="ia-message-container">
          <div className="ia-message">
            <div className="ia-icon-wrap"><Trophy size={22} /></div>
            <div className="ia-content">
              <strong className="ia-content-title">
                {t('Points positifs détectés', 'Zavatra tsara hita', 'Positive points detected')}
              </strong>
              <ul>
                {succes.map((s, i) => (
                  <li key={i}>
                    <CheckCircle size={14} className="success-check" />
                    <span><strong>{s.titre}</strong> — {s.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ✅ RÉPARTITION PAR RÉGION — NOUVELLE PRÉSENTATION EN CARTES */}
      {regionsAffichees.length > 0 && (
        <div className="detail-section full-width">
          <div className="section-header">
            <h4>
              <MapPin size={18} /> {t('Répartition par région', 'Fizarana isaky ny faritra', 'Distribution by region')}
              {selectedRegion !== 'Toutes' && (
                <span className="region-tag">— {selectedRegion}</span>
              )}
            </h4>
            <span className="section-total">
              {t('Total', 'Fitambarany', 'Total')} : {Math.round(totalParRegion).toLocaleString(locale)} Ar
            </span>
          </div>

          <div className="regions-cards-grid">
            {regionsAffichees
              .slice()
              .sort((a, b) => (b.montant || 0) - (a.montant || 0))
              .map((r, i) => {
                const color = REGION_COLORS[i % REGION_COLORS.length];
                const pct = totalParRegion > 0
                  ? ((r.montant / totalParRegion) * 100).toFixed(1)
                  : 0;
                const barPct = maxMontantRegion > 0
                  ? (r.montant / maxMontantRegion) * 100
                  : 0;

                return (
                  <div
                    key={r.region}
                    className="region-card-new"
                    style={{ borderLeftColor: color }}
                  >
                    <div className="region-card-top">
                      <div className="region-card-name-wrap">
                        <span
                          className="region-card-dot"
                          style={{ background: color }}
                        />
                        <span className="region-card-name">{r.region}</span>
                      </div>
                      <span
                        className="region-card-pct"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>

                    <div className="region-card-amount">
                      {Math.round(r.montant).toLocaleString(locale)} <small>Ar</small>
                    </div>

                    <div className="region-card-bar">
                      <div
                        className="region-card-bar-fill"
                        style={{ width: `${barPct}%`, background: color }}
                      />
                    </div>

                    <div className="region-card-meta">
                      <span>
                        <Users size={12} />
                        {r.nbUsagers || 0} {t('usagers', 'mpampiasa', 'users')}
                      </span>
                      <span>
                        <DollarSign size={12} />
                        {r.nbQuittances || 0} {t('paiements', 'fandoavana', 'payments')}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Total général sous les cartes */}
          <div className="regions-total-row">
            <span className="regions-total-label">
              {t('Somme des régions', 'Fitambarany ny faritra', 'Sum of regions')}
            </span>
            <span className="regions-total-value">
              {Math.round(totalParRegion).toLocaleString(locale)} Ar
            </span>
          </div>
        </div>
      )}

      {/* GRAPHIQUES */}
      <div className="diagnostique-charts">
        {forecastData.length > 0 && (
          <div className="chart-card">
            <h4><TrendingUp size={18} /> {t('Prévisions 6 mois', 'Vinavina 6 volana', '6-month forecast')}</h4>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6b8a9a' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b8a9a' }} />
                  <Tooltip formatter={(v) => `${Math.round(v).toLocaleString(locale)} Ar`} />
                  <defs>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3d99f5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3d99f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="valeur" fill="url(#forecastGradient)" stroke="none" />
                  <Line type="monotone" dataKey="valeur" stroke="#3d99f5" strokeWidth={2.8}
                    dot={{ fill: '#3d99f5', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {barData.length > 0 && (
          <div className="chart-card">
            <h4><PieChart size={18} /> {t('Paiements par catégorie', 'Fandoavana isaky ny sokajy', 'Payments by category')}</h4>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b8a9a' }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b8a9a' }} />
                  <Tooltip />
                  <Bar dataKey="payes" fill="#22c55e" name={labelPayes} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="nonPayes" fill="#ef4444" name={labelNonPayes} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ✅ TAUX PAR CATÉGORIE — BarChart HORIZONTAL au lieu de Donut */}
        {tauxBarData.length > 0 && (
          <div className="chart-card">
            <h4><BarChart3 size={18} /> {t('Taux par catégorie', 'Taham isaky ny sokajy', 'Rate by category')}</h4>
            <div className="chart-wrapper" style={{ height: Math.max(220, tauxBarData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tauxBarData}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 20, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6b8a9a' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#1a3a5c', fontWeight: 600 }}
                    width={110}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value}% (${props.payload.payes}/${props.payload.total})`,
                      t('Taux', 'Taham', 'Rate'),
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    label={{
                      position: 'right',
                      formatter: (v) => `${v}%`,
                      fontSize: 11,
                      fill: '#1a3a5c',
                      fontWeight: 700,
                    }}
                  >
                    {tauxBarData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value >= 75 ? '#22c55e'
                          : entry.value >= 50 ? '#3d99f5'
                          : entry.value >= 25 ? '#f59e0b'
                          : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tendance && (
          <div className="chart-card">
            <h4 className="chart-title-with-trend">
              <span className="chart-title-left">
                <LineChartIcon size={18} /> {t('Tendance', 'Fironana', 'Trend')}
              </span>
              <span className="trend-badge" style={{ color: getTendanceColor() }}>
                {getTendanceIcon()} {tendance.pourcentage}%
              </span>
            </h4>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { periode: labelActuel, valeur: 100 },
                  { periode: labelPrevu, valeur: 100 + (tendance.pourcentage || 0) },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 12, fill: '#6b8a9a' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b8a9a' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="valeur" stroke={getTendanceColor()} strokeWidth={3}
                    dot={{ fill: getTendanceColor(), r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {tendance.r2 !== undefined && (
              <div style={{ fontSize: 12, color: '#6b8a9a', textAlign: 'center', marginTop: 4 }}>
                R² = {tendance.r2}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OBJECTIFS + SUGGESTIONS */}
      <div className="diagnostique-details">
        <div className="detail-section">
          <h4><Target size={18} /> {t('Objectifs', 'Tanjona', 'Objectives')}</h4>
          <ul className="detail-list">
            <li>
              <Target size={16} />
              <span>{t('Atteindre', 'Mahatratra', 'Reach')} <strong>{global.objectifTaux}%</strong> {t('taux', 'taham', 'rate')}</span>
            </li>
            {tendance && (
              <li>
                <Compass size={16} />
                <span>{t('Tendance', 'Fironana', 'Trend')} : <strong>{tendance.direction}</strong> ({tendance.pourcentage}%)</span>
              </li>
            )}
            <li>
              <Clock size={16} />
              <span>
                <strong>{global.quittancesNonValidees}</strong>{' '}
                {t('quittance non validée', 'taratasy tsy mbola voamarina', 'unvalidated receipt')}
                {global.quittancesNonValidees > 1 ? 's' : ''}
              </span>
            </li>
          </ul>
        </div>

        <div className="detail-section">
          <h4><Lightbulb size={18} /> {t('Suggestions', 'Soso-kevitra', 'Suggestions')}</h4>
          <ul className="detail-list">
            {(suggestions || []).map((s, i) => (
              <li key={i} className="suggestion-list-item">
                <span className="priority-dot">{PRIORITY_ICON[s.priorite] || '🟢'}</span>
                <span>{s.texte}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* HISTORIQUE */}
      <div className="performance-history">
        <h4><LineChartIcon size={18} /> {t('Historique de performance', "Tantaran'ny fahombiazana", 'Performance history')}</h4>
        <div className="performance-stats">
          <div className="perf-item">
            <span className="perf-label">{t('Meilleur mois', 'Volana tsara indrindra', 'Best month')}</span>
            <span className="perf-value">
              {historique?.meilleurMois
                ? `${historique.meilleurMois.montant.toLocaleString(locale)} Ar`
                : t('Pas assez de données', 'Tsy ampy angona', 'Not enough data')}
            </span>
            {historique?.meilleurMois && <span className="perf-sub">{historique.meilleurMois.periode}</span>}
          </div>
          <div className="perf-item">
            <span className="perf-label">{t('Moyenne mensuelle', 'Antonony isam-bolana', 'Monthly average')}</span>
            <span className="perf-value">{(historique?.moyenneMensuelle || 0).toLocaleString(locale)} Ar</span>
          </div>
          <div className="perf-item">
            <span className="perf-label">{t('Croissance annuelle', 'Fitomboana isan-taona', 'Annual growth')}</span>
            <span className="perf-value" style={{
              color: historique?.croissanceAnnuelle > 0 ? '#22c55e'
                : historique?.croissanceAnnuelle < 0 ? '#ef4444' : '#f59e0b'
            }}>
              {historique?.croissanceAnnuelle !== null && historique?.croissanceAnnuelle !== undefined
                ? `${historique.croissanceAnnuelle > 0 ? '+' : ''}${historique.croissanceAnnuelle}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {renderChat()}
      {renderNotification()}
    </div>
  );
};

export default Diagnostique;
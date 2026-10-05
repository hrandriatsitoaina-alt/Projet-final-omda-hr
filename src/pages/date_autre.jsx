// src/pages/Dateautre.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ShoppingBag, Bus, Music, Tv, Hotel,
  ArrowLeft, Users, Package,
} from 'lucide-react';
import '../styles/date_autre.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MiniSidebar from '../components/MiniSidebar';
// ✅ Hook unique
import { useT } from '../hooks/useT';

const Dateautre = () => {
  const navigate = useNavigate();
  const { t } = useT(); // ✅ t + langue depuis le Context

  const [counts, setCounts] = useState({
    hotel: 0, grandSurface: 0, bus: 0,
    nightclub: 0, media: 0, occ: 0, other: 0,
  });

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [hotelRes, grandSurfaceRes, busRes, nightclubRes, mediaRes, occRes, otherRes] =
        await Promise.all([
          fetch('http://localhost:3001/api/usagers/paiements/hotel'),
          fetch('http://localhost:3001/api/usagers/paiements/grand-surface'),
          fetch('http://localhost:3001/api/usagers/paiements/bus'),
          fetch('http://localhost:3001/api/usagers/paiements/nightclub'),
          fetch('http://localhost:3001/api/usagers/paiements/media'),
          fetch('http://localhost:3001/api/usagers/occasionnels'),
          fetch('http://localhost:3001/api/other-usagers'),
        ]);

      const [hotelData, grandSurfaceData, busData, nightclubData, mediaData, occData, otherData] =
        await Promise.all([
          hotelRes.json(), grandSurfaceRes.json(), busRes.json(),
          nightclubRes.json(), mediaRes.json(), occRes.json(), otherRes.json(),
        ]);

      let mediaCount = 0;
      if (mediaData.success && mediaData.usagers) mediaCount = mediaData.usagers.length;

      setCounts({
        hotel: hotelData.success ? hotelData.usagers.length : 0,
        grandSurface: grandSurfaceData.success ? grandSurfaceData.usagers.length : 0,
        bus: busData.success ? busData.usagers.length : 0,
        nightclub: nightclubData.success ? nightclubData.usagers.length : 0,
        media: mediaCount,
        occ: occData.success
          ? occData.events
            ? occData.events.length
            : occData.usagers
            ? occData.usagers.length
            : 0
          : 0,
        other: otherData.success
          ? otherData.usagers
            ? otherData.usagers.length
            : 0
          : 0,
      });
    } catch (error) {
      console.error('❌ Erreur chargement des compteurs:', error);
    }
  };

  const cards = [
    {
      id: 'occ',
      icon: Calendar,
      title: t('Occasionnelle', 'Fotoana manokana', 'Occasionals'),
      count: counts.occ,
      desc: t("Ajout d'un événement", 'Fanampiana hetsika', 'Add an event'),
      path: '/date_occ',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
    {
      id: 'grandSurface',
      icon: ShoppingBag,
      title: t('Grande Surface', 'Fivarotana lehibe', 'Large Store'),
      count: counts.grandSurface,
      desc: t("Ajout d'un lieu", 'Fanampiana toerana', 'Add a place'),
      path: '/date-grandsurface',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
    {
      id: 'bus',
      icon: Bus,
      title: t('Transport', 'Fitanterana', 'Transport'),
      count: counts.bus,
      desc: t("Ajout d'une ligne", 'Fanampiana lalana', 'Add a line'),
      path: '/date-bus',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
    {
      id: 'nightclub',
      icon: Music,
      title: t('Night Club', 'Club alina', 'Night Club'),
      count: counts.nightclub,
      desc: t('Boîte de nuit', 'Toeram-pandihizana alina', 'Night club'),
      path: '/night-club',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
    {
      id: 'media',
      icon: Tv,
      title: t('Média', 'Haino aman-jery', 'Media'),
      count: counts.media,
      desc: t('Télé / Radio', 'Fahitalavitra / Radio', 'TV / Radio'),
      path: '/tele-radio',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
    {
      id: 'hotel',
      icon: Hotel,
      title: t('Hôtel', 'Hotely', 'Hotel'),
      count: counts.hotel,
      desc: t('Détail des hôtels', "Antsipirian'ny hotely", 'Hotel details'),
      path: '/Hotel_occ',
      countLabel: t('inscrit', 'voasoratra', 'registered'),
      btnLabel: t("Plus d'information", 'Fanazavana bebe kokoa', 'More information'),
    },
  ];

  return (
    <>
      <Header />
      <Sidebar />
      <MiniSidebar />
      <main className="contenu">
        <fieldset className="compact-fieldset">
          <legend>
            <Users size={20} strokeWidth={2} />
            {t(
              "Traitement d'ajout des usagers",
              'Fikirakirana ny fampidirana mpampiasa',
              'User addition processing'
            )}
          </legend>

          <div className="compact-grid">
            {cards.map((card) => (
              <div className="compact-card" key={card.id}>
                <div className="compact-card-icon">
                  <card.icon size={34} strokeWidth={1.8} />
                </div>
                <div className="compact-card-content">
                  <div className="compact-card-title">
                    {card.title}
                    <span className="compact-card-count">
                      {card.count} {card.countLabel}
                    </span>
                  </div>
                  <div className="compact-card-desc">{card.desc}</div>
                  <button
                    className="compact-card-btn"
                    onClick={() => navigate(card.path)}
                  >
                    {card.btnLabel} →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="other-featured-wrapper">
            <div className="other-featured-card">
              <div className="other-featured-icon">
                <Package size={44} strokeWidth={1.6} />
              </div>
              <div className="other-featured-content">
                <h3 className="other-featured-title">
                  {t('Usager événementiel', 'Mpampiasa hetsika', 'Event user')}
                  <span className="other-featured-count">
                    {counts.other} {t('inscrit', 'voasoratra', 'registered')}
                    {counts.other > 1 && t('s', '', 's') ? 's' : ''}
                  </span>
                </h3>
                <p className="other-featured-desc">
                  {t(
                    'CD, MP3, Œuvres Web, Hologrammes, Vidéos...',
                    'CD, MP3, Asa an-tserasera, Holograma, Lahatsary...',
                    'CD, MP3, Web works, Holograms, Videos...'
                  )}
                </p>
                <div className="other-featured-tags">
                  <span className="other-tag">CD</span>
                  <span className="other-tag">MP3</span>
                  <span className="other-tag">{t('Web', 'Web', 'Web')}</span>
                  <span className="other-tag">{t('Hologramme', 'Holograma', 'Hologram')}</span>
                  <span className="other-tag">{t('Vidéo', 'Lahatsary', 'Video')}</span>
                  <span className="other-tag">{t('Autre', 'Hafa', 'Other')}</span>
                </div>
                <div className="other-featured-actions">
                  <button
                    className="other-btn other-btn-primary"
                    onClick={() => navigate('/date_other')}
                  >
                    {t('Voir la liste', 'Hijery ny lisitra', 'View list')} →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="compact-footer">
            <button
              className="compact-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={18} strokeWidth={2} />
              {t(
                "Retour à l'accueil",
                "Hiverina any amin'ny Fandraisana",
                'Back to home'
              )}
            </button>
          </div>
        </fieldset>
      </main>
    </>
  );
};

export default Dateautre;
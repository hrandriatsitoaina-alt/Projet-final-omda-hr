import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ShoppingBag, Radio, MoreHorizontal,
  Settings, Users, Database,
} from 'lucide-react';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const ParamCard = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t } = useT();

  const [counts, setCounts] = useState({
    occ: 0,
    grandSurface: 0,
    media: 0,
    hotel: 0,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const [occRes, grandSurfaceRes, mediaRes, hotelRes] = await Promise.all([
        fetch('http://localhost:3001/api/usagers/occasionnels'),
        fetch('http://localhost:3001/api/usagers/paiements/grand-surface'),
        fetch('http://localhost:3001/api/usagers/paiements/media'),
        fetch('http://localhost:3001/api/usagers/paiements/hotel'),
      ]);

      const occData = await occRes.json();
      const grandSurfaceData = await grandSurfaceRes.json();
      const mediaData = await mediaRes.json();
      const hotelData = await hotelRes.json();

      setCounts({
        occ: occData.success
          ? occData.events
            ? occData.events.length
            : occData.usagers
            ? occData.usagers.length
            : 0
          : 0,
        grandSurface: grandSurfaceData.success ? grandSurfaceData.usagers.length : 0,
        media: mediaData.success ? mediaData.usagers.length : 0,
        hotel: hotelData.success ? hotelData.usagers.length : 0,
      });
    } catch (error) {
      console.error('❌ Erreur chargement des compteurs:', error);
    }
  }, []);

  // ✅ Fetch une seule fois au montage (indépendant de la langue)
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <div className="param-card">
      <div className="param-header">
        <h1>
          <Users size={20} strokeWidth={2} />
          {t(
            'Paramètres du droit public',
            "Fandrindrana ny zon'ny besinimaro",
            'Public rights settings'
          )}
        </h1>
      </div>

      <div className="param-grid">
        <div className="param-item">
          <div className="param-icon">
            <Calendar size={20} strokeWidth={1.8} />
          </div>
          <div className="param-number">{counts.occ}</div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/date_occ'); }}
          >
            {t('Occasionnelle', 'Tsindraindray', 'Occasional')}
          </a>
        </div>

        <div className="param-item">
          <div className="param-icon">
            <ShoppingBag size={20} strokeWidth={1.8} />
          </div>
          <div className="param-number">{counts.grandSurface}</div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/date-grandsurface'); }}
          >
            {t('Grande surface', 'Trano fivarotana lehibe', 'Supermarket')}
          </a>
        </div>

        <div className="param-item">
          <div className="param-icon">
            <Radio size={20} strokeWidth={1.8} />
          </div>
          <div className="param-number">{counts.media}</div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/tele-radio'); }}
          >
            {t('Media', 'Haino aman-jery', 'Media')}
          </a>
        </div>

        <div className="param-item">
          <div className="param-icon">
            <MoreHorizontal size={20} strokeWidth={1.8} />
          </div>
          <div className="param-number param-other">
            <span>{counts.hotel}</span>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/autre-usager'); }}
          >
            {t('Autre Usager', 'Mpampiasa hafa', 'Other User')}
          </a>
        </div>
      </div>

      <div className="param-actions">
        <button
          className="action-btn btn-database"
          onClick={() => navigate('/base-de-donnees')}
        >
          <Database size={18} />{' '}
          {t('Gestion de bd', 'Fitandremana tahiry', 'Database management')}
        </button>
        <button
          className="action-btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => navigate('/Parametre_global')}
        >
          <Settings size={15} />{' '}
          {t('Paramètres', 'Fandrindrana', 'Settings')}
        </button>
      </div>
    </div>
  );
};

export default ParamCard;
// src/context/ParametreContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

const API_BASE = 'http://localhost:3001/api';
const LANGUES_VALIDES = ['fr', 'mg', 'en'];
const STORAGE_KEY_LANGUE = 'app-langue';

const ParametreContext = createContext();

export const useParametres = () => {
  const context = useContext(ParametreContext);
  if (!context) {
    throw new Error('useParametres must be used within ParametreProvider');
  }
  return context;
};

function getUtilisateurActuel() {
  try {
    const raw =
      localStorage.getItem('utilisateur') || localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { id: parsed.id, role: parsed.role, nom: parsed.nom };
    }
  } catch (e) {
    /* ignore */
  }
  const id =
    localStorage.getItem('userId') || localStorage.getItem('utilisateurId');
  return { id: id || null, role: localStorage.getItem('role') || 'user', nom: '' };
}

// ✅ Lecture fiable de la langue stockée
const lireLangueStockee = () => {
  try {
    const l = localStorage.getItem(STORAGE_KEY_LANGUE);
    return LANGUES_VALIDES.includes(l) ? l : 'fr';
  } catch {
    return 'fr';
  }
};

// ✅ Appliquer la langue au <html> (utile pour CSS et accessibilité)
const appliquerLangueAuDOM = (langue) => {
  try {
    document.documentElement.setAttribute('lang', langue);
  } catch (e) {
    /* ignore */
  }
};

export const ParametreProvider = ({ children }) => {
  // ✅ Initialisation : langue = localStorage (source de vérité)
  const [parametres, setParametres] = useState(() => {
    const langue = lireLangueStockee();
    appliquerLangueAuDOM(langue);
    return {
      langue,
      theme: localStorage.getItem('app-theme') || 'light',
      couleurPrincipale:
        localStorage.getItem('app-primary-color') || '#D4AF37',
      police: localStorage.getItem('app-font') || 'default',
      tailleTexte: localStorage.getItem('app-font-size') || 'medium',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      appName: 'OMDA App',
    };
  });

  const [loading, setLoading] = useState(true);
  const utilisateurActuel = getUtilisateurActuel();

  // ✅ Ref pour éviter les closures obsolètes
  const parametresRef = useRef(parametres);
  useEffect(() => {
    parametresRef.current = parametres;
  }, [parametres]);

  // ============================================================
  // APPLIQUER L'APPARENCE
  // ============================================================
  const appliquerApparenceGlobale = useCallback(
    (theme, couleur, police, taille) => {
      const root = document.documentElement;

      if (theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);

        const variables =
          theme === 'dark'
            ? {
                '--bg-primary': '#0f0e17',
                '--bg-secondary': '#1a1932',
                '--bg-card': '#1e1d3a',
                '--bg-input': '#2a294a',
                '--text-primary': '#fffffe',
                '--text-secondary': '#a7a9be',
                '--text-muted': '#6c6e8a',
                '--border-color': '#2a294a',
                '--shadow': '0 4px 20px rgba(0,0,0,0.4)',
                '--shadow-hover': '0 8px 30px rgba(0,0,0,0.6)',
                '--hover-bg': 'rgba(255,255,255,0.05)',
              }
            : {
                '--bg-primary': '#f5f0eb',
                '--bg-secondary': '#ffffff',
                '--bg-card': '#ffffff',
                '--bg-input': '#f5f0eb',
                '--text-primary': '#1a1a2e',
                '--text-secondary': '#4a4a5e',
                '--text-muted': '#8a8a9e',
                '--border-color': '#e8e0d8',
                '--shadow': '0 4px 20px rgba(0,0,0,0.06)',
                '--shadow-hover': '0 8px 30px rgba(0,0,0,0.1)',
                '--hover-bg': 'rgba(0,0,0,0.03)',
              };

        Object.entries(variables).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      }

      if (couleur) {
        root.style.setProperty('--primary-color', couleur);
        localStorage.setItem('app-primary-color', couleur);

        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
                result[3],
                16
              )}`
            : '212, 175, 55';
        };
        const rgb = hexToRgb(couleur);
        root.style.setProperty('--primary-rgb', rgb);
        root.style.setProperty('--primary-light', `rgba(${rgb}, 0.1)`);
        root.style.setProperty('--primary-medium', `rgba(${rgb}, 0.3)`);
        root.style.setProperty('--primary-dark', `rgba(${rgb}, 0.8)`);
      }

      if (police && police !== 'default') {
        root.style.setProperty('--font-family', police);
        document.body.style.fontFamily = police;
        localStorage.setItem('app-font', police);
      } else if (police === 'default') {
        const def =
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        root.style.setProperty('--font-family', def);
        document.body.style.fontFamily = def;
        localStorage.removeItem('app-font');
      }

      const tailleMap = {
        small: '13px',
        medium: '15px',
        large: '18px',
        xlarge: '21px',
      };
      const tailleValue = tailleMap[taille] || '15px';
      root.style.setProperty('--font-size-base', tailleValue);
      document.body.style.fontSize = tailleValue;
      localStorage.setItem('app-font-size', taille || 'medium');
    },
    []
  );

  // ============================================================
  // ✅ SET LANGUE — SEULE porte d'entrée pour changer la langue
  // ============================================================
  const setLangue = useCallback((nouvelleLangue) => {
    if (!LANGUES_VALIDES.includes(nouvelleLangue)) {
      console.warn('⚠️ Langue invalide:', nouvelleLangue);
      return;
    }

    const ancienne = localStorage.getItem(STORAGE_KEY_LANGUE);
    if (ancienne === nouvelleLangue) return;

    console.log('🌍 Langue changée:', ancienne, '→', nouvelleLangue);

    // 1. localStorage = source de vérité
    localStorage.setItem(STORAGE_KEY_LANGUE, nouvelleLangue);

    // 2. State React
    setParametres((prev) => ({ ...prev, langue: nouvelleLangue }));

    // 3. DOM
    appliquerLangueAuDOM(nouvelleLangue);

    // 4. Event pour compatibilité (autres onglets / anciens composants)
    window.dispatchEvent(
      new CustomEvent('langue-change', { detail: { langue: nouvelleLangue } })
    );

    // 5. Persister en BD (best effort, non bloquant)
    if (utilisateurActuel.id) {
      fetch(`${API_BASE}/parametres/${utilisateurActuel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ langue: nouvelleLangue }),
      }).catch((err) =>
        console.warn('⚠️ Sauvegarde langue BD échouée:', err.message)
      );
    }
  }, [utilisateurActuel.id]);

  // ============================================================
  // CHARGER LES PARAMÈTRES (BD) — la langue reste localStorage
  // ============================================================
  const chargerParametres = useCallback(async () => {
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    const savedColor =
      localStorage.getItem('app-primary-color') || '#D4AF37';
    const savedFont = localStorage.getItem('app-font') || 'default';
    const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
    const savedLangue = lireLangueStockee();

    appliquerApparenceGlobale(savedTheme, savedColor, savedFont, savedFontSize);
    appliquerLangueAuDOM(savedLangue);

    if (!utilisateurActuel.id) {
      setParametres((prev) => ({
        ...prev,
        langue: savedLangue,
        theme: savedTheme,
        couleurPrincipale: savedColor,
        police: savedFont,
        tailleTexte: savedFontSize,
      }));
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(
        `${API_BASE}/parametres/${utilisateurActuel.id}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.success) {
        const p = data.parametres;

        // 🔒 La langue reste TOUJOURS celle du localStorage
        const langueFinale = lireLangueStockee();

        setParametres((prev) => ({
          ...prev,
          appName: p.app_name || 'OMDA App',
          langue: langueFinale, // ✅ PAS p.langue
          dateFormat: p.date_format || 'DD/MM/YYYY',
          timeFormat: p.time_format || '24h',
          theme: savedTheme,
          couleurPrincipale: savedColor,
          police: savedFont,
          tailleTexte: savedFontSize,
        }));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Impossible de charger les paramètres:', error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [utilisateurActuel.id, appliquerApparenceGlobale]);

  // ============================================================
  // ✅ ÉCOUTE GLOBALE — toute modif de langue se propage partout
  // ============================================================
  useEffect(() => {
    // 1) Autre onglet
    const onStorage = (e) => {
      if (
        e.key === STORAGE_KEY_LANGUE &&
        e.newValue &&
        LANGUES_VALIDES.includes(e.newValue)
      ) {
        setParametres((prev) =>
          prev.langue === e.newValue ? prev : { ...prev, langue: e.newValue }
        );
        appliquerLangueAuDOM(e.newValue);
      }
    };

    // 2) Même onglet, événement custom
    const onLangueChange = (e) => {
      const l = e?.detail?.langue;
      if (l && LANGUES_VALIDES.includes(l)) {
        setParametres((prev) =>
          prev.langue === l ? prev : { ...prev, langue: l }
        );
        appliquerLangueAuDOM(l);
      }
    };

    // 3) Retour de focus (au cas où localStorage a changé)
    const onFocus = () => {
      const l = lireLangueStockee();
      setParametres((prev) =>
        prev.langue === l ? prev : { ...prev, langue: l }
      );
      appliquerLangueAuDOM(l);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('langue-change', onLangueChange);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('langue-change', onLangueChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ============================================================
  // METTRE À JOUR LES PARAMÈTRES
  // ============================================================
  const mettreAJourParametres = useCallback(
    async (nouveauxParametres) => {
      if (nouveauxParametres.langue) {
        setLangue(nouveauxParametres.langue);
      }

      const actuels = parametresRef.current;
      const fusion = { ...actuels, ...nouveauxParametres };
      setParametres(fusion);

      if (
        nouveauxParametres.theme ||
        nouveauxParametres.couleurPrincipale ||
        nouveauxParametres.police ||
        nouveauxParametres.tailleTexte
      ) {
        appliquerApparenceGlobale(
          fusion.theme,
          fusion.couleurPrincipale,
          fusion.police,
          fusion.tailleTexte
        );
      }

      if (utilisateurActuel.id) {
        try {
          const payload = {
            appName: fusion.appName,
            langue: fusion.langue,
            theme: fusion.theme,
            dateFormat: fusion.dateFormat,
            timeFormat: fusion.timeFormat,
            couleurPrincipale: fusion.couleurPrincipale,
            police: fusion.police,
          };
          await fetch(`${API_BASE}/parametres/${utilisateurActuel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (error) {
          console.warn('Erreur sauvegarde paramètres:', error);
        }
      }
    },
    [utilisateurActuel.id, appliquerApparenceGlobale, setLangue]
  );

  // ============================================================
  // INITIALISATION
  // ============================================================
  useEffect(() => {
    chargerParametres();
  }, [chargerParametres]);

  const value = {
    parametres,
    setParametres: mettreAJourParametres,
    setLangue,
    loading,
    chargerParametres,
    appliquerApparenceGlobale,
  };

  return (
    <ParametreContext.Provider value={value}>
      {children}
    </ParametreContext.Provider>
  );
};

export default ParametreContext;
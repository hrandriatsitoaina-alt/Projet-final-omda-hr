// src/hooks/useT.js
import { useCallback, useMemo } from 'react';
import { useParametres } from '../context/ParametreContext';

/**
 *  Hook de traduction robuste
 * - Lit la langue UNIQUEMENT depuis le Context (source unique)
 * - Retourne `t(fr, mg, en)` et `langue`
 * -  t est STABLE tant que la langue ne change pas
 * -  Retour mémoïsé pour éviter les re-renders en cascade
 */
export const useT = () => {
  const { parametres } = useParametres();

  //  Extraction primitive : string au lieu de l'objet parametres
  const langue = parametres?.langue || 'fr';

  //  t ne change QUE si langue change
  const t = useCallback(
    (fr, mg, en) => {
      switch (langue) {
        case 'mg':
          return mg || fr;
        case 'en':
          return en || fr;
        default:
          return fr;
      }
    },
    [langue]
  );

  //  Retour mémoïsé
  return useMemo(() => ({ t, langue }), [t, langue]);
};

export default useT;
// server/routes/generateursia.routes.js
// ============================================================
// MODULE IA OMDA — v13 (multilingue + conversations + régions corrigées)
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../database');

console.log('✅ Routeur IA (generateursia) chargé - v13');

// ============================================================
// 🌍 DICTIONNAIRE MULTILINGUE — avec variantes aléatoires
// ============================================================
const LANG = {
  fr: {
    greeting_morning: [
      "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
      "Bonjour ! Ravi de vous voir. Que puis-je faire pour vous ?",
      "Salut ! Je suis là pour vous aider. Qu'est-ce qui vous amène ?",
      "Bonjour ! Prêt à vous assister. Que souhaitez-vous savoir ?",
      "Bonjour ! Une belle journée pour analyser vos données, non ?"
    ],
    greeting_afternoon: [
      "Bon après-midi ! Que puis-je analyser pour vous ?",
      "Bonjour ! Comment puis-je vous aider cet après-midi ?",
      "Bon après-midi ! Prêt à vous aider. Que cherchez-vous ?",
      "Bonjour ! Que puis-je faire pour vous aujourd'hui ?"
    ],
    greeting_evening: [
      "Bonsoir ! Comment puis-je vous aider ce soir ?",
      "Bonsoir ! Que puis-je analyser pour vous ?",
      "Bonsoir ! Prêt à vous assister. Que voulez-vous savoir ?"
    ],
    thanks: [
      "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
      "De rien ! Je suis là pour ça.",
      "Je vous en prie ! C'était un plaisir de vous aider.",
      "Avec grand plaisir ! Une autre question ?",
      "Pas de souci ! N'hésitez pas à revenir."
    ],
    bye: [
      "Au revoir ! Revenez quand vous voulez.",
      "À bientôt ! Bonne continuation.",
      "Au revoir ! Passez une excellente journée.",
      "À la prochaine ! Je reste disponible.",
      "Au revoir ! N'hésitez pas à revenir me voir."
    ],
    howAreYou: [
      "Je vais très bien, merci ! Comment puis-je vous aider ?",
      "Tout va bien, merci de demander ! Que puis-je faire pour vous ?",
      "Excellent, merci ! Prêt à vous assister. Que cherchez-vous ?",
      "Très bien, merci ! Dites-moi ce dont vous avez besoin.",
      "Parfaitement bien ! Comment puis-je vous être utile ?"
    ],
    whoAreYou: [
      "Je suis l'assistant intelligent d'OMDA. Je peux vous renseigner sur les usagers, les paiements, les factures, les quittances, les artistes et vous fournir des analyses et prévisions.",
      "Je suis l'assistant OMDA. Mon rôle : vous aider à explorer les données de la plateforme.",
      "Assistant OMDA à votre service. Je peux analyser les usagers, paiements, factures, quittances et bien plus.",
      "Je suis votre assistant OMDA. Posez-moi vos questions sur les données : usagers, paiements, régions, artistes…"
    ],
    helpMe: [
      "Bien sûr ! Voici comment je peux vous aider. Dites-moi ce que vous cherchez, ou choisissez une commande ci-dessous.",
      "Avec plaisir ! Voici les commandes que je comprends.",
      "Pas de problème ! Voici la liste de ce que je peux faire pour vous.",
      "Bien entendu ! Choisissez ce qui vous intéresse dans la liste ci-dessous."
    ],
    ok: ["Parfait ! Que puis-je faire pour vous ?", "Très bien. Comment puis-je vous aider ?", "Entendu ! Dites-moi ce dont vous avez besoin."],
    yes: ["Très bien. Comment puis-je vous aider ?", "Parfait ! Que puis-je faire pour vous ?", "D'accord. Dites-moi ce que vous cherchez."],
    no: ["Pas de problème. Faites-moi signe si vous avez besoin.", "Très bien. Je reste disponible si besoin.", "Entendu. N'hésitez pas à revenir."],
    notUnderstood: [
      "Je n'ai pas bien compris votre demande. Essayez une commande ci-dessous.",
      "Hmm, je n'ai pas saisi. Voici ce que je peux faire :",
      "Je n'ai pas compris. Peut-être cherchez-vous l'une de ces commandes ?",
      "Désolé, je n'ai pas bien saisi. Essayez une de ces options :"
    ],
    noResult: ["Aucun résultat trouvé pour", "Je n'ai rien trouvé pour", "Pas de correspondance pour"],
    usagers: 'usagers', mois: 'mois', quittances: 'quittances', liste: 'Liste',
    totalImpaye: 'Montant total impayé',
    region: 'Région'
  },
  mg: {
    greeting_morning: [
      "Manao ahoana ! Ahoana no ahafahako manampy anao androany ?",
      "Manao ahoana ! Faly mahita anao. Inona no azoko atao ho anao ?",
      "Salama ! Eto aho hanampy anao. Inona no tadiavinao ?"
    ],
    greeting_afternoon: [
      "Manao ahoana ! Inona no tianao hojerena ?",
      "Manao ahoana ! Ahoana no ahafahako manampy anao ?"
    ],
    greeting_evening: [
      "Manao ahoana ! Ahoana ny fanampiana anao anio hariva ?",
      "Manao ahoana ! Eto aho hanampy anao."
    ],
    thanks: [
      "Faly aho ! Aza misalasala mangataka fanazavana.",
      "Tsy misy olana ! Eto aho hanampy anao.",
      "Misaotra anao koa ! Misy fanontaniana hafa ve ?"
    ],
    bye: ["Veloma ! Miverena rehefa tianao.", "Mandrapihaona ! Mirary soa.", "Veloma ! Eto foana aho raha mila fanampiana."],
    howAreYou: ["Manao ahoana tsara aho, misaotra !", "Salama tsara aho, misaotra !", "Tsara ny zava-drehetra !"],
    whoAreYou: ["Izaho no mpanampy manan-tsaina an'ny OMDA.", "Mpanampy OMDA aho.", "Mpanampy OMDA eto."],
    helpMe: ["Mazava ho azy ! Indro ny fomba ahafahako manampy.", "Faly aho ! Indro ny baiko azoko atao.", "Tsy misy olana ! Indro ny lisitra."],
    ok: ["Tsara ! Inona no azoko atao ho anao ?", "Mazava ! Lazao ahy izay mila fanampiana.", "Eny ary ! Inona no tadiavinao ?"],
    yes: ["Tsara. Ahoana no ahafahako manampy anao ?", "Mazava ! Inona no tadiavinao ?"],
    no: ["Tsy maninona. Antsoy aho raha mila fanampiana.", "Mazava. Eto aho raha mila zavatra."],
    notUnderstood: ["Tsy azoko tsara ny fangatahanao.", "Hmm, tsy azoko tsara. Indro izay azoko atao :"],
    noResult: ["Tsy misy valiny ho an'ny", "Tsy nahita na inona na inona aho ho an'ny"],
    usagers: 'mpampiasa', mois: 'volana', quittances: 'taratasy', liste: 'Lisitra',
    totalImpaye: 'Vola tsy voaloa',
    region: 'Faritra'
  },
  en: {
    greeting_morning: [
      "Good morning! How can I help you today?",
      "Good morning! Glad to see you.",
      "Hi there! I'm here to help."
    ],
    greeting_afternoon: ["Good afternoon! What would you like to analyze?", "Hello! How can I help you this afternoon?"],
    greeting_evening: ["Good evening! How can I help you tonight?", "Good evening! Ready to assist."],
    thanks: ["You're welcome! Feel free to ask more questions.", "My pleasure! I'm here for that.", "Anytime! Let me know if you need more."],
    bye: ["Goodbye! Come back anytime.", "See you soon! Have a great day.", "Take care!"],
    howAreYou: ["I'm doing very well, thanks! How can I help you?", "All good, thanks for asking!", "Doing great! What do you need?"],
    whoAreYou: ["I'm the OMDA smart assistant.", "I'm the OMDA assistant. My job: help you explore the platform data.", "OMDA assistant at your service."],
    helpMe: ["Of course! Here's how I can help.", "With pleasure! Here are the commands I understand.", "No problem! Here's what I can do for you."],
    ok: ["Perfect! What can I do for you?", "Very well. How can I help you?", "Got it!"],
    yes: ["Very well. How can I help you?", "Perfect! What can I do for you?"],
    no: ["No problem. Let me know if you need anything.", "Alright. I'm here if needed."],
    notUnderstood: ["I didn't quite understand your request.", "Hmm, I didn't catch that. Here's what I can do:"],
    noResult: ["No results found for", "Nothing found for"],
    usagers: 'users', mois: 'months', quittances: 'receipts', liste: 'List',
    totalImpaye: 'Total unpaid amount',
    region: 'Region'
  }
};

function t(lang, key) {
  const valeur = (LANG[lang] && LANG[lang][key]) || LANG.fr[key] || key;
  if (Array.isArray(valeur)) {
    return valeur[Math.floor(Math.random() * valeur.length)];
  }
  return valeur;
}

// ============================================================
// 🌍 DÉTECTION LANGUE
// ============================================================
function detecterLangue(message) {
  if (!message) return 'fr';
  const msg = message.toLowerCase().trim();
  const motsMG = ['salama', 'manao ahoana', 'akory', 'misaotra', 'azafady',
    'mpampiasa', 'tara', 'vola', 'faritra', 'sokajy', 'lisitra',
    'fanadihadiana', 'fahombiazana', 'soso-kevitra', 'inona', 'ahoana',
    'tsara', 'ratsy', 'ny', 'sy', 'voaloa', 'tsy voaloa', 'fitambarany',
    'veloma', 'manampy', 'tianao', 'hitady', 'mitady', 'lazao', 'taham',
    'sata', 'mpandoa', 'mpihira', 'hetsika', 'firy', 'isa', 'rehetra',
    'vaovao', 'ankapobeny', 'fironana', 'vinavina', 'fampandrenesana',
    'tetikasa', 'tantara', 'faktiora', 'taratasy', 'atahorana', 'mafy'];
  const motsEN = ['hello', 'hi', 'hey', 'good morning', 'good evening',
    'thanks', 'thank', 'please', 'users', 'late', 'payers', 'best', 'worst',
    'top', 'region', 'category', 'list', 'show', 'give', 'performance',
    'forecast', 'suggestions', 'plan', 'alerts', 'success', 'the', 'and',
    'with', 'for', 'from', 'all', 'detail', 'status', 'invoice', 'receipt',
    'search', 'find', 'artist', 'artists', 'payment', 'payments', 'amount',
    'count', 'how', 'what', 'when', 'where', 'money', 'report', 'risk', 'critical'];
  let scoreMG = 0, scoreEN = 0;
  for (const m of motsMG) if (msg.includes(m)) scoreMG++;
  for (const m of motsEN) if (msg.includes(m)) scoreEN++;
  if (scoreMG > scoreEN && scoreMG > 0) return 'mg';
  if (scoreEN > scoreMG && scoreEN > 0) return 'en';
  return 'fr';
}

function normaliser(texte) {
  if (!texte) return '';
  return texte.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;:'"()]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function normaliserRecherche(texte) {
  if (!texte) return '';
  return texte.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const fmtN = (n) => Math.round(n || 0).toLocaleString('fr-FR');

function listeUsagersTexte(usagers, langue, { max = 30 } = {}) {
  if (!usagers || usagers.length === 0) {
    return `   (${langue === 'mg' ? 'Tsy misy angona' : langue === 'en' ? 'No data' : 'Aucune donnée'})`;
  }
  return usagers.slice(0, max).map((u, i) => {
    const statutTxt = u.statut === 'bon-payeur' ? 'Bon payeur'
      : u.statut === 'payeur-moyen' ? 'Payeur moyen'
      : u.statut === 'mauvais-payeur' ? 'Mauvais payeur'
      : 'Non payeur';
    return `${i + 1}) ${u.denomination}\n` +
           `   Région : ${u.region} | ${u.typeLabel} | ${u.nbMoisPayes}/12 mois\n` +
           `   Payé : ${fmtN(u.montantPaye)} Ar | Statut : ${statutTxt}${u.telephone ? ` | Tél : ${u.telephone}` : ''}`;
  }).join('\n\n');
}
function listeGenerique(items, { max = 30 } = {}) {
  if (!items || items.length === 0) return '   (aucun élément)';
  return items.slice(0, max).map((it, i) => `${i + 1}) ${it}`).join('\n');
}

// ============================================================
// 📥 COLLECTE
// ============================================================
async function collecterDonneesCompletes() {
  const data = { usagers: {}, paiements: [], factures: [], quittances: [], regions: [], artistesCount: 0, utilisateursActifs: 0 };
  const USAGER_TABLES = {
    hotel: 'usagers_hotel',
    'grand-surface': 'usagers_magasin',
    media: 'usagers_media',
    occ: 'usagers_occasionnel',
    bus: 'usagers_bus',
    nightclub: 'usagers_nightclub',
    other: 'usager_other',   // ✅ AJOUT
  };
  for (const [type, table] of Object.entries(USAGER_TABLES)) {
    try { data.usagers[type] = (await pool.query(`SELECT * FROM ${table}`)).rows; }
    catch (e) { data.usagers[type] = []; }
  }
  try { data.paiements = (await pool.query(`SELECT * FROM paiements ORDER BY created_at DESC`)).rows; } catch (e) {}
  try {
    data.factures = (await pool.query(`SELECT * FROM facture_usager ORDER BY created_at DESC`)).rows;
    data.quittances = data.factures.filter(f => f.quittance);
  } catch (e) {}
  try { data.regions = (await pool.query(`SELECT * FROM regions ORDER BY nom`)).rows; } catch (e) {}
  try { data.artistesCount = parseInt((await pool.query(`SELECT COUNT(*) as total FROM artistes`)).rows[0]?.total) || 0; } catch (e) {}
  try { data.utilisateursActifs = parseInt((await pool.query(`SELECT COUNT(*) AS total FROM utilisateurs WHERE statut = 'actif'`)).rows[0]?.total) || 0; } catch (e) {}
  return data;
}

const TYPE_LABELS = {
  hotel: 'Hôtel',
  'grand-surface': 'Grande Surface',
  media: 'Télé/Radio',
  occ: 'OCC',
  bus: 'Bus',
  nightclub: 'Night Club',
  other: 'Autre',   // ✅ AJOUT
};

const MOIS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ============================================================
// 📅 EXTRAIRE LES DONNÉES MENSUELLES
// ============================================================
function extraireDonneesMensuelles(paiements) {
  const mois = {};
  paiements.forEach(p => {
    const dateRef = p.date_paiement || p.created_at;
    if (!dateRef) return;
    const d = new Date(dateRef);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!mois[key]) {
      mois[key] = { key, annee: d.getFullYear(), mois: d.getMonth() + 1, montant: 0, nb: 0 };
    }
    mois[key].montant += parseFloat(p.montant) || 0;
    mois[key].nb += 1;
  });
  return Object.values(mois).sort((a, b) => a.key.localeCompare(b.key));
}

// ============================================================
// 📉 RÉGRESSION LINÉAIRE
// ============================================================
function regressionManuelle(valeurs) {
  const n = valeurs.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const xs = valeurs.map((_, i) => i);
  const sX = xs.reduce((a, b) => a + b, 0);
  const sY = valeurs.reduce((a, b) => a + b, 0);
  const sXY = xs.reduce((s, x, i) => s + x * valeurs[i], 0);
  const sX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = (n * sX2 - sX * sX) || 1;
  const slope = (n * sXY - sX * sY) / denom;
  const intercept = (sY - slope * sX) / n;
  const moyY = sY / n;
  let sst = 0, sse = 0;
  for (let i = 0; i < n; i++) {
    const p = intercept + slope * xs[i];
    sst += Math.pow(valeurs[i] - moyY, 2);
    sse += Math.pow(valeurs[i] - p, 2);
  }
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  return { slope, intercept, r2 };
}
function forecastManuel(valeurs, horizon) {
  const { slope, intercept } = regressionManuelle(valeurs);
  const n = valeurs.length;
  const out = [];
  for (let i = 0; i < horizon; i++) {
    out.push(Math.max(0, intercept + slope * (n + i)));
  }
  return out;
}
const calculateStandardDeviation = (arr) => {
  if (!arr || arr.length === 0) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length);
};

// ============================================================
// 🔎 ANALYSE
// ============================================================
async function analyserUsagersParAnnee(annee = null) {
  const anneeCible = annee || new Date().getFullYear();
  const data = await collecterDonneesCompletes();
  const result = [];

  for (const [type, usagers] of Object.entries(data.usagers)) {
    const pType = data.paiements.filter(p => p.usager_type === type && p.statut === 'paye' && p.annee === anneeCible);
    for (const u of usagers) {
      const pU = pType.filter(p => p.usager_id === u.id);
      const moisPayes = pU.map(p => p.mois).sort((a, b) => a - b);
      const montantPaye = pU.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
      const nbMois = moisPayes.length;
      let statut = 'non-payeur';
      if (nbMois >= 12) statut = 'bon-payeur';
      else if (nbMois >= 6) statut = 'payeur-moyen';
      else if (nbMois > 0) statut = 'mauvais-payeur';

      result.push({
        id: u.id, type, typeLabel: TYPE_LABELS[type] || type,
        denomination: u.denomination || u.nom_evenement || u.genre_manifestation || 'Sans nom',
        demandeur: u.demandeur || u.organisateurs || u.representant_par || '',
        telephone: u.telephone || '', email: u.email || '',
        region: u.region || 'N/A',
        adresse: u.adresse_siege || u.adresse || '',
        montantMensuel: parseFloat(u.montant_mensuel) || 0,
        moisPayes, moisPayesLabels: moisPayes.map(m => MOIS_SHORT[m - 1]),
        nbMoisPayes: nbMois, moisRestants: 12 - nbMois,
        montantPaye, statut, annee: anneeCible,
        tauxPaiement: Math.round((nbMois / 12) * 100)
      });
    }
  }
  return result;
}

async function getUsagersEnRetard(annee = null) {
  const u = await analyserUsagersParAnnee(annee);
  return u.filter(x => x.statut !== 'bon-payeur' && x.nbMoisPayes < 12)
    .sort((a, b) => a.nbMoisPayes - b.nbMoisPayes);
}
async function getMeilleursPayeurs(annee = null, limit = 20) {
  return (await analyserUsagersParAnnee(annee))
    .filter(u => u.nbMoisPayes > 0)
    .sort((a, b) => b.nbMoisPayes - a.nbMoisPayes || b.montantPaye - a.montantPaye)
    .slice(0, limit);
}
async function getTopMontants(annee = null, limit = 15) {
  return (await analyserUsagersParAnnee(annee))
    .filter(u => u.montantPaye > 0)
    .sort((a, b) => b.montantPaye - a.montantPaye)
    .slice(0, limit);
}
async function rechercherUsagers(critere) {
  const usagers = await analyserUsagersParAnnee();
  const terme = normaliserRecherche(critere || '');
  if (terme.length < 2) return [];
  const mots = terme.split(' ').filter(m => m.length >= 2);
  return usagers.filter(u => {
    const haystack = normaliserRecherche(
      `${u.denomination || ''} ${u.demandeur || ''} ${u.telephone || ''} ${u.email || ''} ${u.region || ''} ${u.typeLabel || ''}`
    );
    return mots.every(mot => haystack.includes(mot));
  }).slice(0, 30);
}

// ============================================================
// 🧩 DIAGNOSTIC — VERSION COMPLÈTE CORRIGÉE
//    ✅ Répartition par région calculée depuis les PAIEMENTS RÉELS
// ============================================================
async function construireDiagnostic() {
  const data = await collecterDonneesCompletes();
  const categories = {};
  let totalUsagers = 0;
  let totalUsagersPayes = 0;

  for (const [type, usagers] of Object.entries(data.usagers)) {
    const paiementsType = data.paiements.filter(p => p.usager_type === type && p.statut === 'paye');
    const usagersPayesIds = new Set(paiementsType.map(p => p.usager_id));
    const montantType = paiementsType.reduce((s, p) => {
      const m = parseFloat(p.montant) || 0;
      const f = parseFloat(p.frais_dossier) || 0;
      const r = parseFloat(p.montant_retard) || 0;
      return s + m + f + r;
    }, 0);

    categories[type] = {
      label: TYPE_LABELS[type] || type,
      total: usagers.length,
      payes: usagersPayesIds.size,
      nonPayes: Math.max(0, usagers.length - usagersPayesIds.size),
      tauxPaiement: usagers.length > 0 ? Number(((usagersPayesIds.size / usagers.length) * 100).toFixed(1)) : 0,
      montantTotal: Number(montantType.toFixed(2))
    };
    totalUsagers += usagers.length;
    totalUsagersPayes += usagersPayesIds.size;
  }

  const tauxGlobal = totalUsagers > 0 ? Number(((totalUsagersPayes / totalUsagers) * 100).toFixed(1)) : 0;

  // ✅ SOURCE DE VÉRITÉ : paiements réels (statut = 'paye')
  const paiementsPayesAll = data.paiements.filter(p => p.statut === 'paye');

  // ✅ Montant global encaissé (montant + frais_dossier + montant_retard)
  const montantGlobalPaye = paiementsPayesAll.reduce((s, p) => {
    const m = parseFloat(p.montant) || 0;
    const f = parseFloat(p.frais_dossier) || 0;
    const r = parseFloat(p.montant_retard) || 0;
    return s + m + f + r;
  }, 0);

  // ✅ Index usagers par (type_id) pour retrouver la région
  const usagersIndex = {};
  for (const [type, usagers] of Object.entries(data.usagers)) {
    for (const u of usagers) {
      usagersIndex[`${type}_${u.id}`] = u;
    }
  }

  // ✅ Répartition par région depuis les paiements réels
  const regionsMap = {};
  for (const p of paiementsPayesAll) {
    const key = `${p.usager_type}_${p.usager_id}`;
    const usager = usagersIndex[key];
    const region = (usager?.region || '').trim() || 'Non spécifié';

    if (!regionsMap[region]) {
      regionsMap[region] = {
        region,
        nbQuittances: 0,
        nbUsagers: 0,
        montant: 0,
        _usagersSet: new Set(),
      };
    }

    const m = parseFloat(p.montant) || 0;
    const f = parseFloat(p.frais_dossier) || 0;
    const r = parseFloat(p.montant_retard) || 0;
    regionsMap[region].montant += m + f + r;

    if (!regionsMap[region]._usagersSet.has(key)) {
      regionsMap[region]._usagersSet.add(key);
      regionsMap[region].nbUsagers += 1;
    }
    regionsMap[region].nbQuittances += 1;
  }

  const parRegion = Object.values(regionsMap)
    .map(r => ({
      region: r.region,
      nbQuittances: r.nbQuittances,
      nbUsagers: r.nbUsagers,
      montant: Number(r.montant.toFixed(2)),
    }))
    .sort((a, b) => b.montant - a.montant);

  // Log de vérification
  const totalParRegion = parRegion.reduce((s, r) => s + r.montant, 0);
  console.log(`🗺️  Répartition par région — Total : ${totalParRegion} Ar`);
  parRegion.forEach(r => {
    console.log(`   ${r.region.padEnd(20)} : ${r.nbUsagers} usagers, ${r.nbQuittances} paiements — ${r.montant} Ar`);
  });

  const quittancesNonValidees = data.factures.filter(f => f.quittance && f.quittance_validee === false).length;

  // ─── STATS USAGERS ───
  const usagersStatut = await analyserUsagersParAnnee();
  const statsStatut = {
    bonPayeur: usagersStatut.filter(u => u.statut === 'bon-payeur').length,
    payeurMoyen: usagersStatut.filter(u => u.statut === 'payeur-moyen').length,
    mauvaisPayeur: usagersStatut.filter(u => u.statut === 'mauvais-payeur').length,
    nonPayeur: usagersStatut.filter(u => u.statut === 'non-payeur').length
  };

  // ✅ DONNÉES MENSUELLES
  const donneesMensuelles = extraireDonneesMensuelles(paiementsPayesAll);
  let tendance = null;
  let forecast = [];
  let ecartType = 0;

  if (donneesMensuelles.length >= 3) {
    const montants = donneesMensuelles.map(d => d.montant);
    const reg = regressionManuelle(montants);
    const base = montants[0] || 1;
    tendance = {
      pente: reg.slope,
      intercept: reg.intercept,
      direction: reg.slope > 0 ? 'croissance' : (reg.slope < 0 ? 'décroissance' : 'stable'),
      pourcentage: Number(((reg.slope / base) * 100).toFixed(1))
    };
    forecast = forecastManuel(montants, 6).map(v => Math.max(0, Math.round(v)));
    ecartType = Number(calculateStandardDeviation(montants).toFixed(2));
  }

  let meilleurMois = null;
  let moyenneMensuelle = 0;
  if (donneesMensuelles.length > 0) {
    const best = donneesMensuelles.reduce((max, d) => (d.montant > max.montant ? d : max), donneesMensuelles[0]);
    meilleurMois = { periode: `${best.mois}/${best.annee}`, montant: Math.round(best.montant) };
    moyenneMensuelle = Math.round(
      donneesMensuelles.reduce((s, d) => s + d.montant, 0) / donneesMensuelles.length
    );
  }

  const anneeActuelle = new Date().getFullYear();
  const totalAnneeActuelle = donneesMensuelles.filter(d => d.annee === anneeActuelle).reduce((s, d) => s + d.montant, 0);
  const totalAnneePrecedente = donneesMensuelles.filter(d => d.annee === anneeActuelle - 1).reduce((s, d) => s + d.montant, 0);
  const croissanceAnnuelle = totalAnneePrecedente > 0
    ? Number((((totalAnneeActuelle - totalAnneePrecedente) / totalAnneePrecedente) * 100).toFixed(1))
    : null;

  let objectifTaux;
  if (tauxGlobal < 50) objectifTaux = 50;
  else if (tauxGlobal < 70) objectifTaux = 70;
  else if (tauxGlobal < 90) objectifTaux = 90;
  else objectifTaux = 100;

  // ─── ALERTES ───
  const alertes = [];
  if (tauxGlobal < 50 && totalUsagers > 0) {
    alertes.push({
      id: 'taux-critique', type: 'critique', priorite: 1,
      titre: 'Taux de paiement global critique',
      message: `Seulement ${tauxGlobal}% (${totalUsagersPayes}/${totalUsagers}) à jour.`,
      plan: [
        { etape: 'Identifier les retardataires', delai: 'Cette semaine' },
        { etape: 'Envoyer des relances', delai: '3-5 jours' }
      ]
    });
  } else if (tauxGlobal < 70 && totalUsagers > 0) {
    alertes.push({
      id: 'taux-moyen', type: 'warning', priorite: 2,
      titre: 'Taux de paiement à améliorer',
      message: `${tauxGlobal}% — objectif ${objectifTaux}%.`,
      plan: [
        { etape: 'Analyser catégories en retard', delai: '1 semaine' },
        { etape: 'Automatiser les rappels', delai: '2 semaines' }
      ]
    });
  }
  Object.entries(categories).forEach(([type, c]) => {
    if (c.total > 0 && c.tauxPaiement < 40) {
      alertes.push({
        id: `cat-${type}`, type: 'warning', priorite: 2,
        titre: `${c.label} : taux faible (${c.tauxPaiement}%)`,
        message: `${c.payes}/${c.total} à jour.`,
        plan: [
          { etape: `Extraire ${c.label} en retard`, delai: '2 jours' },
          { etape: `Contacter responsables`, delai: '1 semaine' }
        ]
      });
    }
  });
  if (tendance && tendance.pente < 0) {
    alertes.push({
      id: 'tendance-baisse', type: 'warning', priorite: 1,
      titre: 'Tendance revenus à la baisse',
      message: `Baisse ${Math.abs(tendance.pourcentage)}%.`,
      plan: [
        { etape: 'Comparer mois/mois', delai: '3 jours' },
        { etape: 'Ajuster stratégie', delai: '2 semaines' }
      ]
    });
  }
  if (quittancesNonValidees > 0) {
    alertes.push({
      id: 'quittances-non-validees', type: 'warning', priorite: 2,
      titre: `${quittancesNonValidees} quittance(s) non validée(s)`,
      message: 'À valider rapidement.',
      plan: [
        { etape: 'Lister', delai: '1 jour' },
        { etape: 'Valider', delai: '3 jours' }
      ]
    });
  }
  alertes.sort((a, b) => a.priorite - b.priorite);

  // ─── SUCCÈS ───
  const succes = [];
  if (tauxGlobal >= 70) succes.push({ titre: 'Bon taux global', message: `${tauxGlobal}% à jour.` });
  if (tendance && tendance.pente > 0) succes.push({ titre: 'Croissance', message: `+${tendance.pourcentage}%.` });
  const meilleureCat = Object.entries(categories).filter(([, c]) => c.total > 0).sort((a, b) => b[1].tauxPaiement - a[1].tauxPaiement)[0];
  if (meilleureCat && meilleureCat[1].tauxPaiement >= 60) {
    succes.push({ titre: `${meilleureCat[1].label} performante`, message: `${meilleureCat[1].tauxPaiement}% de taux.` });
  }
  if (data.artistesCount > 0) succes.push({ titre: 'Base artistes', message: `${data.artistesCount} artiste(s).` });
  if (succes.length === 0) succes.push({ titre: 'Aucun point fort majeur', message: 'Concentrez-vous sur les alertes.' });

  // ─── SUGGESTIONS ───
  const suggestions = [];
  suggestions.push({ texte: `Atteindre ${objectifTaux}% de taux global`, priorite: 'haute' });
  if (tauxGlobal < 60) suggestions.push({ texte: 'Lancer relance urgente', priorite: 'haute' });
  if (tendance && tendance.pente < 0) suggestions.push({ texte: 'Réviser stratégie commerciale', priorite: 'haute' });
  Object.entries(categories).forEach(([type, c]) => {
    if (c.total > 0 && c.tauxPaiement < 40) {
      suggestions.push({ texte: `Relancer ${c.label}`, priorite: 'moyenne' });
    }
  });
  suggestions.push({ texte: 'Automatiser rappels de paiement', priorite: 'basse' });

  const donneesMensuellesFormatees = donneesMensuelles.map(d => ({
    annee: d.annee,
    mois: d.mois,
    montant: Math.round(d.montant),
    nb: d.nb
  }));

  return {
    genereLe: new Date().toISOString(),
    global: {
      totalUsagers,
      totalUsagersPayes,
      tauxGlobal,
      objectifTaux,
      montantGlobalPaye: Number(montantGlobalPaye.toFixed(2)),
      totalFactures: data.factures.length,
      totalQuittances: data.quittances.length,
      quittancesNonValidees,
      totalRegions: data.regions.length,
      totalArtistes: data.artistesCount,
      utilisateursActifs: data.utilisateursActifs
    },
    categories,
    tendance,
    forecast,
    ecartType,
    historique: {
      meilleurMois,
      moyenneMensuelle,
      croissanceAnnuelle,
      donneesMensuelles: donneesMensuellesFormatees
    },
    parRegion,
    alertes,
    succes,
    suggestions,
    statsStatut
  };
}

// ============================================================
// 🧠 DÉTECTION INTENTION
// ============================================================
function detecterIntention(msg) {
  if (/\b(statut|status|situation|etat|state|sata|fiche|dossier)\b/.test(msg)) return 'statut_usager';
  if (/^(bonjour|salut|coucou|hello|hey|bonsoir|hi|bjr|slt|manao ahoana|salama|akory|mbon\s+tsara|good\s+morning|good\s+evening)\b/.test(msg)) return 'salutation';
  if (/(comment\s+(ca\s+)?va|comment\s+allez|how\s+are\s+you|ca\s+va|ahoana\s+ny\s+vao)/.test(msg)) return 'comment_ca_va';
  if (/(qui\s+(es[- ]?tu|est[- ]?tu)|who\s+are\s+you|izao\s+iza\s+ianao|what\s+can\s+you\s+do|que\s+peux[- ]tu\s+faire)/.test(msg)) return 'qui_es_tu';
  if (/(aide[- ]?moi|help\s+me|besoin\s+d'aide|aidez[- ]moi|manampia\s+ahy)/.test(msg)) return 'aide_moi';
  if (/\b(merci[e]?s?|mrc|mci|thanks?|thx|misaotra|super|parfait[e]?|nickel|bravo|génial|genial|top|impeccable)\b/.test(msg)) return 'merci';
  if (/^(ok|okay|d'accord|daccord|entendu|compris|tres\s+bien|très\s+bien|parfait|good|fine|dac|oki)\b/.test(msg)) return 'ok';
  if (/^(oui|ouais|yep|yes|yeah|yup)\b/.test(msg)) return 'oui';
  if (/^(non|no|nope|nan)\b/.test(msg)) return 'non';
  if (/\b(au\s+revoir|aurevoir|a\+\s*|a\s+plus|bye|goodbye|ciao|veloma|a\s+bientot|à\s+bient[oô]t)\b/.test(msg)) return 'aurevoir';
  if (/(critique|critical|urgent|mafy)/.test(msg)) return 'usagers_critiques';
  if (/(bon[s]?\s*payeur|bonne\s*paiement|bon\s*paiement|meilleur[s]?\s*payeur|best\s*pay|good\s*payer|mpandoa\s*tsara|exemplaire|qui\s+paie\s+bien)/.test(msg)) return 'bons_payeurs';
  if (/(mauvais\s*payeur|pire[s]?\s*payeur|bad\s*payer|worst\s*payer|mpandoa\s*ratsy|qui\s+paie\s+mal)/.test(msg)) return 'mauvais_payeurs';
  if (/(risque|risk|atahorana|danger|perte|loss|menace)/.test(msg)) return 'usagers_risque';
  if (/(retard|en retard|pas paye|impaye|arriere|arrier|late|overdue|unpaid|tara|tsy voaloa|non paye|non-paye|dette)/.test(msg)) return 'usagers_retard';
  if (/(non[\s-]?payeur|jamais paye|never paid|tsy mandoa|aucun paiement)/.test(msg)) return 'non_payeurs';
  if (/(top\s*montant|plus gros|gros contributeur|gros payeur|top contributor|biggest|mpandoa be|be indrindra)/.test(msg)) return 'top_montants';
  if (/(paiement[s]?\s+par\s+mois|fandoavana\s+isam-bolana)/.test(msg)) return 'paiements_mois';
  if (/(paiement[s]?\s+(par|de)\s+(region|faritra)|fandoavana\s+isaky\s+ny\s+faritra)/.test(msg)) return 'paiements_region';
  if (/(paiement[s]?|fandoavana|liste\s+des\s+paiements|historique\s+paiement)/.test(msg)) return 'paiements';
  if (/(facture[s]?\s+(non|impay|en\s+attente)|faktiora\s+tsy\s+voaloa)/.test(msg)) return 'factures_impayees';
  if (/(facture[s]?\s+(paye|regle)|faktiora\s+voaloa)/.test(msg)) return 'factures_payees';
  if (/(facture[s]?|faktiora|invoice[s]?)/.test(msg)) return 'factures';
  if (/(quittance[s]?\s+(non|pas)\s+valide|quittance[s]?\s+en\s+attente|taratasy\s+tsy\s+voamarina)/.test(msg)) return 'quittances_non_validees';
  if (/(quittance[s]?|recu[s]?|receipt[s]?|taratasy)/.test(msg)) return 'quittances';
  if (/(artiste[s]?|mpihira|mpilalao)/.test(msg)) {
    if (/(top|meilleur|malaza|populaire)/.test(msg)) return 'top_artistes';
    return 'artistes';
  }
  if (/(bilan[s]?\s+(par\s+)?(region|faritra)|par\s+region|by\s+region|faritra)/.test(msg)) return 'regions';
  if (/(categorie[s]?|sokajy|hotel|hôtel|bus|night\s*club|media|grande\s*surface)/.test(msg)) return 'categories';
  if (/(performance|global|situation|bilan|resume|fahombiazana|overview)/.test(msg)) return 'performance';
  if (/(statistique|stat|donnee[s]?|chiffre|total\s+general)/.test(msg)) return 'statistiques';
  if (/(alerte|alert|probleme|urgent|anomalie|fampandrenesana)/.test(msg)) return 'alertes';
  if (/(plan|action|resoudre|solution|comment faire|etapes|tetikasa|how to)/.test(msg)) return 'plan_action';
  if (/(prevision|previsions|avenir|projection|forecast|vinavina)/.test(msg)) return 'previsions';
  if (/(tendance|trend|evolution|fironana)/.test(msg)) return 'tendance';
  if (/(succes|positif|point fort|felicitation|zavatra tsara|success|good news)/.test(msg)) return 'succes';
  if (/(suggestion|conseil|recommandation|ameliorer|avis|soso-kevitra)/.test(msg)) return 'suggestions';
  if (/(objectif|target|but|goal|tanjona)/.test(msg)) return 'objectifs';
  if (/(historique|history|tantara)/.test(msg)) return 'historique';
  if (/(nombre|combien|total|firy|isa)\s+(d'?usager|d'?mpampiasa|de\s+client|users?|mpampiasa)/.test(msg)) return 'total_usagers';
  if (/(recette|revenu|chiffre\s+d'affaire|total\s+collecte|montant\s+total|revenue|vola\s+voaangona)/.test(msg)) return 'total_recettes';
  if (/(impaye|dette|reste\s+a\s+payer|manquant|outstanding|vola\s+tsy\s+voaloa)/.test(msg)) return 'montant_impaye';
  if (/(taux|percentage|pourcentage|taham)/.test(msg)) return 'taux_paiement';
  if (/(liste|list|lister|tous les usagers|all users|lisitra|mpampiasa\s+rehetra|show all|to\s+ny\s+mpampiasa)/.test(msg)) return 'liste_usagers';
  if (/(nouveau|nouveaux|recent|derniers?\s+ajout|new\s+users|vaovao)/.test(msg)) return 'usagers_nouveaux';
  if (/(cherche|recherche|trouve|trouver|search|find|mitady|hitady|ou\s+est|where\s+is)\s+\w/.test(msg)) return 'recherche';
  if (/(analyse|analyze|fanadihadiana)\s+(usager|client|mpampiasa)?\s*\w/.test(msg)) return 'analyse_usager';
  return 'inconnu';
}

function extraireTermeRecherche(messageOriginale) {
  let terme = messageOriginale.trim();
  terme = terme.replace(/^(cherche|recherche|trouve|trouver|search|find|mitady|hitady|analyse|analyze|detail|details|info|infos|fanadihadiana)\s+/i, '');
  terme = terme.replace(/^(statut|status|situation|etat|state|sata|fiche|dossier)\s+(de\s+|du\s+|d'|la\s+|le\s+|les\s+|des\s+|ny\s+|an'ny\s+|pour\s+)?/i, '');
  terme = terme.replace(/^(usager|client|mpampiasa|le\s+usager|la\s+usager)\s*/i, '');
  return terme.replace(/["']/g, '').trim();
}

function ficheUsagerTexte(u, langue) {
  const statutTxt = u.statut === 'bon-payeur' ? 'Bon payeur'
    : u.statut === 'payeur-moyen' ? 'Payeur moyen'
    : u.statut === 'mauvais-payeur' ? 'Mauvais payeur'
    : 'Non payeur';
  const moisTxt = (u.moisPayesLabels && u.moisPayesLabels.length > 0)
    ? u.moisPayesLabels.join(', ')
    : 'Aucun';
  const titre = langue === 'fr' ? 'FICHE USAGER' : langue === 'en' ? 'USER RECORD' : 'TAKELAKA MPAMPIASA';
  return [
    `${titre} — ${u.denomination}`,
    '',
    `Type ............. : ${u.typeLabel}`,
    `ID ............... : #${String(u.id).padStart(3, '0')}`,
    `Région ........... : ${u.region}`,
    `Téléphone ........ : ${u.telephone || '-'}`,
    `Email ............ : ${u.email || '-'}`,
    `Adresse .......... : ${u.adresse || '-'}`,
    `Montant mensuel .. : ${fmtN(u.montantMensuel)} Ar`,
    '',
    `Statut ........... : ${statutTxt}`,
    `Mois payés ....... : ${u.nbMoisPayes}/12`,
    `Détail ........... : ${moisTxt}`,
    `Montant payé ..... : ${fmtN(u.montantPaye)} Ar`,
    `Taux ............. : ${u.tauxPaiement}%`,
    `Reste dû ......... : ${fmtN((12 - u.nbMoisPayes) * u.montantMensuel)} Ar`
  ].join('\n');
}

function texteAide(langue) {
  return [
    'COMMANDES DISPONIBLES',
    '',
    '   USAGERS :',
    '   1) statut [nom] — fiche usager',
    '   2) usagers bons payeurs',
    '   3) usagers en retard',
    '   4) usagers à risque',
    '   5) usagers critiques',
    '   6) mauvais payeurs',
    '   7) non payeurs',
    '   8) liste usagers',
    '   9) usagers nouveaux',
    "   10) combien d'usagers",
    '',
    '   PAIEMENTS :',
    '   1) paiements',
    '   2) paiements par mois',
    '   3) paiements par région',
    '   4) top contributeurs',
    '   5) montant impayé',
    '   6) taux de paiement',
    '',
    '   FACTURES & QUITTANCES :',
    '   1) factures',
    '   2) factures impayées',
    '   3) factures payées',
    '   4) quittances',
    '   5) quittances non validées',
    '',
    '   ARTISTES :',
    '   1) statut des artistes',
    '   2) top artistes',
    '',
    '   ANALYSE :',
    '   1) performance globale',
    '   2) suggestions',
    '   3) objectifs',
    '   4) total recettes',
    '   5) total usagers'
  ].join('\n');
}

// ============================================================
// 💬 POST /api/ia/chat
// ============================================================
router.post('/ia/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message vide' });
  }

  const langueParam = (req.body.langue || '').toLowerCase();
  const langue = ['fr', 'mg', 'en'].includes(langueParam) ? langueParam : detecterLangue(message);
  const L = (key) => t(langue, key);
  const MSG = normaliser(message);
  const intent = detecterIntention(MSG);
  const annee = new Date().getFullYear();

  console.log(`🧠 Intention: ${intent} | Langue: ${langue} | Msg: "${message}"`);

  try {
    const diagnostic = await construireDiagnostic();
    let reponse = '';

    if (intent === 'statut_usager' || intent === 'analyse_usager') {
      const terme = extraireTermeRecherche(message);
      if (terme.length < 2) {
        reponse = langue === 'fr' ? "Précisez le nom de l'usager.\n\nExemple : \"statut usager Ilay Nosy Ambohimangakely\"" :
                  langue === 'en' ? "Please specify the user name." :
                  "Lazao ny anaran'ny mpampiasa.";
      } else {
        const r = await rechercherUsagers(terme);
        if (r.length === 0) {
          reponse = `${L('noResult')} "${terme}".\n\n   Conseil : essayez "liste usagers" pour voir tous les usagers.`;
        } else if (r.length === 1) {
          reponse = ficheUsagerTexte(r[0], langue);
        } else {
          reponse = `${r.length} ${L('usagers')} trouvés pour "${terme}" :\n\n`;
          reponse += listeUsagersTexte(r.slice(0, 10), langue);
        }
      }
    }
    else if (intent === 'salutation') {
      const h = new Date().getHours();
      reponse = h >= 18 ? L('greeting_evening') : h < 12 ? L('greeting_morning') : L('greeting_afternoon');
    }
    else if (intent === 'comment_ca_va') reponse = L('howAreYou');
    else if (intent === 'qui_es_tu') reponse = L('whoAreYou');
    else if (intent === 'aide_moi') reponse = L('helpMe') + '\n\n' + texteAide(langue);
    else if (intent === 'merci') reponse = L('thanks');
    else if (intent === 'ok') reponse = L('ok');
    else if (intent === 'oui') reponse = L('yes');
    else if (intent === 'non') reponse = L('no');
    else if (intent === 'aurevoir') reponse = L('bye');
    else if (intent === 'usagers_critiques') {
      const tous = await analyserUsagersParAnnee(annee);
      const critiques = tous
        .filter(u => u.nbMoisPayes === 0 || (u.nbMoisPayes < 3 && u.montantMensuel > 0))
        .sort((a, b) => (b.montantMensuel * (12 - b.nbMoisPayes)) - (a.montantMensuel * (12 - a.nbMoisPayes)))
        .slice(0, 20);
      const perte = critiques.reduce((s, u) => s + (12 - u.nbMoisPayes) * u.montantMensuel, 0);
      reponse = `USAGERS CRITIQUES — ${annee} (${critiques.length})\n`;
      reponse += `\n   Perte estimée : ${fmtN(perte)} Ar\n\n`;
      reponse += listeUsagersTexte(critiques, langue);
    }
    else if (intent === 'bons_payeurs') {
      const bons = await getMeilleursPayeurs(annee, 20);
      reponse = `BONS PAYEURS — ${annee} (${bons.length})\n\n`;
      reponse += listeUsagersTexte(bons, langue);
    }
    else if (intent === 'mauvais_payeurs') {
      const m = (await analyserUsagersParAnnee(annee))
        .filter(u => u.statut === 'mauvais-payeur' || u.statut === 'non-payeur')
        .sort((a, b) => a.nbMoisPayes - b.nbMoisPayes).slice(0, 20);
      reponse = `MAUVAIS / NON PAYEURS — ${annee} (${m.length})\n\n`;
      reponse += listeUsagersTexte(m, langue);
    }
    else if (intent === 'usagers_risque') {
      const tous = await analyserUsagersParAnnee(annee);
      const aRisque = tous
        .filter(u => u.nbMoisPayes < 6 && u.montantMensuel > 0)
        .sort((a, b) => (b.montantMensuel * (12 - b.nbMoisPayes)) - (a.montantMensuel * (12 - a.nbMoisPayes)))
        .slice(0, 20);
      const totalPerte = aRisque.reduce((s, u) => s + (12 - u.nbMoisPayes) * u.montantMensuel, 0);
      reponse = `USAGERS À RISQUE — ${annee} (${aRisque.length})\n`;
      reponse += `\n   ${L('totalImpaye')} : ${fmtN(totalPerte)} Ar\n\n`;
      reponse += listeUsagersTexte(aRisque, langue);
    }
    else if (intent === 'usagers_retard') {
      const enRetard = await getUsagersEnRetard(annee);
      const total = enRetard.reduce((s, u) => s + (12 - u.nbMoisPayes) * u.montantMensuel, 0);
      reponse = `USAGERS EN RETARD — ${annee} (${enRetard.length})\n`;
      reponse += `\n   ${L('totalImpaye')} : ${fmtN(total)} Ar\n\n`;
      reponse += listeUsagersTexte(enRetard.slice(0, 30), langue);
    }
    else if (intent === 'non_payeurs') {
      const np = (await analyserUsagersParAnnee(annee)).filter(u => u.statut === 'non-payeur').slice(0, 30);
      reponse = `NON PAYEURS — ${annee} (${np.length})\n\n`;
      reponse += listeUsagersTexte(np, langue);
    }
    else if (intent === 'top_montants') {
      const top = await getTopMontants(annee, 15);
      reponse = `TOP 15 CONTRIBUTEURS — ${annee}\n\n`;
      reponse += listeUsagersTexte(top, langue);
    }
    else if (intent === 'paiements') {
      const data = await collecterDonneesCompletes();
      const payes = data.paiements.filter(p => p.statut === 'paye');
      const total = payes.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
      reponse = `PAIEMENTS — ${payes.length}\n`;
      reponse += `\n   Total : ${fmtN(total)} Ar\n\n`;
      reponse += listeGenerique(
        payes.slice(0, 20).map(p => `${p.usager_type || '-'} — M${p.mois || '-'}/${p.annee || '-'} : ${fmtN(p.montant)} Ar`)
      );
    }
    else if (intent === 'paiements_mois') {
      const data = await collecterDonneesCompletes();
      const parMois = {};
      data.paiements.filter(p => p.statut === 'paye').forEach(p => {
        const k = `${p.annee}-${String(p.mois).padStart(2, '0')}`;
        if (!parMois[k]) parMois[k] = { nb: 0, montant: 0 };
        parMois[k].nb++;
        parMois[k].montant += parseFloat(p.montant) || 0;
      });
      reponse = `PAIEMENTS PAR MOIS\n\n`;
      reponse += listeGenerique(
        Object.entries(parMois).sort().slice(-12).map(([k, v]) => `${k} : ${v.nb} paiements — ${fmtN(v.montant)} Ar`)
      );
    }
    else if (intent === 'paiements_region' || intent === 'regions') {
      const total = diagnostic.parRegion.reduce((s, r) => s + r.montant, 0);
      reponse = `BILAN PAR RÉGION\n`;
      reponse += `\n   Total : ${fmtN(total)} Ar\n\n`;
      reponse += listeGenerique(
        diagnostic.parRegion.map(r => `${r.region} — ${r.nbUsagers} usagers · ${r.nbQuittances} paiements : ${fmtN(r.montant)} Ar`)
      );
    }
    else if (intent === 'categories') {
      reponse = `CATÉGORIES D'USAGERS\n\n`;
      reponse += listeGenerique(
        Object.values(diagnostic.categories).map(c => `${c.label} — ${c.payes}/${c.total} payés (${c.tauxPaiement}%)`)
      );
    }
    else if (intent === 'factures' || intent === 'factures_payees' || intent === 'factures_impayees') {
      const data = await collecterDonneesCompletes();
      let factures = data.factures;
      let titreTxt = 'Factures';
      if (intent === 'factures_payees') { factures = factures.filter(f => f.quittance && f.quittance_validee !== false); titreTxt = 'Factures payées'; }
      else if (intent === 'factures_impayees') { factures = factures.filter(f => !f.quittance || f.quittance_validee === false); titreTxt = 'Factures impayées'; }
      reponse = `${titreTxt} — ${factures.length}\n\n`;
      reponse += listeGenerique(
        factures.slice(0, 20).map(f => `Réf ${f.ref_usager || '-'} — ${f.region_usager || '-'} : ${fmtN(f.soit_total)} Ar`)
      );
    }
    else if (intent === 'quittances' || intent === 'quittances_non_validees') {
      const data = await collecterDonneesCompletes();
      if (intent === 'quittances_non_validees') {
        const nv = data.factures.filter(f => f.quittance && f.quittance_validee === false);
        reponse = `QUITTANCES NON VALIDÉES — ${nv.length}\n\n`;
        reponse += listeGenerique(
          nv.slice(0, 20).map(f => `Réf ${f.ref_usager || '-'} — ${f.region_usager || '-'} : ${fmtN(f.soit_total)} Ar`)
        );
      } else {
        reponse = `QUITTANCES\n\n`;
        reponse += `   1) Total ............. : ${diagnostic.global.totalQuittances}\n`;
        reponse += `   2) Non validées ...... : ${diagnostic.global.quittancesNonValidees}\n`;
        reponse += `   3) Factures .......... : ${diagnostic.global.totalFactures}`;
      }
    }
    else if (intent === 'artistes' || intent === 'artistes_statut') {
      const data = await collecterDonneesCompletes();
      try {
        const r = await pool.query(`SELECT id, nom, prenom, role FROM artistes ORDER BY nom LIMIT 50`);
        reponse = `ARTISTES — ${data.artistesCount}\n\n`;
        reponse += listeGenerique(r.rows.map(a => `${a.nom || '-'} ${a.prenom || ''} — ${a.role || '-'}`));
      } catch (e) {
        reponse = `${data.artistesCount} artistes référencés.`;
      }
    }
    else if (intent === 'top_artistes') {
      try {
        const r = await pool.query(
          `SELECT a.nom, a.prenom, COUNT(ea.event_id) AS nb_events
           FROM artistes a LEFT JOIN event_artistes ea ON a.id = ea.artiste_id
           GROUP BY a.id, a.nom, a.prenom ORDER BY nb_events DESC LIMIT 15`
        );
        reponse = `TOP ARTISTES\n\n`;
        reponse += listeGenerique(r.rows.map(a => `${a.nom || '-'} ${a.prenom || ''} — ${a.nb_events} événements`));
      } catch (e) {
        reponse = `Erreur : ${e.message}`;
      }
    }
    else if (intent === 'performance' || intent === 'statistiques') {
      const g = diagnostic.global;
      reponse = `PERFORMANCE GLOBALE OMDA\n\n`;
      reponse += `   1) Usagers total ....... : ${g.totalUsagers}\n`;
      reponse += `   2) Usagers à jour ...... : ${g.totalUsagersPayes}\n`;
      reponse += `   3) Taux de paiement .... : ${g.tauxGlobal}%\n`;
      reponse += `   4) Objectif ............ : ${g.objectifTaux}%\n`;
      reponse += `   5) Montant collecté .... : ${fmtN(g.montantGlobalPaye)} Ar\n`;
      reponse += `   6) Factures ............ : ${g.totalFactures}\n`;
      reponse += `   7) Quittances .......... : ${g.totalQuittances}\n`;
      reponse += `   8) Quittances à valider  : ${g.quittancesNonValidees}\n`;
      reponse += `   9) Artistes ............ : ${g.totalArtistes}\n\n`;
      reponse += `   Répartition :\n`;
      reponse += `   1) Bons payeurs ........ : ${diagnostic.statsStatut.bonPayeur}\n`;
      reponse += `   2) Payeurs moyens ...... : ${diagnostic.statsStatut.payeurMoyen}\n`;
      reponse += `   3) Mauvais payeurs ..... : ${diagnostic.statsStatut.mauvaisPayeur}\n`;
      reponse += `   4) Non payeurs ......... : ${diagnostic.statsStatut.nonPayeur}`;
    }
    else if (intent === 'alertes') {
      reponse = `ALERTES\n\n`;
      reponse += `   1) "usagers en retard"\n   2) "usagers à risque"\n   3) "usagers critiques"\n   4) "quittances non validées"`;
    }
    else if (intent === 'plan_action') {
      reponse = `PLAN D'ACTION RECOMMANDÉ\n\n`;
      reponse += `   1) Identifier les usagers en retard → "usagers en retard"\n`;
      reponse += `   2) Envoyer des relances\n`;
      reponse += `   3) Valider les quittances → "quittances non validées"\n`;
      reponse += `   4) Suivre le taux → "performance globale"`;
    }
    else if (intent === 'previsions') {
      reponse = `PRÉVISIONS\n\n   1) "paiements par mois"\n   2) "total recettes"\n   3) "performance globale"`;
    }
    else if (intent === 'tendance') {
      if (diagnostic.tendance) {
        reponse = `TENDANCE\n\n   Direction : ${diagnostic.tendance.direction}\n   Variation : ${diagnostic.tendance.pourcentage}%`;
      } else {
        reponse = `TENDANCE\n\n   Données insuffisantes.`;
      }
    }
    else if (intent === 'succes') {
      reponse = `POINTS POSITIFS\n\n`;
      reponse += `   1) ${diagnostic.global.tauxGlobal}% des usagers sont à jour\n`;
      reponse += `   2) ${diagnostic.global.totalArtistes} artiste(s) référencé(s)\n`;
      reponse += `   3) ${diagnostic.global.totalRegions} région(s) active(s)`;
    }
    else if (intent === 'suggestions') {
      reponse = `SUGGESTIONS\n\n`;
      reponse += listeGenerique(diagnostic.suggestions.map(s => `${s.texte} (${s.priorite})`));
    }
    else if (intent === 'objectifs') {
      const g = diagnostic.global;
      reponse = `OBJECTIFS\n\n   1) Objectif : ${g.objectifTaux}%\n   2) Actuel : ${g.tauxGlobal}%\n   3) Écart : ${(g.objectifTaux - g.tauxGlobal).toFixed(1)} points`;
    }
    else if (intent === 'historique') {
      const h = diagnostic.historique;
      reponse = `HISTORIQUE\n\n`;
      reponse += `   Meilleur mois ....... : ${h.meilleurMois ? `${fmtN(h.meilleurMois.montant)} Ar (${h.meilleurMois.periode})` : 'N/A'}\n`;
      reponse += `   Moyenne mensuelle ... : ${fmtN(h.moyenneMensuelle)} Ar\n`;
      reponse += `   Croissance annuelle . : ${h.croissanceAnnuelle !== null ? `${h.croissanceAnnuelle > 0 ? '+' : ''}${h.croissanceAnnuelle}%` : 'N/A'}`;
    }
    else if (intent === 'total_usagers') {
      const g = diagnostic.global;
      reponse = `TOTAL USAGERS\n\n   1) Total : ${g.totalUsagers}\n   2) À jour : ${g.totalUsagersPayes}\n   3) Non à jour : ${g.totalUsagers - g.totalUsagersPayes}`;
    }
    else if (intent === 'total_recettes') {
      const g = diagnostic.global;
      reponse = `TOTAL RECETTES\n\n   1) Montant : ${fmtN(g.montantGlobalPaye)} Ar\n   2) Factures : ${g.totalFactures}\n   3) Quittances : ${g.totalQuittances}`;
    }
    else if (intent === 'montant_impaye') {
      const enRetard = await getUsagersEnRetard(annee);
      const total = enRetard.reduce((s, u) => s + (12 - u.nbMoisPayes) * u.montantMensuel, 0);
      reponse = `${L('totalImpaye')}\n\n   1) Usagers en retard : ${enRetard.length}\n   2) Montant : ${fmtN(total)} Ar`;
    }
    else if (intent === 'taux_paiement') {
      const g = diagnostic.global;
      reponse = `TAUX DE PAIEMENT\n\n   1) Taux : ${g.tauxGlobal}%\n   2) Objectif : ${g.objectifTaux}%\n   3) À jour : ${g.totalUsagersPayes}/${g.totalUsagers}`;
    }
    else if (intent === 'liste_usagers') {
      const tous = await analyserUsagersParAnnee();
      reponse = `LISTE — ${tous.length} usagers\n\n`;
      reponse += listeUsagersTexte(tous.slice(0, 50), langue);
      if (tous.length > 50) reponse += `\n\n   ... +${tous.length - 50} autres`;
    }
    else if (intent === 'usagers_nouveaux') {
      const data = await collecterDonneesCompletes();
      const recents = [];
      for (const [type, usagers] of Object.entries(data.usagers)) {
        for (const u of usagers) {
          if (u.created_at) {
            const jours = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
            if (jours <= 30) recents.push({
              denomination: u.denomination || u.nom_evenement || 'Sans nom',
              typeLabel: TYPE_LABELS[type], region: u.region || 'N/A',
              nbMoisPayes: 0, montantPaye: 0, statut: 'non-payeur'
            });
          }
        }
      }
      reponse = `NOUVEAUX USAGERS (30j) — ${recents.length}\n\n`;
      reponse += listeUsagersTexte(recents, langue);
    }
    else if (intent === 'recherche') {
      const terme = extraireTermeRecherche(message);
      if (terme.length < 2) {
        reponse = langue === 'fr' ? 'Précisez au moins 2 caractères.' :
                  langue === 'en' ? 'Refine your search (min 2 chars).' :
                  'Lazao farafahakeliny 2 litera.';
      } else {
        const r = await rechercherUsagers(terme);
        if (r.length === 0) reponse = `${L('noResult')} "${terme}".`;
        else if (r.length === 1) reponse = ficheUsagerTexte(r[0], langue);
        else {
          reponse = `${r.length} usagers trouvés pour "${terme}"\n\n`;
          reponse += listeUsagersTexte(r.slice(0, 15), langue);
        }
      }
    }
    else {
      reponse = L('notUnderstood') + '\n\n' + texteAide(langue);
    }

    res.json({ success: true, reponse, langue, intent });
  } catch (error) {
    console.error('❌ Erreur chat IA:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// 📌 ROUTES GET
// ============================================================
router.get('/ia/diagnostic', async (req, res) => {
  try { res.json({ success: true, diagnostic: await construireDiagnostic() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/ia/usagers/retard', async (req, res) => {
  try {
    const annee = req.query.annee ? parseInt(req.query.annee) : new Date().getFullYear();
    const usagers = await getUsagersEnRetard(annee);
    res.json({ success: true, annee, total: usagers.length, usagers });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/ia/usagers/meilleurs', async (req, res) => {
  try {
    const annee = req.query.annee ? parseInt(req.query.annee) : new Date().getFullYear();
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const u = await getMeilleursPayeurs(annee, limit);
    res.json({ success: true, annee, total: u.length, usagers: u });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/ia/top-montants', async (req, res) => {
  try {
    const annee = req.query.annee ? parseInt(req.query.annee) : new Date().getFullYear();
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const usagers = await getTopMontants(annee, limit);
    res.json({ success: true, annee, total: usagers.length, usagers });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
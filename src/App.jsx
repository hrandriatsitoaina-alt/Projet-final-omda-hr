// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ParametreProvider } from './context/ParametreContext';
import { ToastProvider } from './components/Toast';
import './styles/App.css';

import Authentification from './pages/Authentification';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profil from './pages/Profil';
import AjoutUsager from './pages/AjoutUsager';
import VerificationUsager from './pages/VerificationUsager';
import PayementChoix from './pages/PayementChoix';
import TableauDB from './pages/TableauDB';
import DateOcc from './pages/date_occ';
import DateGrandSurface from './pages/date_grandSurface';
import DateBus from './pages/date_bus';
import DateNigth from './pages/date_nigth';
import Dateautre from './pages/date_autre';
import Facture from './pages/fact';
import Tele from './pages/tele_radio';
import Hotel from './pages/hotel_class';
import Gerepaiement from './pages/gere-paiement';
import Gestioncontra from './pages/gestion_contra';
import Gestiondossier from './pages/gestion_dossier';
import Gestusagercrud from './pages/gestion_crud';
import GestionRegionCrud from './pages/gestion_region_crud';
import NotificationAdmin from './pages/notification_admin';
import ConfirmePaiement from './pages/ConfirmePaiement';
import ConfirmationDossier from './pages/ConfirmationDossier';
import GenerationFacture from './pages/GenerationFacture';
import PaiementMensuel from './pages/PaiementMensuel';
import Parametre from './pages/parametre';
import BaseDeDonnees from './pages/base_de_donnees';
import Quitance from './pages/quitance';
import RepartitionArtister from './pages/repartition_artister';
import Diagnostique from './pages/diagnostique';
import OtherAjout from './pages/OtherAjout';
import DateOther from './pages/DateOther';
import Comptet from './pages/comptet';
import ComptetTypeDetail from './pages/ComptetTypeDetail';   

function AuthRoute() {
  const location = useLocation();
  const resetKey = location.state?.resetKey || location.key;

  return <Authentification key={resetKey} />;
}

function App() {
  return (
    <ToastProvider>
      <ParametreProvider>
        <Routes>
          <Route path="/" element={<AuthRoute />} />
          <Route
            path="/authentification"
            element={<Navigate to="/" replace state={{ resetKey: Date.now() }} />}
          />

          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/ajout-usager" element={<AjoutUsager />} />
          <Route path="/verification-usager" element={<VerificationUsager />} />
          <Route path="/billan" element={<PayementChoix />} />
          <Route path="/tableau-db" element={<TableauDB />} />
          <Route path="/date_occ" element={<DateOcc />} />
          <Route path="/date-grandsurface" element={<DateGrandSurface />} />
          <Route path="/date-bus" element={<DateBus />} />
          <Route path="/night-club" element={<DateNigth />} />
          <Route path="/autre-usager" element={<Dateautre />} />
          <Route path="/facture-usager" element={<Facture />} />
          <Route path="/tele-radio" element={<Tele />} />
          <Route path="/Hotel_occ" element={<Hotel />} />
          <Route path="/gere-payer" element={<Gerepaiement />} />
          <Route path="/paiement-mensuel" element={<PaiementMensuel />} />
          <Route path="/gere-contra" element={<Gestioncontra />} />
          <Route path="/gere-dossier" element={<Gestiondossier />} />
          <Route path="/gestion_crud" element={<Gestusagercrud />} />
          <Route path="/gestion-region" element={<GestionRegionCrud />} />
          <Route path="/notification_admin" element={<NotificationAdmin />} />
          <Route path="/confirme-paiement" element={<ConfirmePaiement />} />
          <Route path="/confirmation-dossier" element={<ConfirmationDossier />} />
          <Route path="/generation-facture" element={<GenerationFacture />} />
          <Route path="/Parametre_global" element={<Parametre />} />
          <Route path="/base-de-donnees" element={<BaseDeDonnees />} />
          <Route path="/quitance" element={<Quitance />} />
          <Route path="/repartition-artistes" element={<RepartitionArtister />} />
          <Route path="/diagnostique" element={<Diagnostique />} />
          <Route path="/other-ajout" element={<OtherAjout />} />
          <Route path="/date_other" element={<DateOther />} />

          {/*  Page Compte globale */}
          <Route path="/comptet" element={<Comptet />} />

          {/*  AJOUT : Page Compte détail par type */}
          <Route path="/comptet/type/:type" element={<ComptetTypeDetail />} />

          {/* Fallback : toute route inconnue → racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ParametreProvider>
    </ToastProvider>
  );
}

export default App;
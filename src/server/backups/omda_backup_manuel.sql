--
-- PostgreSQL database dump
--

-- Dumped from database version 16.1
-- Dumped by pg_dump version 16.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: omda_app; Type: SCHEMA; Schema: -; Owner: omda_user
--

CREATE SCHEMA omda_app;


ALTER SCHEMA omda_app OWNER TO omda_user;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activites; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.activites (
    id integer NOT NULL,
    action character varying(100) NOT NULL,
    details text,
    user_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.activites OWNER TO omda_user;

--
-- Name: activites_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.activites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.activites_id_seq OWNER TO omda_user;

--
-- Name: activites_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.activites_id_seq OWNED BY omda_app.activites.id;


--
-- Name: artistes; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.artistes (
    id integer NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100),
    nationalite character varying(50),
    role character varying(100),
    biographie text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.artistes OWNER TO omda_user;

--
-- Name: artistes_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.artistes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.artistes_id_seq OWNER TO omda_user;

--
-- Name: artistes_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.artistes_id_seq OWNED BY omda_app.artistes.id;


--
-- Name: backup_annuel; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.backup_annuel (
    id integer NOT NULL,
    annee integer NOT NULL,
    data jsonb NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.backup_annuel OWNER TO omda_user;

--
-- Name: backup_annuel_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.backup_annuel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.backup_annuel_id_seq OWNER TO omda_user;

--
-- Name: backup_annuel_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.backup_annuel_id_seq OWNED BY omda_app.backup_annuel.id;


--
-- Name: backup_config; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.backup_config (
    id integer DEFAULT 1 NOT NULL,
    chemin_sauvegarde text,
    defini_par integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT backup_config_single_row CHECK ((id = 1))
);


ALTER TABLE omda_app.backup_config OWNER TO omda_user;

--
-- Name: backup_historique; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.backup_historique (
    id integer NOT NULL,
    type_backup character varying(20) NOT NULL,
    nom_fichier character varying(255),
    chemin_complet text,
    taille_octets bigint DEFAULT 0,
    statut character varying(20) DEFAULT 'succes'::character varying,
    message text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.backup_historique OWNER TO omda_user;

--
-- Name: backup_historique_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.backup_historique_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.backup_historique_id_seq OWNER TO omda_user;

--
-- Name: backup_historique_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.backup_historique_id_seq OWNED BY omda_app.backup_historique.id;


--
-- Name: compteurs_dossiers_utilisateurs; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.compteurs_dossiers_utilisateurs (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    annee integer NOT NULL,
    compteur integer DEFAULT 0,
    type_usager character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.compteurs_dossiers_utilisateurs OWNER TO omda_user;

--
-- Name: compteurs_dossiers_utilisateurs_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.compteurs_dossiers_utilisateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.compteurs_dossiers_utilisateurs_id_seq OWNER TO omda_user;

--
-- Name: compteurs_dossiers_utilisateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.compteurs_dossiers_utilisateurs_id_seq OWNED BY omda_app.compteurs_dossiers_utilisateurs.id;


--
-- Name: delete_confirmations; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.delete_confirmations (
    id integer NOT NULL,
    request_id integer NOT NULL,
    user_id integer NOT NULL,
    user_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.delete_confirmations OWNER TO omda_user;

--
-- Name: delete_confirmations_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.delete_confirmations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.delete_confirmations_id_seq OWNER TO omda_user;

--
-- Name: delete_confirmations_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.delete_confirmations_id_seq OWNED BY omda_app.delete_confirmations.id;


--
-- Name: delete_history; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.delete_history (
    id integer NOT NULL,
    usager_nom character varying(200) NOT NULL,
    usager_type character varying(50) NOT NULL,
    deleted_by character varying(100) NOT NULL,
    deleted_by_role character varying(50) DEFAULT 'super_admin'::character varying,
    user_id integer,
    created_by integer,
    details jsonb,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.delete_history OWNER TO omda_user;

--
-- Name: delete_history_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.delete_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.delete_history_id_seq OWNER TO omda_user;

--
-- Name: delete_history_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.delete_history_id_seq OWNED BY omda_app.delete_history.id;


--
-- Name: delete_requests; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.delete_requests (
    id integer NOT NULL,
    usager_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.delete_requests OWNER TO omda_user;

--
-- Name: delete_requests_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.delete_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.delete_requests_id_seq OWNER TO omda_user;

--
-- Name: delete_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.delete_requests_id_seq OWNED BY omda_app.delete_requests.id;


--
-- Name: event_artistes; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.event_artistes (
    id integer NOT NULL,
    event_id integer NOT NULL,
    artiste_id integer NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.event_artistes OWNER TO omda_user;

--
-- Name: event_artistes_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.event_artistes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.event_artistes_id_seq OWNER TO omda_user;

--
-- Name: event_artistes_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.event_artistes_id_seq OWNED BY omda_app.event_artistes.id;


--
-- Name: facture_usager; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.facture_usager (
    id integer NOT NULL,
    ref_omda integer NOT NULL,
    num_facture character varying(20) NOT NULL,
    num_facture_type character varying(1) DEFAULT 'A'::character varying,
    ref_client_type character varying(10) NOT NULL,
    ref_usager integer NOT NULL,
    type_facture character varying(50),
    region_usager character varying(100),
    date_ajout date DEFAULT CURRENT_DATE,
    denomination character varying(255),
    demandeur character varying(255),
    telephone character varying(50),
    email character varying(255),
    adresse text,
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree character varying(50),
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    activite character varying(255),
    etoiles character varying(10),
    ravinala boolean DEFAULT false,
    nombre_magasins integer DEFAULT 0,
    nombre_vehicules integer DEFAULT 0,
    lignes character varying(255),
    type_bus character varying(50),
    trajet character varying(255),
    horaires character varying(255),
    zones_desservies character varying(255),
    jauge_max integer DEFAULT 0,
    frequence character varying(50),
    canal character varying(50),
    siege character varying(255),
    nif character varying(100),
    stat character varying(100),
    taux numeric(15,2),
    organisateurs character varying(255),
    representant_par character varying(255),
    genre_manifestation character varying(255),
    artistes character varying(255),
    date_evenement date,
    lieu_evenement character varying(255),
    domicile character varying(255),
    lieu_ajout character varying(255),
    date_signature date,
    confirmation_nom character varying(255),
    personne_recu character varying(255),
    quittance integer,
    quittance_validee boolean DEFAULT false,
    moyens_communication jsonb,
    a_compter_du date,
    echeance date,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    montant_retard numeric(15,2) DEFAULT 0,
    is_retard boolean DEFAULT false,
    soit_total numeric(15,2) DEFAULT 0,
    uniter integer DEFAULT 1,
    mois_facture integer,
    annee_facture integer,
    mois_groupes text,
    type_groupe character varying(10) DEFAULT 'A'::character varying,
    suffixe character varying(5),
    description_personnalisee text,
    annee_paiement integer,
    mois_groupes_json jsonb,
    numero_dossier_utilisateur character varying(50),
    numero_dossier_global character varying(50),
    daf_nom character varying(255),
    statut character varying(20) DEFAULT 'brouillon'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT facture_usager_mois_facture_check CHECK (((mois_facture >= 1) AND (mois_facture <= 12)))
);


ALTER TABLE omda_app.facture_usager OWNER TO omda_user;

--
-- Name: facture_usager_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.facture_usager_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.facture_usager_id_seq OWNER TO omda_user;

--
-- Name: facture_usager_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.facture_usager_id_seq OWNED BY omda_app.facture_usager.id;


--
-- Name: notifications; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.notifications (
    id integer NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    usager_id integer,
    read boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.notifications OWNER TO omda_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.notifications_id_seq OWNER TO omda_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.notifications_id_seq OWNED BY omda_app.notifications.id;


--
-- Name: paiements; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.paiements (
    id integer NOT NULL,
    usager_id integer NOT NULL,
    usager_type character varying(50) NOT NULL,
    type_paiement character varying(20) NOT NULL,
    annee integer,
    mois integer,
    montant numeric(15,2) NOT NULL,
    date_paiement date NOT NULL,
    frais_dossier numeric(15,2) DEFAULT 0,
    montant_retard numeric(15,2) DEFAULT 0,
    est_retard boolean DEFAULT false,
    reference character varying(100),
    statut character varying(20) DEFAULT 'paye'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_paiement CHECK (((((type_paiement)::text = 'mensuel'::text) AND (annee IS NOT NULL) AND (mois IS NOT NULL)) OR (((type_paiement)::text = 'unique'::text) AND (annee IS NULL) AND (mois IS NULL)))),
    CONSTRAINT paiements_mois_check CHECK (((mois >= 1) AND (mois <= 12)))
);


ALTER TABLE omda_app.paiements OWNER TO omda_user;

--
-- Name: paiements_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.paiements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.paiements_id_seq OWNER TO omda_user;

--
-- Name: paiements_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.paiements_id_seq OWNED BY omda_app.paiements.id;


--
-- Name: parametres_utilisateur; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.parametres_utilisateur (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    app_name character varying(100) DEFAULT 'OMDA App'::character varying,
    langue character varying(10) DEFAULT 'fr'::character varying,
    theme character varying(20) DEFAULT 'light'::character varying,
    date_format character varying(20) DEFAULT 'DD/MM/YYYY'::character varying,
    time_format character varying(10) DEFAULT '24h'::character varying,
    couleur_principale character varying(20) DEFAULT '#3498db'::character varying,
    police character varying(50) DEFAULT 'default'::character varying,
    notifications jsonb DEFAULT '{"sms": false, "push": true, "email": true, "sound": true}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.parametres_utilisateur OWNER TO omda_user;

--
-- Name: parametres_utilisateur_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.parametres_utilisateur_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.parametres_utilisateur_id_seq OWNER TO omda_user;

--
-- Name: parametres_utilisateur_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.parametres_utilisateur_id_seq OWNED BY omda_app.parametres_utilisateur.id;


--
-- Name: regions; Type: TABLE; Schema: omda_app; Owner: postgres
--

CREATE TABLE omda_app.regions (
    id integer NOT NULL,
    nom character varying(100) NOT NULL,
    telephone character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.regions OWNER TO postgres;

--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: postgres
--

CREATE SEQUENCE omda_app.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.regions_id_seq OWNER TO postgres;

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: postgres
--

ALTER SEQUENCE omda_app.regions_id_seq OWNED BY omda_app.regions.id;


--
-- Name: usagers; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers (
    id integer NOT NULL,
    type_usager character varying(50) NOT NULL,
    denomination character varying(255),
    demandeur character varying(255),
    telephone character varying(50),
    email character varying(255),
    region character varying(100),
    adresse text,
    frais_dossier numeric(15,2) DEFAULT 0,
    montant_mensuel numeric(15,2) DEFAULT 0,
    uniter integer DEFAULT 1,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers OWNER TO omda_user;

--
-- Name: usagers_bus; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_bus (
    id integer NOT NULL,
    demandeur character varying(255),
    denomination character varying(255),
    adresse_siege character varying(255),
    nif_stat character varying(100),
    telephone character varying(50),
    email character varying(255),
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    nombre_vehicules integer DEFAULT 0,
    lignes character varying(255),
    type_bus character varying(50),
    trajet character varying(255),
    horaires character varying(255),
    zones_desservies character varying(255),
    a_compter_du date,
    echeance date,
    type_paiement character varying(50) DEFAULT 'mensuel'::character varying,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    region character varying(100),
    confirmation_nom character varying(255),
    date_signature date,
    lieu_signature character varying(255),
    uniter integer DEFAULT 1,
    numero_dossier_utilisateur character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_bus OWNER TO omda_user;

--
-- Name: usagers_bus_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_bus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_bus_id_seq OWNER TO omda_user;

--
-- Name: usagers_bus_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_bus_id_seq OWNED BY omda_app.usagers_bus.id;


--
-- Name: usagers_hotel; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_hotel (
    id integer NOT NULL,
    demandeur character varying(255),
    denomination character varying(255),
    adresse_siege character varying(255),
    nif_stat character varying(100),
    telephone character varying(50),
    email character varying(255),
    etoiles character varying(10),
    ravinala boolean DEFAULT false,
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    activite character varying(100),
    moyens_communication jsonb,
    total character varying(50),
    a_compter_du date,
    echeance date,
    confirmation_nom character varying(255),
    date_signature date,
    lieu_signature character varying(255),
    type_paiement character varying(50) DEFAULT 'mensuel'::character varying,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    region character varying(100),
    uniter integer DEFAULT 1,
    numero_dossier_utilisateur character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_hotel OWNER TO omda_user;

--
-- Name: usagers_hotel_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_hotel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_hotel_id_seq OWNER TO omda_user;

--
-- Name: usagers_hotel_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_hotel_id_seq OWNED BY omda_app.usagers_hotel.id;


--
-- Name: usagers_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_id_seq OWNER TO omda_user;

--
-- Name: usagers_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_id_seq OWNED BY omda_app.usagers.id;


--
-- Name: usagers_magasin; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_magasin (
    id integer NOT NULL,
    demandeur character varying(255),
    denomination character varying(255),
    adresse_siege character varying(255),
    nif_stat character varying(100),
    telephone character varying(50),
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    activite character varying(255),
    nombre_magasins integer DEFAULT 0,
    moyens_communication jsonb,
    total character varying(50),
    a_compter_du date,
    echeance date,
    confirmation_nom character varying(255),
    date_signature date,
    lieu_signature character varying(255),
    type_paiement character varying(50) DEFAULT 'mensuel'::character varying,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    region character varying(100),
    uniter integer DEFAULT 1,
    numero_dossier_utilisateur character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_magasin OWNER TO omda_user;

--
-- Name: usagers_magasin_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_magasin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_magasin_id_seq OWNER TO omda_user;

--
-- Name: usagers_magasin_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_magasin_id_seq OWNED BY omda_app.usagers_magasin.id;


--
-- Name: usagers_media; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_media (
    id integer NOT NULL,
    proprietaire_nom character varying(255),
    proprietaire_adresse character varying(255),
    proprietaire_tel character varying(50),
    proprietaire_cin character varying(100),
    proprietaire_cin_delivree date,
    proprietaire_cin_lieu character varying(255),
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_pouvoir_date date,
    representant_pouvoir_par character varying(255),
    representant_fonction character varying(255),
    denomination character varying(255),
    frequence character varying(50),
    canal character varying(50),
    siege character varying(255),
    telephone character varying(50),
    email character varying(255),
    nif character varying(100),
    stat character varying(100),
    taux numeric(15,2),
    couverture_capitale boolean DEFAULT false,
    couverture_chef_lieu_province boolean DEFAULT false,
    couverture_chef_lieu_region boolean DEFAULT false,
    couverture_district boolean DEFAULT false,
    horaires_jusqua12 boolean DEFAULT false,
    horaires_13a24 boolean DEFAULT false,
    has_regions boolean DEFAULT false,
    regions_detail jsonb,
    type_paiement character varying(50) DEFAULT 'mensuel'::character varying,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    region character varying(100),
    confirmation_nom character varying(255),
    date_signature date,
    lieu_signature character varying(255),
    uniter integer DEFAULT 1,
    numero_dossier_utilisateur character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_media OWNER TO omda_user;

--
-- Name: usagers_media_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_media_id_seq OWNER TO omda_user;

--
-- Name: usagers_media_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_media_id_seq OWNED BY omda_app.usagers_media.id;


--
-- Name: usagers_nightclub; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_nightclub (
    id integer NOT NULL,
    demandeur character varying(255),
    denomination character varying(255),
    adresse_siege character varying(255),
    nif_stat character varying(100),
    telephone character varying(50),
    email character varying(255),
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    jauge_max integer DEFAULT 0,
    horaires character varying(255),
    moyens_communication jsonb,
    total character varying(50),
    a_compter_du date,
    echeance date,
    type_paiement character varying(50) DEFAULT 'mensuel'::character varying,
    montant_mensuel numeric(15,2) DEFAULT 0,
    frais_dossier numeric(15,2) DEFAULT 0,
    region character varying(100),
    confirmation_nom character varying(255),
    date_signature date,
    lieu_signature character varying(255),
    uniter integer DEFAULT 1,
    numero_dossier_utilisateur character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_nightclub OWNER TO omda_user;

--
-- Name: usagers_nightclub_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_nightclub_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_nightclub_id_seq OWNER TO omda_user;

--
-- Name: usagers_nightclub_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_nightclub_id_seq OWNED BY omda_app.usagers_nightclub.id;


--
-- Name: usagers_occasionnel; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_occasionnel (
    id integer NOT NULL,
    demandeur character varying(255),
    denomination character varying(255),
    adresse_siege character varying(255),
    nif_stat character varying(100),
    telephone character varying(50),
    email character varying(255),
    representant_nom character varying(255),
    representant_adresse character varying(255),
    representant_tel character varying(50),
    representant_cin character varying(100),
    representant_cin_delivree date,
    representant_cin_lieu character varying(255),
    representant_fonction character varying(255),
    organisateurs character varying(255),
    representant_par character varying(255),
    genre_manifestation character varying(255),
    artistes character varying(255),
    date_evenement date,
    lieu_evenement character varying(255),
    adresse character varying(255),
    domicile character varying(255),
    confirmation_nom character varying(255),
    date_signature date,
    lieu_ajout character varying(255),
    frais_dossier numeric(15,2) DEFAULT 0,
    montant numeric(15,2) DEFAULT 0,
    montant_retard numeric(15,2) DEFAULT 0,
    is_retard boolean DEFAULT false,
    soit_total numeric(15,2) DEFAULT 0,
    date_ajout date,
    nom_evenement character varying(255),
    numero_dossier_global character varying(50),
    numero_dossier_utilisateur character varying(50),
    region character varying(100),
    uniter integer DEFAULT 1,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_occasionnel OWNER TO omda_user;

--
-- Name: usagers_occasionnel_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_occasionnel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_occasionnel_id_seq OWNER TO omda_user;

--
-- Name: usagers_occasionnel_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_occasionnel_id_seq OWNED BY omda_app.usagers_occasionnel.id;


--
-- Name: usagers_vus; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.usagers_vus (
    id integer NOT NULL,
    usager_id integer NOT NULL,
    usager_type character varying(50) NOT NULL,
    vu_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE omda_app.usagers_vus OWNER TO omda_user;

--
-- Name: usagers_vus_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.usagers_vus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.usagers_vus_id_seq OWNER TO omda_user;

--
-- Name: usagers_vus_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.usagers_vus_id_seq OWNED BY omda_app.usagers_vus.id;


--
-- Name: utilisateurs; Type: TABLE; Schema: omda_app; Owner: omda_user
--

CREATE TABLE omda_app.utilisateurs (
    id integer NOT NULL,
    nom character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying,
    statut character varying(20) DEFAULT 'actif'::character varying,
    prefix character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion timestamp without time zone
);


ALTER TABLE omda_app.utilisateurs OWNER TO omda_user;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE; Schema: omda_app; Owner: omda_user
--

CREATE SEQUENCE omda_app.utilisateurs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE omda_app.utilisateurs_id_seq OWNER TO omda_user;

--
-- Name: utilisateurs_id_seq; Type: SEQUENCE OWNED BY; Schema: omda_app; Owner: omda_user
--

ALTER SEQUENCE omda_app.utilisateurs_id_seq OWNED BY omda_app.utilisateurs.id;


--
-- Name: activites id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.activites ALTER COLUMN id SET DEFAULT nextval('omda_app.activites_id_seq'::regclass);


--
-- Name: artistes id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.artistes ALTER COLUMN id SET DEFAULT nextval('omda_app.artistes_id_seq'::regclass);


--
-- Name: backup_annuel id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_annuel ALTER COLUMN id SET DEFAULT nextval('omda_app.backup_annuel_id_seq'::regclass);


--
-- Name: backup_historique id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_historique ALTER COLUMN id SET DEFAULT nextval('omda_app.backup_historique_id_seq'::regclass);


--
-- Name: compteurs_dossiers_utilisateurs id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.compteurs_dossiers_utilisateurs ALTER COLUMN id SET DEFAULT nextval('omda_app.compteurs_dossiers_utilisateurs_id_seq'::regclass);


--
-- Name: delete_confirmations id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_confirmations ALTER COLUMN id SET DEFAULT nextval('omda_app.delete_confirmations_id_seq'::regclass);


--
-- Name: delete_history id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_history ALTER COLUMN id SET DEFAULT nextval('omda_app.delete_history_id_seq'::regclass);


--
-- Name: delete_requests id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_requests ALTER COLUMN id SET DEFAULT nextval('omda_app.delete_requests_id_seq'::regclass);


--
-- Name: event_artistes id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.event_artistes ALTER COLUMN id SET DEFAULT nextval('omda_app.event_artistes_id_seq'::regclass);


--
-- Name: facture_usager id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.facture_usager ALTER COLUMN id SET DEFAULT nextval('omda_app.facture_usager_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.notifications ALTER COLUMN id SET DEFAULT nextval('omda_app.notifications_id_seq'::regclass);


--
-- Name: paiements id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.paiements ALTER COLUMN id SET DEFAULT nextval('omda_app.paiements_id_seq'::regclass);


--
-- Name: parametres_utilisateur id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.parametres_utilisateur ALTER COLUMN id SET DEFAULT nextval('omda_app.parametres_utilisateur_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: omda_app; Owner: postgres
--

ALTER TABLE ONLY omda_app.regions ALTER COLUMN id SET DEFAULT nextval('omda_app.regions_id_seq'::regclass);


--
-- Name: usagers id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_id_seq'::regclass);


--
-- Name: usagers_bus id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_bus ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_bus_id_seq'::regclass);


--
-- Name: usagers_hotel id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_hotel ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_hotel_id_seq'::regclass);


--
-- Name: usagers_magasin id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_magasin ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_magasin_id_seq'::regclass);


--
-- Name: usagers_media id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_media ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_media_id_seq'::regclass);


--
-- Name: usagers_nightclub id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_nightclub ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_nightclub_id_seq'::regclass);


--
-- Name: usagers_occasionnel id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_occasionnel ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_occasionnel_id_seq'::regclass);


--
-- Name: usagers_vus id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_vus ALTER COLUMN id SET DEFAULT nextval('omda_app.usagers_vus_id_seq'::regclass);


--
-- Name: utilisateurs id; Type: DEFAULT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.utilisateurs ALTER COLUMN id SET DEFAULT nextval('omda_app.utilisateurs_id_seq'::regclass);


--
-- Data for Name: activites; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.activites (id, action, details, user_id, created_by, created_at) FROM stdin;
1	Ajout utilisateur	Ajout de l'utilisateur ANDRIATSITOAINA Herimbola (user)	1	\N	2026-08-19 14:06:51.7676
2	Modification statut	activer de FITAHIANTSOA Nemenjanahary	1	\N	2026-08-20 14:02:10.345083
3	Modification utilisateur	Modification de RAMAHEFASOA Larisa 	1	\N	2026-08-25 08:27:05.233719
4	Ajout utilisateur	Ajout de RAMANABOHITRA	1	\N	2026-08-25 08:30:10.330951
5	Suppression utilisateur	Suppression de RAMAHEFASOA Larisa 	1	\N	2026-08-25 08:30:39.671426
6	Suppression utilisateur	Suppression de DAF	1	\N	2026-08-27 09:14:44.862156
7	Modification statut	activer de RAKOTOTSARAFARA Jean Michel	1	\N	2026-08-31 17:53:35.381493
8	Modification statut	activer de bera	1	\N	2026-09-01 10:06:07.536968
9	Modification utilisateur	Modification de Super Admin	1	\N	2026-09-01 10:06:42.705024
10	Modification utilisateur	Modification de Admin	1	\N	2026-09-01 10:07:22.69735
\.


--
-- Data for Name: artistes; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.artistes (id, nom, prenom, nationalite, role, biographie, created_by, created_at) FROM stdin;
1	Ny Ainga		\N	Artiste principal	\N	\N	2026-08-20 12:11:58.427293
2	Raouto		\N	Artiste principal	\N	\N	2026-08-20 14:18:51.805852
3	benja		\N	Artiste principal	\N	\N	2026-08-20 14:21:59.10222
4	Samoela		\N	Artiste principal	\N	\N	2026-08-21 08:29:56.904908
5	Mahaleo		\N	Artiste principal	\N	\N	2026-08-21 10:09:03.012797
6	Johane		\N	Artiste principal	\N	\N	2026-08-21 11:25:24.990294
7	Mialy		\N	Chanteurs 	\N	\N	2026-08-22 09:19:50.405525
8	I-zit		\N	Artiste principal	\N	\N	2026-08-23 12:44:14.77919
9	Marion		\N	Chanteurs	\N	\N	2026-08-23 12:44:14.842241
10	Zay		\N	Artiste principal	\N	\N	2026-08-23 13:13:29.329371
11	Nat tex		\N	Chanteurs	\N	\N	2026-08-23 13:13:29.340666
12	Agrad		\N	Artiste principal	\N	\N	2026-08-23 13:19:53.41758
13	i		\N	Artiste principal	\N	\N	2026-08-23 13:42:13.716847
14	Reko		\N	Artiste principal	\N	\N	2026-08-23 14:22:38.822148
15	Mage 4		\N	Artiste principal	\N	\N	2026-08-24 06:44:46.876662
16	Ambondrona		\N	Artiste principal	\N	\N	2026-08-24 07:18:16.139216
17	Nael		\N	Artiste principal	\N	\N	2026-08-24 11:35:05.729627
18	Samih		\N	Chanteurs	\N	\N	2026-08-24 11:35:05.764972
19	f		\N	Artiste principal	\N	\N	2026-08-24 12:27:42.56829
20	Olombelo Ricky		\N	Chanteurs	\N	\N	2026-08-24 13:26:13.153932
21	Rija RAMANANTOANINA		\N	Artiste principal	\N	\N	2026-08-25 03:07:14.028257
22	Tarika Johary		\N	Chanteurs	\N	\N	2026-08-25 03:07:14.073867
23	Tif tif		\N	Chanteurs	\N	\N	2026-08-25 07:04:52.024215
24	Zandry Jaz		\N	Musicien	\N	\N	2026-08-25 07:04:52.065938
25	Generation 2000		\N	Artiste principal	\N	\N	2026-08-25 08:16:59.734843
26	Odyai		\N	Chanteurs	\N	\N	2026-08-25 08:16:59.741662
27	THT		\N	Chanteurs	\N	\N	2026-08-25 08:16:59.747431
28	Manalazy Vita Bac		\N	Artiste principal	\N	\N	2026-08-25 08:57:15.19772
29	Wawa		\N	Chanteurs	\N	\N	2026-08-25 08:57:15.205711
30	Dadi Love		\N	Chanteurs	\N	\N	2026-08-25 08:57:15.208962
31	Samoele		\N	Artiste principal	\N	\N	2026-08-27 11:58:55.635058
32	Farakely		\N	Chanteurs	\N	\N	2026-08-31 18:07:54.383704
\.


--
-- Data for Name: backup_annuel; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.backup_annuel (id, annee, data, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: backup_config; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.backup_config (id, chemin_sauvegarde, defini_par, created_at, updated_at) FROM stdin;
1	\N	\N	2026-09-02 07:16:21.943152	2026-09-02 07:16:21.943152
\.


--
-- Data for Name: backup_historique; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.backup_historique (id, type_backup, nom_fichier, chemin_complet, taille_octets, statut, message, created_by, created_at) FROM stdin;
1	auto	omda_backup_auto.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	\N	2026-09-02 08:34:25.063157
2	manuel	omda_backup_manuel.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	7	2026-09-02 08:34:48.298814
3	manuel	omda_backup_manuel.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	7	2026-09-02 08:39:35.337357
4	manuel	omda_backup_manuel.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	7	2026-09-02 08:43:34.906548
5	auto	omda_backup_auto.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	\N	2026-09-02 08:43:43.548223
6	manuel	omda_backup_manuel.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	7	2026-09-02 08:53:57.107731
7	manuel	omda_backup_manuel.sql		0	echec	'pg_dump' n'est pas reconnu en tant que commande interne\r\nou externe, un programme ex�cutable ou un fichier de commandes.\r\n	7	2026-09-02 08:54:04.454915
8	manuel	omda_backup_manuel.sql	E:\\3ans ISSIG\\OMDA\\AZ projet\\10-OMDA_electron_run - pg\\src\\server\\backups\\omda_backup_manuel.sql	226449	succes	\N	7	2026-09-02 08:56:23.831967
9	auto	omda_backup_auto.sql	E:\\3ans ISSIG\\OMDA\\AZ projet\\10-OMDA_electron_run - pg\\src\\server\\backups\\omda_backup_auto.sql	226632	succes	\N	\N	2026-09-02 08:57:01.736697
\.


--
-- Data for Name: compteurs_dossiers_utilisateurs; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.compteurs_dossiers_utilisateurs (id, utilisateur_id, annee, compteur, type_usager, created_at, updated_at) FROM stdin;
1	1	2026	0	Hôtel	2026-08-19 14:00:23.834788	2026-08-19 14:00:23.834788
2	1	2026	0	Grand Surface	2026-08-19 14:00:23.859956	2026-08-19 14:00:23.859956
3	1	2026	0	Télé/Radio	2026-08-19 14:00:23.862476	2026-08-19 14:00:23.862476
4	1	2026	0	Bus	2026-08-19 14:00:23.865782	2026-08-19 14:00:23.865782
5	1	2026	0	Night club	2026-08-19 14:00:23.868607	2026-08-19 14:00:23.868607
6	1	2026	0	OCC	2026-08-19 14:00:23.871487	2026-08-19 14:00:23.871487
7	2	2026	0	Hôtel	2026-08-19 14:00:23.87965	2026-08-19 14:00:23.87965
8	2	2026	0	Grand Surface	2026-08-19 14:00:23.882312	2026-08-19 14:00:23.882312
9	2	2026	0	Télé/Radio	2026-08-19 14:00:23.884542	2026-08-19 14:00:23.884542
10	2	2026	0	Bus	2026-08-19 14:00:23.887057	2026-08-19 14:00:23.887057
11	2	2026	0	Night club	2026-08-19 14:00:23.888965	2026-08-19 14:00:23.888965
12	2	2026	0	OCC	2026-08-19 14:00:23.891591	2026-08-19 14:00:23.891591
19	4	2026	0	Hôtel	2026-08-19 14:00:23.92013	2026-08-19 14:00:23.92013
20	4	2026	0	Grand Surface	2026-08-19 14:00:23.922966	2026-08-19 14:00:23.922966
21	4	2026	0	Télé/Radio	2026-08-19 14:00:23.925126	2026-08-19 14:00:23.925126
22	4	2026	0	Bus	2026-08-19 14:00:23.927067	2026-08-19 14:00:23.927067
23	4	2026	0	Night club	2026-08-19 14:00:23.928999	2026-08-19 14:00:23.928999
24	4	2026	0	OCC	2026-08-19 14:00:23.931419	2026-08-19 14:00:23.931419
25	5	2026	0	Hôtel	2026-08-19 14:00:23.939546	2026-08-19 14:00:23.939546
26	5	2026	0	Grand Surface	2026-08-19 14:00:23.943099	2026-08-19 14:00:23.943099
27	5	2026	0	Télé/Radio	2026-08-19 14:00:23.946222	2026-08-19 14:00:23.946222
28	5	2026	0	Bus	2026-08-19 14:00:23.948631	2026-08-19 14:00:23.948631
29	5	2026	0	Night club	2026-08-19 14:00:23.950681	2026-08-19 14:00:23.950681
30	5	2026	0	OCC	2026-08-19 14:00:23.953806	2026-08-19 14:00:23.953806
31	6	2026	0	Hôtel	2026-08-19 14:00:23.960848	2026-08-19 14:00:23.960848
32	6	2026	0	Grand Surface	2026-08-19 14:00:23.963537	2026-08-19 14:00:23.963537
33	6	2026	0	Télé/Radio	2026-08-19 14:00:23.966174	2026-08-19 14:00:23.966174
34	6	2026	0	Bus	2026-08-19 14:00:23.968554	2026-08-19 14:00:23.968554
35	6	2026	0	Night club	2026-08-19 14:00:23.970358	2026-08-19 14:00:23.970358
36	6	2026	0	OCC	2026-08-19 14:00:23.972049	2026-08-19 14:00:23.972049
61	11	2026	0	Hôtel	2026-08-27 12:12:35.520159	2026-08-27 12:12:35.520159
39	7	2026	11	Télé/Radio	2026-08-19 14:06:51.743773	2026-09-01 11:44:07.046239
62	11	2026	0	Grand Surface	2026-08-27 12:12:35.585043	2026-08-27 12:12:35.585043
63	11	2026	0	Télé/Radio	2026-08-27 12:12:35.587451	2026-08-27 12:12:35.587451
64	11	2026	0	Bus	2026-08-27 12:12:35.589318	2026-08-27 12:12:35.589318
50	9	2026	0	Grand Surface	2026-08-25 08:30:10.302692	2026-08-25 08:30:10.302692
51	9	2026	0	Télé/Radio	2026-08-25 08:30:10.304391	2026-08-25 08:30:10.304391
53	9	2026	0	Bus	2026-08-25 08:30:10.308034	2026-08-25 08:30:10.308034
65	11	2026	0	Night club	2026-08-27 12:12:35.590946	2026-08-27 12:12:35.590946
66	11	2026	0	OCC	2026-08-27 12:12:35.59286	2026-08-27 12:12:35.59286
38	7	2026	22	Grand Surface	2026-08-19 14:06:51.741537	2026-09-01 12:15:40.248542
42	7	2026	15	Night club	2026-08-19 14:06:51.751029	2026-09-01 12:21:35.248926
37	7	2026	49	Hôtel	2026-08-19 14:06:51.699898	2026-09-01 16:05:20.131021
43	8	2026	30	Hôtel	2026-08-20 14:01:55.711047	2026-09-01 16:07:24.982015
48	8	2026	11	Night club	2026-08-20 14:01:55.78853	2026-09-01 16:10:19.950434
52	9	2026	2	OCC	2026-08-25 08:30:10.306312	2026-08-25 11:27:01.293065
54	9	2026	1	Night club	2026-08-25 08:30:10.309631	2026-08-25 11:28:20.132023
45	8	2026	9	Télé/Radio	2026-08-20 14:01:55.763993	2026-09-01 09:03:45.977791
49	9	2026	15	Hôtel	2026-08-25 08:30:10.255102	2026-08-25 12:07:08.76943
67	12	2026	0	Hôtel	2026-08-31 17:52:51.94689	2026-08-31 17:52:51.94689
68	12	2026	0	Grand Surface	2026-08-31 17:52:52.089677	2026-08-31 17:52:52.089677
69	12	2026	0	Télé/Radio	2026-08-31 17:52:52.093097	2026-08-31 17:52:52.093097
70	12	2026	0	OCC	2026-08-31 17:52:52.096066	2026-08-31 17:52:52.096066
71	12	2026	0	Bus	2026-08-31 17:52:52.098873	2026-08-31 17:52:52.098873
72	12	2026	0	Night club	2026-08-31 17:52:52.101714	2026-08-31 17:52:52.101714
47	8	2026	10	Bus	2026-08-20 14:01:55.785726	2026-09-01 09:06:50.84308
40	7	2026	34	OCC	2026-08-19 14:06:51.74675	2026-08-26 13:44:44.28769
41	7	2026	9	Bus	2026-08-19 14:06:51.748731	2026-08-26 13:45:47.125246
46	8	2026	14	OCC	2026-08-20 14:01:55.783323	2026-09-01 09:37:45.8438
44	8	2026	12	Grand Surface	2026-08-20 14:01:55.761552	2026-09-01 09:57:46.444184
73	13	2026	0	Hôtel	2026-09-01 10:05:51.321692	2026-09-01 10:05:51.321692
74	13	2026	0	Grand Surface	2026-09-01 10:05:51.414283	2026-09-01 10:05:51.414283
75	13	2026	0	Télé/Radio	2026-09-01 10:05:51.453128	2026-09-01 10:05:51.453128
76	13	2026	0	OCC	2026-09-01 10:05:51.455373	2026-09-01 10:05:51.455373
77	13	2026	0	Bus	2026-09-01 10:05:51.510864	2026-09-01 10:05:51.510864
78	13	2026	0	Night club	2026-09-01 10:05:51.534979	2026-09-01 10:05:51.534979
\.


--
-- Data for Name: delete_confirmations; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.delete_confirmations (id, request_id, user_id, user_name, created_at) FROM stdin;
\.


--
-- Data for Name: delete_history; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.delete_history (id, usager_nom, usager_type, deleted_by, deleted_by_role, user_id, created_by, details, deleted_at) FROM stdin;
1	r	Hôtel	Super Admin	admin	1	\N	{"region": "Manjakandriana", "uniter": 1, "demandeur": "r", "telephone": "r"}	2026-08-20 12:59:18.087135
\.


--
-- Data for Name: delete_requests; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.delete_requests (id, usager_id, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_artistes; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.event_artistes (id, event_id, artiste_id, created_by, created_at) FROM stdin;
1	1	1	\N	2026-08-20 12:11:58.466306
2	2	1	\N	2026-08-20 14:16:11.665175
3	3	2	\N	2026-08-20 14:18:51.847564
4	4	3	\N	2026-08-20 14:21:59.104198
5	5	4	\N	2026-08-21 08:29:56.92668
6	6	5	\N	2026-08-21 10:09:03.047239
7	7	6	\N	2026-08-21 11:25:25.020958
8	8	1	\N	2026-08-22 09:19:50.382676
9	8	7	\N	2026-08-22 09:19:50.429477
10	9	2	\N	2026-08-22 10:10:21.302081
11	10	1	\N	2026-08-23 12:15:49.759701
12	11	8	\N	2026-08-23 12:44:14.835021
13	11	9	\N	2026-08-23 12:44:14.844065
14	13	10	\N	2026-08-23 13:13:29.331477
15	13	11	\N	2026-08-23 13:13:29.341946
16	14	12	\N	2026-08-23 13:19:53.420185
17	16	13	\N	2026-08-23 13:42:13.719229
18	17	1	\N	2026-08-23 14:12:23.433004
19	18	14	\N	2026-08-23 14:22:38.879314
20	19	15	\N	2026-08-24 06:44:46.917562
21	20	16	\N	2026-08-24 07:18:16.141682
22	21	2	\N	2026-08-24 07:45:33.664884
23	22	1	\N	2026-08-24 07:59:43.495905
24	23	16	\N	2026-08-24 08:27:45.119012
25	24	17	\N	2026-08-24 11:35:05.757388
26	24	18	\N	2026-08-24 11:35:05.767388
27	25	1	\N	2026-08-24 11:58:49.794646
28	27	19	\N	2026-08-24 12:27:42.954006
29	29	5	\N	2026-08-24 13:26:13.146798
30	29	20	\N	2026-08-24 13:26:13.157668
31	30	21	\N	2026-08-25 03:07:14.033902
32	30	22	\N	2026-08-25 03:07:14.076887
33	31	1	\N	2026-08-25 07:04:52.016506
34	31	23	\N	2026-08-25 07:04:52.058504
35	31	5	\N	2026-08-25 07:04:52.062463
36	31	24	\N	2026-08-25 07:04:52.067991
37	32	25	\N	2026-08-25 08:16:59.737576
38	32	26	\N	2026-08-25 08:16:59.742815
39	32	9	\N	2026-08-25 08:16:59.745159
40	32	27	\N	2026-08-25 08:16:59.748552
41	34	28	\N	2026-08-25 08:57:15.199803
42	34	29	\N	2026-08-25 08:57:15.206959
43	34	30	\N	2026-08-25 08:57:15.20988
44	35	4	\N	2026-08-25 09:06:50.954569
45	35	16	\N	2026-08-25 09:06:50.958239
47	6	31	\N	2026-08-27 11:58:55.675217
48	8	21	\N	2026-08-31 18:07:54.378619
49	8	32	\N	2026-08-31 18:07:54.386238
50	9	1	\N	2026-09-01 08:33:42.623142
\.


--
-- Data for Name: facture_usager; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.facture_usager (id, ref_omda, num_facture, num_facture_type, ref_client_type, ref_usager, type_facture, region_usager, date_ajout, denomination, demandeur, telephone, email, adresse, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, activite, etoiles, ravinala, nombre_magasins, nombre_vehicules, lignes, type_bus, trajet, horaires, zones_desservies, jauge_max, frequence, canal, siege, nif, stat, taux, organisateurs, representant_par, genre_manifestation, artistes, date_evenement, lieu_evenement, domicile, lieu_ajout, date_signature, confirmation_nom, personne_recu, quittance, quittance_validee, moyens_communication, a_compter_du, echeance, montant_mensuel, frais_dossier, montant_retard, is_retard, soit_total, uniter, mois_facture, annee_facture, mois_groupes, type_groupe, suffixe, description_personnalisee, annee_paiement, mois_groupes_json, numero_dossier_utilisateur, numero_dossier_global, daf_nom, statut, created_by, created_at, updated_at) FROM stdin;
1	1	0001	A	HTL	92	Redevances	Manjakandriana	2026-09-01	ANDRIATSITOAINA	Hr	0345007145	hrandriatsitoaina@gmail.com	Antsahavola	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration		t	0	0						0						0.00					\N			Antananarivo	\N	Hr	BENJA	99	f	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "300", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	\N	\N	0.00	500.00	0.00	f	500.00	1	9	2026	\N	A	\N	\N	\N	\N	AND 48/3/2026		\N	validee	7	2026-09-01 16:04:10.094511	2026-09-01 16:04:42.902295
2	2	0002	A	HTL	93	Redevances	Manjakandriana	2026-09-01	ANDRIATSITOAINA	Hr	0345007145	hrandriatsitoaina@gmail.com	Antsahavola	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	2	t	0	0						0						0.00					\N			Antananarivo	\N	Hr	ANDRIATSITOAINA Herimbola	100	f	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "2121", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	\N	\N	0.00	3121.00	0.00	f	3121.00	1	9	2026	\N	A	\N	\N	\N	\N	AND 49/3/2026		\N	validee	7	2026-09-01 16:05:26.180297	2026-09-01 16:05:26.180297
3	3	0003	A	HTL	94	Redevances	Mahajanga	2026-09-01	ANDRIATSITOAINA	Hr	0345007145	hrandriatsitoaina@gmail.com	Antsahavola	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	4	f	0	0						0						0.00					\N			Antananarivo	\N	Hr	FITAHIANTSOA Nemenjanahary	101	f	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "333", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	\N	\N	0.00	13333.00	0.00	f	13333.00	1	9	2026	\N	A	\N	\N	\N	\N	FIT 30/3/2026		\N	validee	8	2026-09-01 16:07:31.173992	2026-09-01 16:07:31.173992
4	4	0004	A	NGT	27	Redevances	Toliara	2026-09-01	ANDRIATSITOAINA	Hr	0345007145	hrandriatsitoaina@gmail.com	Antsahavola	somacau	Antsahavola	0345007145	123	2026-10-05T00:00:00.000+01:00	D	D			f	0	0				20		1						0.00					\N			Antananarivo	\N	Hr	Benjamina	102	f	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	\N	\N	0.00	500.00	0.00	f	500.00	1	9	2026	\N	A	\N	\N	\N	\N	FIT 11/3/2026		\N	validee	8	2026-09-01 16:10:25.471725	2026-09-01 16:16:48.689157
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.notifications (id, message, type, usager_id, read, created_by, created_at) FROM stdin;
1	Nouveau Hôtel ajouté: Kintan'ny Analamanga	new	1	f	\N	2026-08-20 12:03:39.887277
2	Nouveau OCC ajouté: Concert	new	1	f	\N	2026-08-20 12:11:58.516023
4	Nouveau Hôtel ajouté: r	new	3	f	\N	2026-08-20 13:00:41.615792
5	Nouveau Hôtel ajouté: lova Mena 	new	4	f	\N	2026-08-20 13:31:07.862597
6	Nouveau Hôtel ajouté: a	new	5	f	\N	2026-08-20 13:41:13.690681
7	Nouveau Grand Surface ajouté: Ilay Nosy	new	1	f	\N	2026-08-20 14:07:45.234412
8	Nouveau OCC ajouté: Spectacle	new	2	f	\N	2026-08-20 14:16:11.669149
9	Nouveau OCC ajouté: Spectacle 	new	3	f	\N	2026-08-20 14:18:51.852953
10	Nouveau Night club ajouté: manatenasoa 	new	1	f	\N	2026-08-20 14:20:40.071701
11	Nouveau OCC ajouté: concert	new	4	f	\N	2026-08-20 14:21:59.107462
12	Nouveau Bus ajouté: 1235	new	1	f	\N	2026-08-20 14:30:12.473795
13	Nouveau OCC ajouté: Spectacle 	new	5	f	\N	2026-08-21 08:29:56.970654
14	Nouveau OCC ajouté: Concert	new	6	f	\N	2026-08-21 10:09:03.065023
15	Nouveau OCC ajouté: Spectacle 	new	7	f	\N	2026-08-21 11:25:25.034727
16	Nouveau Hôtel ajouté: Lova ety atany 	new	6	f	\N	2026-08-21 12:28:01.688023
17	Nouveau Hôtel ajouté: Ilay Kintana 33	new	7	f	\N	2026-08-21 12:40:20.192712
18	Nouveau Hôtel ajouté: Hotelin'ny Tanora	new	8	f	\N	2026-08-21 13:35:09.531904
19	Nouveau Grand Surface ajouté: ANAKAO Log	new	2	f	\N	2026-08-21 13:48:36.251205
20	Nouveau Télé/Radio ajouté: Real TV	new	1	f	\N	2026-08-21 14:06:59.660292
21	Nouveau Télé/Radio ajouté: TVM 	new	2	f	\N	2026-08-21 14:33:56.789226
22	Nouveau Télé/Radio ajouté: Viva Radia	new	3	f	\N	2026-08-21 14:44:30.233324
23	Nouveau Bus ajouté: Tselatra	new	2	f	\N	2026-08-22 07:21:49.649512
24	Nouveau Bus ajouté: Koloina 	new	1	f	\N	2026-08-22 08:02:29.494239
25	Nouveau Bus ajouté: Kintana Ambohimanambola 	new	2	f	\N	2026-08-22 08:37:48.393643
26	Nouveau Night club ajouté: lA ROUTENDE 	new	2	f	\N	2026-08-22 08:55:40.446141
27	Nouveau Hôtel ajouté: Soamanatombo	new	9	f	\N	2026-08-22 09:07:01.502566
28	Nouveau OCC ajouté: Festival	new	8	f	\N	2026-08-22 09:19:50.430931
29	Nouveau Hôtel ajouté: Kintan'ny Amoromania	new	10	f	\N	2026-08-22 09:50:45.275909
30	Nouveau Grand Surface ajouté: Ilay Nosy	new	3	f	\N	2026-08-22 09:57:08.998337
31	Nouveau Télé/Radio ajouté: RECORD TV/FM	new	4	f	\N	2026-08-22 10:01:42.818757
32	Nouveau OCC ajouté: Festival	new	9	f	\N	2026-08-22 10:10:21.305258
33	Nouveau Bus ajouté: 135 Mazda	new	3	f	\N	2026-08-22 10:16:15.838914
34	Nouveau Night club ajouté: ALINA Maizina	new	3	f	\N	2026-08-22 10:18:27.963111
35	Nouveau Night club ajouté: Alin'ny Tanora	new	4	f	\N	2026-08-22 11:35:34.453833
36	Nouveau Hôtel ajouté: Ze Maika	new	11	f	\N	2026-08-22 14:21:09.975917
37	Nouveau Grand Surface ajouté: Super Maky	new	4	f	\N	2026-08-23 06:51:05.375265
38	Nouveau Grand Surface ajouté: shop liantsoa 	new	5	f	\N	2026-08-23 07:01:54.454492
39	Nouveau OCC ajouté: Spectacle 	new	10	f	\N	2026-08-23 12:15:49.800368
40	Nouveau OCC ajouté: Concert 	new	11	f	\N	2026-08-23 12:44:14.846454
41	Nouveau Télé/Radio ajouté: Ma tv 	new	5	f	\N	2026-08-23 12:52:28.166906
42	Nouveau OCC ajouté: r	new	12	f	\N	2026-08-23 13:02:33.921124
43	Nouveau Bus ajouté: to	new	4	f	\N	2026-08-23 13:09:15.908977
44	Nouveau OCC ajouté: Spectacle 	new	13	f	\N	2026-08-23 13:13:29.343481
45	Nouveau OCC ajouté: Concert	new	14	f	\N	2026-08-23 13:19:53.423669
46	Nouveau OCC ajouté: o	new	15	f	\N	2026-08-23 13:36:46.600052
47	Nouveau OCC ajouté: i	new	16	f	\N	2026-08-23 13:42:13.727035
48	Nouveau OCC ajouté: Spectacle 	new	17	f	\N	2026-08-23 14:12:23.455164
49	Nouveau OCC ajouté: Spectacle 	new	18	f	\N	2026-08-23 14:22:38.884043
50	Nouveau OCC ajouté: Spectacle	new	19	f	\N	2026-08-24 06:44:46.982329
51	Nouveau OCC ajouté: Spectacle 	new	20	f	\N	2026-08-24 07:18:16.145951
52	Nouveau OCC ajouté: Festival	new	21	f	\N	2026-08-24 07:45:33.693335
53	Nouveau OCC ajouté: Concert 	new	22	f	\N	2026-08-24 07:59:43.499103
54	Nouveau OCC ajouté: Spectacle 	new	23	f	\N	2026-08-24 08:27:45.123045
55	Nouveau OCC ajouté: Spectacle 	new	24	f	\N	2026-08-24 11:35:05.800709
56	Nouveau OCC ajouté: Spectacle 	new	25	f	\N	2026-08-24 11:58:49.801421
57	Nouveau OCC ajouté: g	new	26	f	\N	2026-08-24 12:01:17.678637
58	Nouveau Hôtel ajouté: Tsangatsanga Hotel	new	12	f	\N	2026-08-24 12:25:46.131303
59	Nouveau OCC ajouté: f	new	27	f	\N	2026-08-24 12:27:43.019558
60	Nouveau Hôtel ajouté: d	new	13	f	\N	2026-08-24 12:32:45.203231
61	Nouveau Hôtel ajouté: c	new	14	f	\N	2026-08-24 12:43:51.371716
62	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	15	f	\N	2026-08-24 12:51:54.54827
63	Nouveau Hôtel ajouté: f	new	16	f	\N	2026-08-24 12:56:06.980716
64	Nouveau OCC ajouté: d	new	28	f	\N	2026-08-24 12:58:19.660236
65	Nouveau Hôtel ajouté: d	new	17	f	\N	2026-08-24 13:04:08.082028
66	Nouveau Night club ajouté: d	new	5	f	\N	2026-08-24 13:05:49.339821
67	Nouveau OCC ajouté: Spectacle 	new	29	f	\N	2026-08-24 13:26:13.189669
68	Nouveau OCC ajouté: Concert	new	30	f	\N	2026-08-25 03:07:14.08169
69	Nouveau OCC ajouté: Spectacle 	new	31	f	\N	2026-08-25 07:04:52.070516
70	Nouveau OCC ajouté: Concert	new	32	f	\N	2026-08-25 08:16:59.749908
71	Nouveau OCC ajouté: r	new	33	f	\N	2026-08-25 08:25:12.243714
72	Nouveau OCC ajouté: Spectacle 	new	34	f	\N	2026-08-25 08:57:15.211067
73	Nouveau OCC ajouté: Spectacle 	new	35	f	\N	2026-08-25 09:06:50.9595
74	Nouveau Hôtel ajouté: Soa Felling Behintsy	new	18	f	\N	2026-08-25 09:40:33.714502
75	Nouveau Hôtel ajouté: r	new	19	f	\N	2026-08-25 10:00:08.972147
76	Nouveau OCC ajouté: U	new	36	f	\N	2026-08-25 10:02:01.230384
77	Nouveau Hôtel ajouté: d	new	20	f	\N	2026-08-25 11:15:27.643666
78	Nouveau Hôtel ajouté: F	new	21	f	\N	2026-08-25 11:20:11.047121
79	Nouveau Hôtel ajouté: d	new	22	f	\N	2026-08-25 11:24:05.262346
80	Nouveau OCC ajouté: d	new	37	f	\N	2026-08-25 11:27:01.383512
81	Nouveau Night club ajouté: f	new	6	f	\N	2026-08-25 11:28:20.137401
82	Nouveau Hôtel ajouté: d	new	23	f	\N	2026-08-25 11:31:33.709167
83	Nouveau Hôtel ajouté: d	new	24	f	\N	2026-08-25 11:34:54.823677
84	Nouveau Hôtel ajouté: d	new	25	f	\N	2026-08-25 11:39:06.637549
85	Nouveau Hôtel ajouté: d	new	26	f	\N	2026-08-25 11:40:53.246923
86	Nouveau Hôtel ajouté: f	new	27	f	\N	2026-08-25 11:44:32.061944
87	Nouveau Hôtel ajouté: f	new	28	f	\N	2026-08-25 11:51:33.762815
88	Nouveau Hôtel ajouté: d	new	29	f	\N	2026-08-25 11:52:44.296579
89	Nouveau Hôtel ajouté: R	new	30	f	\N	2026-08-25 12:00:57.732064
90	Nouveau Hôtel ajouté: X	new	31	f	\N	2026-08-25 12:02:23.000215
91	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	32	f	\N	2026-08-25 12:07:08.775766
92	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	33	f	\N	2026-08-25 12:13:53.288197
93	Nouveau OCC ajouté: f	new	38	f	\N	2026-08-25 12:18:05.02058
94	Nouveau Hôtel ajouté: g	new	34	f	\N	2026-08-25 12:26:21.00477
95	Nouveau Hôtel ajouté: t	new	35	f	\N	2026-08-25 12:27:40.171522
96	Nouveau Hôtel ajouté: g	new	36	f	\N	2026-08-25 12:28:53.305456
97	Nouveau Hôtel ajouté: r	new	37	f	\N	2026-08-25 12:30:00.702498
98	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	38	f	\N	2026-08-25 12:33:07.209604
99	Nouveau Hôtel ajouté: f	new	39	f	\N	2026-08-25 12:39:44.668675
100	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	40	f	\N	2026-08-25 12:46:20.928243
101	Nouveau Télé/Radio ajouté: Hr ANDRIATSITOAINA	new	6	f	\N	2026-08-26 07:00:28.802284
102	Nouveau Grand Surface ajouté: Super U	new	6	f	\N	2026-08-26 07:17:49.597229
103	Nouveau Hôtel ajouté: Z	new	41	f	\N	2026-08-26 07:19:58.473181
104	Nouveau Grand Surface ajouté: h	new	7	f	\N	2026-08-26 07:28:06.529037
105	Nouveau Grand Surface ajouté: RAFANOMEZANTSOA	new	8	f	\N	2026-08-26 07:38:42.120605
106	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	9	f	\N	2026-08-26 08:05:54.83319
107	Nouveau Hôtel ajouté: s	new	42	f	\N	2026-08-26 08:15:53.775712
108	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	10	f	\N	2026-08-26 08:23:32.459795
109	Nouveau Hôtel ajouté: f	new	43	f	\N	2026-08-26 09:25:17.340613
110	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	11	f	\N	2026-08-26 09:27:12.583082
111	Nouveau Télé/Radio ajouté: somacau	new	7	f	\N	2026-08-26 09:28:20.773838
112	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	12	f	\N	2026-08-26 09:34:14.068719
113	Nouveau Night club ajouté: ANDRIATSITOAINA	new	7	f	\N	2026-08-26 09:36:54.096411
114	Nouveau Télé/Radio ajouté: f	new	8	f	\N	2026-08-26 09:38:25.175914
115	Nouveau Bus ajouté: ANDRIATSITOAINA	new	5	f	\N	2026-08-26 09:40:07.598573
116	Nouveau Hôtel ajouté: f	new	44	f	\N	2026-08-26 09:49:06.193351
117	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	13	f	\N	2026-08-26 09:50:08.786264
118	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	45	f	\N	2026-08-26 09:53:23.348354
119	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	14	f	\N	2026-08-26 09:54:38.180774
120	Nouveau OCC ajouté: Nouvel usager	new	1	f	\N	2026-08-26 11:42:26.45477
121	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	46	f	\N	2026-08-26 11:44:07.398441
122	Nouveau Grand Surface ajouté: e	new	15	f	\N	2026-08-26 11:45:16.489931
123	Nouveau Night club ajouté: e	new	8	f	\N	2026-08-26 11:47:06.035141
124	Nouveau Hôtel ajouté: f	new	47	f	\N	2026-08-26 11:52:56.941925
125	Nouveau OCC ajouté: Nouvel usager	new	2	f	\N	2026-08-26 12:02:26.347077
126	Nouveau Télé/Radio ajouté: t	new	9	f	\N	2026-08-26 12:23:43.153976
127	Nouveau Télé/Radio ajouté: Hr ANDRIATSITOAINA	new	10	f	\N	2026-08-26 12:31:24.744414
128	Nouveau Bus ajouté: g	new	6	f	\N	2026-08-26 12:32:44.448684
129	Nouveau Hôtel ajouté: d	new	48	f	\N	2026-08-26 12:34:33.205942
130	Nouveau Grand Surface ajouté: d	new	16	f	\N	2026-08-26 12:37:10.900684
131	Nouveau Télé/Radio ajouté: Hr ANDRIATSITOAINA	new	11	f	\N	2026-08-26 12:39:39.713592
132	Nouveau Hôtel ajouté: f	new	49	f	\N	2026-08-26 12:42:53.821405
179	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	67	t	\N	2026-08-31 12:08:35.502455
178	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	66	t	\N	2026-08-31 10:11:55.080667
177	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	65	t	\N	2026-08-31 08:35:40.044934
176	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	64	t	\N	2026-08-29 13:21:08.98259
175	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	63	t	\N	2026-08-29 12:22:24.417376
174	Nouveau Télé/Radio ajouté: Sioka Vaovao Mahafaly	new	13	t	\N	2026-08-29 09:07:15.492524
173	Nouveau Hôtel ajouté: HAZOVATO	new	62	t	\N	2026-08-29 08:24:46.967773
172	Nouveau Hôtel ajouté: Hotelinstsika Fahazaza	new	61	t	\N	2026-08-28 14:23:52.552017
171	Nouveau Night club ajouté: ANDRIATSITOAINA	new	18	t	\N	2026-08-28 14:12:38.718086
170	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	25	t	\N	2026-08-28 14:10:26.242328
169	Nouveau Night club ajouté: Zanakin'ny Alina 	new	17	t	\N	2026-08-28 13:53:07.110251
168	Nouveau Night club ajouté: Alina Maizina (Mitapimasso)	new	16	t	\N	2026-08-28 13:47:16.015431
167	Nouveau OCC ajouté: Nouvel usager	new	7	t	\N	2026-08-28 13:34:30.962338
166	Nouveau Bus ajouté: Kofifivam	new	9	t	\N	2026-08-28 13:13:26.643877
164	Nouveau Grand Surface ajouté: Bazarin'ny Iarivo	new	23	t	\N	2026-08-28 12:04:04.169545
163	Nouveau Hôtel ajouté: KISOA Kely	new	60	t	\N	2026-08-28 11:10:55.239529
162	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	59	t	\N	2026-08-28 09:38:24.688645
161	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	58	t	\N	2026-08-28 09:35:20.371182
160	Nouveau Hôtel ajouté: RANTSANA Loharano	new	57	t	\N	2026-08-28 09:24:40.248888
159	Nouveau Hôtel ajouté: Zanaka Taisaka Log	new	56	t	\N	2026-08-28 08:58:28.886479
158	Nouveau Grand Surface ajouté: Tsenapokonolona Mamay	new	22	t	\N	2026-08-28 07:28:59.971376
157	Nouveau OCC ajouté: Nouvel usager	new	6	t	\N	2026-08-27 11:58:55.688264
156	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	21	t	\N	2026-08-27 11:32:35.087457
155	Nouveau Grand Surface ajouté: Tanindrazana 	new	20	t	\N	2026-08-27 09:12:30.449196
154	Nouveau Night club ajouté: KITOZA MASAKA	new	15	t	\N	2026-08-27 08:45:18.570206
153	Nouveau Night club ajouté: SALAZAN'TSOSETY	new	14	t	\N	2026-08-27 08:43:18.751973
152	Nouveau Hôtel ajouté: Hotely Sakafon'ny Saina 	new	55	t	\N	2026-08-27 08:25:11.423
151	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	54	t	\N	2026-08-26 14:17:18.142992
150	Nouveau Night club ajouté: ANDRIATSITOAINA	new	13	t	\N	2026-08-26 13:55:58.757194
149	Nouveau Night club ajouté: ANDRIATSITOAINA	new	12	t	\N	2026-08-26 13:54:22.272613
148	Nouveau Night club ajouté: ANDRIATSITOAINA	new	11	t	\N	2026-08-26 13:51:58.341673
147	Nouveau Night club ajouté: ANDRIATSITOAINA	new	10	t	\N	2026-08-26 13:50:57.038413
146	Nouveau Bus ajouté: ANDRIATSITOAINA	new	8	t	\N	2026-08-26 13:45:47.130967
145	Nouveau OCC ajouté: Nouvel usager	new	5	t	\N	2026-08-26 13:44:44.293301
144	Nouveau Télé/Radio ajouté: somacau	new	12	t	\N	2026-08-26 13:43:35.281213
143	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	19	t	\N	2026-08-26 13:42:15.230112
142	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	53	t	\N	2026-08-26 13:41:22.397302
141	Nouveau OCC ajouté: Nouvel usager	new	4	t	\N	2026-08-26 13:40:05.129169
139	Nouveau Hôtel ajouté: e	new	52	t	\N	2026-08-26 13:17:19.398376
138	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	51	t	\N	2026-08-26 13:01:42.943943
137	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	50	t	\N	2026-08-26 12:59:30.634555
136	Nouveau Grand Surface ajouté: r	new	17	t	\N	2026-08-26 12:56:59.963891
135	Nouveau Night club ajouté: ANDRIATSITOAINA	new	9	t	\N	2026-08-26 12:49:22.33834
134	Nouveau Bus ajouté: ANDRIATSITOAINA	new	7	t	\N	2026-08-26 12:47:21.449888
133	Nouveau OCC ajouté: Nouvel usager	new	3	t	\N	2026-08-26 12:44:39.913833
180	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	68	t	\N	2026-08-31 12:17:41.527016
182	Nouveau Night club ajouté: ANDRIATSITOAINA	new	19	t	\N	2026-08-31 12:30:56.802672
181	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	26	t	\N	2026-08-31 12:22:19.228128
165	Nouveau Grand Surface ajouté: BEHORIRIKA	new	24	t	\N	2026-08-28 12:38:30.76207
140	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	18	t	\N	2026-08-26 13:18:46.320227
183	Nouveau OCC ajouté: Nouvel usager	new	8	f	\N	2026-08-31 18:07:54.38788
184	Nouveau Hôtel ajouté: Hotely Tsis Kisoa 	new	69	f	\N	2026-08-31 18:21:03.25555
185	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	70	f	\N	2026-08-31 18:22:33.416549
186	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	71	f	\N	2026-09-01 06:53:03.406127
187	Nouveau Bus ajouté: ANDRIATSITOAINA	new	10	f	\N	2026-09-01 06:59:56.282296
188	Nouveau Bus ajouté: ANDRIATSITOAINA	new	11	f	\N	2026-09-01 07:01:31.773505
189	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	72	f	\N	2026-09-01 07:07:26.67332
190	Nouveau Bus ajouté: ANDRIATSITOAINA	new	12	f	\N	2026-09-01 07:14:15.985683
191	Nouveau Bus ajouté: ANDRIATSITOAINA	new	13	f	\N	2026-09-01 07:20:04.69679
192	Nouveau Bus ajouté: ANDRIATSITOAINA	new	14	f	\N	2026-09-01 07:23:55.073929
193	Nouveau Bus ajouté: ANDRIATSITOAINA	new	15	f	\N	2026-09-01 07:37:38.039121
194	Nouveau Bus ajouté: ANDRIATSITOAINA	new	16	f	\N	2026-09-01 07:40:00.49752
195	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	27	f	\N	2026-09-01 07:42:15.801762
196	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	28	f	\N	2026-09-01 07:46:22.703658
197	Nouveau Télé/Radio ajouté: somacau	new	14	f	\N	2026-09-01 07:52:23.349442
198	Nouveau Télé/Radio ajouté: somacau	new	15	f	\N	2026-09-01 07:53:40.743007
199	Nouveau Télé/Radio ajouté: somacau	new	16	f	\N	2026-09-01 07:56:48.705861
200	Nouveau Télé/Radio ajouté: somacau	new	17	f	\N	2026-09-01 08:02:19.743675
201	Nouveau Night club ajouté: ANDRIATSITOAINA	new	20	f	\N	2026-09-01 08:06:26.146593
202	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	73	f	\N	2026-09-01 08:12:24.98282
203	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	29	f	\N	2026-09-01 08:26:39.276652
204	Nouveau Télé/Radio ajouté: somacau	new	18	f	\N	2026-09-01 08:31:11.441213
205	Nouveau OCC ajouté: Nouvel usager	new	9	f	\N	2026-09-01 08:33:42.711084
206	Nouveau OCC ajouté: Nouvel usager	new	10	f	\N	2026-09-01 08:39:15.879004
207	Nouveau Night club ajouté: ANDRIATSITOAINA	new	21	f	\N	2026-09-01 08:41:15.37667
208	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	74	f	\N	2026-09-01 08:42:15.16903
209	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	75	f	\N	2026-09-01 08:49:09.964206
210	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	76	f	\N	2026-09-01 09:00:30.521151
211	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	30	f	\N	2026-09-01 09:02:10.553588
212	Nouveau Télé/Radio ajouté: somacau	new	19	f	\N	2026-09-01 09:03:46.003958
213	Nouveau OCC ajouté: Nouvel usager	new	11	f	\N	2026-09-01 09:05:22.541099
214	Nouveau Bus ajouté: ANDRIATSITOAINA	new	17	f	\N	2026-09-01 09:06:50.849215
215	Nouveau Night club ajouté: ANDRIATSITOAINA	new	22	f	\N	2026-09-01 09:08:29.643793
216	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	77	f	\N	2026-09-01 09:20:17.211013
217	Nouveau OCC ajouté: Nouvel usager	new	12	f	\N	2026-09-01 09:37:45.84856
218	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	78	f	\N	2026-09-01 09:46:43.877116
219	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	31	f	\N	2026-09-01 09:47:49.959177
220	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	79	f	\N	2026-09-01 09:48:56.592391
221	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	80	f	\N	2026-09-01 09:56:46.62681
222	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	32	f	\N	2026-09-01 09:57:46.454238
223	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	81	f	\N	2026-09-01 10:03:36.702258
224	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	82	f	\N	2026-09-01 11:17:14.734747
225	Nouveau Night club ajouté: ANDRIATSITOAINA	new	23	f	\N	2026-09-01 11:19:06.351044
226	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	83	f	\N	2026-09-01 11:20:12.339624
227	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	84	f	\N	2026-09-01 11:20:50.911471
228	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	85	f	\N	2026-09-01 11:32:59.688888
229	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	86	f	\N	2026-09-01 11:33:50.694393
230	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	87	f	\N	2026-09-01 11:40:48.981652
231	Nouveau Night club ajouté: ANDRIATSITOAINA	new	24	f	\N	2026-09-01 11:42:20.551469
232	Nouveau Télé/Radio ajouté: somacau	new	20	f	\N	2026-09-01 11:44:07.051205
233	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	33	f	\N	2026-09-01 11:49:20.86835
234	Nouveau Night club ajouté: ANDRIATSITOAINA	new	25	f	\N	2026-09-01 11:50:20.398461
235	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	88	f	\N	2026-09-01 12:08:30.422624
236	Nouveau Grand Surface ajouté: ANDRIATSITOAINA	new	34	f	\N	2026-09-01 12:15:40.377976
237	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	89	f	\N	2026-09-01 12:17:50.723584
238	Nouveau Night club ajouté: ANDRIATSITOAINA	new	26	f	\N	2026-09-01 12:21:35.255113
239	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	90	f	\N	2026-09-01 12:22:33.295378
240	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	91	f	\N	2026-09-01 12:27:53.736711
241	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	92	f	\N	2026-09-01 16:04:03.179126
242	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	93	f	\N	2026-09-01 16:05:20.136425
243	Nouveau Hôtel ajouté: ANDRIATSITOAINA	new	94	f	\N	2026-09-01 16:07:24.987173
244	Nouveau Night club ajouté: ANDRIATSITOAINA	new	27	f	\N	2026-09-01 16:10:19.955643
245	Ceci est une notification de test.	info	\N	f	7	2026-09-02 07:35:28.768648
246	Ceci est une notification de test.	info	\N	f	7	2026-09-02 07:35:34.444964
247	Ceci est une notification de test.	info	\N	f	7	2026-09-02 07:35:35.925
248	Ceci est une notification de test.	info	\N	f	7	2026-09-02 08:04:13.032523
\.


--
-- Data for Name: paiements; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.paiements (id, usager_id, usager_type, type_paiement, annee, mois, montant, date_paiement, frais_dossier, montant_retard, est_retard, reference, statut, created_by, created_at) FROM stdin;
3	4	nightclub	mensuel	2026	1	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.651139
4	4	nightclub	mensuel	2026	2	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.680921
5	4	nightclub	mensuel	2026	3	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.713498
6	4	nightclub	mensuel	2026	4	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.782385
7	4	nightclub	mensuel	2026	5	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.796559
8	4	nightclub	mensuel	2026	6	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.809745
9	4	nightclub	mensuel	2026	7	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.822837
10	4	nightclub	mensuel	2026	8	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.836747
11	4	nightclub	mensuel	2026	9	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.85023
12	4	nightclub	mensuel	2026	10	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.863226
13	4	nightclub	mensuel	2026	11	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.876342
14	4	nightclub	mensuel	2026	12	100.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:13:45.889679
15	60	hotel	mensuel	2026	1	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.10283
16	60	hotel	mensuel	2026	2	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.231184
17	60	hotel	mensuel	2026	3	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.234045
18	60	hotel	mensuel	2026	4	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.236609
19	60	hotel	mensuel	2026	5	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.239587
20	60	hotel	mensuel	2026	6	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.243296
21	60	hotel	mensuel	2026	7	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.245894
22	60	hotel	mensuel	2026	8	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.248756
23	60	hotel	mensuel	2026	9	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.282672
24	60	hotel	mensuel	2026	10	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.285367
25	60	hotel	mensuel	2026	11	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.288513
26	60	hotel	mensuel	2026	12	100.00	2026-08-28	50.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-28 11:37:34.291699
27	1	media	mensuel	2026	1	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:55:27.344805
28	1	media	mensuel	2026	2	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:55:27.37707
29	1	media	mensuel	2026	3	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:55:27.393321
30	1	media	mensuel	2026	4	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:56:41.078019
31	1	media	mensuel	2026	5	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:56:41.130274
32	1	media	mensuel	2026	6	150.00	2026-08-28	0.00	0.00	f	\N	paye	\N	2026-08-28 11:56:41.207125
33	23	grand-surface	mensuel	2026	8	150.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 12:35:01.613972
34	24	grand-surface	mensuel	2026	8	1500.00	2026-08-28	500.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 12:45:57.412706
35	9	bus	mensuel	2026	1	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.019349
36	9	bus	mensuel	2026	2	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.025555
37	9	bus	mensuel	2026	3	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.029804
38	9	bus	mensuel	2026	4	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.033822
39	9	bus	mensuel	2026	5	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.037468
40	9	bus	mensuel	2026	6	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.040965
41	9	bus	mensuel	2026	7	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.04533
42	9	bus	mensuel	2026	8	500.00	2026-08-28	500.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:13:44.050635
43	7	occ	unique	\N	\N	55000.00	2026-08-28	5000.00	0.00	f	FIT 9/2/2026	paye	\N	2026-08-28 13:34:32.670207
44	16	nightclub	mensuel	2026	1	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.95631
45	16	nightclub	mensuel	2026	2	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.965795
46	16	nightclub	mensuel	2026	3	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.9688
47	16	nightclub	mensuel	2026	4	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.971699
48	16	nightclub	mensuel	2026	5	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.975434
49	16	nightclub	mensuel	2026	6	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.97855
50	16	nightclub	mensuel	2026	7	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.981661
51	16	nightclub	mensuel	2026	8	250.00	2026-08-28	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-28 13:47:30.985932
52	17	nightclub	mensuel	2026	3	250.00	2026-08-28	50.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 13:53:27.043357
53	17	nightclub	mensuel	2026	8	250.00	2026-08-28	50.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 13:53:27.052335
54	17	nightclub	mensuel	2026	10	250.00	2026-08-28	50.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 13:53:27.055091
55	25	grand-surface	mensuel	2026	8	150.00	2026-08-28	50.00	0.00	f	FIT 3/2/2026	paye	\N	2026-08-28 14:10:29.05923
56	18	nightclub	mensuel	2026	8	150.00	2026-08-28	50.00	0.00	f	FIT 3/2/2026	paye	\N	2026-08-28 14:12:40.865228
57	61	hotel	mensuel	2026	8	200.00	2026-08-28	50.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 14:24:06.277699
58	61	hotel	mensuel	2026	10	200.00	2026-08-28	50.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-28 14:24:06.287114
59	62	hotel	mensuel	2026	1	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.904296
60	62	hotel	mensuel	2026	2	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.917448
61	62	hotel	mensuel	2026	3	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.957072
62	62	hotel	mensuel	2026	4	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.960782
63	62	hotel	mensuel	2026	5	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.96337
64	62	hotel	mensuel	2026	6	1500.00	2026-08-29	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 08:25:30.965945
65	13	media	mensuel	2026	1	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.70206
66	13	media	mensuel	2026	2	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.707691
67	13	media	mensuel	2026	3	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.739906
68	13	media	mensuel	2026	4	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.74405
69	13	media	mensuel	2026	5	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.747855
70	13	media	mensuel	2026	6	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.751737
71	13	media	mensuel	2026	7	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.75557
72	13	media	mensuel	2026	8	55000.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 09:08:09.761383
73	11	hotel	mensuel	2026	1	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 09:37:41.246209
74	11	hotel	mensuel	2026	2	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 09:37:41.486851
75	11	hotel	mensuel	2026	3	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 09:37:41.667492
76	2	grand-surface	mensuel	2026	1	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 10:58:04.409311
77	2	grand-surface	mensuel	2026	2	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 10:58:04.646116
78	2	grand-surface	mensuel	2026	3	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 10:58:04.663868
79	2	grand-surface	mensuel	2026	4	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 10:58:04.678593
80	2	grand-surface	mensuel	2026	5	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 10:58:04.692426
81	2	grand-surface	mensuel	2026	6	100.00	2026-08-29	0.00	50.00	t	\N	paye	\N	2026-08-29 11:06:37.76716
82	2	grand-surface	mensuel	2026	7	100.00	2026-08-29	0.00	50.00	t	\N	paye	\N	2026-08-29 11:06:37.946959
83	2	grand-surface	mensuel	2026	8	100.00	2026-08-29	0.00	50.00	t	\N	paye	\N	2026-08-29 11:06:37.963704
84	2	grand-surface	mensuel	2026	9	80.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:10:39.112931
85	2	grand-surface	mensuel	2026	10	80.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:10:39.139274
86	2	grand-surface	mensuel	2026	11	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:15:55.13653
87	2	grand-surface	mensuel	2026	12	100.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:15:55.169594
88	11	hotel	mensuel	2026	4	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.822048
89	11	hotel	mensuel	2026	5	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.846129
90	11	hotel	mensuel	2026	6	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.867209
91	11	hotel	mensuel	2026	7	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.890699
92	11	hotel	mensuel	2026	8	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.914583
93	11	hotel	mensuel	2026	9	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.940908
94	11	hotel	mensuel	2026	10	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.961361
95	11	hotel	mensuel	2026	11	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:20.982298
96	11	hotel	mensuel	2026	12	80000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:19:21.002586
97	3	bus	mensuel	2026	1	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:20:26.258922
98	3	nightclub	mensuel	2026	1	90000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:30:29.859113
99	3	nightclub	mensuel	2026	2	90000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:30:30.028202
100	4	media	mensuel	2026	1	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:41:24.039419
101	4	media	mensuel	2026	2	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:41:24.068752
102	4	media	mensuel	2026	3	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:41:24.091086
103	4	media	mensuel	2026	4	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:41:46.589423
104	4	media	mensuel	2026	5	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:41:46.622886
105	4	media	mensuel	2026	6	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:46:18.676828
106	4	media	mensuel	2026	7	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:46:18.699879
107	4	media	mensuel	2026	8	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:46:18.717685
108	5	media	mensuel	2026	1	500000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:53:44.442903
109	5	media	mensuel	2026	2	500000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:53:44.472948
110	5	media	mensuel	2026	3	500000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:53:53.143801
111	5	media	mensuel	2026	4	500000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:53:53.170682
112	32	hotel	mensuel	2026	1	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:56:11.807091
113	32	hotel	mensuel	2026	2	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:56:11.964418
114	32	hotel	mensuel	2026	3	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:56:11.982614
115	32	hotel	mensuel	2026	4	497.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 11:58:15.810577
116	1	grand-surface	mensuel	2026	1	50.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:02:01.145776
117	1	grand-surface	mensuel	2026	2	50.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:02:01.170586
118	1	grand-surface	mensuel	2026	3	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.063837
119	1	grand-surface	mensuel	2026	4	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.089787
120	1	grand-surface	mensuel	2026	5	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.117969
121	1	grand-surface	mensuel	2026	6	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.1426
122	1	grand-surface	mensuel	2026	7	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.168393
123	1	grand-surface	mensuel	2026	8	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.192667
124	1	grand-surface	mensuel	2026	9	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.21427
125	1	grand-surface	mensuel	2026	10	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.234207
126	1	grand-surface	mensuel	2026	11	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.255413
127	1	grand-surface	mensuel	2026	12	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:09:03.271744
128	3	nightclub	mensuel	2026	3	43.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:12:15.398889
129	8	media	mensuel	2026	1	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:11.873391
130	8	media	mensuel	2026	2	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:11.929964
131	8	media	mensuel	2026	3	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:11.953503
132	8	media	mensuel	2026	4	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:11.97085
133	8	media	mensuel	2026	5	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.021604
134	8	media	mensuel	2026	6	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.043624
135	8	media	mensuel	2026	7	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.05961
136	8	media	mensuel	2026	8	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.094446
137	8	media	mensuel	2026	9	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.11036
138	8	media	mensuel	2026	10	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.132899
139	8	media	mensuel	2026	11	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.151114
140	8	media	mensuel	2026	12	590000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:21:12.174014
141	63	hotel	mensuel	2026	8	5100.00	2026-08-29	5000.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-29 12:22:33.602794
142	3	nightclub	mensuel	2026	4	9000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:31:59.128885
143	3	nightclub	mensuel	2026	5	9000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 12:31:59.281959
144	3	bus	mensuel	2026	2	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:02:05.434191
145	3	bus	mensuel	2026	3	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:02:05.462629
146	8	grand-surface	mensuel	2026	1	5000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:03:43.907131
147	8	grand-surface	mensuel	2026	2	5000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:03:43.931204
148	8	grand-surface	mensuel	2026	3	5000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:03:43.950453
149	8	grand-surface	mensuel	2026	4	5000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:03:43.970267
150	8	grand-surface	mensuel	2026	5	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:14:27.098249
151	8	grand-surface	mensuel	2026	6	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:14:27.246392
152	64	hotel	mensuel	2026	1	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.393933
153	64	hotel	mensuel	2026	2	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.442301
154	64	hotel	mensuel	2026	3	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.446895
155	64	hotel	mensuel	2026	4	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.450232
156	64	hotel	mensuel	2026	5	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.454781
157	64	hotel	mensuel	2026	6	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.477617
158	64	hotel	mensuel	2026	7	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.48098
159	64	hotel	mensuel	2026	8	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.483832
160	64	hotel	mensuel	2026	9	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.486415
161	64	hotel	mensuel	2026	10	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.488657
162	64	hotel	mensuel	2026	11	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.491085
163	64	hotel	mensuel	2026	12	7000.00	2026-08-29	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-29 13:21:27.495698
164	8	grand-surface	mensuel	2026	9	15000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:22:22.444916
165	5	hotel	mensuel	2026	1	50000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:23:46.1275
166	5	media	mensuel	2026	5	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:34:03.782967
167	5	media	mensuel	2026	6	150000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:35:20.744052
168	9	grand-surface	mensuel	2026	1	500.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:36:49.358463
169	3	nightclub	mensuel	2026	6	90000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:43:15.6636
170	3	nightclub	mensuel	2026	7	90000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:46:07.932779
171	6	media	mensuel	2026	1	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:49:29.606872
172	6	media	mensuel	2026	2	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:51:50.089778
173	6	hotel	mensuel	2026	1	50.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:57:04.361418
174	6	hotel	mensuel	2026	2	50.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 13:57:04.396062
175	3	bus	mensuel	2026	4	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 14:11:52.349858
176	3	bus	mensuel	2026	5	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 14:11:52.392649
177	3	bus	mensuel	2026	6	55000.00	2026-08-29	0.00	0.00	f	\N	paye	\N	2026-08-29 14:11:52.452599
178	5	hotel	mensuel	2026	2	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:08:23.291729
179	5	hotel	mensuel	2026	3	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:09:00.88477
180	5	hotel	mensuel	2026	4	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:09:00.906148
181	10	media	mensuel	2026	1	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:43:50.861701
182	10	media	mensuel	2026	2	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:12.272336
183	10	media	mensuel	2026	3	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:12.433156
184	10	media	mensuel	2026	4	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:12.470278
185	10	media	mensuel	2026	5	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:50.44382
186	10	media	mensuel	2026	6	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:50.485074
187	10	media	mensuel	2026	7	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:45:50.600335
188	10	media	mensuel	2026	8	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:46:04.443198
189	10	media	mensuel	2026	9	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:46:04.476003
190	10	media	mensuel	2026	10	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:46:04.520652
191	10	media	mensuel	2026	11	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:48:49.442996
192	10	media	mensuel	2026	12	550000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 07:48:49.590873
193	12	nightclub	mensuel	2026	1	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:06:58.82432
194	40	hotel	mensuel	2026	1	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:10:36.780924
195	15	hotel	mensuel	2026	1	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:27:55.81234
196	15	hotel	mensuel	2026	2	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:27:58.161405
197	15	hotel	mensuel	2026	3	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:31:45.453571
198	15	hotel	mensuel	2026	4	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:31:46.524313
199	15	hotel	mensuel	2026	5	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:31:46.543876
200	65	hotel	mensuel	2026	8	2500.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 08:35:47.152101
201	65	hotel	mensuel	2026	9	2500.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 08:35:47.157477
202	65	hotel	mensuel	2026	10	2500.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 08:35:47.160087
203	1	media	mensuel	2026	7	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:43:53.175118
204	1	media	mensuel	2026	8	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:43:53.221802
205	1	media	mensuel	2026	9	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:43:53.234908
206	3	media	mensuel	2026	5	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 08:52:02.827951
207	55	hotel	mensuel	2026	1	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:00:35.304907
208	55	hotel	mensuel	2026	2	5000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:00:35.348057
209	55	hotel	mensuel	2026	3	500000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:01:38.172571
210	15	hotel	mensuel	2026	6	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.599854
211	15	hotel	mensuel	2026	7	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.622679
212	15	hotel	mensuel	2026	8	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.638698
213	15	hotel	mensuel	2026	9	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.655347
214	15	hotel	mensuel	2026	10	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.669552
215	15	hotel	mensuel	2026	11	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.685631
216	15	hotel	mensuel	2026	12	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:18:18.697819
217	46	hotel	mensuel	2026	1	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.796852
218	46	hotel	mensuel	2026	2	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.820366
219	46	hotel	mensuel	2026	3	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.836591
220	46	hotel	mensuel	2026	4	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.849286
221	46	hotel	mensuel	2026	5	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.865759
222	46	hotel	mensuel	2026	6	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.916611
223	46	hotel	mensuel	2026	7	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.92878
224	46	hotel	mensuel	2026	8	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.940922
225	46	hotel	mensuel	2026	9	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.953351
226	46	hotel	mensuel	2026	10	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.965321
227	46	hotel	mensuel	2026	11	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.977437
228	46	hotel	mensuel	2026	12	47.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:19:12.990557
229	6	grand-surface	mensuel	2026	1	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:15.972653
230	6	grand-surface	mensuel	2026	2	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:15.99628
231	6	grand-surface	mensuel	2026	3	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.046733
232	6	grand-surface	mensuel	2026	4	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.0827
233	6	grand-surface	mensuel	2026	5	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.098364
234	6	grand-surface	mensuel	2026	6	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.114469
235	6	grand-surface	mensuel	2026	7	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.129632
236	6	grand-surface	mensuel	2026	8	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.142429
237	6	grand-surface	mensuel	2026	9	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.156566
238	6	grand-surface	mensuel	2026	10	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.168109
239	6	grand-surface	mensuel	2026	11	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.182035
240	6	grand-surface	mensuel	2026	12	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:20:16.193791
241	4	grand-surface	mensuel	2026	1	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.114682
242	4	grand-surface	mensuel	2026	2	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.131898
243	4	grand-surface	mensuel	2026	3	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.146355
244	4	grand-surface	mensuel	2026	4	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.159918
245	4	grand-surface	mensuel	2026	5	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.175193
246	4	grand-surface	mensuel	2026	6	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.187047
247	4	grand-surface	mensuel	2026	7	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.201718
248	4	grand-surface	mensuel	2026	8	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.213756
249	4	grand-surface	mensuel	2026	9	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.226779
250	4	grand-surface	mensuel	2026	10	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.238902
251	4	grand-surface	mensuel	2026	11	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.251585
252	4	grand-surface	mensuel	2026	12	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:25:58.26356
253	4	hotel	mensuel	2026	1	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:57.861525
254	4	hotel	mensuel	2026	2	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.049609
255	4	hotel	mensuel	2026	3	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.064133
256	4	hotel	mensuel	2026	4	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.080611
257	4	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.095274
258	4	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.109448
259	4	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.123414
260	4	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.13642
261	4	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.149772
262	4	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.165608
263	4	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.178209
264	4	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:31:58.190165
265	32	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.588824
266	32	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.614079
267	32	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.62862
268	32	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.643134
269	32	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.658177
270	32	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.671622
271	32	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.685586
272	32	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:35:28.698469
273	2	media	mensuel	2026	1	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.021414
274	2	media	mensuel	2026	2	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.044019
275	2	media	mensuel	2026	3	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.060214
276	2	media	mensuel	2026	4	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.074764
277	2	media	mensuel	2026	5	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.092788
278	2	media	mensuel	2026	6	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.106765
279	2	media	mensuel	2026	7	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.120549
280	2	media	mensuel	2026	8	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.134492
281	2	media	mensuel	2026	9	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.147593
282	2	media	mensuel	2026	10	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.180342
283	2	media	mensuel	2026	11	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.196252
284	2	media	mensuel	2026	12	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:36:18.211591
285	7	media	mensuel	2026	1	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.63635
286	7	media	mensuel	2026	2	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.656248
287	7	media	mensuel	2026	3	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.670692
288	7	media	mensuel	2026	4	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.686154
289	7	media	mensuel	2026	5	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.69901
290	7	media	mensuel	2026	6	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.713422
291	7	media	mensuel	2026	7	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.726262
292	7	media	mensuel	2026	8	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.739544
293	7	media	mensuel	2026	9	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.753284
294	7	media	mensuel	2026	10	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.780012
295	7	media	mensuel	2026	11	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.792068
296	7	media	mensuel	2026	12	590000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:40:29.805887
297	59	hotel	mensuel	2026	1	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:14.91551
298	59	hotel	mensuel	2026	2	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.084975
299	59	hotel	mensuel	2026	3	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.099834
300	59	hotel	mensuel	2026	4	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.114535
301	59	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.128085
302	59	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.163581
303	59	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.177174
304	59	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.218161
305	59	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.231425
306	59	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.247262
307	59	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.260505
308	59	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:15.290854
309	56	hotel	mensuel	2026	1	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.869392
310	56	hotel	mensuel	2026	2	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.936264
311	56	hotel	mensuel	2026	3	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.952232
312	56	hotel	mensuel	2026	4	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.96542
313	56	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.982931
314	56	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:48.996926
315	56	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.010681
316	56	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.025924
317	56	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.039287
318	56	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.054018
319	56	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.066325
320	56	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:50:49.081688
321	6	hotel	mensuel	2026	3	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.492042
322	6	hotel	mensuel	2026	4	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.53673
323	6	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.550324
324	6	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.564949
325	6	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.580316
326	6	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.592458
327	6	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.606867
328	6	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.619348
329	6	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.643732
330	6	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 09:55:14.658099
331	66	hotel	mensuel	2026	8	250.00	2026-08-31	50.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-31 10:11:59.332659
332	5	hotel	mensuel	2026	5	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:41:43.702052
333	5	hotel	mensuel	2026	6	500.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:41:44.039653
334	5	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:02.673981
335	5	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:04.330782
336	5	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:04.472952
337	5	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:04.505556
338	5	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:04.638585
339	5	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:47:04.700965
340	33	hotel	mensuel	2026	1	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.37795
341	33	hotel	mensuel	2026	2	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.667358
342	33	hotel	mensuel	2026	3	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.682237
343	33	hotel	mensuel	2026	4	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.700845
344	33	hotel	mensuel	2026	5	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.731803
345	33	hotel	mensuel	2026	6	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.78606
346	33	hotel	mensuel	2026	7	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.799852
347	33	hotel	mensuel	2026	8	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.814328
348	33	hotel	mensuel	2026	9	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.883685
349	33	hotel	mensuel	2026	10	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.911041
350	33	hotel	mensuel	2026	11	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.925216
351	33	hotel	mensuel	2026	12	50.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:54:20.940206
352	38	hotel	mensuel	2026	1	2000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:56:45.041601
353	38	hotel	mensuel	2026	2	2000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:57:17.138528
354	38	hotel	mensuel	2026	3	2000.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 11:58:14.773128
355	67	hotel	mensuel	2026	1	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.903272
356	67	hotel	mensuel	2026	2	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.910183
357	67	hotel	mensuel	2026	3	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.940041
358	67	hotel	mensuel	2026	4	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.956848
359	67	hotel	mensuel	2026	8	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.959685
360	67	hotel	mensuel	2026	11	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:08:43.962528
361	68	hotel	mensuel	2026	8	1050.00	2026-08-31	500.00	0.00	f	FIT 2/2/2026	paye	\N	2026-08-31 12:17:46.052385
362	26	grand-surface	mensuel	2026	1	10500.00	2026-08-31	5000.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:22:24.841892
363	26	grand-surface	mensuel	2026	8	10500.00	2026-08-31	5000.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:22:24.872045
364	26	grand-surface	mensuel	2026	10	10500.00	2026-08-31	5000.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:22:24.906306
365	19	nightclub	mensuel	2026	8	150.00	2026-08-31	50.00	0.00	f	FIT 1/2/2026	paye	\N	2026-08-31 12:30:59.563198
366	8	occ	unique	\N	\N	150000.00	2026-08-31	5000.00	0.00	f	FIT 10/2/2026	paye	\N	2026-08-31 18:09:43.812019
367	69	hotel	mensuel	2026	1	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.747102
368	69	hotel	mensuel	2026	2	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.752082
369	69	hotel	mensuel	2026	3	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.75556
370	69	hotel	mensuel	2026	4	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.758692
371	69	hotel	mensuel	2026	5	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.761747
372	69	hotel	mensuel	2026	6	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.76459
373	69	hotel	mensuel	2026	7	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.767445
374	69	hotel	mensuel	2026	8	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.771068
375	69	hotel	mensuel	2026	12	2000.00	2026-08-31	500.00	0.00	f	AND 1/2/2026	paye	\N	2026-08-31 18:21:28.774147
376	70	hotel	mensuel	2026	8	10001.00	2026-08-31	5000.00	0.00	f	AND 2/2/2026	paye	\N	2026-08-31 18:22:35.927006
377	7	hotel	mensuel	2026	1	100.00	2026-08-31	0.00	5000.00	t	\N	paye	\N	2026-08-31 18:24:09.610731
378	7	hotel	mensuel	2026	2	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:25:37.249964
379	7	hotel	mensuel	2026	3	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:25:37.59167
380	7	hotel	mensuel	2026	4	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:26:08.984249
381	7	hotel	mensuel	2026	5	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:26:09.012055
382	7	hotel	mensuel	2026	6	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:26:09.038475
383	7	hotel	mensuel	2026	7	100.00	2026-08-31	0.00	0.00	f	\N	paye	\N	2026-08-31 18:26:09.053959
384	71	hotel	mensuel	2026	1	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.525106
385	71	hotel	mensuel	2026	2	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.651117
386	71	hotel	mensuel	2026	3	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.654081
387	71	hotel	mensuel	2026	4	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.690621
388	71	hotel	mensuel	2026	5	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.69377
389	71	hotel	mensuel	2026	6	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.696412
390	71	hotel	mensuel	2026	7	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.699136
391	71	hotel	mensuel	2026	8	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.732004
392	71	hotel	mensuel	2026	9	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.735637
393	71	hotel	mensuel	2026	10	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.73865
394	71	hotel	mensuel	2026	11	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.741754
395	71	hotel	mensuel	2026	12	1500.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 06:53:17.744473
396	10	bus	mensuel	2026	1	55000.00	2026-09-01	5000.00	0.00	f	FIT 3/3/2026	paye	\N	2026-09-01 07:00:19.846169
397	10	bus	mensuel	2026	2	55000.00	2026-09-01	5000.00	0.00	f	FIT 3/3/2026	paye	\N	2026-09-01 07:00:19.914739
398	10	bus	mensuel	2026	3	55000.00	2026-09-01	5000.00	0.00	f	FIT 3/3/2026	paye	\N	2026-09-01 07:00:19.920935
399	10	bus	mensuel	2026	4	55000.00	2026-09-01	5000.00	0.00	f	FIT 3/3/2026	paye	\N	2026-09-01 07:00:19.947679
400	10	bus	mensuel	2026	9	55000.00	2026-09-01	5000.00	0.00	f	FIT 3/3/2026	paye	\N	2026-09-01 07:00:19.970003
401	11	bus	mensuel	2026	9	55000.00	2026-09-01	5000.00	0.00	f	FIT 4/3/2026	paye	\N	2026-09-01 07:04:28.841167
402	72	hotel	mensuel	2026	9	25000.00	2026-09-01	5000.00	0.00	f	FIT 15/3/2026	paye	\N	2026-09-01 07:14:55.018362
403	13	bus	mensuel	2026	9	55000.00	2026-09-01	5000.00	0.00	f	FIT 6/3/2026	paye	\N	2026-09-01 07:23:03.530625
404	14	bus	mensuel	2026	9	55000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:36:49.988748
405	15	bus	mensuel	2026	9	60000.00	2026-09-01	5000.00	0.00	f	FIT 8/3/2026	paye	\N	2026-09-01 07:37:45.509309
406	16	bus	mensuel	2026	9	5000.00	2026-09-01	500.00	0.00	f	FIT 9/3/2026	paye	\N	2026-09-01 07:40:07.151809
407	27	grand-surface	mensuel	2026	1	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:31.964066
408	27	grand-surface	mensuel	2026	2	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:31.970584
409	27	grand-surface	mensuel	2026	3	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:31.973687
410	27	grand-surface	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:31.977447
411	27	grand-surface	mensuel	2026	11	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:32.189249
412	27	grand-surface	mensuel	2026	12	15000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 07:42:32.191806
413	12	bus	mensuel	2026	9	55000.00	2026-09-01	5000.00	0.00	f	FIT 5/3/2026	paye	\N	2026-09-01 07:42:48.930039
414	28	grand-surface	mensuel	2026	1	25000.00	2026-09-01	5000.00	0.00	f	FIT 8/3/2026	paye	\N	2026-09-01 07:46:28.462047
415	28	grand-surface	mensuel	2026	9	25000.00	2026-09-01	5000.00	0.00	f	FIT 8/3/2026	paye	\N	2026-09-01 07:46:28.468331
416	28	grand-surface	mensuel	2026	11	25000.00	2026-09-01	5000.00	0.00	f	FIT 8/3/2026	paye	\N	2026-09-01 07:46:28.470788
417	14	media	mensuel	2026	9	5000.00	2026-09-01	55000.00	0.00	f	FIT 4/3/2026	paye	\N	2026-09-01 07:52:36.729043
418	15	media	mensuel	2026	9	5000.00	2026-09-01	55000.00	0.00	f	FIT 5/3/2026	paye	\N	2026-09-01 07:53:59.246744
419	16	media	mensuel	2026	9	5000.00	2026-09-01	55000.00	0.00	f	FIT 6/3/2026	paye	\N	2026-09-01 07:56:58.048625
420	17	media	mensuel	2026	9	128000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 08:02:23.509476
421	20	nightclub	mensuel	2026	9	7000.00	2026-09-01	5000.00	0.00	f	FIT 7/3/2026	paye	\N	2026-09-01 08:06:29.214316
422	73	hotel	mensuel	2026	1	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.832806
423	73	hotel	mensuel	2026	2	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.843613
424	73	hotel	mensuel	2026	3	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.847156
425	73	hotel	mensuel	2026	4	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.85029
426	73	hotel	mensuel	2026	5	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.852841
427	73	hotel	mensuel	2026	6	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.88088
428	73	hotel	mensuel	2026	7	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.883695
429	73	hotel	mensuel	2026	8	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.886506
430	73	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.889928
431	73	hotel	mensuel	2026	10	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.894047
432	73	hotel	mensuel	2026	11	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.897414
433	73	hotel	mensuel	2026	12	15000.00	2026-09-01	5000.00	0.00	f	FIT 16/3/2026	paye	\N	2026-09-01 08:12:33.899857
434	29	grand-surface	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 9/3/2026	paye	\N	2026-09-01 08:26:42.751388
435	38	hotel	mensuel	2026	4	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 08:28:48.358418
436	38	hotel	mensuel	2026	5	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 08:28:48.382037
437	38	hotel	mensuel	2026	6	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 08:28:48.396535
438	38	hotel	mensuel	2026	7	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 08:28:48.410904
439	18	media	mensuel	2026	9	60000.00	2026-09-01	2000.00	0.00	f	FIT 8/3/2026	paye	\N	2026-09-01 08:31:15.54316
440	9	occ	unique	\N	\N	55000.00	2026-09-01	5000.00	0.00	f	FIT 11/3/2026	paye	\N	2026-09-01 08:33:53.648051
441	10	occ	unique	\N	\N	60000.00	2026-09-01	5000.00	0.00	f	FIT 12/3/2026	paye	\N	2026-09-01 08:39:18.054764
442	76	hotel	mensuel	2026	9	8000.00	2026-09-01	3000.00	0.00	f	FIT 19/3/2026	paye	\N	2026-09-01 09:00:35.936058
443	30	grand-surface	mensuel	2026	2	1300.00	2026-09-01	300.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 09:02:19.717874
444	30	grand-surface	mensuel	2026	3	1300.00	2026-09-01	300.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 09:02:19.745032
445	30	grand-surface	mensuel	2026	4	1300.00	2026-09-01	300.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 09:02:19.870897
446	30	grand-surface	mensuel	2026	9	1300.00	2026-09-01	300.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 09:02:19.877752
447	19	media	mensuel	2026	9	20000.00	2026-09-01	15000.00	0.00	f	FIT 9/3/2026	paye	\N	2026-09-01 09:03:51.977649
448	11	occ	unique	\N	\N	2000.00	2026-09-01	500.00	0.00	f	FIT 13/3/2026	paye	\N	2026-09-01 09:05:26.098908
449	17	bus	mensuel	2026	9	20000.00	2026-09-01	5000.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 09:06:53.679626
450	22	nightclub	mensuel	2026	9	15.00	2026-09-01	5.00	0.00	f	FIT 9/3/2026	paye	\N	2026-09-01 09:08:32.105556
451	77	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 20/3/2026	paye	\N	2026-09-01 09:20:19.971972
452	12	occ	unique	\N	\N	6000.00	2026-09-01	500.00	0.00	f	FIT 14/3/2026	paye	\N	2026-09-01 09:37:47.916208
453	78	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 21/3/2026	paye	\N	2026-09-01 09:46:46.343806
454	31	grand-surface	mensuel	2026	9	1500.00	2026-09-01	500.00	0.00	f	FIT 11/3/2026	paye	\N	2026-09-01 09:47:52.683713
455	79	hotel	mensuel	2026	9	50.00	2026-09-01	0.00	0.00	f	FIT 22/3/2026	paye	\N	2026-09-01 09:49:01.460465
456	80	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 23/3/2026	paye	\N	2026-09-01 09:56:48.857276
457	32	grand-surface	mensuel	2026	9	1500.00	2026-09-01	500.00	0.00	f	FIT 12/3/2026	paye	\N	2026-09-01 09:57:48.714449
458	81	hotel	mensuel	2026	9	10000.00	2026-09-01	0.00	0.00	f	FIT 24/3/2026	paye	\N	2026-09-01 10:03:40.226855
459	82	hotel	mensuel	2026	9	13000.00	2026-09-01	8000.00	0.00	f	FIT 25/3/2026	paye	\N	2026-09-01 11:17:17.117216
460	23	nightclub	mensuel	2026	9	13000.00	2026-09-01	3000.00	0.00	f	FIT 10/3/2026	paye	\N	2026-09-01 11:19:08.944206
461	83	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 26/3/2026	paye	\N	2026-09-01 11:20:14.515209
462	84	hotel	mensuel	2026	9	500.00	2026-09-01	0.00	0.00	f	FIT 27/3/2026	paye	\N	2026-09-01 11:20:53.175265
463	85	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 28/3/2026	paye	\N	2026-09-01 11:33:02.539448
464	86	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	FIT 29/3/2026	paye	\N	2026-09-01 11:33:52.980921
465	87	hotel	mensuel	2026	9	10000.00	2026-09-01	5000.00	0.00	f	AND 43/3/2026	paye	\N	2026-09-01 11:40:52.340177
466	24	nightclub	mensuel	2026	9	150.00	2026-09-01	50.00	0.00	f	AND 13/3/2026	paye	\N	2026-09-01 11:42:23.07385
467	20	media	mensuel	2026	9	60000.00	2026-09-01	5000.00	0.00	f	AND 11/3/2026	paye	\N	2026-09-01 11:44:09.46173
468	33	grand-surface	mensuel	2026	9	5090.00	2026-09-01	90.00	0.00	f	AND 21/3/2026	paye	\N	2026-09-01 11:49:23.464343
469	25	nightclub	mensuel	2026	9	5500.00	2026-09-01	5000.00	0.00	f	AND 14/3/2026	paye	\N	2026-09-01 11:50:22.933243
470	88	hotel	mensuel	2026	9	163000.00	2026-09-01	153000.00	0.00	f	AND 44/3/2026	paye	\N	2026-09-01 12:08:32.746552
471	34	grand-surface	mensuel	2026	9	1000.00	2026-09-01	500.00	0.00	f	AND 22/3/2026	paye	\N	2026-09-01 12:15:43.517993
472	38	hotel	mensuel	2026	8	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 12:16:39.279526
473	38	hotel	mensuel	2026	9	2000.00	2026-09-01	0.00	0.00	f	\N	paye	\N	2026-09-01 12:16:39.299789
474	89	hotel	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	AND 45/3/2026	paye	\N	2026-09-01 12:17:53.284954
475	26	nightclub	mensuel	2026	9	15000.00	2026-09-01	5000.00	0.00	f	AND 15/3/2026	paye	\N	2026-09-01 12:21:37.803173
476	90	hotel	mensuel	2026	9	5500.00	2026-09-01	5000.00	0.00	f	AND 46/3/2026	paye	\N	2026-09-01 12:22:35.691716
477	91	hotel	mensuel	2026	9	6000.00	2026-09-01	5000.00	0.00	f	AND 47/3/2026	paye	\N	2026-09-01 12:27:56.40313
478	92	hotel	mensuel	2026	9	800.00	2026-09-01	500.00	0.00	f	AND 48/3/2026	paye	\N	2026-09-01 16:04:06.827544
479	93	hotel	mensuel	2026	9	5242.00	2026-09-01	3121.00	0.00	f	AND 49/3/2026	paye	\N	2026-09-01 16:05:23.008174
480	94	hotel	mensuel	2026	9	13666.00	2026-09-01	13333.00	0.00	f	FIT 30/3/2026	paye	\N	2026-09-01 16:07:28.225454
481	27	nightclub	mensuel	2026	9	1500.00	2026-09-01	500.00	0.00	f	FIT 11/3/2026	paye	\N	2026-09-01 16:10:22.355103
\.


--
-- Data for Name: parametres_utilisateur; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.parametres_utilisateur (id, utilisateur_id, app_name, langue, theme, date_format, time_format, couleur_principale, police, notifications, created_at, updated_at) FROM stdin;
1	1	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.325433	2026-09-02 07:16:21.325433
2	2	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.891943	2026-09-02 07:16:21.891943
3	11	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.903284	2026-09-02 07:16:21.903284
4	4	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.915205	2026-09-02 07:16:21.915205
5	5	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.921447	2026-09-02 07:16:21.921447
6	6	OMDA App	fr	light	DD/MM/YYYY	24h	#3498db	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:16:21.933856	2026-09-02 07:16:21.933856
7	7	OMDA App	fr	light	DD/MM/YYYY	24h	#e74c3c	default	{"sms": false, "push": true, "email": true, "sound": true}	2026-09-02 07:35:47.001835	2026-09-02 08:26:53.053029
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: omda_app; Owner: postgres
--

COPY omda_app.regions (id, nom, telephone, created_at) FROM stdin;
2	Atsinanana	034 98 765 43	2026-08-19 14:23:04.860454
3	Diana	032 11 223 33	2026-08-19 14:23:04.860454
6	Vatovavy Fito Vinany	034 48 753 45	2026-08-19 14:55:40.812598
5	Analanjirofo	034 05 789 41	2026-08-19 14:51:07.632688
4	Fianarantsoa	034 50 147 78	2026-08-19 14:30:31.901526
7	Analamanga	034 05 489 62	2026-08-20 12:00:23.610743
8	Tolaniaro	034 54 753 54	2026-08-20 12:25:50.907177
9	Manjakandriana	034 78 465 12	2026-08-20 12:27:15.483014
10	Andraisoro	034 87 412 56	2026-08-20 13:00:09.005744
11	Vatomandry	034 85 456 52	2026-08-20 14:06:43.393388
12	Mahajanga	034 50 458 96	2026-08-21 12:36:21.9748
13	Toliara	034 85 456 12	2026-08-21 13:45:56.790076
14	Besarety	0345007145	2026-08-22 08:53:47.998291
15	Amoron'ny Mania	034 59 789 41	2026-08-22 09:47:16.952896
\.


--
-- Data for Name: usagers; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers (id, type_usager, denomination, demandeur, telephone, email, region, adresse, frais_dossier, montant_mensuel, uniter, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: usagers_bus; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_bus (id, demandeur, denomination, adresse_siege, nif_stat, telephone, email, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, nombre_vehicules, lignes, type_bus, trajet, horaires, zones_desservies, a_compter_du, echeance, type_paiement, montant_mensuel, frais_dossier, region, confirmation_nom, date_signature, lieu_signature, uniter, numero_dossier_utilisateur, created_by, created_at) FROM stdin;
1	RAFALIMANANA Paule 	Koloina 	Mahazo Ambohimangakely	123/45M	038 52 456 21	koloina@gmial.com	RAZANKATOANINA Lemena	Andraharo	039 99 888 77	109 753 456 12	1999-08-22	Antanandrano	Chef Cooperative 	50	3	Urbaine	Antananarivo - Antananarivo	4h - 19h		\N	\N	mensuel	60.00	50.00	Vatovavy Fito Vinany	Larisa 	2026-08-22	Antananarevo	2	AND 2/2/2026	7	2026-08-22 08:02:28.075182
2	RASOLOJAONANI	Kintana Ambohimanambola 	Ambohijatovo	 io/12: 1099	034 85 456 12	mailnk@gmail.com	RAZAFIMAHEFA Felix	Andraharo	035 74 123 69	101 54 79876 	2026-08-21	Tanambao	Chef	5	5	Urbaine	Tana Tolosy	Tous 		\N	\N	mensuel	5500.00	500.00	Manjakandriana	Larisa	2026-08-22	Antananarivo	1	AND 3/2/2026	7	2026-08-22 08:37:48.144601
3	RAKITSAHY	135 Mazda	Ambomahintsy	12JDJ/1984	0345007145	mail@gmail.com	somacau	Antsahavola	0345007145	105 456 78 52	2026-08-24	Andraharo	Chef Province	50	6	Suburbain	Antananarivo 	4h - 15h		\N	\N	mensuel	55000.00	5000.00	Analamanga	Larisa	2026-08-22	Antananarivo	1	AND 4/2/2026	7	2026-08-22 10:16:15.764028
4	to	to					to			1111	\N			5	6	Suburbain				\N	\N	mensuel	95000.00	5000.00	Tolaniaro	TAna	\N	g	1	AND 5/2/2026	7	2026-08-23 13:09:15.856141
5	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	56	\N			1	ftt	Suburbain				\N	\N	mensuel	650000.00	5000.00	Toliara		\N		1	AND 6/2/2026	7	2026-08-26 09:40:07.56004
6	g	g		g	g		g	g		g	\N			1	g	Urbaine	g			\N	\N	mensuel	1230000.00	50000.00	Tolaniaro		\N		1	AND 7/2/2026	7	2026-08-26 12:32:44.399154
7	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	r	r		r	\N			45	r	Urbaine	g	g		\N	\N	mensuel	559000.00	5000.00	Manjakandriana		\N		1	AND 8/2/2026	7	2026-08-26 12:47:21.378869
8	Hr	ANDRIATSITOAINA	Antsahavola	12JDJ	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	156	2026-09-01	56	hef	5	5	Urbaine	k	5		\N	\N	mensuel	65000.00	5000.00	Manjakandriana		\N		1	AND 9/2/2026	7	2026-08-26 13:45:47.107412
9	RASOLOMANANA	Kofifivam	ANOSIBE	12/23 2024	0345007145	mail@gmail.com	RAZANAMANJA Fitiavana	Antsahavola	0345007145	101 234 577 85	2026-08-29	Antanadrano 	Chef	50	--	National	Antananarivo , Toliara ,Ambositra , Fandriana	--		\N	\N	mensuel	500.00	500.00	Mahajanga	RAZANAMAHEFA Larisa	\N	AntaNANARIVIO	1	FIT 2/2/2026	8	2026-08-28 13:13:26.622977
10	Hr	ANDRIATSITOAINA	Antsahavola	E	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	2026-09-09	se	prefet	50	kofiatra	Suburbain	Antananarivo	20		\N	\N	mensuel	55000.00	5000.00	Tolaniaro	RAKOTOJAONIA	2026-09-23	Antananarivo	1	FIT 3/3/2026	8	2026-09-01 06:59:51.523034
11	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	984	\N			50	fd	Urbaine				\N	\N	mensuel	55000.00	5000.00	Tolaniaro		\N		1	FIT 4/3/2026	8	2026-09-01 07:01:31.747089
12	Hr	ANDRIATSITOAINA	Antsahavola	Semi	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	s	\N			5	ligne A	Suburbain	Tana	20		\N	\N	mensuel	55000.00	5000.00	Vatomandry	RAKOTO	\N	S	1	FIT 5/3/2026	8	2026-09-01 07:14:15.759271
13	Hr	ANDRIATSITOAINA	Antsahavola	d	0345007145	hrandriatsitoaina@gmail.com	s	s		s	\N			5	Kofiatra	Suburbain	Tana	20		\N	\N	mensuel	55000.00	5000.00	Manjakandriana	RAKOTO	2026-09-21	S	1	FIT 6/3/2026	8	2026-09-01 07:20:04.63924
14	Hr	ANDRIATSITOAINA	Antsahavola	AZ	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	Z	2026-09-22		Z	50	a	Suburbain	t	e		\N	\N	mensuel	55000.00	5000.00	Manjakandriana		\N		1	FIT 7/3/2026	8	2026-09-01 07:23:55.05472
15	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	s	2026-09-28		q	56	ftt	Suburbain	Tana	20		\N	\N	mensuel	60000.00	5000.00	Toliara		\N		1	FIT 8/3/2026	8	2026-09-01 07:37:37.705883
16	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	d	\N		d	12	Lo	Urbaine	taa	20h		\N	\N	mensuel	5000.00	500.00	Toliara		\N		1	FIT 9/3/2026	8	2026-09-01 07:40:00.478701
17	Hr	ANDRIATSITOAINA	Antsahavola	15	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	15	2026-09-23			51	ftt	Urbaine	tana			\N	\N	mensuel	15000.00	5000.00	Tolaniaro		\N		1	FIT 10/3/2026	8	2026-09-01 09:06:50.805224
\.


--
-- Data for Name: usagers_hotel; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_hotel (id, demandeur, denomination, adresse_siege, nif_stat, telephone, email, etoiles, ravinala, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, activite, moyens_communication, total, a_compter_du, echeance, confirmation_nom, date_signature, lieu_signature, type_paiement, montant_mensuel, frais_dossier, region, uniter, numero_dossier_utilisateur, created_by, created_at) FROM stdin;
1	RABEZAVANA 	Kintan'ny Analamanga	Andraharo	123/1M 1998	034 50 789 54	mail@gmail.com	5	f	MANJAKAMILA	Andraisoro 	034 52 148 75	101 458 753 12	2026-08-02	Ilafy		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "50", "actif": true}}	200	\N	\N	Larisa	2026-08-20	Antananarivo	mensuel	50.00	50.00	Analamanga	1	AND 1/2/2026	7	2026-08-20 12:03:39.13151
9	RAZAFITSAHALA Mamitiana 	Soamanatombo	Anosy	12/A23	034 52 123 45	SOA@GMAIL.COM		t	RABEMANANJARY Soavelo	lot XD Ambidivohara	034 52 123 45	109 7753 198 55	2000-08-21	Ambohimangakely		hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	300	2026-08-22	2026-09-24	Larisa	2026-08-22	Antananarivo	mensuel	100.00	100.00	Analamanga	2	FIT 4/2/2026	8	2026-08-22 09:07:01.298308
3	r	r	r	r	r	r@gmail.com		t	r	r	r	r	2026-08-23	r		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "", "actif": false}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	50	\N	\N	r	\N	r	mensuel	0.00	50.00	Tolaniaro	1	AND 3/2/2026	7	2026-08-20 13:00:41.59542
4	RAMAFA	lova Mena 	67 hct		035 41 235 78		4	f	RANDRIANA	Antsahavola	0345007145	104 587 985 45	2026-07-06	IVATO		hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	200	\N	\N	larisa	2026-08-10	tana	mensuel	50.00	50.00	Vatovavy Fito Vinany	1	AND 4/2/2026	7	2026-08-20 13:31:07.709017
5	a	a	a					t	a	a	a	a	2026-08-31	a		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	100	\N	\N	a	2026-08-20	a	mensuel	0.00	50.00	Fianarantsoa	1	AND 5/2/2026	7	2026-08-20 13:41:13.645274
6	RIANTSOA	Lova ety atany 	Andraisoro	123/541	034 50 454 78	mail@gmail.com	4	f	RAZAFIMANANTSOA	Andraharo	034 50 486 52	101 456 785 95	2026-08-01	Analamanga		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N	Larisa	2026-08-21	RAZAKANOTAZNINA	mensuel	50.00	50.00	Manjakandriana	1	FIT 1/2/2026	8	2026-08-21 12:28:01.306606
7	RAFARALAZA Nomena 	Ilay Kintana 33	Antsahavola	uo/OP 1990	0345007145	mail@gmail.com		t	RAKOTOMALANDY	LOT td 335	034 85 424 85	106 478 951 42	2026-08-24	Tanandrano		hotellerie_restauration	{"tv": {"taux": "70", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "80", "actif": true}, "lecteur": {"taux": "60", "actif": true}}	450	2026-08-21	2026-08-21	Larisa	2026-08-15	Antananarivo	mensuel	100.00	90.00	Mahajanga	1	FIT 2/2/2026	8	2026-08-21 12:40:19.989492
8	RAZANAMADY Vonolona	Hotelin'ny Tanora	Andravohangy	123/124	034 52 123 48	RAVO@GMAIL.COM		t	RAFALIMANANA Jean	Ampasambaza 	034 52 789 41	109 852 456 12	0999-05-14	ANDRAHARO		hotellerie	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "10", "actif": true}, "autres": {"taux": "30", "actif": true}, "lecteur": {"taux": "20", "actif": true}}	120	2026-08-21	2026-10-21	Larisa	2026-08-22	Larisa	mensuel	10.00	50.00	Analamanga	2	FIT 3/2/2026	8	2026-08-21 13:35:07.943765
10	RAMBOLAMANANA	Kintan'ny Amoromania	Fandriana	12/HF 2010	034 52 123 45	mail@gmail.com	3	f	somacau	Antsahavola	0345007145	105 852 741	2026-08-15	Fandriana		hotellerie_restauration	{"tv": {"taux": "25000", "actif": true}, "radio": {"taux": "25000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	105000	2026-08-01	2026-08-22	Larisa	2026-08-22	Antananarivo	mensuel	50000.00	5000.00	Amoron'ny Mania	1	AND 6/2/2026	7	2026-08-22 09:50:45.057473
11	RAFENO	Ze Maika	Analakely	12/op	034 52 1554 44	mail@gmail.com		t	somacau	Antsahavola	0345007145	1110555 666	2026-08-16	Raliva		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "1000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	87000	2026-08-22	2026-10-21	LARISA	2026-08-26	Antananarivo	mensuel	80000.00	5000.00	Analamanga	2	FIT 5/2/2026	8	2026-08-22 14:21:09.815472
12	RAZANAKOTO	Tsangatsanga Hotel	Andraharo	102/op	034 52 123 69	hrandriatsitoaina@gmail.com		t	RAKOTOMANATSOA Fidelise	Andraharo	034 52 123 96	101 456 852 45	2026-08-24	Antanato		hotellerie_restauration	{"tv": {"taux": "10000", "actif": true}, "radio": {"taux": "10000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	45000	2026-08-24	2026-10-13	RANDRIATSO Larix	2026-08-24	Antananarivo	mensuel	0.00	5000.00	Fianarantsoa	2	AND 7/2/2026	7	2026-08-24 12:25:45.830564
13	d	d						f	d			d	\N			restauration	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	7000	2026-08-30	2026-08-27	h	2026-08-13	h	mensuel	0.00	5000.00	Tolaniaro	1	AND 8/2/2026	7	2026-08-24 12:32:45.145989
14	c	c						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "2000", "actif": true}, "autres": {"taux": "2000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	13000	2026-08-24	2026-08-27	Andrianaivo	2026-08-25	Tananarivo	mensuel	0.00	5000.00	Fianarantsoa	2	AND 9/2/2026	7	2026-08-24 12:43:51.067677
15	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	s			s	\N			restauration	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	16000	\N	\N	d	\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 10/2/2026	7	2026-08-24 12:51:54.483672
16	f	f	f					f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "2000", "actif": true}, "radio": {"taux": "2000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	13000	2026-08-18	2026-08-18	rt	2026-08-19	t	mensuel	0.00	5000.00	Fianarantsoa	2	AND 11/2/2026	7	2026-08-24 12:56:06.931564
17	d	d						f	d		d	d	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "", "actif": false}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	185000	\N	\N	d	\N		mensuel	90000.00	5000.00	Diana	2	AND 12/2/2026	7	2026-08-24 13:04:08.032207
38	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	101	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	14000	\N	\N		\N		mensuel	2000.00	2000.00	Tolaniaro	1	AND 18/2/2026	7	2026-08-25 12:33:07.186912
40	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	x	\N			hotellerie_restauration	{"tv": {"taux": "10", "actif": true}, "radio": {"taux": "10", "actif": true}, "autres": {"taux": "10", "actif": true}, "lecteur": {"taux": "10", "actif": true}}	50	\N	\N		\N		mensuel	0.00	10.00	Tolaniaro	1	AND 20/2/2026	7	2026-08-25 12:46:20.801411
18	RASOLOBE Rijamanana	Soa Felling Behintsy	Lot XV Behintsy	101 562 789/2023 	0345007145	hrandriatsitoaina@gmail.com		t	RASOLOMANANA Jen Fredy	Lot XD Fenoarivo	0345007145	101 5689 564 65	1994-08-11	Antanandava		hotellerie_restauration	{"tv": {"taux": "65000", "actif": true}, "radio": {"taux": "35000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	105000	2026-08-25	2026-11-24	SABORAH IASHIF HUSSAIN	0026-07-29	Mahajanga	mensuel	0.00	5000.00	Analamanga	1	RAM 1/2/2026	9	2026-08-25 09:40:33.509573
19	r	r						f	r		r	r	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "5000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	f	\N		mensuel	0.00	5000.00	Tolaniaro	1	RAM 2/2/2026	9	2026-08-25 10:00:08.952408
20	dd	d						f	d		d	d	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	s	\N		mensuel	0.00	5000.00	Diana	1	RAM 3/2/2026	9	2026-08-25 11:15:27.475682
21	F	F						f	F			F	\N			hotellerie_restauration	{"tv": {"taux": "35000", "actif": true}, "radio": {"taux": "85000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	125000	\N	\N	F	\N		mensuel	0.00	5000.00	Fianarantsoa	1	RAM 4/2/2026	9	2026-08-25 11:20:11.024001
22	d	d						f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "55000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	66000	\N	\N		\N		mensuel	0.00	5000.00	Diana	1	RAM 5/2/2026	9	2026-08-25 11:24:05.248471
23	d	d	d					f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5500", "actif": true}, "autres": {"taux": "56000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	66500	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	RAM 6/2/2026	9	2026-08-25 11:31:33.693414
24	d	d						f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "59000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	70000	\N	\N		\N		mensuel	0.00	5000.00	Diana	1	RAM 7/2/2026	9	2026-08-25 11:34:54.800097
25	d	d						f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "64998", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	74998	\N	\N	d	\N		mensuel	0.00	5000.00	Diana	1	RAM 8/2/2026	9	2026-08-25 11:39:06.615461
26	x	d						f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "65000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	75000	\N	\N	d	\N		mensuel	0.00	5000.00	Diana	1	RAM 9/2/2026	9	2026-08-25 11:40:53.227094
27	ff	f	f					f	f		f	f	\N			hotellerie_restauration	{"tv": {"taux": "5600", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15600	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	RAM 10/2/2026	9	2026-08-25 11:44:32.038966
28	f	f	f					f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "55000", "actif": true}, "radio": {"taux": "89000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	209200	\N	\N	f	\N		mensuel	0.00	0.00	Fianarantsoa	1	RAM 11/2/2026	9	2026-08-25 11:51:33.746111
29	d	d						f	Hr ANDRIATSITOAINA	Antsahavola	0345007145	d	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	0.00	Diana	1	RAM 12/2/2026	9	2026-08-25 11:52:44.278079
30	RR	R		R				f	R		R	R	\N			hotellerie_restauration	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	16000	\N	\N		\N		mensuel	0.00	0.00	Mahajanga	1	RAM 13/2/2026	9	2026-08-25 12:00:57.705805
31	X	X						f	X		X	X	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "6000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	16000	\N	\N		\N		mensuel	0.00	0.00	Tolaniaro	1	RAM 14/2/2026	9	2026-08-25 12:02:22.974943
32	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	4	f	r			r	\N			hotellerie_restauration	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "6000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	65000	\N	\N		\N		mensuel	0.00	53000.00	Tolaniaro	1	RAM 15/2/2026	9	2026-08-25 12:07:08.754347
33	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	x			d	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500003", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	505003	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 13/2/2026	7	2026-08-25 12:13:53.264665
34	g	g						f	g			g	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	70000	\N	\N	g	\N		mensuel	0.00	0.00	Manjakandriana	2	AND 14/2/2026	7	2026-08-25 12:26:20.795421
35	tt	t						f	t			t	\N			hotellerie_restauration	{"tv": {"taux": "55000", "actif": true}, "radio": {"taux": "55000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150000	\N	\N	t	\N		mensuel	40000.00	0.00	Tolaniaro	1	AND 15/2/2026	7	2026-08-25 12:27:40.051428
36	gg	g						f	g		g	g	\N			hotellerie_restauration	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	7000	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	AND 16/2/2026	7	2026-08-25 12:28:53.284201
37	r	r						f	r			r	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	469300	\N	\N		\N		mensuel	456000.00	12300.00	Manjakandriana	1	AND 17/2/2026	7	2026-08-25 12:30:00.5776
39	f	f						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "5000", "actif": true}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	AND 19/2/2026	7	2026-08-25 12:39:44.648638
41	RAKOTO	Z						f	Z			Z	\N			hotellerie_restauration	{"tv": {"taux": "5500", "actif": true}, "radio": {"taux": "5500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	16000	2026-08-27	2026-08-31	rasolomanana	2026-08-27	Andraisora	mensuel	0.00	5000.00	Manjakandriana	1	AND 21/2/2026	7	2026-08-26 07:19:58.280113
42	s	s						f	somacau	Antsahavola	0345007145	s	\N			hotellerie_restauration	{"tv": {"taux": "56000", "actif": true}, "radio": {"taux": "56000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	162000	\N	\N		\N		mensuel	0.00	50000.00	Fianarantsoa	1	AND 22/2/2026	7	2026-08-26 08:15:53.737935
43	f	f						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	AND 23/2/2026	7	2026-08-26 09:25:15.903562
44	f	f						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "90000", "actif": true}, "radio": {"taux": "90000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	185000	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	AND 24/2/2026	7	2026-08-26 09:49:06.09763
45	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 25/2/2026	7	2026-08-26 09:53:23.322838
46	Hr	ANDRIATSITOAINA	Antsahavola	e	0345007145	hrandriatsitoaina@gmail.com		f	e	e		e	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	e	\N		mensuel	0.00	5000.00	Fianarantsoa	1	AND 26/2/2026	7	2026-08-26 11:44:07.322999
47	f	f						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5000	\N	\N		\N		mensuel	0.00	0.00	Fianarantsoa	1	AND 27/2/2026	7	2026-08-26 11:52:56.917566
48	d	d						f	d			d	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	17500	\N	\N		\N		mensuel	2500.00	5000.00	Diana	1	AND 28/2/2026	7	2026-08-26 12:34:33.166544
49	FETRA	f						f	f			f	\N			hotellerie_restauration	{"tv": {"taux": "49999", "actif": true}, "radio": {"taux": "50000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	104999	\N	\N		\N		mensuel	0.00	5000.00	Fianarantsoa	1	AND 29/2/2026	7	2026-08-26 12:42:53.758904
50	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	{"tv": {"taux": "65000", "actif": true}, "radio": {"taux": "5500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	70500	\N	\N		\N		mensuel	0.00	0.00	Manjakandriana	1	AND 30/2/2026	7	2026-08-26 12:59:30.542067
51	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	56	2026-08-17	yy	y	hotellerie_restauration	{"tv": {"taux": "5", "actif": true}, "radio": {"taux": "5", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15	\N	\N		\N		mensuel	0.00	5.00	Toliara	1	AND 31/2/2026	7	2026-08-26 13:01:42.849664
52	e	e						f	somacau	Antsahavola	0345007145	e	\N			hotellerie_restauration	{"tv": {"taux": "55000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	65000	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	AND 32/2/2026	7	2026-08-26 13:17:19.111674
53	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	35647+98	\N			hotellerie_restauration	{"tv": {"taux": "62999", "actif": true}, "radio": {"taux": "55000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	122999	\N	\N		\N		mensuel	0.00	5000.00	Vatomandry	1	AND 33/2/2026	7	2026-08-26 13:41:22.299073
54	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	<	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	66000	\N	\N		\N		mensuel	0.00	56000.00	Mahajanga	1	AND 34/2/2026	7	2026-08-26 14:17:17.639815
55	RAKOTONAIVOA	Hotely Sakafon'ny Saina 	Ampasapito	105/IO 2024	0345007145	Rakoto@gmail.com	5	f	RABEMANATSOA Felix	Lot YC 23 Andraharo	034 52 154 48	101 454 964 4 	2026-08-10	Andrainarivo	Chef	hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "5000", "actif": true}}	20000	2026-08-27	2026-10-28	RAMAHEFASOA Larisa	2026-08-27	Antananarivo	mensuel	0.00	5000.00	Analamanga	1	AND 35/2/2026	7	2026-08-27 08:25:11.041317
56	SAKATI BOy	Zanaka Taisaka Log	Antsahavola	1234/LOP	0345007145	TAISAKA@gmail.com	5	f	rasolomanana	LOT XC 234 lm	034 52 68 78 	 101 569 854 23	2026-08-17	tANA	cHEFR DE COMPAIGNE	hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	2026-08-28	2026-10-25	RASOLOBE	2026-08-28	Antananarivo	mensuel	0.00	5000.00	Vatovavy Fito Vinany	1	FIT 6/2/2026	8	2026-08-28 08:58:28.506441
57	Hr	RANTSANA Loharano	Antsahavola	e	0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	101 569 852 45	2026-08-30	Az	Chef	hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 7/2/2026	8	2026-08-28 09:24:39.645092
58	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	3	f	somacau	Antsahavola	0345007145	52	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 8/2/2026	8	2026-08-28 09:35:19.86972
59	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	2	f	Hr ANDRIATSITOAINA	Antsahavola	0345007145	5	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Vatomandry	1	FIT 9/2/2026	8	2026-08-28 09:38:24.581409
60	Hr	KISOA Kely	Antsahavola	1234/2026	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	101 564 854 454	2026-08-28	Antananarivo	Chef Province	hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	2026-08-28	2026-08-30	RASOLOMANANA Fenohasina	2026-08-28	RAZAFINANANTSOA Lirisa	mensuel	0.00	50.00	Fianarantsoa	1	AND 10/2/2026	8	2026-08-28 11:10:55.068511
61	RAZANANAIVO 	Hotelinstsika Fahazaza	Antsahavola	12JDJ	0345007145	mail@gmail.com		t	RANDRENDRA	Antsahavola	0345007145	101 5669 87 42	2026-08-28	Antanana	Chef de brigade	hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "50", "actif": true}, "lecteur": {"taux": "", "actif": false}}	200	2026-08-28	2026-12-01	RASOLO	2026-08-28	Antananarivo	mensuel	0.00	50.00	Analamanga	1	FIT 11/2/2026	8	2026-08-28 14:23:52.491011
62	RASOLOMANANA Fenohaja	HAZOVATO	Antsahavola	12JDJ:2026	0345007145	mail@gmail.com		t	RABEHAJA Solofo	Antsahavola lot xv 	034 52 123 69	101 563 214 89	2026-08-23	Antanandrano	Pretre 	hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	2026-08-30	2026-10-27	RAFENOMANANTSOA	2026-08-29	Antananarivo	mensuel	0.00	500.00	Analamanga	1	AND 36/2/2026	7	2026-08-29 08:24:45.803382
63	Hr	ANDRIATSITOAINA	Antsahavola	g	0345007145	hrandriatsitoaina@gmail.com	3	f	G	G		G	\N			hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5100	\N	\N	Aingo	\N		mensuel	0.00	5000.00	Toliara	1	AND 37/2/2026	7	2026-08-29 12:22:24.327383
64	Hr	ANDRIATSITOAINA	Antsahavola	f	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	101202	2026-08-24	tana	pretre	hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "1000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	7000	2026-08-29	2026-10-25	RASOANDRAIBE	2026-08-29	Ambaja	mensuel	0.00	5000.00	Toliara	1	AND 38/2/2026	7	2026-08-29 13:21:08.84957
65	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	101	\N			hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	2500	\N	\N		\N		mensuel	0.00	500.00	Toliara	2	AND 39/2/2026	7	2026-08-31 08:35:39.816568
66	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	102	2026-08-18	2	p	hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "50", "actif": true}, "lecteur": {"taux": "50", "actif": true}}	250	\N	\N		\N		mensuel	0.00	50.00	Tolaniaro	1	AND 40/2/2026	7	2026-08-31 10:11:54.683107
67	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	10	2026-09-02	tana	d	hotellerie_restauration	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N	f	\N		mensuel	0.00	50.00	Manjakandriana	1	FIT 12/2/2026	8	2026-08-31 12:08:35.229453
68	Hr	ANDRIATSITOAINA	Antsahavola	d	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	d	2026-08-31	d	d	hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1050	\N	\N		\N		mensuel	0.00	500.00	Toliara	1	FIT 13/2/2026	8	2026-08-31 12:17:41.471822
69	RANAIVO	Hotely Tsis Kisoa 	Lot XC Andraharo	123/AZ3	034 56 032 33	mail@gmail.com		t	RAZAFINDRAVELO Jean Luc	Lot XS Anjanahary	034 59 654 32	101 345 443 11	2026-08-30	Ampandrana	Prefet	hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "500", "actif": true}}	2000	2026-08-31	2026-11-04	RASOLOJAONINA	2026-08-31	Mahajanga	mensuel	0.00	500.00	Mahajanga	1	AND 41/2/2026	7	2026-08-31 18:21:03.162567
70	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	d	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5001", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	10001	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	AND 42/2/2026	7	2026-08-31 18:22:33.39799
71	Hr	ANDRIATSITOAINA	Antsahavola	12	0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	df	2026-09-23	f	f	hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	2026-09-01	2026-10-20	RAVALOMANANA	2026-09-09	Antananarivo	mensuel	0.00	500.00	Tolaniaro	1	FIT 14/3/2026	8	2026-09-01 06:53:02.921264
72	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	150	\N			hotellerie_restauration	{"tv": {"taux": "10000", "actif": true}, "radio": {"taux": "10000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	25000	\N	\N	sd	\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 15/3/2026	8	2026-09-01 07:07:25.723569
73	Hr	ANDRIATSITOAINA	Antsahavola	s	0345007145	hrandriatsitoaina@gmail.com	5	f	somacau	Antsahavola	0345007145	102 	2026-09-28	s	prefet	hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	2026-09-08	2026-09-17	Rabe	\N	tana	mensuel	0.00	5000.00	Besarety	1	FIT 16/3/2026	8	2026-09-01 08:12:24.895595
74	Hr	ANDRIATSITOAINA	Antsahavola	12	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	156	\N			hotellerie_restauration	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	6000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	FIT 17/3/2026	8	2026-09-01 08:42:15.127306
75	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	3	f	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	164000	\N	\N		\N		mensuel	0.00	159000.00	Vatomandry	1	FIT 18/3/2026	8	2026-09-01 08:49:09.793799
76	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	105	2026-09-22	q		hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	8000	\N	\N		\N		mensuel	0.00	3000.00	Tolaniaro	1	FIT 19/3/2026	8	2026-09-01 09:00:30.495428
77	Hr	ANDRIATSITOAINA	Antsahavola	c	0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	1015	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	FIT 20/3/2026	8	2026-09-01 09:20:15.443363
78	Hr	ANDRIATSITOAINA	Antsahavola	E	0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	105	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	FIT 21/3/2026	8	2026-09-01 09:46:43.711321
79	Hr	ANDRIATSITOAINA	Antsahavola	s	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	s	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	50	\N	\N		\N		mensuel	0.00	0.00	Manjakandriana	1	FIT 22/3/2026	8	2026-09-01 09:48:56.53852
80	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	50	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 23/3/2026	8	2026-09-01 09:56:46.409001
81	Hr	ANDRIATSITOAINA	Antsahavola	12	0345007145	hrandriatsitoaina@gmail.com	2	f	somacau	Antsahavola	0345007145	45	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	10000	\N	\N		\N		mensuel	0.00	0.00	Vatomandry	1	FIT 24/3/2026	8	2026-09-01 10:03:36.522579
82	Hr	ANDRIATSITOAINA	Antsahavola	12JDJ	0345007145	hrandriatsitoaina@gmail.com	5	f	somacau	Antsahavola	0345007145	156	2026-09-15	tana	chef	hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	13000	\N	\N		\N		mensuel	0.00	8000.00	Tolaniaro	1	FIT 25/3/2026	8	2026-09-01 11:17:14.511058
83	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	zaz			150	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 26/3/2026	8	2026-09-01 11:20:12.319677
84	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	156	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	500	\N	\N		\N		mensuel	0.00	0.00	Toliara	1	FIT 27/3/2026	8	2026-09-01 11:20:50.891692
85	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	15	2026-09-08		s	hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	2026-09-15	2026-09-23	RAKOTO	\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 28/3/2026	8	2026-09-01 11:32:59.45232
86	Hr	ANDRIATSITOAINA	Antsahavola	62	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	105	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	FIT 29/3/2026	8	2026-09-01 11:33:50.677956
87	Hr	ANDRIATSITOAINA	Antsahavola	12JDJ	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	150	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	10000	\N	\N		\N		mensuel	0.00	5000.00	Atsinanana	1	AND 43/3/2026	7	2026-09-01 11:40:47.576871
88	Hr	ANDRIATSITOAINA	Antsahavola	45	0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	105	2026-09-21			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	163000	\N	\N		\N		mensuel	0.00	153000.00	Mahajanga	1	AND 44/3/2026	7	2026-09-01 12:08:30.239227
89	Hr	ANDRIATSITOAINA	Antsahavola	s	0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	505	\N			hotellerie_restauration	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Mahajanga	1	AND 45/3/2026	7	2026-09-01 12:17:50.681964
90	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	45	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5500	\N	\N		\N		mensuel	0.00	5000.00	Diana	1	AND 46/3/2026	7	2026-09-01 12:22:33.277891
91	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		f	somacau	Antsahavola	0345007145	105	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "500", "actif": true}, "lecteur": {"taux": "", "actif": false}}	6000	\N	\N		\N		mensuel	0.00	5000.00	Mahajanga	1	AND 47/3/2026	7	2026-09-01 12:27:53.635507
92	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com		t	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "300", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	800	\N	\N		\N		mensuel	0.00	500.00	Manjakandriana	1	AND 48/3/2026	7	2026-09-01 16:04:03.013108
93	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	2	t	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "2121", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5242	\N	\N		\N		mensuel	0.00	3121.00	Manjakandriana	1	AND 49/3/2026	7	2026-09-01 16:05:20.119422
94	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	4	f	somacau	Antsahavola	0345007145	12	\N			hotellerie_restauration	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "333", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	13666	\N	\N		\N		mensuel	0.00	13333.00	Mahajanga	1	FIT 30/3/2026	8	2026-09-01 16:07:24.962738
\.


--
-- Data for Name: usagers_magasin; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_magasin (id, demandeur, denomination, adresse_siege, nif_stat, telephone, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, activite, nombre_magasins, moyens_communication, total, a_compter_du, echeance, confirmation_nom, date_signature, lieu_signature, type_paiement, montant_mensuel, frais_dossier, region, uniter, numero_dossier_utilisateur, created_by, created_at) FROM stdin;
1	RASOLO	Ilay Nosy	Ambohimangakely	12/ER 2024	034 58 412 36	Hr ANDRIATSITOAINA	Antsahavola	0345007145	101 456 231 8	2026-08-17	 Antsobolo		Vente ppn	5	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false, "periode": "mois"}, "lecteur": {"taux": "50", "actif": true}}	200	\N	\N	Larisa	2026-08-13	tana	mensuel	50.00	50.00	Analamanga	1	FIT 1/2/2026	8	2026-08-20 14:07:45.137499
2	RABENJAMINA Laurent 	ANAKAO Log	Amoronakona 	120L/lm	034 52 548 52	RAZANAMANGA	Antsahavola 	034 85 456 12	109 789 452 12	1998-04-05	Antokotany	Chef de Market	Vente de Materielle PPN de Moronakona 	1	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "80", "actif": true}, "autres": {"taux": "90", "actif": true}, "lecteur": {"taux": "", "actif": false}}	300	2026-08-21	2026-10-04	Larisa	2026-08-21	Antananarivo	mensuel	80.00	50.00	Toliara	2	FIT 2/2/2026	8	2026-08-21 13:48:36.064082
3	RABENJAMINA 	Ilay Nosy	Ambohimangakely	104/OP 1998	0345007145	RAZANAMANDIMBY	lot 23 IO	034 52 123 47	101 45 7889	2026-08-31	Mahajanga	Chef  b	Vente PPN	3	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "6000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	97000	2026-08-22	2026-08-25	lARISA	2026-08-22	Antananarivo	mensuel	80000.00	5000.00	Analamanga	2	AND 1/2/2026	7	2026-08-22 09:57:08.663353
4	RAZANAMADY Alvine	Super Maky	Lot HJ Andraharo	 123/m 1999	034 52 123 48	FALIMANANJARY Fenohasina 	Andraisoro	0345007145	159 789 426 53	2026-08-23	Antananarivo	Chef de marketing	Vente PPN	6	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	2026-08-21	2026-10-13	RAZANATIANA Larisa 	2026-08-25	Antananarivo	mensuel	0.00	5000.00	Analamanga	1	AND 2/2/2026	7	2026-08-23 06:51:04.749149
5	RAZANANY 	shop liantsoa 	Analakely 	1234/LOP	0345007145	Hr ANDRIATSITOAINA	Antsahavola	0345007145	102 568 42 124	2026-08-24	Andrainarivo	Chef be	vent porduit laiter 	5	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	60000	2026-08-23	2026-10-23	Andria lARISA	2026-08-23	Antananarivo	mensuel	0.00	50000.00	Tolaniaro	2	AND 3/2/2026	7	2026-08-23 07:01:54.40541
6	RAKOTOMALALA Felix	Super U	Antsahavola	1234/UO	0345007145	RANDRIANASOLO Ferdinant 	Lot AZ I Ml	0345007145	101 254 789 56	2026-08-26	Andrainarivo	Chef de departement 	Vente PPN	5	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	27000	2026-08-26	2026-08-27	RAMANANTSOA Aingo	2026-09-23	Antananarivo	mensuel	0.00	5000.00	Diana	2	AND 4/2/2026	7	2026-08-26 07:17:49.289926
7	h	h				h		h	101	\N			TEXTEL	3	{"tv": {"taux": "5300", "actif": true}, "radio": {"taux": "5500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15800	\N	\N	re	\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 5/2/2026	7	2026-08-26 07:28:06.203501
8	RAMANANTSOA Larisa	RAFANOMEZANTSOA	Antsahavola	2000/2039	0345007145	Hr ANDRIATSITOAINA	Antsahavola	0345007145	101 569 845 32	2026-08-27	Andrainarivo	Chef province	vente PPN	5	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	27000	\N	\N	GEAL	\N		mensuel	0.00	5000.00	Diana	2	AND 6/2/2026	7	2026-08-26 07:38:38.507838
9	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	Hr ANDRIATSITOAINA	Antsahavola	0345007145	d	\N			d	6	{"tv": {"taux": "59998", "actif": true}, "radio": {"taux": "5300", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	70298	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	AND 7/2/2026	7	2026-08-26 08:05:54.754443
10	Hr	ANDRIATSITOAINA	Antsahavola	1234	0345007145	somacau	Antsahavola	0345007145	102	2026-08-18	Tana	Chef	TEXTEL	5	{"tv": {"taux": "9000", "actif": true}, "radio": {"taux": "15000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	29000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 8/2/2026	7	2026-08-26 08:23:32.421465
11	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	c			c	\N			c	5	{"tv": {"taux": "1590", "actif": true}, "radio": {"taux": "9650", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	16240	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	AND 9/2/2026	7	2026-08-26 09:27:12.239659
12	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	4	\N			TEXTEL	4	{"tv": {"taux": "65000", "actif": true}, "radio": {"taux": "9000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	79000	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	AND 10/2/2026	7	2026-08-26 09:34:13.751052
13	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	5	\N			5	5	{"tv": {"taux": "6000", "actif": true}, "radio": {"taux": "", "actif": false}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "5000", "actif": true}}	16000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	AND 11/2/2026	7	2026-08-26 09:50:08.770341
14	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	2	\N			2	2	{"tv": {"taux": "50000", "actif": true}, "radio": {"taux": "50000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	105000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	AND 12/2/2026	7	2026-08-26 09:54:38.143558
15	e	e	e			e	e	e	e	\N			e	56	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	60000	\N	\N		\N		mensuel	0.00	50000.00	Tolaniaro	1	AND 13/2/2026	7	2026-08-26 11:45:16.440669
16	d	d				d	d		d	\N			d	50	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "54998", "actif": true}, "lecteur": {"taux": "", "actif": false}}	69998	\N	\N	5	\N		mensuel	0.00	5000.00	Diana	1	AND 14/2/2026	7	2026-08-26 12:37:10.808149
17	r	r		r		r	r		r	\N			r	4	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "5999", "actif": true}, "lecteur": {"taux": "", "actif": false}}	20999	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	AND 15/2/2026	7	2026-08-26 12:56:59.906415
18	Hr	ANDRIATSITOAINA	Antsahavola	e	0345007145	somacau	Antsahavola	0345007145	e	2026-08-25	e	e	TEXTEL	5	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	20500	\N	\N	ml	\N		mensuel	5500.00	5000.00	Tolaniaro	1	AND 16/2/2026	7	2026-08-26 13:18:46.294046
19	Hr	ANDRIATSITOAINA	Antsahavola	12	0345007145	somacau	Antsahavola	0345007145	102	2026-08-25	546	5	TEXTEL	5	{"tv": {"taux": "50000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	180000	\N	\N		\N		mensuel	0.00	125000.00	Manjakandriana	1	AND 17/2/2026	7	2026-08-26 13:42:14.990455
20	Hr	Tanindrazana 	Antsahavola	1234/12/2025	0345007145	somacau	Antsahavola	0345007145	102 354 321	2026-08-26	Tsarahonenana	Chef provence	TEXTEL	5	{"tv": {"taux": "3000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "4000", "actif": true}, "lecteur": {"taux": "2000", "actif": true}}	15000	2026-08-27	2026-10-18	RASOLOMANANA 	2026-08-27	Antananarivo	mensuel	0.00	5000.00	Toliara	1	AND 18/2/2026	7	2026-08-27 09:12:17.670966
21	Hr	ANDRIATSITOAINA	Antsahavola	12JDJ	0345007145	somacau	Antsahavola	0345007145	101	\N		x	5	5	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	25000	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	2	AND 19/2/2026	7	2026-08-27 11:32:34.67327
22	RASOLOMANANA	Tsenapokonolona Mamay	Antsahavola	12/AZ 2026 	0345007145	somacau	Antsahavola	0345007145	15	2026-08-31	Zerar	Chef	Vente ppn , Decoration Salle 	5	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "1000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	8000	2026-08-29	2026-09-02	RASOAMANANJARA Aingo	2026-08-30	Antananarivo	mensuel	0.00	5000.00	Manjakandriana	1	AND 20/2/2026	7	2026-08-28 07:28:59.512115
23	RASOLOJAONINA Fenohaja	Bazarin'ny Iarivo	Manjakaray	12/15 2026	0345007145	FENOHAJA Malala	Lot XD 25 M	034 58 951 42	105 456 874 42	1999-08-01	Ambohitravao	Gerent	Vent PPN , Aliment , ... 	2	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	2026-08-22	2026-08-31	RABEHAJA Malala	2026-08-28	Antananarivo	mensuel	0.00	50.00	Atsinanana	1	FIT 3/2/2026	8	2026-08-28 12:04:04.064028
24	RASOLOBE	BEHORIRIKA	Antsahavola	12JDJ	0345007145	somacau	Antsahavola	0345007145	105	2026-09-08	jirofo	Chef lieu de province	Vente de Maderielle informatique	50	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	2026-08-28	2026-08-23	RASOLO	2026-08-30	Antananarivo	mensuel	0.00	500.00	Vatomandry	1	FIT 4/2/2026	8	2026-08-28 12:38:30.526686
25	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	1015	2026-08-31		s	TEXTEL	5	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N		\N		mensuel	0.00	50.00	Toliara	1	FIT 5/2/2026	8	2026-08-28 14:10:26.188984
26	Hr	ANDRIATSITOAINA	Antsahavola	qs	0345007145	somacau	Antsahavola	0345007145	s	2026-09-01	s	s	s	5	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	10500	\N	\N		\N		mensuel	0.00	5000.00	Manjakandriana	1	FIT 6/2/2026	8	2026-08-31 12:22:18.731827
27	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	1	\N			TEXTEL	50	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Toliara	1	FIT 7/3/2026	8	2026-09-01 07:42:15.320098
28	Hr	ANDRIATSITOAINA	Antsahavola	df	0345007145	somacau	Antsahavola	0345007145	f	\N			f	5	{"tv": {"taux": "10000", "actif": true}, "radio": {"taux": "10000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	25000	\N	\N		\N		mensuel	0.00	5000.00	Mahajanga	1	FIT 8/3/2026	8	2026-09-01 07:46:20.762347
29	Hr	ANDRIATSITOAINA	Antsahavola	sd	0345007145	somacau	Antsahavola	0345007145	az	2026-09-12	zz	b	TEXTEL	55	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N		\N		mensuel	0.00	5000.00	Tolaniaro	1	FIT 9/3/2026	8	2026-09-01 08:26:38.782187
30	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	105	2026-09-29	f	f	TEXTEL	50	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1300	\N	\N		\N		mensuel	0.00	300.00	Vatovavy Fito Vinany	1	FIT 10/3/2026	8	2026-09-01 09:02:10.493431
31	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	189	\N			55	2	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	\N	\N		\N		mensuel	0.00	500.00	Tolaniaro	1	FIT 11/3/2026	8	2026-09-01 09:47:49.658073
32	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	d	\N			s	5	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	\N	\N		\N		mensuel	0.00	500.00	Tolaniaro	1	FIT 12/3/2026	8	2026-09-01 09:57:46.425546
33	Hr	ANDRIATSITOAINA	Antsahavola	45	0345007145	somacau	Antsahavola	0345007145	105	\N			TEXTEL	59	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5090	\N	\N		\N		mensuel	0.00	90.00	Manjakandriana	1	AND 21/3/2026	7	2026-09-01 11:49:20.810585
34	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	somacau	Antsahavola	0345007145	105	\N			E	45	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1000	\N	\N		\N		mensuel	0.00	500.00	Manjakandriana	1	AND 22/3/2026	7	2026-09-01 12:15:40.201971
\.


--
-- Data for Name: usagers_media; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_media (id, proprietaire_nom, proprietaire_adresse, proprietaire_tel, proprietaire_cin, proprietaire_cin_delivree, proprietaire_cin_lieu, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_pouvoir_date, representant_pouvoir_par, representant_fonction, denomination, frequence, canal, siege, telephone, email, nif, stat, taux, couverture_capitale, couverture_chef_lieu_province, couverture_chef_lieu_region, couverture_district, horaires_jusqua12, horaires_13a24, has_regions, regions_detail, type_paiement, montant_mensuel, frais_dossier, region, confirmation_nom, date_signature, lieu_signature, uniter, numero_dossier_utilisateur, created_by, created_at) FROM stdin;
1	RANDRIANDRASOLO	Lot 2 F 33 FX Ambatomaro	0345007145	101456078054	2001-08-21	Antanandrano	RABEMANANJARY	Lot XC 67	035 21 47 89	101 235 4884 52	2026-08-08	TANA	2026-08-09	RALEVA	Chef de comunication 	Real TV	106.4	6	Iaviloha 	034 50 458 79	mail@gmail.com	23/lo 1987	654 /lm / 2001	5000.00	t	f	t	t	f	t	f	[]	mensuel	0.00	1230.00	Analamanga	Larisa	2026-08-21	Antananarivo Be	1	FIT 1/2/2026	8	2026-08-21 14:06:59.036279
2	RAVELOMANANTSOA	Andraharo	034 52 123 48	101 458 753 52	2026-08-14	Ambatondrazaka	RANDRIANARIVOLO Sarila	Andrainarivo	034 58 753 62	101 45 454	2026-08-09	Anmatondrazaka	2026-08-05	PDG de societe	Chif journaliste	TVM 	108..6	canal 5	Anosy 	034 85 456 12	tvm@gmail.com	123/9O 1978	145M/OI	500.00	t	f	t	f	f	t	f	[]	mensuel	0.00	5000.00	Vatovavy Fito Vinany	ANDRIANTSOA Larisa	2026-08-21	Antananarivo	1	FIT 2/2/2026	8	2026-08-21 14:33:56.268611
3	RAZAFIMANDE	Andraharo	034 52 128 74	105 456 78 53	2026-08-17	Ambalavao	RACHEFO Mandresy	Andraisora	031 54 45 97 	101 54 894654 5	2026-08-21	Tana	2026-09-02	Chef deba	Chef Journaliste	Viva Radia	105	canal 9	Antsahavola	0345007145	hrandriatsitoaina@gmail.com	404	101	50.00	f	t	f	f	t	f	f	[]	mensuel	0.00	5000.00	Atsinanana	Larisa	2026-08-21	Antananarrivo	1	FIT 3/2/2026	8	2026-08-21 14:44:29.895584
4	RABEZAVANA	Anbohimahintsy	034 58 741 12	101 654 789 42	2026-08-22	Ambatondrazaka	RAZANABELOMANANA	Andraharo	034 52 123 45	101 456 785 	2026-08-23	Louvre	2026-08-17	Chef 	Chef Marketing	RECORD TV/FM	105 TV ET 106 FM	canal 89 VHF	Anosizato	034 50 156 75	record@gmail.com	123/op 24	101	150000.00	t	f	f	t	f	t	f	[]	mensuel	0.00	5000.00	Analamanga	LARISA	2026-08-22	MADAGASIKARA	1	AND 1/2/2026	7	2026-08-22 10:01:42.743287
5	rabe	Andraisaro	063 58 456 12	101 456 789 32	2026-08-23	Ambatondrazaka	ANDRIAMASINORO	Analamahintsy	034 50 12 456	555 999 	2026-08-23	Zazavao	2026-10-14	Androany	Chef deba pr	Ma tv 	105	3	Anosivavaka 	034 52 123 48	hrandriatsitoaina@gmail.com	404	101	500000.00	t	f	t	f	t	f	f	[]	mensuel	0.00	5000.00	Analamanga	RAFETRANIAINA	2026-08-24	Antananarivo	1	AND 2/2/2026	7	2026-08-23 12:52:28.130967
6	RAHARIMALALA Jonathan	Lot 2 F 33 FX Ambatomaro	035 23 124 78	101 563 475 56	2026-08-26	Ambatondrazaka	RAFENOMANANA Jean Luc	Antsahavola	0345007145	101 568 985 452	2026-08-26	Andrainarivo	2026-08-24	Ampitatafika	Chef de projet 	Hr ANDRIATSITOAINA	105	Canal 35	Antsahavola	0345007145	hrandriatsitoaina@gmail.com	404:256	101/Mbola	55000.00	t	f	t	f	t	f	f	[]	mensuel	0.00	5000.00	Manjakandriana	Hr ANDRIATSITOAINA	2026-08-27	Ambatondrazaka	1	AND 3/2/2026	7	2026-08-26 07:00:28.605828
7	somacau	Antsahavola	0345007145	f	\N		f	f	f	1	\N		\N			somacau	101		Antsahavola	0345007145	mail@gmail.com			590000.00	f	f	f	f	f	f	f	[]	mensuel	0.00	5000.00	Manjakandriana		\N		1	AND 4/2/2026	7	2026-08-26 09:28:20.749519
8	somacau	Antsahavola	0345007145	52	\N		5	r	r	r	\N		\N			f	f		f	f				590000.00	f	f	f	f	f	f	f	[]	mensuel	590000.00	50000.00	Toliara		\N		1	AND 5/2/2026	7	2026-08-26 09:38:25.099666
9	tr	t	t	t	\N		t	t	t	t	\N		\N			t	t	t	t	t				5520000.00	f	f	f	f	f	f	f	[]	mensuel	5520000.00	5000.00	Tolaniaro		\N		1	AND 6/2/2026	7	2026-08-26 12:23:42.989973
10	somacau	Antsahavola	0345007145	d	\N		d	d	d	d	\N		\N			Hr ANDRIATSITOAINA	d		Antsahavola	0345007145	hrandriatsitoaina@gmail.com	f	f	550000.00	t	t	f	t	t	f	f	[]	mensuel	550000.00	5000.00	Vatomandry	fg	\N		1	AND 7/2/2026	7	2026-08-26 12:31:24.426505
11	gg	g	g	g	\N		g	g	g	g	\N		\N			Hr ANDRIATSITOAINA	g	g	Antsahavola	0345007145	hrandriatsitoaina@gmail.com	g	g	59000.00	f	t	f	t	f	t	f	[]	mensuel	59000.00	5000.00	Toliara		\N		1	AND 8/2/2026	7	2026-08-26 12:39:39.689
12	somacau	Antsahavola	0345007145	101456078054	\N		somacau	Antsahavola	0345007145	111021	2026-08-18	mp	2026-08-25			somacau	20	20	Antsahavola	0345007145	mail@gmail.com	404	101	560000.00	f	f	f	f	f	f	f	[]	mensuel	560000.00	5000.00	Tolaniaro		\N		1	AND 9/2/2026	7	2026-08-26 13:43:35.255284
13	RANOMAHERY	Lot 2 F 33 FX Ambatomaro	0345007145	101456078054	2026-08-16	Ambatondrazaka	BENJAMINA Flavien	Lot XV Andraharo	0345007145	106 589 413 69	2026-08-29	Antananarivo	2026-08-29	Mgn Ambanja	Pretre 	Sioka Vaovao Mahafaly	105.3		Ampasamadilo Ambanja	034 52 123 45	mail@gmail.com	404/2019	101:6 TRS	55000.00	t	f	t	f	t	t	f	[]	mensuel	55000.00	5000.00	Analamanga	RAFALIMANANAJA Jean Luc	2026-08-29	Mahajanga	1	AND 10/2/2026	7	2026-08-29 09:07:15.05058
14	somacau	Antsahavola	0345007145	101	2026-09-09	ANTANANARIVO	somacau	Antsahavola	0345007145	1051	2026-09-22	lo	2026-09-22	1	chef	somacau	150	12	Antsahavola	0345007145	mail@gmail.com	23	101	5000.00	f	f	f	f	f	f	f	[]	mensuel	5000.00	55000.00	Manjakandriana		\N		1	FIT 4/3/2026	8	2026-09-01 07:52:22.850016
15	somacau	Antsahavola	0345007145	125	2026-09-22	56	somacau	Antsahavola	0345007145	102	2026-09-28	d	\N			somacau	12		Antsahavola	0345007145	mail@gmail.com	f		5000.00	f	f	f	f	f	f	f	[]	mensuel	5000.00	55000.00	Manjakandriana		\N		1	FIT 5/3/2026	8	2026-09-01 07:53:40.699875
16	somacau	Antsahavola	0345007145	&é	\N		é	é	é	é	\N		\N			somacau	é	é	Antsahavola	0345007145	mail@gmail.com	é	é	5000.00	f	f	f	f	f	f	f	[]	mensuel	5000.00	55000.00	Tolaniaro		\N		1	FIT 6/3/2026	8	2026-09-01 07:56:48.673419
17	somacau	Antsahavola	0345007145	15	2026-09-07	q	somacau	Antsahavola	0345007145	s	\N		\N			somacau	105		Antsahavola	0345007145	mail@gmail.com	404		123000.00	f	f	t	f	f	f	f	[]	mensuel	128000.00	5000.00	Mahajanga		\N		1	FIT 7/3/2026	8	2026-09-01 08:02:19.723364
18	somacau	Antsahavola	0345007145	150	2026-09-07	Ambatondrazaka	somacau	Antsahavola	0345007145	105	2026-09-21		\N		Prefet	somacau	105		Antsahavola	0345007145	mail@gmail.com	56	2	58000.00	f	f	f	f	f	f	f	[]	mensuel	60000.00	2000.00	Fianarantsoa	rabe	\N		1	FIT 8/3/2026	8	2026-09-01 08:31:11.419778
19	somacau	Antsahavola	0345007145	102	2026-09-22	fd	somacau	Antsahavola	0345007145	105	\N		\N			somacau	105		Antsahavola	0345007145	mail@gmail.com	150		5000.00	f	f	f	f	f	f	f	[]	mensuel	20000.00	15000.00	Analamanga		\N		1	FIT 9/3/2026	8	2026-09-01 09:03:45.950479
20	somacau	Antsahavola	0345007145	101456078054	2026-09-14		somacau	Antsahavola	0345007145	105	2026-09-15	451	2026-09-21	50	chehf	somacau	105		Antsahavola	0345007145	mail@gmail.com			55000.00	f	f	f	f	f	f	f	[]	mensuel	60000.00	5000.00	Manjakandriana		\N		1	AND 11/3/2026	7	2026-09-01 11:44:07.016463
\.


--
-- Data for Name: usagers_nightclub; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_nightclub (id, demandeur, denomination, adresse_siege, nif_stat, telephone, email, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, jauge_max, horaires, moyens_communication, total, a_compter_du, echeance, type_paiement, montant_mensuel, frais_dossier, region, confirmation_nom, date_signature, lieu_signature, uniter, numero_dossier_utilisateur, created_by, created_at) FROM stdin;
1	rasolobe	manatenasoa 	andraharo	12	12		Hr ANDRIATSITOAINA	Antsahavola	0345007145	101	2026-08-25	tana		50	20	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "50", "actif": true}}	200	\N	\N	mensuel	50.00	50.00	Tolaniaro	lrs	2026-08-20	tana	1	FIT 1/2/2026	8	2026-08-20 14:20:39.952498
2	RALEVA Mpampandihy	lA ROUTENDE 	Andravohangy	123/aze0	0345007145	mail@gmail.com	somacau	Antsahavola	0345007145	1056489794	2026-08-25	Vatomandry	chef deba	50	20-4	{"tv": {"taux": "100", "actif": true}, "radio": {"taux": "100", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	2026-08-22	2026-08-27	mensuel	700.00	600.00	Besarety	Larisa	2026-08-31	Antananarivo	1	AND 1/2/2026	7	2026-08-22 08:55:40.241267
3	RAHALINA	ALINA Maizina	lot 45 LM	12JDJ:1978	0345007145	mail@gmail.com	somacau	Antsahavola	0345007145	159	2026-08-25	Andraharo	Chef	50	20h	{"tv": {"taux": "", "actif": true}, "radio": {"taux": "", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	95000	2026-08-22	2026-10-19	mensuel	90000.00	5000.00	Fianarantsoa	Larisa	2026-08-22	Antananarivo	1	AND 2/2/2026	7	2026-08-22 10:18:27.930988
4	RAZANAMANDIMBY	Alin'ny Tanora	Antanimena	123/l	034 50 236 54	anora@gmail.com	Rabeza	Andrainarivo	034 52 189 65	109 456 78 5	2026-08-15	Atanikatsaka	DRH	50	20h	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	70000	2026-08-22	2026-10-27	mensuel	55000.00	5000.00	Mahajanga	RAZANAMANDIMBY Larisa	2026-08-22	Antananarivo	1	FIT 2/2/2026	8	2026-08-22 11:35:34.25848
5	d	d					d		d	d	\N			5	20	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "15", "actif": true}, "autres": {"taux": "15", "actif": true}, "lecteur": {"taux": "", "actif": false}}	509060	\N	\N	mensuel	0.00	509000.00	Manjakandriana		\N		2	AND 3/2/2026	7	2026-08-24 13:05:49.240905
6	f	f					f	f		f	\N			50	20	{"tv": {"taux": "5220", "actif": true}, "radio": {"taux": "9000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	19220	\N	\N	mensuel	0.00	5000.00	Manjakandriana		\N		1	RAM 1/2/2026	9	2026-08-25 11:28:20.087812
7	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	2	\N			5	52	{"tv": {"taux": "65000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	75000	\N	\N	mensuel	0.00	5000.00	Toliara		\N		1	AND 4/2/2026	7	2026-08-26 09:36:54.036042
8	eee	e					somacau	Antsahavola	0345007145	e	\N			54	54	{"tv": {"taux": "6980", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "320", "actif": true}, "lecteur": {"taux": "5000", "actif": true}}	17800	\N	\N	mensuel	0.00	5000.00	Manjakandriana		\N		1	AND 5/2/2026	7	2026-08-26 11:47:05.992466
9	Hr	ANDRIATSITOAINA	Antsahavola	12	0345007145	hrandriatsitoaina@gmail.com	f	Antsahavola	0345007145	ffdf	\N			5	f	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	mensuel	0.00	5000.00	Toliara		\N		1	AND 6/2/2026	7	2026-08-26 12:49:22.28556
10	Hr	ANDRIATSITOAINA	Antsahavola	fd	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	f	2026-09-01	f	f	23	50	{"tv": {"taux": "9500", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	19500	\N	\N	mensuel	0.00	5000.00	Tolaniaro		\N		1	AND 7/2/2026	7	2026-08-26 13:50:56.98463
11	Hr	ANDRIATSITOAINA	Antsahavola	f	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	r	\N		r	5	50	{"tv": {"taux": "4997", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	10497	\N	\N	mensuel	0.00	5000.00	Toliara		\N		1	AND 8/2/2026	7	2026-08-26 13:51:58.294647
12	Hr	ANDRIATSITOAINA	Antsahavola	s	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	s	2026-09-02	s	s	5	52	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	3000	\N	\N	mensuel	0.00	1000.00	Toliara		\N		1	AND 9/2/2026	7	2026-08-26 13:54:22.248957
13	Hr	ANDRIATSITOAINA	Antsahavola	g	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	g	\N		g	5	20	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	3000	\N	\N	mensuel	0.00	1000.00	Toliara		\N		1	AND 10/2/2026	7	2026-08-26 13:55:58.686617
14	RASOLO	SALAZAN'TSOSETY	Antsahavola	12JDJ	0345007145	mail@gmail.com	somacau	Antsahavola	0345007145	101 456 489 54	2026-08-26	Antananarivo	Chef Province 	50	20	{"tv": {"taux": "55000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	65000	2026-08-11	2026-09-10	mensuel	0.00	5000.00	Mahajanga	Larisa	2026-08-26	Antananarivo	1	AND 11/2/2026	7	2026-08-27 08:43:18.48296
15	Hr	KITOZA MASAKA	Antsahavola	d	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	12456	\N			50	50	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	mensuel	0.00	5000.00	Vatomandry	lARISA	\N		1	AND 12/2/2026	7	2026-08-27 08:45:18.336698
16	DANIMANGA Be	Alina Maizina (Mitapimasso)	Lot SX Antaninarnina	AZ12/2015	034  52 145 69	hrandriatsitoaina@gmail.com	rabotondraibe	Lot XC Soamanandraariny 	034 52 126 85	101 458 963 54	2026-08-28	Nanisana	Chef de province 	150	20h - 3:30	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "50", "actif": true}, "lecteur": {"taux": "50", "actif": true}}	250	2026-08-28	2026-09-29	mensuel	0.00	50.00	Analamanga	RAZANAMAHASOA Felix	2026-08-30	Antananarivo	1	FIT 3/2/2026	8	2026-08-28 13:47:15.95442
17	ALIN Randriamiseza	Zanakin'ny Alina 	Lot Z Antanimena	1234/2015	0345007145	mail@gmail.com	RASOLOJAONINA Hajarivo 	Antsahavola	0345007145	101 569 874 62	2026-08-28	Antananarivo	Chef de province	50	20	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "50", "actif": true}, "lecteur": {"taux": "50", "actif": true}}	250	2026-08-28	2026-08-12	mensuel	0.00	50.00	Fianarantsoa	y	\N	j	1	FIT 4/2/2026	8	2026-08-28 13:53:07.090209
18	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	\N			5	20	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N	mensuel	0.00	50.00	Vatomandry		\N		1	FIT 5/2/2026	8	2026-08-28 14:12:38.652442
19	Hr	ANDRIATSITOAINA	Antsahavola	fd	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	sd	2026-08-31	d	d	5	5	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N	mensuel	0.00	50.00	Tolaniaro		\N		1	FIT 6/2/2026	8	2026-08-31 12:30:56.368728
20	Hr	ANDRIATSITOAINA	Antsahavola	15	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	101	2026-09-16		45	5	20	{"tv": {"taux": "1000", "actif": true}, "radio": {"taux": "1000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	7000	\N	\N	mensuel	0.00	5000.00	Manjakandriana		\N		1	FIT 7/3/2026	8	2026-09-01 08:06:25.606529
21	Hr	ANDRIATSITOAINA	Antsahavola	EE	0345007145	hrandriatsitoaina@gmail.com	Hr ANDRIATSITOAINA	Antsahavola	0345007145	564	\N			52	20	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	2000	\N	\N	mensuel	0.00	1000.00	Tolaniaro		\N		1	FIT 8/3/2026	8	2026-09-01 08:41:15.299315
22	Hr	ANDRIATSITOAINA	Antsahavola	15	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	2026-09-29			50	20	{"tv": {"taux": "5", "actif": true}, "radio": {"taux": "5", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15	\N	\N	mensuel	0.00	5.00	Vatomandry		\N		1	FIT 9/3/2026	8	2026-09-01 09:08:29.611509
23	Hr	ANDRIATSITOAINA	Antsahavola	s	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	2026-09-22	s		50	20	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "5000", "actif": true}, "lecteur": {"taux": "", "actif": false}}	13000	\N	\N	mensuel	0.00	3000.00	Toliara		\N		1	FIT 10/3/2026	8	2026-09-01 11:19:06.223209
24	Hr	ANDRIATSITOAINA	Antsahavola	485	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	2026-09-21	54	ij	51	20	{"tv": {"taux": "50", "actif": true}, "radio": {"taux": "50", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	150	\N	\N	mensuel	0.00	50.00	Diana		\N		1	AND 13/3/2026	7	2026-09-01 11:42:20.532617
25	Hr	ANDRIATSITOAINA	Antsahavola	45	0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	\N			50	20	{"tv": {"taux": "", "actif": false}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	5500	\N	\N	mensuel	0.00	5000.00	Fianarantsoa		\N		1	AND 14/3/2026	7	2026-09-01 11:50:20.378515
26	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	105	\N			50	4	{"tv": {"taux": "5000", "actif": true}, "radio": {"taux": "5000", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	15000	\N	\N	mensuel	0.00	5000.00	Manjakandriana		\N		1	AND 15/3/2026	7	2026-09-01 12:21:35.199114
27	Hr	ANDRIATSITOAINA	Antsahavola		0345007145	hrandriatsitoaina@gmail.com	somacau	Antsahavola	0345007145	123	2026-10-05	D	D	1	20	{"tv": {"taux": "500", "actif": true}, "radio": {"taux": "500", "actif": true}, "autres": {"taux": "", "actif": false}, "lecteur": {"taux": "", "actif": false}}	1500	\N	\N	mensuel	0.00	500.00	Toliara		\N		1	FIT 11/3/2026	8	2026-09-01 16:10:19.898576
\.


--
-- Data for Name: usagers_occasionnel; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_occasionnel (id, demandeur, denomination, adresse_siege, nif_stat, telephone, email, representant_nom, representant_adresse, representant_tel, representant_cin, representant_cin_delivree, representant_cin_lieu, representant_fonction, organisateurs, representant_par, genre_manifestation, artistes, date_evenement, lieu_evenement, adresse, domicile, confirmation_nom, date_signature, lieu_ajout, frais_dossier, montant, montant_retard, is_retard, soit_total, date_ajout, nom_evenement, numero_dossier_global, numero_dossier_utilisateur, region, uniter, created_by, created_at) FROM stdin;
1	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		5000.00	55000.00	0.00	f	60000.00	2026-08-26	\N	1/08/2026	AND 30/2/2026		1	7	2026-08-26 11:42:26.261979
2	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		5000.00	35000.00	0.00	f	75000.00	2026-08-26	\N	2/08/2026	AND 31/2/2026		2	7	2026-08-26 12:02:26.285882
3	r		\N	\N		\N	\N	\N	\N		\N		\N	r			Raouto	\N					\N		5000.00	65000.00	5000.00	t	140000.00	2026-08-26	\N	3/08/2026	AND 32/2/2026		2	7	2026-08-26 12:44:39.803183
4	x		\N	\N		\N	\N	\N	\N		\N		\N	x				\N					\N		5000.00	556000.00	5000.00	t	1122000.00	2026-08-26	\N	4/08/2026	AND 33/2/2026		2	7	2026-08-26 13:40:04.998811
5	MALAZA BE MOZIKA		\N	\N	0345007145	\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N		Antsahavola	Antananavo		\N		5000.00	156200.00	5000.00	t	166200.00	2026-08-26	\N	5/08/2026	AND 34/2/2026		1	7	2026-08-26 13:44:44.271543
6	MALAZA BE MOZIKA		\N	\N	0345007145	\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA			Samoele	\N		Lot XD 56	Antananavo		\N		5000.00	55000.00	5000.00	t	65000.00	2026-08-27	\N	6/08/2026	FIT 8/2/2026	Manjakandriana	1	8	2026-08-27 11:58:55.236197
7	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		5000.00	55000.00	0.00	f	60000.00	2026-08-28	\N	7/08/2026	FIT 9/2/2026		1	8	2026-08-28 13:34:30.947152
8	MALAZA BE MOZIKA		\N	\N	034 56 432 45 	\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA			Rija Ramanantoanina	\N		Lot 2F 65 V Fenomanana Atsimo	Antananarivo		\N		5000.00	150000.00	0.00	f	155000.00	2026-08-31	\N	8/08/2026	FIT 10/2/2026	Analamanga	1	8	2026-08-31 18:07:54.247603
9	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA			Ny Ainga 	\N					\N		5000.00	55000.00	0.00	f	60000.00	2026-09-01	\N	9/09/2026	FIT 11/3/2026	Besarety	1	8	2026-09-01 08:33:42.581499
10	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		5000.00	55000.00	0.00	f	60000.00	2026-09-01	\N	10/09/2026	FIT 12/3/2026		1	8	2026-09-01 08:39:15.863856
11	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		500.00	1500.00	0.00	f	2000.00	2026-09-01	\N	11/09/2026	FIT 13/3/2026	Manjakandriana	1	8	2026-09-01 09:05:22.426472
12	MALAZA BE MOZIKA		\N	\N		\N	\N	\N	\N		\N		\N	MALAZA BE MOZIKA				\N					\N		500.00	5500.00	0.00	f	6000.00	2026-09-01	\N	12/09/2026	FIT 14/3/2026		1	8	2026-09-01 09:37:45.775978
\.


--
-- Data for Name: usagers_vus; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.usagers_vus (id, usager_id, usager_type, vu_le) FROM stdin;
1	5	hotel	2026-08-20 13:50:14.941492
4	1	hotel	2026-08-20 13:52:01.509898
7	20	grand-surface	2026-08-27 09:30:20.898631
10	3	bus	2026-08-27 09:46:39.445168
12	2	grand-surface	2026-08-27 10:04:32.621439
13	12	hotel	2026-08-31 18:31:33.942373
\.


--
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: omda_app; Owner: omda_user
--

COPY omda_app.utilisateurs (id, nom, email, mot_de_passe, role, statut, prefix, created_at, derniere_connexion) FROM stdin;
2	Admin OMDA	admin@omda.mg	1234	admin	actif	AD	2026-08-19 14:00:23.876598	\N
4	Jean Dupont	jean@omda.mg	1234	user	actif	JD	2026-08-19 14:00:23.916276	\N
5	Marie Claire	marie@omda.mg	1234	user	actif	MC	2026-08-19 14:00:23.935624	\N
12	RAKOTOTSARAFARA Jean Michel	rakoto@gmail.com	1234	user	actif	\N	2026-08-31 17:52:51.772572	2026-08-31 17:57:42.047382
13	bera	bera@gmail.com	1234	user	actif	\N	2026-09-01 10:05:51.157489	\N
1	Super Admin	superadmin@omda.mg	az78	super_admin	actif	SA	2026-08-19 14:00:23.738203	\N
6	Admin	Admin@gmail.com	az12	super_admin	actif	ADM	2026-08-19 14:00:23.958312	\N
8	FITAHIANTSOA Nemenjanahary	zara@gmail.com	1234	user	actif	\N	2026-08-20 14:01:55.6213	2026-09-01 16:09:30.321805
9	RAMANABOHITRA	vohitra@gmail.com	1234	daf	actif	\N	2026-08-25 08:30:10.22259	2026-08-25 09:20:46.164134
7	ANDRIATSITOAINA Herimbola	hr@gmail.com	1234	user	actif	\N	2026-08-19 14:06:51.683571	2026-09-02 07:46:28.271793
11	DAF	daf@omda.mg	5678	daf	actif	DAF	2026-08-27 12:12:35.376368	\N
\.


--
-- Name: activites_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.activites_id_seq', 10, true);


--
-- Name: artistes_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.artistes_id_seq', 32, true);


--
-- Name: backup_annuel_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.backup_annuel_id_seq', 1, false);


--
-- Name: backup_historique_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.backup_historique_id_seq', 9, true);


--
-- Name: compteurs_dossiers_utilisateurs_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.compteurs_dossiers_utilisateurs_id_seq', 78, true);


--
-- Name: delete_confirmations_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.delete_confirmations_id_seq', 1, false);


--
-- Name: delete_history_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.delete_history_id_seq', 1, true);


--
-- Name: delete_requests_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.delete_requests_id_seq', 1, false);


--
-- Name: event_artistes_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.event_artistes_id_seq', 50, true);


--
-- Name: facture_usager_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.facture_usager_id_seq', 4, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.notifications_id_seq', 248, true);


--
-- Name: paiements_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.paiements_id_seq', 481, true);


--
-- Name: parametres_utilisateur_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.parametres_utilisateur_id_seq', 43, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: postgres
--

SELECT pg_catalog.setval('omda_app.regions_id_seq', 16, true);


--
-- Name: usagers_bus_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_bus_id_seq', 17, true);


--
-- Name: usagers_hotel_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_hotel_id_seq', 94, true);


--
-- Name: usagers_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_id_seq', 1, false);


--
-- Name: usagers_magasin_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_magasin_id_seq', 34, true);


--
-- Name: usagers_media_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_media_id_seq', 20, true);


--
-- Name: usagers_nightclub_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_nightclub_id_seq', 27, true);


--
-- Name: usagers_occasionnel_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_occasionnel_id_seq', 12, true);


--
-- Name: usagers_vus_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.usagers_vus_id_seq', 13, true);


--
-- Name: utilisateurs_id_seq; Type: SEQUENCE SET; Schema: omda_app; Owner: omda_user
--

SELECT pg_catalog.setval('omda_app.utilisateurs_id_seq', 13, true);


--
-- Name: activites activites_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.activites
    ADD CONSTRAINT activites_pkey PRIMARY KEY (id);


--
-- Name: artistes artistes_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.artistes
    ADD CONSTRAINT artistes_pkey PRIMARY KEY (id);


--
-- Name: backup_annuel backup_annuel_annee_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_annuel
    ADD CONSTRAINT backup_annuel_annee_key UNIQUE (annee);


--
-- Name: backup_annuel backup_annuel_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_annuel
    ADD CONSTRAINT backup_annuel_pkey PRIMARY KEY (id);


--
-- Name: backup_config backup_config_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_config
    ADD CONSTRAINT backup_config_pkey PRIMARY KEY (id);


--
-- Name: backup_historique backup_historique_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_historique
    ADD CONSTRAINT backup_historique_pkey PRIMARY KEY (id);


--
-- Name: compteurs_dossiers_utilisateurs compteurs_dossiers_utilisateu_utilisateur_id_annee_type_usa_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.compteurs_dossiers_utilisateurs
    ADD CONSTRAINT compteurs_dossiers_utilisateu_utilisateur_id_annee_type_usa_key UNIQUE (utilisateur_id, annee, type_usager);


--
-- Name: compteurs_dossiers_utilisateurs compteurs_dossiers_utilisateurs_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.compteurs_dossiers_utilisateurs
    ADD CONSTRAINT compteurs_dossiers_utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: delete_confirmations delete_confirmations_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_confirmations
    ADD CONSTRAINT delete_confirmations_pkey PRIMARY KEY (id);


--
-- Name: delete_confirmations delete_confirmations_request_id_user_id_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_confirmations
    ADD CONSTRAINT delete_confirmations_request_id_user_id_key UNIQUE (request_id, user_id);


--
-- Name: delete_history delete_history_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_history
    ADD CONSTRAINT delete_history_pkey PRIMARY KEY (id);


--
-- Name: delete_requests delete_requests_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_requests
    ADD CONSTRAINT delete_requests_pkey PRIMARY KEY (id);


--
-- Name: event_artistes event_artistes_event_id_artiste_id_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.event_artistes
    ADD CONSTRAINT event_artistes_event_id_artiste_id_key UNIQUE (event_id, artiste_id);


--
-- Name: event_artistes event_artistes_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.event_artistes
    ADD CONSTRAINT event_artistes_pkey PRIMARY KEY (id);


--
-- Name: facture_usager facture_usager_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.facture_usager
    ADD CONSTRAINT facture_usager_pkey PRIMARY KEY (id);


--
-- Name: facture_usager facture_usager_ref_omda_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.facture_usager
    ADD CONSTRAINT facture_usager_ref_omda_key UNIQUE (ref_omda);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paiements paiements_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.paiements
    ADD CONSTRAINT paiements_pkey PRIMARY KEY (id);


--
-- Name: parametres_utilisateur parametres_utilisateur_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.parametres_utilisateur
    ADD CONSTRAINT parametres_utilisateur_pkey PRIMARY KEY (id);


--
-- Name: parametres_utilisateur parametres_utilisateur_utilisateur_id_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.parametres_utilisateur
    ADD CONSTRAINT parametres_utilisateur_utilisateur_id_key UNIQUE (utilisateur_id);


--
-- Name: regions regions_nom_key; Type: CONSTRAINT; Schema: omda_app; Owner: postgres
--

ALTER TABLE ONLY omda_app.regions
    ADD CONSTRAINT regions_nom_key UNIQUE (nom);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: postgres
--

ALTER TABLE ONLY omda_app.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: usagers_bus usagers_bus_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_bus
    ADD CONSTRAINT usagers_bus_pkey PRIMARY KEY (id);


--
-- Name: usagers_hotel usagers_hotel_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_hotel
    ADD CONSTRAINT usagers_hotel_pkey PRIMARY KEY (id);


--
-- Name: usagers_magasin usagers_magasin_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_magasin
    ADD CONSTRAINT usagers_magasin_pkey PRIMARY KEY (id);


--
-- Name: usagers_media usagers_media_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_media
    ADD CONSTRAINT usagers_media_pkey PRIMARY KEY (id);


--
-- Name: usagers_nightclub usagers_nightclub_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_nightclub
    ADD CONSTRAINT usagers_nightclub_pkey PRIMARY KEY (id);


--
-- Name: usagers_occasionnel usagers_occasionnel_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_occasionnel
    ADD CONSTRAINT usagers_occasionnel_pkey PRIMARY KEY (id);


--
-- Name: usagers usagers_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers
    ADD CONSTRAINT usagers_pkey PRIMARY KEY (id);


--
-- Name: usagers_vus usagers_vus_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_vus
    ADD CONSTRAINT usagers_vus_pkey PRIMARY KEY (id);


--
-- Name: usagers_vus usagers_vus_usager_id_usager_type_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_vus
    ADD CONSTRAINT usagers_vus_usager_id_usager_type_key UNIQUE (usager_id, usager_type);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: idx_backup_historique_date; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_backup_historique_date ON omda_app.backup_historique USING btree (created_at);


--
-- Name: idx_backup_historique_type; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_backup_historique_type ON omda_app.backup_historique USING btree (type_backup);


--
-- Name: idx_facture_ref_client_type; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_ref_client_type ON omda_app.facture_usager USING btree (ref_client_type);


--
-- Name: idx_facture_ref_omda; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_ref_omda ON omda_app.facture_usager USING btree (ref_omda);


--
-- Name: idx_facture_ref_usager; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_ref_usager ON omda_app.facture_usager USING btree (ref_usager);


--
-- Name: idx_facture_statut; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_statut ON omda_app.facture_usager USING btree (statut);


--
-- Name: idx_facture_usager_annee_facture; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_usager_annee_facture ON omda_app.facture_usager USING btree (annee_facture);


--
-- Name: idx_facture_usager_annee_paiement; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_usager_annee_paiement ON omda_app.facture_usager USING btree (annee_paiement);


--
-- Name: idx_facture_usager_mois_facture; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_usager_mois_facture ON omda_app.facture_usager USING btree (mois_facture);


--
-- Name: idx_facture_usager_quittance; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_usager_quittance ON omda_app.facture_usager USING btree (quittance);


--
-- Name: idx_facture_usager_type_groupe; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_facture_usager_type_groupe ON omda_app.facture_usager USING btree (type_groupe);


--
-- Name: idx_paiements_annee; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_paiements_annee ON omda_app.paiements USING btree (annee);


--
-- Name: idx_paiements_date; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_paiements_date ON omda_app.paiements USING btree (date_paiement);


--
-- Name: idx_paiements_usager; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_paiements_usager ON omda_app.paiements USING btree (usager_id, usager_type);


--
-- Name: idx_utilisateurs_email; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_utilisateurs_email ON omda_app.utilisateurs USING btree (email);


--
-- Name: idx_utilisateurs_role; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_utilisateurs_role ON omda_app.utilisateurs USING btree (role);


--
-- Name: idx_utilisateurs_statut; Type: INDEX; Schema: omda_app; Owner: omda_user
--

CREATE INDEX idx_utilisateurs_statut ON omda_app.utilisateurs USING btree (statut);


--
-- Name: activites activites_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.activites
    ADD CONSTRAINT activites_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: artistes artistes_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.artistes
    ADD CONSTRAINT artistes_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: backup_annuel backup_annuel_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_annuel
    ADD CONSTRAINT backup_annuel_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: backup_config backup_config_defini_par_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_config
    ADD CONSTRAINT backup_config_defini_par_fkey FOREIGN KEY (defini_par) REFERENCES omda_app.utilisateurs(id);


--
-- Name: backup_historique backup_historique_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.backup_historique
    ADD CONSTRAINT backup_historique_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: compteurs_dossiers_utilisateurs compteurs_dossiers_utilisateurs_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.compteurs_dossiers_utilisateurs
    ADD CONSTRAINT compteurs_dossiers_utilisateurs_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES omda_app.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: delete_confirmations delete_confirmations_request_id_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_confirmations
    ADD CONSTRAINT delete_confirmations_request_id_fkey FOREIGN KEY (request_id) REFERENCES omda_app.delete_requests(id) ON DELETE CASCADE;


--
-- Name: delete_history delete_history_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_history
    ADD CONSTRAINT delete_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: delete_requests delete_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.delete_requests
    ADD CONSTRAINT delete_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: event_artistes event_artistes_artiste_id_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.event_artistes
    ADD CONSTRAINT event_artistes_artiste_id_fkey FOREIGN KEY (artiste_id) REFERENCES omda_app.artistes(id) ON DELETE CASCADE;


--
-- Name: event_artistes event_artistes_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.event_artistes
    ADD CONSTRAINT event_artistes_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: facture_usager facture_usager_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.facture_usager
    ADD CONSTRAINT facture_usager_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: paiements paiements_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.paiements
    ADD CONSTRAINT paiements_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: parametres_utilisateur parametres_utilisateur_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.parametres_utilisateur
    ADD CONSTRAINT parametres_utilisateur_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES omda_app.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: usagers_bus usagers_bus_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_bus
    ADD CONSTRAINT usagers_bus_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers usagers_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers
    ADD CONSTRAINT usagers_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers_hotel usagers_hotel_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_hotel
    ADD CONSTRAINT usagers_hotel_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers_magasin usagers_magasin_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_magasin
    ADD CONSTRAINT usagers_magasin_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers_media usagers_media_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_media
    ADD CONSTRAINT usagers_media_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers_nightclub usagers_nightclub_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_nightclub
    ADD CONSTRAINT usagers_nightclub_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: usagers_occasionnel usagers_occasionnel_created_by_fkey; Type: FK CONSTRAINT; Schema: omda_app; Owner: omda_user
--

ALTER TABLE ONLY omda_app.usagers_occasionnel
    ADD CONSTRAINT usagers_occasionnel_created_by_fkey FOREIGN KEY (created_by) REFERENCES omda_app.utilisateurs(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT CREATE ON SCHEMA public TO omda_user;


--
-- Name: TABLE regions; Type: ACL; Schema: omda_app; Owner: postgres
--

GRANT ALL ON TABLE omda_app.regions TO omda_user;


--
-- Name: SEQUENCE regions_id_seq; Type: ACL; Schema: omda_app; Owner: postgres
--

GRANT ALL ON SEQUENCE omda_app.regions_id_seq TO omda_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: omda_app; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA omda_app GRANT ALL ON SEQUENCES TO omda_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: omda_app; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA omda_app GRANT ALL ON TABLES TO omda_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO omda_user;


--
-- PostgreSQL database dump complete
--


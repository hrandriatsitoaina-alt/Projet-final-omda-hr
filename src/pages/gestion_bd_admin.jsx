// src/pages/gestion_bd_admin.jsx
// ═══════════════════════════════════════════════════════════════════
// GESTION BDD ADMIN — Réservé SuperAdmin
// ═══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Database, Table, Edit, Trash2, Save, X, AlertTriangle,
  CheckCircle, RefreshCw, Loader2, Shield, Key, Eye, EyeOff,
  Layers, ChevronLeft, ChevronRight, Search, Lock, Unlock,
  Eraser, Info, AlertCircle, CheckCircle2, XCircle,
  ArrowRight, GitBranch, Network, Filter, ShieldAlert,
} from 'lucide-react';
import '../styles/gestion_bd_admin.css';
import { useT } from '../hooks/useT';

const API_URL = 'http://localhost:3001/api';
const CONFIRMATION_TRUNCATE = 'EFFACER_TOUT';
const ROWS_PER_PAGE = 50;

const GestionBdAdmin = () => {
  const { t, langue } = useT();

  const [activeTab, setActiveTab] = useState('explorer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [token, setToken] = useState(null);

  // Explorer
  const [tables, setTables] = useState([]);
  const [searchTable, setSearchTable] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchRow, setSearchRow] = useState('');

  // Dépendances
  const [dependencies, setDependencies] = useState(null);
  const [loadingDeps, setLoadingDeps] = useState(false);

  // Édition
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Suppression
  const [deletingRow, setDeletingRow] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Truncate
  const [truncateMode, setTruncateMode] = useState('one');
  const [truncateTarget, setTruncateTarget] = useState('');
  const [showTruncateModal, setShowTruncateModal] = useState(false);
  const [isTruncating, setIsTruncating] = useState(false);

  // Password
  const [passwordStatus, setPasswordStatus] = useState({ isDefined: false });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordInputRef = useRef(null);

  const locale = useMemo(() => {
    if (langue === 'en') return 'en-US';
    if (langue === 'mg') return 'fr-MG';
    return 'fr-FR';
  }, [langue]);

  // ✅ Tables protégées (mêmes que backend)
  const TABLES_PROTEGEES_FRONT = ['restauration_config', 'backup_config', 'utilisateurs'];

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      loadTables(storedToken);
      loadPasswordStatus(storedToken);
    } else {
      setError(t('Token manquant', 'Tsy misy token', 'Token missing'));
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(null), 3500);
      return () => clearTimeout(id);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const id = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(id);
    }
  }, [error]);

  useEffect(() => {
    if (activeTab === 'password') {
      const id = setTimeout(() => passwordInputRef.current?.focus(), 150);
      return () => clearTimeout(id);
    }
  }, [activeTab]);

  // ============================================================
  // API
  // ============================================================
  const loadTables = useCallback(async (tk) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/gestionbd/tables`, { headers: { adminToken: tk || token } });
      const data = await res.json();
      if (data.success) setTables(data.tables || []);
      else setError(data.message || 'Erreur chargement tables');
    } catch (err) {
      console.error('loadTables:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  const loadTableData = useCallback(async (tableName, page = 0) => {
    if (!tableName) return;
    try {
      setLoadingTable(true);
      const offset = page * ROWS_PER_PAGE;
      const res = await fetch(
        `${API_URL}/gestionbd/table/${tableName}?limit=${ROWS_PER_PAGE}&offset=${offset}`,
        { headers: { adminToken: token } }
      );
      const data = await res.json();
      if (data.success) {
        setTableData(data);
        setCurrentPage(page);
      } else {
        setError(data.message || 'Erreur chargement données');
      }
    } catch (err) {
      console.error('loadTableData:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      setLoadingTable(false);
    }
  }, [t, token]);

  const loadDependencies = useCallback(async (tableName) => {
    if (!tableName) return;
    try {
      setLoadingDeps(true);
      const res = await fetch(
        `${API_URL}/gestionbd/table/${tableName}/dependencies`,
        { headers: { adminToken: token } }
      );
      const data = await res.json();
      if (data.success) {
        setDependencies({
          sortantes: data.sortantes || [],
          entrantes: data.entrantes || [],
        });
      }
    } catch (err) {
      console.error('loadDependencies:', err);
    } finally {
      setLoadingDeps(false);
    }
  }, [token]);

  const handleSelectTable = useCallback((table) => {
    setSelectedTable(table);
    setTableData(null);
    setEditingRowId(null);
    setCurrentPage(0);
    setSearchRow('');
    setDependencies(null);
    loadTableData(table.name, 0);
    loadDependencies(table.name);
  }, [loadTableData, loadDependencies]);

  // ============================================================
  // ÉDITION
  // ============================================================
  const handleStartEdit = (row) => {
    if (!tableData) return;
    const pk = tableData.primaryKey;
    setEditingRowId(row[pk]);
    setEditingData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  const handleEditChange = (col, value) => {
    setEditingData(prev => ({ ...prev, [col]: value }));
  };

  const handleSaveEdit = async () => {
    if (!tableData || !editingRowId) return;
    setSavingEdit(true);
    try {
      const pk = tableData.primaryKey;
      const payload = { ...editingData };
      delete payload[pk];

      const res = await fetch(`${API_URL}/gestionbd/table/${tableData.table}/${editingRowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(t('✅ Ligne mise à jour', '✅ Voaova', '✅ Row updated'));
        setEditingRowId(null);
        setEditingData({});
        await loadTableData(tableData.table, currentPage);
        await loadTables(token);
      } else {
        setError(data.message || 'Erreur modification');
      }
    } catch (err) {
      console.error('handleSaveEdit:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      setSavingEdit(false);
    }
  };

  // ============================================================
  // SUPPRESSION
  // ============================================================
  const handleAskDelete = (row) => {
    setDeletingRow(row);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!tableData || !deletingRow) return;
    try {
      const pk = tableData.primaryKey;
      const id = deletingRow[pk];

      const res = await fetch(`${API_URL}/gestionbd/table/${tableData.table}/${id}`, {
        method: 'DELETE',
        headers: { adminToken: token },
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(t('✅ Ligne supprimée', '✅ Voafafa', '✅ Row deleted'));
        setShowDeleteModal(false);
        setDeletingRow(null);
        await loadTableData(tableData.table, currentPage);
        await loadTables(token);
      } else {
        setError(data.message || 'Erreur suppression');
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error('handleConfirmDelete:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
      setShowDeleteModal(false);
    }
  };

  // ============================================================
  // TRUNCATE
  // ============================================================
  const handleAskTruncate = (tableName) => {
    setTruncateTarget(tableName || '');
    setTruncateMode(tableName ? 'one' : 'all');
    setShowTruncateModal(true);
  };

  const handleConfirmTruncate = async () => {
    setIsTruncating(true);
    try {
      const url = truncateMode === 'all'
        ? `${API_URL}/gestionbd/truncate-all`
        : `${API_URL}/gestionbd/truncate/${truncateTarget}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({ confirmation: CONFIRMATION_TRUNCATE }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(data.message || '✅ Tables vidées');
        setShowTruncateModal(false);
        setTruncateTarget('');
        await loadTables(token);
        if (selectedTable) await loadTableData(selectedTable.name, 0);
      } else {
        setError(data.message || 'Erreur TRUNCATE');
        setShowTruncateModal(false);
      }
    } catch (err) {
      console.error('handleConfirmTruncate:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
      setShowTruncateModal(false);
    } finally {
      setIsTruncating(false);
    }
  };

  // ============================================================
  // PASSWORD
  // ============================================================
  const loadPasswordStatus = useCallback(async (tk) => {
    try {
      const res = await fetch(`${API_URL}/gestionbd/restauration/password-status`, {
        headers: { adminToken: tk || token },
      });
      const data = await res.json();
      if (data.success) {
        setPasswordStatus({ isDefined: data.isDefined, lastUpdated: data.lastUpdated });
      }
    } catch (err) {
      console.error('loadPasswordStatus:', err);
    }
  }, [token]);

  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!/^\d{4}$/.test(newPassword)) {
      setError(t('Le mot de passe doit contenir 4 chiffres', '4 isa marina', 'Password must be 4 digits'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('Les deux codes ne correspondent pas', 'Tsy mifanaraka', 'Codes do not match'));
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_URL}/gestionbd/restauration/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', adminToken: token },
        body: JSON.stringify({ password: newPassword, confirm: confirmPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(t('✅ Mot de passe enregistré', '✅ Voatahiry', '✅ Password saved'));
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPwd(false);
        setShowConfirmPwd(false);
        await loadPasswordStatus(token);
      } else {
        setError(data.message || 'Erreur enregistrement');
      }
    } catch (err) {
      console.error('handleSavePassword:', err);
      setError(t('Erreur de connexion', 'Nisy olana', 'Connection error'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const filteredTables = useMemo(() => {
    if (!searchTable.trim()) return tables;
    const s = searchTable.toLowerCase();
    return tables.filter(tb => tb.name.toLowerCase().includes(s));
  }, [tables, searchTable]);

  const filteredRows = useMemo(() => {
    if (!tableData || !tableData.rows) return [];
    if (!searchRow.trim()) return tableData.rows;
    const s = searchRow.toLowerCase();
    return tableData.rows.filter(row =>
      Object.values(row).some(val =>
        String(val ?? '').toLowerCase().includes(s)
      )
    );
  }, [tableData, searchRow]);

  // ✅ Liste des tables NON protégées (pour truncate)
  const truncatableTables = useMemo(
    () => tables.filter(tb => !TABLES_PROTEGEES_FRONT.includes(tb.name) && !tb.protected),
    [tables]
  );

  // ✅ Liste des tables protégées
  const protectedTables = useMemo(
    () => tables.filter(tb => TABLES_PROTEGEES_FRONT.includes(tb.name) || tb.protected),
    [tables]
  );

  const formatCellValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="gba-cell-null">NULL</span>;
    }
    if (typeof value === 'boolean') return value ? '✅ true' : '❌ false';
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    if (str.length > 60) return str.slice(0, 60) + '…';
    return str;
  };

  const isEditable = (col) => !col.is_primary;

  const totalPages = tableData ? Math.ceil(tableData.total / ROWS_PER_PAGE) : 0;

  // ============================================================
  // RENDER
  // ============================================================
  if (loading && tables.length === 0) {
    return (
      <div className="gba-loading">
        <Loader2 size={48} className="gba-spin" />
        <p>{t('Chargement des tables...', 'Maka ny tabilao...', 'Loading tables...')}</p>
      </div>
    );
  }

  return (
    <div className="gba-container">
      {success && (
        <div className="gba-success-banner">
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="gba-error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="gba-banner-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="gba-header">
        <div className="gba-header-left">
          <div className="gba-header-icon">
            <Database size={26} />
          </div>
          <div>
            <h2>{t('Gestion Base de Données', 'Fitantanana ny Tahiry', 'Database Management')}</h2>
            <p className="gba-subtitle">
              🔒 {t('Réservé au Super Admin', 'Natokana ho Super Admin', 'Super Admin only')}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="gba-btn-refresh"
          onClick={() => {
            loadTables(token);
            if (selectedTable) loadTableData(selectedTable.name, currentPage);
          }}
        >
          <RefreshCw size={16} /> {t('Rafraîchir', 'Havaozy', 'Refresh')}
        </button>
      </div>

      {/* TABS */}
      <div className="gba-tabs">
        <button
          type="button"
          className={`gba-tab ${activeTab === 'explorer' ? 'gba-tab-active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          <Table size={16} /> {t('Explorer', 'Jereo', 'Explore')}
        </button>
        <button
          type="button"
          className={`gba-tab ${activeTab === 'truncate' ? 'gba-tab-active' : ''}`}
          onClick={() => setActiveTab('truncate')}
        >
          <Eraser size={16} /> {t('Vider les tables', 'Fafao', 'Truncate')}
        </button>
        <button
          type="button"
          className={`gba-tab ${activeTab === 'password' ? 'gba-tab-active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <Key size={16} /> {t('Mot de passe', 'Kaody', 'Password')}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ONGLET EXPLORER
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'explorer' && (
        <div className="gba-tab-content">
          <div className="gba-search-row">
            <Search size={16} className="gba-search-icon" />
            <input
              type="text"
              className="gba-search-input"
              placeholder={t('Rechercher une table...', 'Hikaroka tabilao...', 'Search a table...')}
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
            />
            <span className="gba-search-count">{filteredTables.length} / {tables.length}</span>
          </div>

          <div className="gba-tables-grid">
            {filteredTables.map(tb => (
              <div
                key={tb.name}
                className={`gba-table-card ${selectedTable?.name === tb.name ? 'gba-table-card-active' : ''} ${tb.protected || TABLES_PROTEGEES_FRONT.includes(tb.name) ? 'gba-table-card-protected' : ''}`}
                onClick={() => handleSelectTable(tb)}
              >
                <div className="gba-table-card-header">
                  <Table size={18} />
                  <span className="gba-table-name">{tb.name}</span>
                  {(tb.protected || TABLES_PROTEGEES_FRONT.includes(tb.name)) && (
                    <span className="gba-table-protected" title="Protégée">
                      <Lock size={12} />
                    </span>
                  )}
                </div>
                <div className="gba-table-card-body">
                  <span className="gba-table-count">{tb.rowCount} {t('lignes', 'andiany', 'rows')}</span>
                  <span className="gba-table-cols">{tb.columns.length} {t('col.', 'tsang.', 'cols')}</span>
                </div>
              </div>
            ))}
            {filteredTables.length === 0 && (
              <div className="gba-empty-state">
                <Info size={32} />
                <p>{t('Aucune table trouvée', 'Tsy misy tabilao', 'No table found')}</p>
              </div>
            )}
          </div>

          {selectedTable && (
            <div className="gba-rows-wrapper">
              <div className="gba-rows-header">
                <h3>
                  <Layers size={18} />
                  {selectedTable.name}
                  {(selectedTable.protected || TABLES_PROTEGEES_FRONT.includes(selectedTable.name)) && (
                    <span className="gba-protected-tag">
                      <Lock size={12} /> {t('Protégée', 'Voaaro', 'Protected')}
                    </span>
                  )}
                </h3>
                <div className="gba-rows-meta">
                  {tableData && (
                    <>
                      <span>{tableData.total} {t('lignes', 'andiany', 'rows')}</span>
                      <span>•</span>
                      <span>{t('Page', 'Pejy', 'Page')} {currentPage + 1} / {totalPages || 1}</span>
                    </>
                  )}
                </div>
              </div>

              {loadingDeps && (
                <div className="gba-deps-loading">
                  <Loader2 size={16} className="gba-spin" /> {t('Analyse des dépendances...', 'Fandinihana...', 'Analyzing...')}
                </div>
              )}

              {!loadingDeps && dependencies && (
                <div className="gba-deps-section">
                  <div className="gba-deps-title">
                    <Network size={16} />
                    {t('Relations', 'Fifandraisana', 'Relations')}
                  </div>

                  {dependencies.entrantes.length > 0 && (
                    <div className="gba-deps-block">
                      <div className="gba-deps-label">
                        <AlertTriangle size={14} className="gba-deps-warn" />
                        {t('Tables qui RÉFÉRENCENT celle-ci', 'Tabilao mifandray', 'Tables REFERENCING this one')}
                      </div>
                      <div className="gba-deps-flow">
                        {dependencies.entrantes.map((dep, i) => (
                          <div key={i} className="gba-dep-item gba-dep-item-incoming">
                            <span className="gba-dep-table">{dep.source_table}</span>
                            <span className="gba-dep-arrow"><ArrowRight size={14} /></span>
                            <span className="gba-dep-col">{dep.source_column}</span>
                            <span className="gba-dep-fk">→ {selectedTable.name}.{dep.target_column}</span>
                            {dep.on_delete && (
                              <span className={`gba-dep-rule gba-dep-rule-${dep.on_delete.toLowerCase()}`}>
                                {dep.on_delete}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dependencies.sortantes.length > 0 && (
                    <div className="gba-deps-block">
                      <div className="gba-deps-label">
                        <GitBranch size={14} />
                        {t('Tables RÉFÉRENCÉES par celle-ci', 'Tabilao voatondro', 'Tables REFERENCED')}
                      </div>
                      <div className="gba-deps-flow">
                        {dependencies.sortantes.map((dep, i) => (
                          <div key={i} className="gba-dep-item gba-dep-item-outgoing">
                            <span className="gba-dep-col">{selectedTable.name}.{dep.source_column}</span>
                            <span className="gba-dep-arrow"><ArrowRight size={14} /></span>
                            <span className="gba-dep-table">{dep.target_table}</span>
                            <span className="gba-dep-fk">.{dep.target_column}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dependencies.entrantes.length === 0 && dependencies.sortantes.length === 0 && (
                    <div className="gba-deps-empty">
                      {t('Aucune relation', 'Tsy misy fifandraisana', 'No relation')}
                    </div>
                  )}
                </div>
              )}

              {tableData && tableData.rows.length > 0 && (
                <div className="gba-search-row gba-search-row-inline">
                  <Filter size={14} className="gba-search-icon" />
                  <input
                    type="text"
                    className="gba-search-input"
                    placeholder={t('Rechercher dans les lignes...', 'Hikaroka...', 'Search in rows...')}
                    value={searchRow}
                    onChange={(e) => setSearchRow(e.target.value)}
                  />
                  {searchRow && (
                    <>
                      <span className="gba-search-count">
                        {filteredRows.length} / {tableData.rows.length}
                      </span>
                      <button
                        type="button"
                        className="gba-search-clear"
                        onClick={() => setSearchRow('')}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}

              {loadingTable && (
                <div className="gba-rows-loading">
                  <Loader2 size={32} className="gba-spin" />
                </div>
              )}

              {!loadingTable && tableData && (
                <>
                  {filteredRows.length === 0 ? (
                    <div className="gba-empty-state">
                      <Info size={32} />
                      <p>
                        {searchRow
                          ? t('Aucune ligne ne correspond', 'Tsy misy valiny', 'No matching row')
                          : t('Table vide', 'Foana ny tabilao', 'Empty table')}
                      </p>
                    </div>
                  ) : (
                    <div className="gba-table-scroll">
                      <table className="gba-rows-table">
                        <thead>
                          <tr>
                            {tableData.columns.map(col => (
                              <th key={col.column_name} className="gba-col-header">
                                {col.column_name}
                                {col.is_primary && <span className="gba-pk-badge">🔑</span>}
                                <span className="gba-col-type">{col.data_type}</span>
                              </th>
                            ))}
                            <th className="gba-col-header gba-col-actions">
                              {t('Actions', 'Hetsika', 'Actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((row, idx) => {
                            const pk = tableData.primaryKey;
                            const rowId = row[pk];
                            const isEditing = editingRowId === rowId;
                            const isProtected = selectedTable.protected || TABLES_PROTEGEES_FRONT.includes(selectedTable.name);
                            const isDeleting = deletingRow && deletingRow[pk] === rowId && showDeleteModal;

                            return (
                              <tr
                                key={rowId ?? idx}
                                className={`${isEditing ? 'gba-row-editing' : ''} ${isDeleting ? 'gba-row-deleting' : ''}`}
                              >
                                {tableData.columns.map(col => (
                                  <td key={col.column_name} className="gba-cell">
                                    {isEditing && isEditable(col) ? (
                                      <input
                                        type="text"
                                        className="gba-inline-input"
                                        value={
                                          editingData[col.column_name] === null || editingData[col.column_name] === undefined
                                            ? ''
                                            : String(editingData[col.column_name])
                                        }
                                        onChange={(e) => handleEditChange(col.column_name, e.target.value)}
                                        disabled={savingEdit}
                                      />
                                    ) : (
                                      <span className={col.is_primary ? 'gba-cell-id' : ''}>
                                        {formatCellValue(row[col.column_name])}
                                      </span>
                                    )}
                                  </td>
                                ))}
                                <td className="gba-cell gba-cell-actions">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        className="gba-btn-save"
                                        onClick={handleSaveEdit}
                                        disabled={savingEdit}
                                        title={t('Enregistrer', 'Tehirizo', 'Save')}
                                      >
                                        {savingEdit ? <Loader2 size={14} className="gba-spin" /> : <Save size={14} />}
                                      </button>
                                      <button
                                        type="button"
                                        className="gba-btn-cancel"
                                        onClick={handleCancelEdit}
                                        disabled={savingEdit}
                                        title={t('Annuler', 'Foanana', 'Cancel')}
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : isProtected ? (
                                    <span className="gba-action-locked" title={t('Table protégée', 'Voaaro', 'Protected')}>
                                      <Lock size={14} />
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="gba-btn-edit"
                                        onClick={() => handleStartEdit(row)}
                                        title={t('Modifier', 'Ovay', 'Edit')}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="gba-btn-delete"
                                        onClick={() => handleAskDelete(row)}
                                        title={t('Supprimer', 'Fafao', 'Delete')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {totalPages > 1 && !searchRow && (
                    <div className="gba-pagination">
                      <button
                        type="button"
                        className="gba-pagination-btn"
                        onClick={() => loadTableData(selectedTable.name, currentPage - 1)}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft size={16} /> {t('Précédent', 'Teo aloha', 'Previous')}
                      </button>
                      <span className="gba-pagination-info">{currentPage + 1} / {totalPages}</span>
                      <button
                        type="button"
                        className="gba-pagination-btn"
                        onClick={() => loadTableData(selectedTable.name, currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                      >
                        {t('Suivant', 'Manaraka', 'Next')} <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET TRUNCATE
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'truncate' && (
        <div className="gba-tab-content">

          {/* ✅ BANDEAU D'INFO : utilisateurs protégée */}
          <div className="gba-protected-info-banner">
            <ShieldAlert size={22} />
            <div>
              <strong>
                🔒 {t('Table "utilisateurs" PROTÉGÉE', 'Voaaro ny tabilao "utilisateurs"', 'Table "utilisateurs" PROTECTED')}
              </strong>
              <p>
                {t(
                  'Les comptes utilisateurs ne seront JAMAIS effacés par ces actions. La table "utilisateurs" et les configurations système sont protégées.',
                  'Tsy ho voafafa mihitsy ny kaontin\'ny mpampiasa. Voaaro ny tabilao "utilisateurs".',
                  'User accounts will NEVER be deleted by these actions. The "utilisateurs" table and system configurations are protected.'
                )}
              </p>
            </div>
          </div>

          <div className="gba-danger-banner">
            <AlertTriangle size={22} />
            <div>
              <strong>⚠️ {t('Zone DANGEREUSE', 'Faritra MAMPIDI-DOZA', 'DANGER ZONE')}</strong>
              <p>
                {t(
                  'Ces actions effacent DÉFINITIVEMENT le contenu (structure conservée). Irréversible.',
                  'Hamafa TANTERAKA ny votoatiny.',
                  'Permanently erase contents. Irreversible.'
                )}
              </p>
            </div>
          </div>

          {/* Vider TOUT */}
          <div className="gba-truncate-all-banner">
            <div className="gba-truncate-all-info">
              <Eraser size={22} />
              <div>
                <strong>
                  {t('Vider TOUTES les tables', 'Fafao NY REHETRA', 'Truncate ALL tables')}
                </strong>
                <span>
                  {truncatableTables.length} {t('tables seront vidées', 'tabilao ho fafana', 'tables will be emptied')}
                  {' • '}
                  <strong className="gba-truncate-excluded">
                    {protectedTables.length} {t('protégée(s)', 'voaaro', 'protected')}
                  </strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="gba-btn-danger"
              onClick={() => {
                setTruncateMode('all');
                setTruncateTarget('');
                setShowTruncateModal(true);
              }}
            >
              <Eraser size={16} /> {t('Tout vider', 'Fafao ny rehetra', 'Truncate all')}
            </button>
          </div>

          {/* Tables protégées — non modifiables */}
          {protectedTables.length > 0 && (
            <div className="gba-truncate-protected-section">
              <h4 className="gba-truncate-protected-title">
                <Lock size={16} />
                {t('Tables PROTÉGÉES (non modifiables)', 'Tabilao VOAARO', 'PROTECTED tables (not modifiable)')}
              </h4>
              <div className="gba-truncate-protected-grid">
                {protectedTables.map(tb => (
                  <div key={tb.name} className="gba-truncate-protected-card">
                    <div className="gba-truncate-protected-info">
                      <Lock size={16} />
                      <div>
                        <span className="gba-truncate-protected-name">{tb.name}</span>
                        <span className="gba-truncate-protected-count">
                          {tb.rowCount} {t('ligne(s)', 'andiany', 'row(s)')}
                        </span>
                      </div>
                    </div>
                    <span className="gba-truncate-protected-badge">
                      {t('PROTÉGÉE', 'VOAARO', 'PROTECTED')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vider une seule table */}
          <div className="gba-truncate-tables-section">
            <h4 className="gba-truncate-tables-title">
              <Table size={16} />
              {t('Ou vider une table précise', 'Na fafao tabilao iray', 'Or truncate a specific table')}
            </h4>
            <div className="gba-truncate-grid">
              {truncatableTables.map(tb => (
                <div key={tb.name} className="gba-truncate-card">
                  <div className="gba-truncate-card-info">
                    <Table size={16} />
                    <div>
                      <span className="gba-truncate-card-name">{tb.name}</span>
                      <span className="gba-truncate-card-count">
                        {tb.rowCount} {t('ligne(s)', 'andiany', 'row(s)')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gba-truncate-card-btn"
                    onClick={() => handleAskTruncate(tb.name)}
                    disabled={tb.rowCount === 0}
                    title={tb.rowCount === 0
                      ? t('Table déjà vide', 'Efa foana', 'Already empty')
                      : t('Vider cette table', 'Fafao', 'Truncate')}
                  >
                    <Eraser size={14} />
                  </button>
                </div>
              ))}
              {truncatableTables.length === 0 && (
                <div className="gba-empty-state">
                  <Info size={32} />
                  <p>{t('Aucune table disponible', 'Tsy misy tabilao', 'No table')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ONGLET PASSWORD
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'password' && (
        <div className="gba-tab-content">
          <div className="gba-info-banner">
            <Shield size={22} />
            <div>
              <strong>🔐 {t('Sécurité de restauration', 'Fiarovana famerenana', 'Restore security')}</strong>
              <p>
                {t(
                  'Ce mot de passe à 4 chiffres est demandé avant chaque restauration de la base.',
                  'Angatahina alohan\'ny famerenana ny tahiry.',
                  'Required before each database restoration.'
                )}
              </p>
            </div>
          </div>

          <div className="gba-password-section">
            <div className="gba-password-status">
              <div className="gba-status-row">
                <span className="gba-status-label">{t('État', 'Toe-javatra', 'Status')} :</span>
                {passwordStatus.isDefined ? (
                  <span className="gba-status-badge gba-status-ok">
                    <Unlock size={12} /> {t('Défini', 'Voafaritra', 'Defined')}
                  </span>
                ) : (
                  <span className="gba-status-badge gba-status-warn">
                    <AlertCircle size={12} /> {t('Non défini', 'Tsy voafaritra', 'Not defined')}
                  </span>
                )}
              </div>
              {passwordStatus.lastUpdated && (
                <div className="gba-status-row">
                  <span className="gba-status-label">{t('Dernière modification', 'Fanavaozana farany', 'Last update')} :</span>
                  <span className="gba-status-value">
                    {new Date(passwordStatus.lastUpdated).toLocaleString(locale)}
                  </span>
                </div>
              )}
            </div>

            <form className="gba-password-form" onSubmit={handleSavePassword}>
              <div className="gba-form-group">
                <label>
                  <Key size={14} />
                  {t('Nouveau mot de passe (4 chiffres)', 'Kaody vaovao (4 isa)', 'New password (4 digits)')}
                </label>
                <div className="gba-password-input-wrapper">
                  <input
                    ref={passwordInputRef}
                    type={showNewPwd ? 'text' : 'password'}
                    className="gba-password-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    placeholder="0000"
                    disabled={isSavingPassword}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="gba-toggle-pwd"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    tabIndex={-1}
                  >
                    {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="gba-form-group">
                <label>
                  <Key size={14} />
                  {t('Confirmer le nouveau mot de passe', 'Hamafiso ny kaody vaovao', 'Confirm new password')}
                </label>
                <div className="gba-password-input-wrapper">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    className="gba-password-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    placeholder="0000"
                    disabled={isSavingPassword}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="gba-toggle-pwd"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    tabIndex={-1}
                  >
                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="gba-btn-primary gba-btn-full"
                disabled={
                  isSavingPassword ||
                  newPassword.length !== 4 ||
                  confirmPassword.length !== 4 ||
                  newPassword !== confirmPassword
                }
              >
                {isSavingPassword ? (
                  <><Loader2 size={16} className="gba-spin" /> {t('Enregistrement...', 'Mitahiry...', 'Saving...')}</>
                ) : (
                  <><Save size={16} /> {t('Enregistrer le mot de passe', 'Tehirizo', 'Save password')}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALE SUPPRESSION
          ═══════════════════════════════════════════════════════ */}
      {showDeleteModal && deletingRow && tableData && (
        <div className="gba-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="gba-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gba-modal-header gba-modal-header-danger">
              <h3><AlertTriangle size={20} /> {t('Confirmer la suppression', 'Hamafiso', 'Confirm deletion')}</h3>
              <button type="button" className="gba-modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="gba-modal-body">
              <p>
                {t('Supprimer cette ligne de', 'Hamafa ity andiany ity ao amin\'ny', 'Delete this row from')}{' '}
                <strong>{tableData.table}</strong> ?
              </p>

              <div className="gba-modal-preview">
                <div className="gba-modal-preview-id">
                  🔑 {tableData.primaryKey} = <strong>{deletingRow[tableData.primaryKey]}</strong>
                </div>
              </div>

              {dependencies && dependencies.entrantes.length > 0 && (
                <div className="gba-modal-cascade-warning">
                  <div className="gba-modal-cascade-title">
                    <AlertTriangle size={16} />
                    {t('Tables liées détectées', 'Tabilao mifandray', 'Related tables')}
                  </div>
                  <p className="gba-modal-cascade-text">
                    {t(
                      'Les tables suivantes font référence à cette ligne :',
                      'Ireto tabilao manaraka ireto :',
                      'The following tables reference this row:'
                    )}
                  </p>
                  <div className="gba-modal-cascade-list">
                    {dependencies.entrantes.map((dep, i) => (
                      <div key={i} className="gba-modal-cascade-item">
                        <span className="gba-cascade-table">{dep.source_table}</span>
                        <ArrowRight size={12} />
                        <span className="gba-cascade-col">{dep.source_column}</span>
                        {dep.on_delete && (
                          <span className={`gba-dep-rule gba-dep-rule-${dep.on_delete.toLowerCase()}`}>
                            {dep.on_delete}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="gba-modal-warning">
                ⚠️ {t('Cette action est irréversible.', 'Tsy azo ivalozana.', 'Irreversible.')}
              </p>
            </div>

            <div className="gba-modal-footer">
              <button type="button" className="gba-btn-cancel" onClick={() => setShowDeleteModal(false)}>
                {t('Annuler', 'Foanana', 'Cancel')}
              </button>
              <button type="button" className="gba-btn-danger" onClick={handleConfirmDelete}>
                <Trash2 size={16} /> {t('Confirmer', 'Hamafiso', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MODALE TRUNCATE
          ═══════════════════════════════════════════════════════ */}
      {showTruncateModal && (
        <div className="gba-modal-overlay" onClick={() => !isTruncating && setShowTruncateModal(false)}>
          <div className="gba-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gba-modal-header gba-modal-header-danger">
              <h3><AlertTriangle size={20} /> ⚠️ {t('Confirmation', 'Fanamarinana', 'Confirmation')}</h3>
              <button
                type="button"
                className="gba-modal-close"
                onClick={() => !isTruncating && setShowTruncateModal(false)}
                disabled={isTruncating}
              >
                <X size={20} />
              </button>
            </div>

            <div className="gba-modal-body">
              <div className="gba-modal-danger-block">
                <strong>
                  {truncateMode === 'all'
                    ? `🚨 ${t('Vider TOUTES les tables (sauf protégées)', 'Fafao NY REHETRA (afa-ny voaaro)', 'Erase ALL tables (except protected)')}`
                    : `🚨 ${t('Vider la table', 'Fafao ny tabilao', 'Erase table')} "${truncateTarget}"`}
                </strong>
                <p>
                  {t(
                    'Cette action est DÉFINITIVE (structure conservée).',
                    'MAHARITRA ity hetsika ity.',
                    'This action is FINAL (structure kept).'
                  )}
                </p>
              </div>

              {truncateMode === 'all' && (
                <>
                  <div className="gba-modal-protected-notice">
                    <ShieldAlert size={16} />
                    <span>
                      <strong>🔒 {t('Tables PROTÉGÉES (ne seront PAS vidées) :', 'Tabilao VOAARO (tsy fafana) :', 'PROTECTED tables (will NOT be erased):')}</strong>
                      <div className="gba-modal-protected-list">
                        {protectedTables.map(tb => (
                          <span key={tb.name} className="gba-modal-protected-chip">
                            <Lock size={10} /> {tb.name}
                          </span>
                        ))}
                      </div>
                    </span>
                  </div>

                  <div className="gba-modal-tables-list">
                    <strong>
                      {t('Tables qui seront vidées', 'Tabilao ho fafana', 'Tables to be emptied')} ({truncatableTables.length}) :
                    </strong>
                    <ul>
                      {truncatableTables.map(tb => (
                        <li key={tb.name}>{tb.name} <em>({tb.rowCount})</em></li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <p className="gba-modal-warning">
                ⚠️ {t('Action IRRÉVERSIBLE.', 'Tsy azo ivalozana.', 'IRREVERSIBLE.')}
              </p>
            </div>

            <div className="gba-modal-footer">
              <button
                type="button"
                className="gba-btn-cancel"
                onClick={() => !isTruncating && setShowTruncateModal(false)}
                disabled={isTruncating}
              >
                {t('Annuler', 'Foanana', 'Cancel')}
              </button>
              <button
                type="button"
                className="gba-btn-danger"
                onClick={handleConfirmTruncate}
                disabled={isTruncating}
              >
                {isTruncating ? (
                  <><Loader2 size={16} className="gba-spin" /> {t('Suppression...', 'Famafana...', 'Deleting...')}</>
                ) : (
                  <><Eraser size={16} /> {t('Oui, tout effacer', 'Eny, fafao', 'Yes, erase')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionBdAdmin;
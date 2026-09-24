// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css';
import omdaLogo from '../assets/imagesOMDA.png';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
// ✅ Hook unique de traduction
import { useT } from '../hooks/useT';

const Register = () => {
  const navigate = useNavigate();

  // ✅ LANGUE UNIQUE — vient du Context
  const { t, langue } = useT();

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    mot_de_passe: '',
    confirm_mot_de_passe: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.nom.trim()) {
      setError(t('Le nom est requis', 'Ilaina ny anarana', 'Name is required'));
      return false;
    }
    if (!formData.email.trim()) {
      setError(t('L\'email est requis', 'Ilaina ny mailaka', 'Email is required'));
      return false;
    }
    if (!formData.mot_de_passe || formData.mot_de_passe.length < 4) {
      setError(t(
        'Le mot de passe doit contenir au moins 4 caractères',
        'Tsy maintsy misy tarehintsoratra 4 farafahakeliny ny kaody',
        'Password must be at least 4 characters'
      ));
      return false;
    }
    if (formData.mot_de_passe !== formData.confirm_mot_de_passe) {
      setError(t(
        'Les mots de passe ne correspondent pas',
        'Tsy mifanaraka ny kaody',
        'Passwords do not match'
      ));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      nom: formData.nom,
      email: formData.email,
      mot_de_passe: formData.mot_de_passe
    };

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(t(
          'Compte créé avec succès ! Vous allez être redirigé vers la page de connexion.',
          'Vita ny kaonty ! Hampidirina amin\'ny pejy fidirana ianao.',
          'Account created successfully! You will be redirected to the login page.'
        ));
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.message || t(
          'Erreur lors de la création du compte.',
          'Nisy olana tamin\'ny famoronana ny kaonty.',
          'Error while creating account.'
        ));
      }
    } catch (err) {
      console.error('Erreur réseau:', err);
      setError(t(
        'Impossible de contacter le serveur. Vérifie qu\'il est bien lancé sur http://localhost:3001.',
        'Tsy afaka mifandray amin\'ny serveur. Hamarino raha mandeha amin\'ny http://localhost:3001.',
        'Cannot reach server. Check that it is running on http://localhost:3001.'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-bg"></div>
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <img src={omdaLogo} alt="OMDA" className="register-logo" />
            <h1>{t('Créer un compte', 'Hamorona kaonty', 'Create an account')}</h1>
            <p className="register-subtitle">
              {t(
                "Rejoignez l'Office Malagasy du Droit d'Auteur",
                "Midira ao amin'ny Birao Malagasy misahana ny Zon'ny Mpanoratra",
                'Join the Malagasy Copyright Office'
              )}
            </p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><User size={16} /> {t('Nom complet', 'Anarana feno', 'Full name')}</label>
              <input
                type="text"
                name="nom"
                placeholder={t('Votre nom et prénom', 'Anaranao sy fanampin\'anaranao', 'Your first and last name')}
                value={formData.nom}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label><Mail size={16} /> Email</label>
              <input
                type="email"
                name="email"
                placeholder="exemple@domaine.mg"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label><Lock size={16} /> {t('Mot de passe', 'Kaody', 'Password')}</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="mot_de_passe"
                  placeholder={t('Au moins 4 caractères', 'Tarehintsoratra 4 farafahakeliny', 'At least 4 characters')}
                  value={formData.mot_de_passe}
                  onChange={handleChange}
                  disabled={isLoading}
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label><Lock size={16} /> {t('Confirmer le mot de passe', 'Hamarino ny kaody', 'Confirm password')}</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_mot_de_passe"
                  placeholder={t('4 chiffres', 'Isa 4', '4 digits')}
                  value={formData.confirm_mot_de_passe}
                  onChange={handleChange}
                  disabled={isLoading}
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              type="submit"
              className={`register-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading
                ? t('Création en cours...', 'Mamorona...', 'Creating...')
                : t('S\'inscrire', 'Hisoratra anarana', 'Sign up')}
            </button>

            <div className="register-footer">
              <span>{t('Vous avez déjà un compte ?', 'Efa manana kaonty ve ianao ?', 'Already have an account?')}</span>
              <button
                type="button"
                className="login-link"
                onClick={() => navigate('/')}
              >
                <ArrowLeft size={16} /> {t('Se connecter', 'Hiditra', 'Log in')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
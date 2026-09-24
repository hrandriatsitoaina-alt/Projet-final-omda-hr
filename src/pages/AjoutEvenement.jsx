import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AjoutEvenement.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MiniSidebar from '../components/MiniSidebar';

const AjoutEvenement = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: '',
    date: '',
    lieu: '',
    organisateur: '',
    description: '',
    nbArtistes: '',
    budget: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Événement à ajouter :', formData);
    alert('Événement ajouté avec succès !');
    navigate('/dashboard'); // Retour au tableau de bord
  };

  return (
    <>
      <Header />
      <Sidebar />
      <MiniSidebar />
      
      <main class="contenu">
        {/* <!-- En-tête du contenu --> */}

        



{/* <!-- Section principale @ main--> */}
<section>

  {/* selection */}

   <div class="cont">
         <div class="cont1">
                 <div class="cont11">
                    <select class="form-select">
                        <option value="">Sélectionnez votre usage</option>
                        <option value="OCC">OCC</option>
                        <option value="Bus">Bus</option>
                        <option value="Grand Surface">Grand Surface</option>
                        <option value="Night club">Night club</option>
                        <option value="Télé/Radio">Télé/Radio</option>
                        <option value="Hôtel">Hôtel</option>
                    </select>
                 </div>

                 <div class="cont12">
                      <div class="btn"><button> ➕ Ajout Nouveau</button></div>
                      <div class="btn"><button> ✔ Valider</button></div>
                 </div>
         </div>
         <div class="cont2">
           <div class="cont21"><h3>Éléments sélectionnés : <span>OCC</span></h3></div>
           <div class="cont22">
                <div class="izr">
                     <div><h3>Usg : <span>Occ</span></h3></div>
                     <div><h4>Ins: <span>30</span> |  Fonct : <span>40</span> | Ret : <span>300</span></h4></div>
                </div>
          </div>
         </div><br/>
   </div><br />
  {/* selection */}



    <div class="post_event">
        <div class="post_event1">
            <br/>
            <div class="ber">
                <div><h5>Organisateur</h5></div>
                <div><input type="text" id="organisateur1" placeholder="Rechercher..."/></div>
            </div>
            <div class="liste_organisateur">
                <h3 class="item" data-organisateur="IVENCO" data-lieu="Palais des Sports"> IVENCO </h3><hr/>
                <h3 class="item" data-organisateur="SAKOSY" data-lieu="Espace Promo">Myr Prod</h3><hr/>
                <h3 class="item" data-organisateur="BOJO" data-lieu="Parc de Tana">Rakaka Prod</h3>
            </div>
        </div>
        
        <div class="post_event2">
            <br/>
            <div class="ber">
                <div><h5>lieux </h5></div>
                <div><input type="text" id="organisateur2" placeholder="Rechercher..."/></div>
            </div>
            <div class="liste_organisateur">
                <h3 class="item" data-organisateur="RAKOTO" data-lieu="CCESCA">👤 CCESCA</h3><hr/>
                <h3 class="item" data-organisateur="RABE" data-lieu="Hôtel Carlton">👔 Hôtel Carlton</h3><hr/>
                <h3 class="item" data-organisateur="RANDRY" data-lieu="Anosy">🎭 Atsahamanitra</h3>
            </div>
        </div>
    </div>
    
    {/* <!-- Bouton de confirmation unique pour les deux formulaires --> */}
    <div class="zone_confirmation">
        <div class="zar1" onClick={() => navigate('/dashboard')}>
          <h3 align="center">Anuler </h3>
          </div>



        <div class="zar2"><h3 align="center">Ajout un evenement</h3></div>
    </div>
    
    {/* <!-- Zone d'affichage de la sélection --> */}

</section>



    </main>
    </>
  );
};

export default AjoutEvenement;
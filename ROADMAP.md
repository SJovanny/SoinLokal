# ROADMAP — SoinLokal

## V1 — En cours

- [x] Auth (login/register/logout)
- [x] Dashboard infirmière (mock data)
- [x] Patients : recherche parmi tous les patients + ajout à la liste perso
- [x] Patient détail (fiche complète depuis Supabase)
- [x] Tournée V1 : liste du jour + carte + Waze + marquer terminé

## V2 — Prévu

- [ ] **Tournée : Google Directions API**
  - Optimisation réelle du trajet (Traveling Salesman / TSP)
  - Calcul du meilleur ordre de passage entre les adresses
  - Temps de trajet réel entre chaque patient
  - Temps total estimé de la tournée
  - Prérequis : clé API Google Directions (payant, ~5$/1000 requêtes)
  - Fallback possible : OSRM (open source, gratuit, moins précis en outre-mer)
- [ ] Mode offline-first (WatermelonDB / SQLite + sync)
- [ ] Messagerie temps réel (Supabase Realtime)
- [ ] Notifications push (Expo Notifications)
- [ ] Création de RDV depuis l'app
- [ ] Invitations famille (code d'invitation)
- [ ] Dashboard avec données réelles (remplacer mock data)

// PR1 — Coquille re-export. Le contenu sera décliné en version Directeur en PR2/PR3.
// Avant PR1 : /directeur/comparaison renvoyait 404 (sidebar référençait une route inexistante).
// Cette coquille corrige ce bug pré-existant en réutilisant la vue Manager.
export { default } from "../../manager/comparaison/page";

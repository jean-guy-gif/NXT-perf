import { redirect } from "next/navigation";

// Backward compatibility — /manager/classement a été fusionné dans /manager/comparaison
// (tab "Classement agence" — 8 KPIs, photos, export PNG, sub-toggle Conseillers/Équipes).
export default function ManagerClassementRedirect() {
  redirect("/manager/comparaison");
}

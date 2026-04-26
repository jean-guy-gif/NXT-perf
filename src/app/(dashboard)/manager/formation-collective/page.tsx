import { redirect } from "next/navigation";

// Backward compatibility — /manager/formation-collective a été renommé en /manager/formation.
// Liens existants et bookmarks redirigent transparentement.
export default function ManagerFormationCollectiveRedirect() {
  redirect("/manager/formation");
}

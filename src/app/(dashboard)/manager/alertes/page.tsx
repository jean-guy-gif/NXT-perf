import { redirect } from "next/navigation";

// Backward compatibility — /manager/alertes was renamed to /manager/notifications.
// Existing bookmarks redirect transparently.
export default function ManagerAlertesRedirect() {
  redirect("/manager/notifications");
}

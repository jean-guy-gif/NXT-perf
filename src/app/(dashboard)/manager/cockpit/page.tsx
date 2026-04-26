import { redirect } from "next/navigation";

// Backward compatibility — /manager/cockpit was renamed to /manager/dashboard.
// Existing bookmarks redirect transparently.
export default function CockpitRedirect() {
  redirect("/manager/dashboard");
}

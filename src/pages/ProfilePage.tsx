import { ProfileView } from "@/features/auth";

/**
 * Account data section of the personal area. The route heading, the submenu and the other three
 * sections belong to `PersonalAreaLayout`, so this page only renders the editable profile and never
 * offers a second destination for the password flow or for the pending services.
 */
export function ProfilePage() {
  return <ProfileView />;
}

export default ProfilePage;

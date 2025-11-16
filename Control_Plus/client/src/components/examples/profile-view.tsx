import { ProfileView } from "../profile-view";

export default function ProfileViewExample() {
  const profile = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    age: 32,
    sex: "male",
    weight: 75,
    height: 178,
  };

  return <ProfileView profile={profile} />;
}

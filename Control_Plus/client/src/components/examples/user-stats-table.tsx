import { UserStatsTable } from "../user-stats-table";

export default function UserStatsTableExample() {
  const users = [
    {
      id: "1",
      name: "Alice Johnson",
      email: "alice@example.com",
      lastActive: "2 hours ago",
      status: "active" as const,
      steps: 8543,
    },
    {
      id: "2",
      name: "Bob Smith",
      email: "bob@example.com",
      lastActive: "1 day ago",
      status: "inactive" as const,
      steps: 3421,
    },
    {
      id: "3",
      name: "Carol White",
      email: "carol@example.com",
      lastActive: "30 min ago",
      status: "active" as const,
      steps: 12034,
    },
  ];

  return <UserStatsTable users={users} />;
}

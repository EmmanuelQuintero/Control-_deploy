import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserStat {
  id: string;
  name: string;
  email: string;
  lastActive: string;
  status: "active" | "inactive";
  steps: number;
}

interface UserStatsTableProps {
  users: UserStat[];
}

export function UserStatsTable({ users }: UserStatsTableProps) {
  return (
    <Card data-testid="card-user-stats">
      <CardHeader>
        <CardTitle>User Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg hover-elevate border"
              data-testid={`user-row-${user.id}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {user.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.steps.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">steps</p>
                </div>
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {user.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

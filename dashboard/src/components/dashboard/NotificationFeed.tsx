import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

interface NotificationFeedProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
}

const typeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  error: "destructive",
  success: "default",
};

export function NotificationFeed({ notifications, onMarkRead }: NotificationFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={"p-3 rounded border cursor-pointer transition-colors " + (n.read ? "opacity-60" : "bg-gray-100/50")}
              onClick={() => onMarkRead?.(n.id)}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{n.title}</p>
                <Badge variant={typeVariant[n.type]} className="text-xs">{n.type}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{n.message}</p>
              <p className="text-xs text-gray-500 mt-1">{n.createdAt}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

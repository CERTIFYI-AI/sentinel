import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export default function Frameworks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Frameworks</h1>
          <p className="text-muted-foreground">Manage compliance frameworks</p>
        </div>
        <Button>Add New</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compliance Frameworks Item {i}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={i%2===0?"secondary":"default"}>Active</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  plan: string;
  userLimit?: number;
  operationLimit?: number;
  onChangePlan?: () => void;
};

export function TenantPlanCard({ plan, userLimit, operationLimit, onChangePlan }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Plan actual</CardTitle>
        <CardDescription>Gestiona el plan y los límites de consumo del tenant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-semibold">{plan}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Límite de usuarios</span>
          <span className="font-semibold">{userLimit ?? "Sin límite"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Límite de operaciones</span>
          <span className="font-semibold">{operationLimit ?? "Sin límite"}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onChangePlan} className="w-full">
          Cambiar plan
        </Button>
      </CardFooter>
    </Card>
  );
}

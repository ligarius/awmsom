import type { Permission } from "@/types/saas";

interface RolePermissionMatrixProps {
  permissions: Permission[];
  value: string[];
  onChange: (permissions: string[]) => void;
}

const categories = ["INBOUND", "OUTBOUND", "INVENTORY", "CONFIG", "REPORTS"];

export function RolePermissionMatrix({ permissions, value, onChange }: RolePermissionMatrixProps) {
  const toggle = (key: string) => {
    const next = value.includes(key) ? value.filter((p) => p !== key) : [...value, key];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category} className="rounded-lg border p-4">
          <div className="mb-2 text-sm font-semibold">{category}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {permissions
              .filter((p) => p.category === category)
              .map((permission) => (
                <label key={permission.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={value.includes(permission.key)}
                    onChange={() => toggle(permission.key)}
                  />
                  <span>
                    <span className="font-medium">{permission.key}</span>
                    <p className="text-muted-foreground">{permission.description}</p>
                  </span>
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

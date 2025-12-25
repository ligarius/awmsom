"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/FormSection";
import { useApi } from "@/hooks/useApi";
import type { TenantInput } from "@/types/saas";
import { toast } from "@/components/ui/use-toast";
import { PLAN_OPTIONS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "company", label: "Empresa" },
  { key: "warehouses", label: "Bodegas" },
  { key: "zones", label: "Zonas" },
  { key: "locations", label: "Tipos de ubicaciones" },
  { key: "users", label: "Usuarios" }
] as const;

const ZONE_TYPES = [
  { value: "RECEIVING", label: "Recepcion" },
  { value: "PICKING", label: "Picking" },
  { value: "RESERVE", label: "Reserva" },
  { value: "SHIPPING", label: "Despacho" },
  { value: "RETURNS", label: "Devoluciones" },
  { value: "QUARANTINE", label: "Cuarentena" },
  { value: "SCRAP", label: "Merma" },
  { value: "OTHER", label: "Otro" }
] as const;

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERATOR", label: "Operador" }
] as const;

const ZONE_FLAGS: { key: "allowInbound" | "allowPicking" | "allowStorage" | "allowReturns"; label: string }[] = [
  { key: "allowInbound", label: "Inbound" },
  { key: "allowPicking", label: "Picking" },
  { key: "allowStorage", label: "Storage" },
  { key: "allowReturns", label: "Returns" }
];

type WarehouseForm = { code: string; name: string };

type WarehouseRecord = {
  id: string;
  code: string;
  name: string;
};

type ZoneForm = {
  warehouseId: string;
  code: string;
  name: string;
  zoneType: string;
  allowInbound: boolean;
  allowPicking: boolean;
  allowStorage: boolean;
  allowReturns: boolean;
};

type LocationBatch = {
  warehouseId: string;
  zone: string;
  typeLabel: string;
  prefix: string;
  start: number;
  count: number;
};

type UserForm = {
  fullName: string;
  email: string;
  password: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATOR";
};

export default function CreateTenantPage() {
  const router = useRouter();
  const { post, put } = useApi();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState<TenantInput>({
    name: "",
    taxId: "",
    email: "",
    plan: PLAN_OPTIONS[0]?.value ?? "BASIC",
    adminName: "",
    adminPassword: "",
    userLimit: 10,
    operationLimit: 1000
  });

  const [warehouses, setWarehouses] = useState<WarehouseForm[]>([{ code: "", name: "" }]);
  const [createdWarehouses, setCreatedWarehouses] = useState<WarehouseRecord[]>([]);

  const [zones, setZones] = useState<ZoneForm[]>([]);
  const [locationBatches, setLocationBatches] = useState<LocationBatch[]>([]);
  const [users, setUsers] = useState<UserForm[]>([]);

  const step = STEPS[stepIndex];
  const tenantParam = tenantId ? { params: { tenantId } } : undefined;

  useEffect(() => {
    if (!zones.length && createdWarehouses.length && step.key === "zones") {
      const templates = createdWarehouses.flatMap((warehouse) =>
        [
          {
            warehouseId: warehouse.id,
            code: "REC",
            name: "Recepcion",
            zoneType: "RECEIVING",
            allowInbound: true,
            allowPicking: false,
            allowStorage: false,
            allowReturns: false
          },
          {
            warehouseId: warehouse.id,
            code: "PICK",
            name: "Picking",
            zoneType: "PICKING",
            allowInbound: false,
            allowPicking: true,
            allowStorage: false,
            allowReturns: false
          },
          {
            warehouseId: warehouse.id,
            code: "RES",
            name: "Reserva",
            zoneType: "RESERVE",
            allowInbound: false,
            allowPicking: false,
            allowStorage: true,
            allowReturns: false
          },
          {
            warehouseId: warehouse.id,
            code: "SHIP",
            name: "Despacho",
            zoneType: "SHIPPING",
            allowInbound: false,
            allowPicking: false,
            allowStorage: false,
            allowReturns: false
          }
        ]
      );
      setZones(templates);
    }
  }, [createdWarehouses, step.key, zones.length]);

  useEffect(() => {
    if (!locationBatches.length && zones.length && step.key === "locations") {
      const firstZone = zones[0];
      if (firstZone) {
        setLocationBatches([
          {
            warehouseId: firstZone.warehouseId,
            zone: firstZone.code,
            typeLabel: "RACK",
            prefix: `${firstZone.code}-RACK`,
            start: 1,
            count: 10
          }
        ]);
      }
    }
  }, [locationBatches.length, step.key, zones]);

  const warehouseOptions = useMemo(() => createdWarehouses, [createdWarehouses]);

  const zonesByWarehouse = useMemo(() => {
    return zones.reduce<Record<string, ZoneForm[]>>((acc, zone) => {
      acc[zone.warehouseId] = acc[zone.warehouseId] ?? [];
      acc[zone.warehouseId].push(zone);
      return acc;
    }, {});
  }, [zones]);

  const handleCompanySubmit = async () => {
    if (!companyForm.name || !companyForm.email || !companyForm.adminPassword) {
      toast({ title: "Completa los datos obligatorios", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...companyForm,
        adminName: companyForm.adminName?.trim() || companyForm.name
      };
      const response = await post<{ tenantId: string }>("/saas/tenants", payload);
      setTenantId(response.tenantId);
      toast({ title: "Empresa creada" });
      setStepIndex(1);
    } catch (error) {
      toast({ title: "No pudimos crear la empresa", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleWarehouseSubmit = async () => {
    if (!tenantId) return;
    const valid = warehouses.filter((warehouse) => warehouse.code && warehouse.name);
    if (!valid.length) {
      toast({ title: "Agrega al menos una bodega", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const results: WarehouseRecord[] = [];
      for (const warehouse of valid) {
        const created = await post<WarehouseRecord>("/warehouses", warehouse, tenantParam);
        results.push(created);
      }
      setCreatedWarehouses(results);
      toast({ title: "Bodegas creadas" });
      setStepIndex(2);
    } catch (error) {
      toast({ title: "No pudimos crear bodegas", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleZonesSubmit = async () => {
    if (!tenantId) return;
    const valid = zones.filter((zone) => zone.warehouseId && zone.code && zone.name && zone.zoneType);
    if (!valid.length) {
      toast({ title: "Agrega al menos una zona", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      for (const zone of valid) {
        await put("/config/zones", zone, tenantParam);
      }
      toast({ title: "Zonas configuradas" });
      setStepIndex(3);
    } catch (error) {
      toast({ title: "No pudimos crear zonas", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleLocationsSubmit = async () => {
    if (!tenantId) return;
    const valid = locationBatches.filter((batch) => batch.warehouseId && batch.zone && batch.prefix && batch.count > 0);
    if (!valid.length) {
      toast({ title: "Agrega al menos un tipo de ubicacion", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      for (const batch of valid) {
        const separator = batch.prefix.endsWith("-") ? "" : "-";
        for (let i = 0; i < batch.count; i += 1) {
          const code = `${batch.prefix}${separator}${String(batch.start + i).padStart(2, "0")}`;
          await post(
            "/locations",
            {
              warehouseId: batch.warehouseId,
              code,
              zone: batch.zone,
              description: `${batch.typeLabel} ${batch.zone}`
            },
            tenantParam
          );
        }
      }
      toast({ title: "Ubicaciones creadas" });
      setStepIndex(4);
    } catch (error) {
      toast({ title: "No pudimos crear ubicaciones", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleUsersSubmit = async () => {
    if (!tenantId) return;
    const valid = users.filter((user) => user.email && user.password && user.role);

    setBusy(true);
    try {
      for (const user of valid) {
        await post(`/saas/tenants/${tenantId}/users`, user);
      }
      toast({ title: "Usuarios creados" });
      router.push(`/saas/tenants/${tenantId}`);
    } catch (error) {
      toast({ title: "No pudimos crear usuarios", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleNext = async () => {
    if (step.key === "company") {
      await handleCompanySubmit();
      return;
    }
    if (step.key === "warehouses") {
      await handleWarehouseSubmit();
      return;
    }
    if (step.key === "zones") {
      await handleZonesSubmit();
      return;
    }
    if (step.key === "locations") {
      await handleLocationsSubmit();
      return;
    }
    if (step.key === "users") {
      await handleUsersSubmit();
    }
  };

  const handleBack = () => setStepIndex((prev) => Math.max(0, prev - 1));

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Wizard de alta</CardTitle>
          <CardDescription>Empresa, bodegas, zonas, ubicaciones y usuarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((stepItem, index) => (
              <div
                key={stepItem.key}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                  index === stepIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : index < stepIndex
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground"
                )}
              >
                <span className="font-semibold">{index + 1}</span>
                <span>{stepItem.label}</span>
              </div>
            ))}
          </div>

          {step.key === "company" && (
            <FormSection title="Datos de la empresa">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Acme Logistics"
                  />
                </div>
                <div>
                  <Label htmlFor="taxId">RUT / Tax ID</Label>
                  <Input
                    id="taxId"
                    value={companyForm.taxId}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, taxId: e.target.value }))}
                    placeholder="76.123.456-7"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email administrador</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="adminName">Nombre administrador</Label>
                  <Input
                    id="adminName"
                    value={companyForm.adminName ?? ""}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminName: e.target.value }))}
                    placeholder="Nombre del administrador"
                  />
                </div>
                <div>
                  <Label htmlFor="adminPassword">Contrasena inicial</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    required
                    value={companyForm.adminPassword ?? ""}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="Minimo 8 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="plan">Plan comercial</Label>
                  <Select
                    value={companyForm.plan}
                    onValueChange={(value) => setCompanyForm((prev) => ({ ...prev, plan: value }))}
                  >
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({option.description})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>
          )}

          {step.key === "warehouses" && (
            <FormSection title="Bodegas">
              <div className="space-y-4">
                {warehouses.map((warehouse, index) => (
                  <div key={`warehouse-${index}`} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                    <div>
                      <Label>Codigo</Label>
                      <Input
                        value={warehouse.code}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWarehouses((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, code: value } : item))
                          );
                        }}
                        placeholder="WH-01"
                      />
                    </div>
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={warehouse.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWarehouses((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, name: value } : item))
                          );
                        }}
                        placeholder="Bodega Central"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setWarehouses((prev) => prev.filter((_, idx) => idx !== index))
                        }
                        disabled={warehouses.length === 1}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  onClick={() => setWarehouses((prev) => [...prev, { code: "", name: "" }])}
                >
                  + Agregar bodega
                </Button>
              </div>
            </FormSection>
          )}

          {step.key === "zones" && (
            <FormSection title="Zonas por bodega">
              <div className="space-y-4">
                {zones.map((zone, index) => (
                  <div key={`zone-${index}`} className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Bodega</Label>
                        <Select
                          value={zone.warehouseId}
                          onValueChange={(value) =>
                            setZones((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, warehouseId: value } : item))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una bodega" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseOptions.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.code} - {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo de zona</Label>
                        <Select
                          value={zone.zoneType}
                          onValueChange={(value) =>
                            setZones((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, zoneType: value } : item))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            {ZONE_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Codigo</Label>
                        <Input
                          value={zone.code}
                          onChange={(e) =>
                            setZones((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, code: e.target.value } : item))
                            )
                          }
                          placeholder="PICK"
                        />
                      </div>
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={zone.name}
                          onChange={(e) =>
                            setZones((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, name: e.target.value } : item))
                            )
                          }
                          placeholder="Picking"
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      {ZONE_FLAGS.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={zone[item.key]}
                            onCheckedChange={(checked) =>
                              setZones((prev) =>
                                prev.map((entry, idx) =>
                                  idx === index
                                    ? { ...entry, [item.key]: Boolean(checked) }
                                    : entry
                                )
                              )
                            }
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setZones((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        Quitar zona
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  onClick={() =>
                    setZones((prev) => [
                      ...prev,
                      {
                        warehouseId: warehouseOptions[0]?.id ?? "",
                        code: "",
                        name: "",
                        zoneType: "RECEIVING",
                        allowInbound: false,
                        allowPicking: false,
                        allowStorage: false,
                        allowReturns: false
                      }
                    ])
                  }
                >
                  + Agregar zona
                </Button>
              </div>
            </FormSection>
          )}

          {step.key === "locations" && (
            <FormSection title="Tipos de ubicaciones">
              <div className="space-y-4">
                {locationBatches.map((batch, index) => (
                  <div key={`location-${index}`} className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Bodega</Label>
                        <Select
                          value={batch.warehouseId}
                          onValueChange={(value) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) =>
                                idx === index
                                  ? { ...item, warehouseId: value, zone: "" }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una bodega" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseOptions.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.code} - {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Zona</Label>
                        <Select
                          value={batch.zone}
                          onValueChange={(value) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, zone: value } : item))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una zona" />
                          </SelectTrigger>
                          <SelectContent>
                            {(zonesByWarehouse[batch.warehouseId] ?? zones).map((zone) => (
                              <SelectItem key={`${zone.warehouseId}-${zone.code}`} value={zone.code}>
                                {zone.code} - {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Input
                          value={batch.typeLabel}
                          onChange={(e) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, typeLabel: e.target.value } : item))
                            )
                          }
                          placeholder="RACK"
                        />
                      </div>
                      <div>
                        <Label>Prefijo</Label>
                        <Input
                          value={batch.prefix}
                          onChange={(e) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) => (idx === index ? { ...item, prefix: e.target.value } : item))
                            )
                          }
                          placeholder="PICK-RACK"
                        />
                      </div>
                      <div>
                        <Label>Inicio</Label>
                        <Input
                          type="number"
                          value={batch.start}
                          onChange={(e) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, start: Number(e.target.value) } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={batch.count}
                          onChange={(e) =>
                            setLocationBatches((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, count: Number(e.target.value) } : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Se crearan {batch.count} ubicaciones desde {batch.prefix}-
                        {String(batch.start).padStart(2, "0")}.
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setLocationBatches((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        Quitar tipo
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    setLocationBatches((prev) => [
                      ...prev,
                      {
                        warehouseId: warehouseOptions[0]?.id ?? "",
                        zone: zones[0]?.code ?? "",
                        typeLabel: "RACK",
                        prefix: "RACK",
                        start: 1,
                        count: 10
                      }
                    ])
                  }
                >
                  + Agregar tipo de ubicacion
                </Button>
              </div>
            </FormSection>
          )}

          {step.key === "users" && (
            <FormSection title="Usuarios iniciales">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                El usuario admin principal ya fue creado en el paso Empresa. Agrega usuarios adicionales si lo necesitas.
              </div>
              <div className="mt-4 space-y-4">
                {users.map((user, index) => (
                  <div key={`user-${index}`} className="grid gap-4 md:grid-cols-5">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={user.fullName}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, fullName: e.target.value } : item))
                          )
                        }
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={user.email}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, email: e.target.value } : item))
                          )
                        }
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div>
                      <Label>Contrasena</Label>
                      <Input
                        type="password"
                        value={user.password}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, password: e.target.value } : item))
                          )
                        }
                        placeholder="Minimo 8 caracteres"
                      />
                    </div>
                    <div>
                      <Label>Rol</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          setUsers((prev) =>
                            prev.map((item, idx) => (idx === index ? { ...item, role: value as UserForm["role"] } : item))
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setUsers((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    setUsers((prev) => [...prev, { fullName: "", email: "", password: "", role: "OPERATOR" }])
                  }
                >
                  + Agregar usuario
                </Button>
              </div>
            </FormSection>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={handleBack} disabled={stepIndex === 0 || busy}>
            Atras
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Paso {stepIndex + 1} de {STEPS.length}</span>
            <Button onClick={handleNext} disabled={busy}>
              {step.key === "users" ? "Finalizar" : "Continuar"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AppShell>
  );
}

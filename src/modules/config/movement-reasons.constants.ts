export type MovementReasonSeed = {
  code: string;
  label: string;
  description?: string;
  isDefault?: boolean;
};

export const DEFAULT_MOVEMENT_REASONS: MovementReasonSeed[] = [
  {
    code: 'RELOCATE',
    label: 'Reubicacion interna',
    description: 'Movimiento para reorganizar ubicaciones',
    isDefault: true,
  },
  {
    code: 'REPLENISH',
    label: 'Reabastecimiento',
    description: 'Reposicion de picking',
  },
  {
    code: 'RECEIPT',
    label: 'Recepcion',
    description: 'Ingreso de mercaderia',
  },
  {
    code: 'SHIPMENT',
    label: 'Despacho',
    description: 'Salida a cliente o transporte',
  },
  {
    code: 'ADJUSTMENT',
    label: 'Ajuste operativo',
    description: 'Correcciones internas o ajustes menores',
  },
  {
    code: 'QUALITY_HOLD',
    label: 'Control de calidad',
    description: 'Bloqueo temporal por calidad',
  },
  {
    code: 'DAMAGE',
    label: 'Merma o dano',
    description: 'Producto danado o merma',
  },
  {
    code: 'OTHER',
    label: 'Otros',
    description: 'Movimiento manual',
  },
];

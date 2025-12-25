import { PageHeader } from "@/components/layout/PageHeader";

interface SettingsHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  actions?: React.ReactNode;
}

export function SettingsHeader({ title, description, backTo, actions }: SettingsHeaderProps) {
  return <PageHeader title={title} description={description} backHref={backTo} actions={actions} />;
}

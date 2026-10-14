import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, badge, actions }: Props) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

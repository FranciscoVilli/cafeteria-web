import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Input> & { etiqueta: string; ayuda?: string; nombre: string };

/** Campo de formulario con etiqueta y ayuda. */
export function Campo({ etiqueta, ayuda, nombre, className, ...props }: Props) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Input id={nombre} name={nombre} className="h-10" {...props} />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

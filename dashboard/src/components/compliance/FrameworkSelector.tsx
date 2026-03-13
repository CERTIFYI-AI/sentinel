import { Badge } from "../ui/badge";

interface Framework {
  id: string;
  name: string;
  type: "mandatory" | "voluntary";
}

interface FrameworkSelectorProps {
  frameworks: Framework[];
  selected: string;
  onSelect: (id: string) => void;
}

export function FrameworkSelector({ frameworks, selected, onSelect }: FrameworkSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {frameworks.map((fw) => (
        <button
          key={fw.id}
          onClick={() => onSelect(fw.id)}
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors " +
            (selected === fw.id ? "bg-[#1A6B5A] text-white border-primary" : "hover:bg-gray-100")}
        >
          {fw.name}
          <Badge variant={fw.type === "mandatory" ? "destructive" : "secondary"} className="text-xs">
            {fw.type === "mandatory" ? "LAW" : "VOL"}
          </Badge>
        </button>
      ))}
    </div>
  );
}

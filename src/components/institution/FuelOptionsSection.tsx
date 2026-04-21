import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import firewoodImg from "@/assets/fuels/firewood.webp";
import charcoalImg from "@/assets/fuels/charcoal.jpg";
import lpgImg from "@/assets/fuels/lpg.webp";
import biogasImg from "@/assets/fuels/biogas.jpg";
import electricImg from "@/assets/fuels/electric.webp";
import pelletsImg from "@/assets/fuels/pellets.jpg";

const FUEL_OPTIONS = [
  {
    name: "Firewood",
    badge: "Baseline",
    badgeClass: "bg-muted text-muted-foreground",
    cost: "KSh 3–5",
    unit: "/ meal",
    desc: "High particulate emissions, deforestation risk",
    image: firewoodImg,
  },
  {
    name: "Charcoal",
    badge: "Common",
    badgeClass: "bg-muted text-muted-foreground",
    cost: "KSh 8–12",
    unit: "/ meal",
    desc: "Lower efficiency, indoor air quality concerns",
    image: charcoalImg,
  },
  {
    name: "LPG",
    badge: "Transitional",
    badgeClass: "bg-primary/15 text-primary",
    cost: "KSh 6–9",
    unit: "/ meal",
    desc: "Clean burn, supply-chain dependent",
    image: lpgImg,
  },
  {
    name: "Biogas",
    badge: "Renewable",
    badgeClass: "bg-emerald-500/15 text-emerald-600",
    cost: "KSh 2–4",
    unit: "/ meal",
    desc: "Lowest running cost, needs feedstock",
    image: biogasImg,
  },
  {
    name: "Electric (Induction)",
    badge: "Clean",
    badgeClass: "bg-emerald-500/15 text-emerald-600",
    cost: "KSh 5–8",
    unit: "/ meal",
    desc: "Zero emissions at point of use, grid-dependent",
    image: electricImg,
  },
  {
    name: "Biomass Pellets",
    badge: "Emerging",
    badgeClass: "bg-orange-500/15 text-orange-600",
    cost: "KSh 4–7",
    unit: "/ meal",
    desc: "Efficient, standardised fuel, growing supply",
    image: pelletsImg,
  },
];

export default function FuelOptionsSection() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-display font-bold">
          Fuel Options and Cost per Meal
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Comparing institutional cooking fuel costs across Kenya. Figures are indicative averages for a 500-person institution.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FUEL_OPTIONS.map((fuel) => (
            <div key={fuel.name} className="rounded-xl border border-border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="h-44 overflow-hidden">
                <img
                  src={fuel.image}
                  alt={fuel.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{fuel.name}</h3>
                  <Badge variant="secondary" className={fuel.badgeClass}>
                    {fuel.badge}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-orange-500">
                  {fuel.cost} <span className="text-sm font-normal text-muted-foreground">{fuel.unit}</span>
                </p>
                <p className="text-sm text-muted-foreground">{fuel.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

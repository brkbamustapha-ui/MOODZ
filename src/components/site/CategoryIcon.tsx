"use client";

import {
  AvocadoIcon,
  BowlFoodIcon,
  BowlSteamIcon,
  BreadIcon,
  CakeIcon,
  CheeseIcon,
  CherriesIcon,
  CoffeeBeanIcon,
  CoffeeIcon,
  CookieIcon,
  CookingPotIcon,
  DropIcon,
  EggIcon,
  FishIcon,
  ForkKnifeIcon,
  HamburgerIcon,
  IceCreamIcon,
  LeafIcon,
  MartiniIcon,
  OrangeSliceIcon,
  PepperIcon,
  PizzaIcon,
  PopsicleIcon,
  SparkleIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

const ICONS: Record<string, Icon> = {
  coffee: CoffeeIcon,
  "coffee-bean": CoffeeBeanIcon,
  drop: DropIcon,
  "orange-slice": OrangeSliceIcon,
  martini: MartiniIcon,
  egg: EggIcon,
  bread: BreadIcon,
  cake: CakeIcon,
  cookie: CookieIcon,
  "ice-cream": IceCreamIcon,
  leaf: LeafIcon,
  avocado: AvocadoIcon,
  hamburger: HamburgerIcon,
  pizza: PizzaIcon,
  "bowl-food": BowlFoodIcon,
  "bowl-steam": BowlSteamIcon,
  "cooking-pot": CookingPotIcon,
  "fork-knife": ForkKnifeIcon,
  fish: FishIcon,
  cheese: CheeseIcon,
  pepper: PepperIcon,
  cherries: CherriesIcon,
  popsicle: PopsicleIcon,
  sparkle: SparkleIcon,
};

export function CategoryIcon({
  name,
  size = 22,
  weight = "light",
  className,
}: {
  name: string;
  size?: number;
  weight?: IconWeight;
  className?: string;
}) {
  const Component = ICONS[name] ?? ForkKnifeIcon;
  return <Component size={size} weight={weight} className={className} aria-hidden />;
}

import { MealCard } from "../meal-card";

export default function MealCardExample() {
  return (
    <MealCard
      type="Breakfast"
      time="8:30 AM"
      calories={450}
      items={[
        "Oatmeal with berries",
        "Greek yogurt",
        "Orange juice",
      ]}
    />
  );
}

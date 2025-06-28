import { readdir } from "node:fs/promises";

const POSITIONS = ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"];

async function formatRecipe(recipe: string[]) {
  const output: Record<string, string> = {};
  for (let i = 0; i < POSITIONS.length; i++) {
    if (!recipe[i]) {
      output[POSITIONS[i]] = "";
      continue;
    }

    const [NEUId, amount] = recipe[i].split(":");
    const id = (await getItemId(NEUId)) ?? NEUId;

    output[POSITIONS[i]] = `${id};${amount}`;
  }

  return output;
}

const output: { 
  [key: string]: {
    name: string;
    recipe: any;
    wiki?: string[]
  }
} = {};
const items = await readdir("../items");

for (const item of items) {
  const itemData = await Bun.file(`../items/${item}`).json();
  if (itemData.recipe) {
    output[itemData.internalname as string] = {
      name: itemData.displayname.replace(/ยง./g, ""),
      recipe: await formatRecipe(Object.values(itemData.recipe)),
      wiki: itemData.info,
    };
  }

  const foundRecipes = itemData.recipes?.filter(
    (recipe: { type: string; }) => recipe?.type === "npc_shop"
  );
  if (foundRecipes && foundRecipes.length) {
    for (const recipe of foundRecipes) {
      const newRecipe = await formatRecipe(recipe.cost);
      const [fileId, amount] = recipe.result.split(":");
      const id = recipe.result.split(";")[0];

      const itemData = await Bun.file(`../items/${fileId}.json`).json().catch(() => null);
      if (!itemData) {
        console.log(`Item data for ${fileId} not found, skipping...`);
        continue;
      }

      output[id] = {
        name: itemData?.displayname.replace(/ยง./g, ""),
        recipe: { ...newRecipe, count: parseInt(amount ?? 1) ?? 1 },
        wiki: itemData?.info,
      };
    }
  }
}

async function getItemId(NEUId: string) {
  if (NEUId === "SKYBLOCK_COIN") {
    return NEUId;
  }

  const itemData = await Bun.file(`../items/${NEUId}.json`).json();
  return itemData.internalname.replace("-", ":");
}

const sorted = Object.fromEntries(
  Object.entries(output).sort(([a], [b]) => a.localeCompare(b))
);

await Bun.write("../recipes/recipes.json", JSON.stringify(sorted, null, 2));

const MEAL_SHARE = {
  breakfast: 0.3,
  lunch: 0.35,
  dinner: 0.35,
}

const MEAL_POOL_FIELDS = {
  breakfast: ['breakfast'],
  lunch: ['lunch', 'lateLunch'],
  dinner: ['dinner', 'lateDinner', 'lateNight'],
}

const MEAL_BOUNDS = {
  breakfast: { min: 1, max: 3 },
  lunch: { min: 2, max: 3 },
  dinner: { min: 2, max: 3 },
}

const MONTE_CARLO_ITERATIONS = 25000
const LEADERBOARD_LIMIT = 32
const DIVERSE_RESULTS_LIMIT = 5
const DIVERSITY_THRESHOLD = 0.65
const REFINE_CANDIDATES = 10
const MAX_REFINE_PASSES = 4
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner']

const EPSILON = 1

const LOSS_WEIGHTS = {
  calories: 1.35,
  protein: 4.4,
  carbs: 1.6,
  fat: 1,
}

const OVERSHOOT_MULTIPLIERS = {
  calories: 1.2,
  protein: 0.9,
  carbs: 1.55,
  fat: 1.4,
}

const UNDERSHOOT_MULTIPLIERS = {
  calories: 1.45,
  protein: 2.45,
  carbs: 1.35,
  fat: 1,
}

const MIN_MEAL_PROTEIN_SHARE = {
  breakfast: 0.62,
  lunch: 0.6,
  dinner: 0.6,
}

const MIN_MEAL_CALORIE_SHARE = {
  breakfast: 0.25,
  lunch: 0.25,
  dinner: 0.25,
}

const MIN_MEAL_CARB_SHARE = {
  breakfast: 0.5,
  lunch: 0.55,
  dinner: 0.55,
}

const DAY_MIN_SHARE = {
  calories: 0.85,
  carbs: 0.82,
  protein: 0.8,
}

const CATEGORY_RULES = {
  breakfast: {
    entree: { min: 1, max: 2 },
    side: { min: 0, max: 2 },
    treat: { min: 0, max: 1 },
    treatChance: 0.2,
  },
  lunch: {
    entree: { min: 1, max: 2 },
    side: { min: 1, max: 2 },
    treat: { min: 0, max: 1 },
    treatChance: 0.15,
  },
  dinner: {
    entree: { min: 1, max: 2 },
    side: { min: 1, max: 2 },
    treat: { min: 0, max: 1 },
    treatChance: 0.12,
  },
}

const MAIN_ITEM_KEYWORDS = [
  'chicken',
  'beef',
  'pork',
  'turkey',
  'sausage',
  'tofu',
  'egg',
  'omelet',
  'burger',
  'sandwich',
  'wrap',
  'pasta',
  'pizza',
  'burrito',
  'bowl',
  'rice',
  'beans',
  'ravioli',
  'noodle',
  'soup',
  'salad',
  'fish',
  'shrimp',
  'ham',
  'bacon',
]

const SIDE_KEYWORDS = [
  'rice',
  'beans',
  'broccoli',
  'carrot',
  'corn',
  'potato',
  'salad',
  'greens',
  'cabbage',
  'vegetable',
  'fruit',
  'oats',
  'grits',
  'quinoa',
  'pasta salad',
]

const TREAT_SECTION_KEYWORDS = [
  'dessert',
  'bakery',
  'pastry',
  'sweets',
  'ice cream',
]

const EXCLUDED_SECTIONS = ['beverages', 'condiments and spreads', 'cereal']
const EXCLUDED_ITEM_KEYWORDS = ['ice cream']

const DESSERT_KEYWORDS = [
  'cake',
  'cookie',
  'brownie',
  'muffin',
  'donut',
  'scone',
  'turnover',
  'pastry',
  'ice cream',
  'sorbet',
  'pudding',
  'whipped topping',
  'frosting',
  'sugar',
  'sweet',
  'chocolate sauce',
  'caramel sauce',
]

const CONDIMENT_KEYWORDS = [
  'sauce',
  'dressing',
  'vinaigrette',
  'gravy',
  'salsa',
  'ketchup',
  'mustard',
  'mayo',
  'mayonnaise',
  'aioli',
  'relish',
  'jam',
  'jelly',
  'cream cheese',
  'butter',
  'margarine',
  'syrup',
  'spread',
]

const CONDIMENT_SECTION_KEYWORDS = [
  'condiment',
  'sauce',
  'spread',
  'topping',
]

const TYPE_KEYWORDS = [
  'bagel', 'bread', 'roll', 'biscuit', 'croissant', 'toast', 'tortilla', 'pita',
  'waffle', 'pancake', 'crepe', 'french toast',
  'muffin', 'scone', 'donut', 'pastry', 'turnover', 'croissant',
  'egg', 'omelet', 'omelette', 'frittata',
  'yogurt', 'oats', 'grits', 'granola', 'cereal',
  'chicken', 'beef', 'pork', 'turkey', 'lamb',
  'fish', 'salmon', 'tilapia', 'tuna', 'shrimp', 'cod',
  'sausage', 'ham', 'bacon', 'pepperoni',
  'tofu', 'tempeh',
  'pasta', 'noodle', 'ravioli', 'macaroni', 'spaghetti', 'fettuccine', 'penne',
  'pizza', 'flatbread',
  'rice', 'quinoa',
  'beans', 'lentils', 'hummus',
  'soup', 'chili', 'stew',
  'salad',
  'sandwich', 'sub', 'hoagie',
  'burger', 'patty',
  'wrap', 'burrito', 'taco', 'quesadilla',
  'bowl',
  'cake', 'cookie', 'brownie', 'pudding',
  'potato', 'fries',
  'broccoli', 'carrot', 'corn', 'spinach', 'cabbage', 'kale',
  'apple', 'banana', 'orange', 'melon', 'berry', 'grape', 'pear', 'peach',
]

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mealAvailableFor(item, mealKey) {
  const fields = MEAL_POOL_FIELDS[mealKey] ?? []
  return fields.some((field) => Number(item?.[field] ?? 0) === 1)
}

function itemName(item) {
  return String(item?.foodName || '').toLowerCase()
}

function itemSection(item) {
  return String(item?.section || '').toLowerCase()
}

function isDessertLike(item) {
  const name = itemName(item)
  return DESSERT_KEYWORDS.some((keyword) => name.includes(keyword))
}

function isMainItem(item) {
  const name = itemName(item)
  return MAIN_ITEM_KEYWORDS.some((keyword) => name.includes(keyword))
}

function isSideLike(item) {
  const name = itemName(item)
  return SIDE_KEYWORDS.some((keyword) => name.includes(keyword))
}

function isTreatSection(item) {
  const section = itemSection(item)
  return TREAT_SECTION_KEYWORDS.some((keyword) => section.includes(keyword))
}

function isCondimentLike(item) {
  const name = itemName(item)
  const section = itemSection(item)
  const calories = toNumber(item?.calories)
  const protein = toNumber(item?.protein)
  const looksLikeCondiment = CONDIMENT_KEYWORDS.some((keyword) => name.includes(keyword))
  const condimentSection = CONDIMENT_SECTION_KEYWORDS.some((keyword) => section.includes(keyword))

  if (condimentSection) {
    return true
  }

  if (looksLikeCondiment && calories <= 220 && protein <= 8) {
    return true
  }

  return false
}

function foodTypeKey(item) {
  const name = itemName(item)
  let bestMatch = ''
  for (const keyword of TYPE_KEYWORDS) {
    if (name.includes(keyword) && keyword.length > bestMatch.length) {
      bestMatch = keyword
    }
  }
  if (bestMatch) return bestMatch
  const words = name.trim().split(/\s+/)
  return words[words.length - 1] || name
}

function itemCategory(item) {
  if (isDessertLike(item) || isTreatSection(item)) {
    return 'treat'
  }

  const calories = toNumber(item?.calories)
  const protein = toNumber(item?.protein)

  if (isMainItem(item) || protein >= 14 || (protein >= 10 && calories >= 180)) {
    return 'entree'
  }

  if (isSideLike(item)) {
    return 'side'
  }

  if (protein >= 9 && calories >= 140) {
    return 'entree'
  }

  return 'side'
}

function comboPenalty(items, mealKey) {
  const dessertCount = items.reduce((count, item) => count + (isDessertLike(item) ? 1 : 0), 0)
  const mainCount = items.reduce((count, item) => count + (isMainItem(item) ? 1 : 0), 0)
  const proteinCount = items.reduce((count, item) => count + (toNumber(item?.protein) >= 8 ? 1 : 0), 0)

  if (mealKey === 'breakfast') {
    if (mainCount === 0 && proteinCount === 0) {
      return 6
    }
    return dessertCount === items.length ? 4.5 : 0
  }

  if (mainCount === 0) {
    return 10
  }

  if (dessertCount === items.length) {
    return 12
  }

  if (dessertCount > 1) {
    return (dessertCount - 1) * 5
  }

  return 0
}

function combinationTotals(selectedItems) {
  return selectedItems.reduce(
    (totals, item) => {
      totals.calories += toNumber(item?.calories)
      totals.protein += toNumber(item?.protein)
      totals.carbs += toNumber(item?.totalCarbohydrates)
      totals.fat += toNumber(item?.totalFat)
      return totals
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

function repeatPenalty(selectedMeals) {
  const seen = new Set()
  let penalty = 0

  for (const mealItems of [selectedMeals.breakfast, selectedMeals.lunch, selectedMeals.dinner]) {
    for (const item of mealItems) {
      const key = itemName(item)
      if (!key) {
        continue
      }

      if (seen.has(key)) {
        penalty += 18
      } else {
        seen.add(key)
      }
    }
  }

  return penalty
}

function typeDayRepeatPenalty(selectedMeals) {
  const typeCounts = new Map()
  for (const mealItems of [selectedMeals.breakfast, selectedMeals.lunch, selectedMeals.dinner]) {
    for (const item of mealItems) {
      const key = foodTypeKey(item)
      typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1)
    }
  }
  let penalty = 0
  for (const count of typeCounts.values()) {
    if (count > 2) {
      penalty += (count - 2) * 28
    }
  }
  return penalty
}

function mealTargetsFromGoals(goals) {
  return {
    breakfast: {
      calories: toNumber(goals.calories) * MEAL_SHARE.breakfast,
      protein: toNumber(goals.protein) * MEAL_SHARE.breakfast,
      carbs: toNumber(goals.carbs) * MEAL_SHARE.breakfast,
      fat: toNumber(goals.fat) * MEAL_SHARE.breakfast,
    },
    lunch: {
      calories: toNumber(goals.calories) * MEAL_SHARE.lunch,
      protein: toNumber(goals.protein) * MEAL_SHARE.lunch,
      carbs: toNumber(goals.carbs) * MEAL_SHARE.lunch,
      fat: toNumber(goals.fat) * MEAL_SHARE.lunch,
    },
    dinner: {
      calories: toNumber(goals.calories) * MEAL_SHARE.dinner,
      protein: toNumber(goals.protein) * MEAL_SHARE.dinner,
      carbs: toNumber(goals.carbs) * MEAL_SHARE.dinner,
      fat: toNumber(goals.fat) * MEAL_SHARE.dinner,
    },
  }
}

function errorTerm(goal, actual, macro) {
  if (goal <= 0) {
    return 0
  }

  const gap = actual - goal
  if (gap > 0) {
    return (Math.abs(gap) / Math.max(goal, EPSILON)) * (OVERSHOOT_MULTIPLIERS[macro] ?? 1)
  }

  return (Math.abs(gap) / Math.max(goal, EPSILON)) * (UNDERSHOOT_MULTIPLIERS[macro] ?? 1)
}

function macroLoss(goals, totals) {
  return (
    LOSS_WEIGHTS.calories * errorTerm(toNumber(goals.calories), toNumber(totals.calories), 'calories') +
    LOSS_WEIGHTS.protein * errorTerm(toNumber(goals.protein), toNumber(totals.protein), 'protein') +
    LOSS_WEIGHTS.carbs * errorTerm(toNumber(goals.carbs), toNumber(totals.carbs), 'carbs') +
    LOSS_WEIGHTS.fat * errorTerm(toNumber(goals.fat), toNumber(totals.fat), 'fat')
  )
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedChoice(items, usedLocal, weightFn) {
  const candidates = items.filter((item) => !usedLocal.has(item))
  if (!candidates.length) {
    return null
  }

  const weights = candidates.map((item) => {
    const value = weightFn ? Number(weightFn(item)) : 1
    return Number.isFinite(value) ? Math.max(value, 0.01) : 1
  })

  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  let threshold = Math.random() * totalWeight

  for (let index = 0; index < candidates.length; index += 1) {
    threshold -= weights[index]
    if (threshold <= 0) {
      return candidates[index]
    }
  }

  return candidates[candidates.length - 1]
}

function chooseCategoryCounts(mealKey, size, categorizedPool) {
  const rules = CATEGORY_RULES[mealKey]
  const counts = { entree: 0, side: 0, treat: 0 }

  const treatAvailable = categorizedPool.treat.length > 0
  const treatCap = Math.min(rules.treat.max, size)
  const addTreat = treatAvailable && treatCap > 0 && Math.random() < rules.treatChance
  counts.treat = addTreat ? 1 : 0

  const remainingAfterTreat = Math.max(size - counts.treat, 0)
  const entreeMin = Math.min(rules.entree.min, remainingAfterTreat)
  const entreeCapByRule = Math.min(rules.entree.max, remainingAfterTreat)
  const entreeCapByPool = Math.max(categorizedPool.entree.length, 0)
  const entreeMax = Math.max(Math.min(entreeCapByRule, entreeCapByPool), entreeMin)

  counts.entree = randomInt(entreeMin, entreeMax)

  const remainingAfterEntree = Math.max(size - counts.treat - counts.entree, 0)
  const sideMin = Math.min(rules.side.min, remainingAfterEntree)
  const sideCapByRule = Math.min(rules.side.max, remainingAfterEntree)
  const sideCapByPool = Math.max(categorizedPool.side.length, 0)
  const sideMax = Math.max(Math.min(sideCapByRule, sideCapByPool), sideMin)
  counts.side = randomInt(sideMin, sideMax)

  let assigned = counts.entree + counts.side + counts.treat
  while (assigned < size) {
    if (counts.side < rules.side.max && counts.side < categorizedPool.side.length) {
      counts.side += 1
    } else if (counts.entree < rules.entree.max && counts.entree < categorizedPool.entree.length) {
      counts.entree += 1
    } else if (counts.treat < rules.treat.max && counts.treat < categorizedPool.treat.length) {
      counts.treat += 1
    } else {
      break
    }
    assigned += 1
  }

  return counts
}

function pickUniqueFromPool(pool, count, usedLocal, weightFn) {
  if (count <= 0 || !pool.length) {
    return []
  }

  const picks = []

  for (let index = 0; index < count; index += 1) {
    const candidate = weightedChoice(pool, usedLocal, weightFn)
    if (!candidate) {
      break
    }

    usedLocal.add(candidate)
    picks.push(candidate)
  }

  return picks
}

function entreeWeight(item) {
  const protein = toNumber(item?.protein)
  const calories = Math.max(toNumber(item?.calories), 1)
  const carbs = toNumber(item?.totalCarbohydrates)
  const density = protein / calories
  const carbRatio = carbs / calories
  const mainBonus = isMainItem(item) ? 2.5 : 0
  const lowProteinPenalty = protein < 10 ? 3.2 : 0
  const carbPenalty = carbRatio > 0.16 ? (carbRatio - 0.16) * 30 : 0
  return Math.max(0.1, 1 + protein * 0.82 + density * 74 + mainBonus - lowProteinPenalty - carbPenalty)
}

function sideWeight(item) {
  const protein = toNumber(item?.protein)
  const carbs = toNumber(item?.totalCarbohydrates)
  const calories = Math.max(toNumber(item?.calories), 1)
  const carbRatio = carbs / calories
  return Math.max(0.1, 1 + protein * 0.42 + carbs * 0.01 - (carbRatio > 0.2 ? (carbRatio - 0.2) * 20 : 0))
}

function treatWeight(item) {
  const protein = toNumber(item?.protein)
  return Math.max(0.25, 1 + protein * 0.08)
}

function sampleMeal(mealKey, poolInfo) {
  const bounds = MEAL_BOUNDS[mealKey]
  const categories = poolInfo.categories
  const size = randomInt(bounds.min, bounds.max)
  const counts = chooseCategoryCounts(mealKey, size, categories)
  const usedLocal = new Set()
  const usedTypeKeys = new Set()

  const pickWithTypeGuard = (pool, count, weightFn) => {
    const available = pool.filter((item) => !usedTypeKeys.has(foodTypeKey(item)))
    const picks = pickUniqueFromPool(available, count, usedLocal, weightFn)
    for (const pick of picks) usedTypeKeys.add(foodTypeKey(pick))
    return picks
  }

  const items = [
    ...pickWithTypeGuard(categories.entree, counts.entree, entreeWeight),
    ...pickWithTypeGuard(categories.side, counts.side, sideWeight),
    ...pickWithTypeGuard(categories.treat, counts.treat, treatWeight),
  ]

  while (items.length < size) {
    const fallback = pickWithTypeGuard(poolInfo.allItems, 1, entreeWeight)
    if (!fallback.length) break
    items.push(...fallback)
  }

  if (items.length < bounds.min) {
    return null
  }

  return items
}

function proteinUndershootPenalty(actualProtein, goalProtein) {
  const goal = toNumber(goalProtein)
  const actual = toNumber(actualProtein)
  if (goal <= 0 || actual >= goal) {
    return 0
  }

  const missRatio = (goal - actual) / Math.max(goal, EPSILON)
  return missRatio * 14 + missRatio * missRatio * 42
}

function undershootPenalty(actual, goal, linearWeight, quadraticWeight) {
  const target = toNumber(goal)
  const value = toNumber(actual)
  if (target <= 0 || value >= target) {
    return 0
  }

  const missRatio = (target - value) / Math.max(target, EPSILON)
  return missRatio * linearWeight + missRatio * missRatio * quadraticWeight
}

function mealProteinPenalty(mealKey, actualProtein, mealTargetProtein) {
  const floor = toNumber(mealTargetProtein) * (MIN_MEAL_PROTEIN_SHARE[mealKey] ?? 0.6)
  if (floor <= 0 || actualProtein >= floor) {
    return 0
  }

  const missRatio = (floor - actualProtein) / Math.max(floor, EPSILON)
  return missRatio * 4.5 + missRatio * missRatio * 10
}

function mealMacroFloorPenalty(actualValue, mealTargetValue, shareFloor, linearWeight, quadraticWeight) {
  const floor = toNumber(mealTargetValue) * shareFloor
  return undershootPenalty(actualValue, floor, linearWeight, quadraticWeight)
}

function scoreMeals(meals, goals, mealTargets) {
  const { breakfast, lunch, dinner } = meals
  const dayItems = [...breakfast, ...lunch, ...dinner]
  const dayTotals = combinationTotals(dayItems)
  const breakfastTotals = combinationTotals(breakfast)
  const lunchTotals = combinationTotals(lunch)
  const dinnerTotals = combinationTotals(dinner)
  const calorieGoal = toNumber(goals.calories)
  const carbGoal = toNumber(goals.carbs)
  const proteinGoal = toNumber(goals.protein)

  const dayLoss = macroLoss(goals, dayTotals)
  const splitLoss =
    macroLoss(mealTargets.breakfast, breakfastTotals) +
    macroLoss(mealTargets.lunch, lunchTotals) +
    macroLoss(mealTargets.dinner, dinnerTotals)

  const realismLoss =
    comboPenalty(breakfast, 'breakfast') +
    comboPenalty(lunch, 'lunch') +
    comboPenalty(dinner, 'dinner')

  const proteinLoss =
    proteinUndershootPenalty(dayTotals.protein, goals.protein) +
    mealProteinPenalty('breakfast', breakfastTotals.protein, mealTargets.breakfast.protein) +
    mealProteinPenalty('lunch', lunchTotals.protein, mealTargets.lunch.protein) +
    mealProteinPenalty('dinner', dinnerTotals.protein, mealTargets.dinner.protein)

  const calorieLoss =
    undershootPenalty(dayTotals.calories, goals.calories, 3.8, 9.5) +
    mealMacroFloorPenalty(breakfastTotals.calories, mealTargets.breakfast.calories, MIN_MEAL_CALORIE_SHARE.breakfast, 2, 5) +
    mealMacroFloorPenalty(lunchTotals.calories, mealTargets.lunch.calories, MIN_MEAL_CALORIE_SHARE.lunch, 2, 5) +
    mealMacroFloorPenalty(dinnerTotals.calories, mealTargets.dinner.calories, MIN_MEAL_CALORIE_SHARE.dinner, 2, 5)

  const carbLoss =
    undershootPenalty(dayTotals.carbs, goals.carbs, 3.2, 8.5) +
    mealMacroFloorPenalty(breakfastTotals.carbs, mealTargets.breakfast.carbs, MIN_MEAL_CARB_SHARE.breakfast, 1.6, 4.2) +
    mealMacroFloorPenalty(lunchTotals.carbs, mealTargets.lunch.carbs, MIN_MEAL_CARB_SHARE.lunch, 1.8, 4.4) +
    mealMacroFloorPenalty(dinnerTotals.carbs, mealTargets.dinner.carbs, MIN_MEAL_CARB_SHARE.dinner, 1.8, 4.4)

  const proteinFloor = proteinGoal >= 120 ? DAY_MIN_SHARE.protein : 0.72
  const gateLoss =
    undershootPenalty(dayTotals.calories, calorieGoal * DAY_MIN_SHARE.calories, 7.5, 18) +
    undershootPenalty(dayTotals.carbs, carbGoal * DAY_MIN_SHARE.carbs, 6.2, 16) +
    undershootPenalty(dayTotals.protein, proteinGoal * proteinFloor, 13, 34) +
    undershootPenalty(dayTotals.protein, proteinGoal, 8, 20) +
    undershootPenalty(dayTotals.protein, proteinGoal * 0.9, 7, 18) +
    undershootPenalty(carbGoal, dayTotals.carbs, 4, 10)

  // dayLoss is weighted 2x to make day-total macro accuracy the primary objective
  const loss = 2 * dayLoss + splitLoss * 0.55 + realismLoss + repeatPenalty(meals) + typeDayRepeatPenalty(meals) + proteinLoss + calorieLoss + carbLoss + gateLoss

  return { loss, dayTotals }
}

function setFromMeals(meals) {
  const names = new Set()
  for (const meal of [meals.breakfast, meals.lunch, meals.dinner]) {
    for (const item of meal) {
      names.add(itemName(item))
    }
  }
  return names
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size && !setB.size) {
    return 1
  }

  let overlap = 0
  for (const value of setA) {
    if (setB.has(value)) {
      overlap += 1
    }
  }

  const union = setA.size + setB.size - overlap
  return union > 0 ? overlap / union : 0
}

function insertLeaderboard(leaderboard, candidate) {
  leaderboard.push(candidate)
  leaderboard.sort((left, right) => left.loss - right.loss)
  if (leaderboard.length > LEADERBOARD_LIMIT) {
    leaderboard.length = LEADERBOARD_LIMIT
  }
}

function selectDiverseCandidates(leaderboard) {
  const diverse = []
  for (const candidate of leaderboard) {
    const tooSimilar = diverse.some((selected) => jaccardSimilarity(selected.itemSet, candidate.itemSet) > DIVERSITY_THRESHOLD)
    if (!tooSimilar) {
      diverse.push(candidate)
    }

    if (diverse.length >= DIVERSE_RESULTS_LIMIT) {
      break
    }
  }

  if (!diverse.length && leaderboard.length) {
    diverse.push(leaderboard[0])
  }

  return diverse
}

function mapCandidateToResult(candidate, normalizedHall) {
  if (!candidate) {
    return {
      breakfast: null,
      lunch: null,
      dinner: null,
      totals: combinationTotals([]),
      hall: normalizedHall,
    }
  }

  return {
    breakfast: {
      items: candidate.meals.breakfast,
      totals: combinationTotals(candidate.meals.breakfast),
    },
    lunch: {
      items: candidate.meals.lunch,
      totals: combinationTotals(candidate.meals.lunch),
    },
    dinner: {
      items: candidate.meals.dinner,
      totals: combinationTotals(candidate.meals.dinner),
    },
    totals: candidate.dayTotals,
    hall: normalizedHall,
    score: candidate.loss,
  }
}

function greedyRefine(candidate, poolInfo, goals, mealTargets) {
  let meals = {
    breakfast: [...candidate.meals.breakfast],
    lunch: [...candidate.meals.lunch],
    dinner: [...candidate.meals.dinner],
  }
  let { loss } = scoreMeals(meals, goals, mealTargets)

  for (let pass = 0; pass < MAX_REFINE_PASSES; pass++) {
    let anyImproved = false

    for (const mealKey of MEAL_KEYS) {
      const pool = poolInfo[mealKey].allItems

      for (let idx = 0; idx < meals[mealKey].length; idx++) {
        const currentMeal = meals[mealKey]
        let bestSwap = null
        let bestLoss = loss

        for (const poolItem of pool) {
          if (currentMeal.includes(poolItem)) continue
          const poolItemType = foodTypeKey(poolItem)
          if (currentMeal.some((other, i) => i !== idx && foodTypeKey(other) === poolItemType)) continue
          const trialMeal = [...currentMeal]
          trialMeal[idx] = poolItem
          const { loss: trialLoss } = scoreMeals({ ...meals, [mealKey]: trialMeal }, goals, mealTargets)
          if (trialLoss < bestLoss) {
            bestLoss = trialLoss
            bestSwap = poolItem
          }
        }

        if (bestSwap !== null) {
          const updated = [...meals[mealKey]]
          updated[idx] = bestSwap
          meals = { ...meals, [mealKey]: updated }
          loss = bestLoss
          anyImproved = true
        }
      }
    }

    if (!anyImproved) break
  }

  const { dayTotals } = scoreMeals(meals, goals, mealTargets)
  return { meals, dayTotals, loss, itemSet: setFromMeals(meals) }
}

export function recommendMeals(rows, goals, hall, preferences) {
  const normalizedHall = String(hall || 'all').toLowerCase()
  const filteredRows = (Array.isArray(rows) ? rows : []).filter((item) => {
    if (normalizedHall === 'all') {
      return true
    }

    return String(item?.diningHall || '').toLowerCase() === normalizedHall
  })

  let usableRows = filteredRows.filter((item) => {
    const name = itemName(item)
    const section = itemSection(item)
    if (EXCLUDED_ITEM_KEYWORDS.some((keyword) => name.includes(keyword))) {
      return false
    }

    if (EXCLUDED_SECTIONS.some((excludedSection) => section.includes(excludedSection))) {
      return false
    }

    return !isCondimentLike(item)
  })

  const dietaryRestriction = preferences?.dietaryRestriction ?? 'none'
  if (dietaryRestriction === 'vegan') {
    usableRows = usableRows.filter((item) => item.vegan === true)
  } else if (dietaryRestriction === 'vegetarian') {
    usableRows = usableRows.filter((item) => item.vegetarian === true)
  }

  const allergies = typeof preferences?.allergies === 'string' ? preferences.allergies.trim() : ''
  if (allergies) {
    const allergyTerms = allergies.toLowerCase().split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean)
    if (allergyTerms.length > 0) {
      usableRows = usableRows.filter((item) => {
        const name = String(item?.foodName || '').toLowerCase()
        return !allergyTerms.some((term) => name.includes(term))
      })
    }
  }

  const mealPools = {
    breakfast: usableRows.filter((item) => mealAvailableFor(item, 'breakfast')),
    lunch: usableRows.filter((item) => mealAvailableFor(item, 'lunch')),
    dinner: usableRows.filter((item) => mealAvailableFor(item, 'dinner')),
  }

  if (!mealPools.breakfast.length || !mealPools.lunch.length || !mealPools.dinner.length) {
    return {
      breakfast: null,
      lunch: null,
      dinner: null,
      totals: combinationTotals([]),
      hall: normalizedHall,
    }
  }

  const poolInfo = {
    breakfast: {
      allItems: mealPools.breakfast,
      categories: {
        entree: mealPools.breakfast.filter((item) => itemCategory(item) === 'entree'),
        side: mealPools.breakfast.filter((item) => itemCategory(item) === 'side'),
        treat: mealPools.breakfast.filter((item) => itemCategory(item) === 'treat'),
      },
    },
    lunch: {
      allItems: mealPools.lunch,
      categories: {
        entree: mealPools.lunch.filter((item) => itemCategory(item) === 'entree'),
        side: mealPools.lunch.filter((item) => itemCategory(item) === 'side'),
        treat: mealPools.lunch.filter((item) => itemCategory(item) === 'treat'),
      },
    },
    dinner: {
      allItems: mealPools.dinner,
      categories: {
        entree: mealPools.dinner.filter((item) => itemCategory(item) === 'entree'),
        side: mealPools.dinner.filter((item) => itemCategory(item) === 'side'),
        treat: mealPools.dinner.filter((item) => itemCategory(item) === 'treat'),
      },
    },
  }

  const mealTargets = mealTargetsFromGoals(goals)
  const leaderboard = []
  const iterations = Math.min(
    MONTE_CARLO_ITERATIONS,
    6000 + filteredRows.length * 30
  )

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const breakfast = sampleMeal('breakfast', poolInfo.breakfast)
    const lunch = sampleMeal('lunch', poolInfo.lunch)
    const dinner = sampleMeal('dinner', poolInfo.dinner)

    if (!breakfast || !lunch || !dinner) {
      continue
    }

    const meals = { breakfast, lunch, dinner }
    const breakfastTotals = combinationTotals(breakfast)
    const lunchTotals = combinationTotals(lunch)
    const dinnerTotals = combinationTotals(dinner)

    const calorieGoal = toNumber(goals.calories)
    if (calorieGoal > 0) {
      const mealFloor = calorieGoal * MIN_MEAL_CALORIE_SHARE.breakfast
      if (
        breakfastTotals.calories < mealFloor ||
        lunchTotals.calories < mealFloor ||
        dinnerTotals.calories < mealFloor
      ) {
        continue
      }
    }

    const { loss, dayTotals } = scoreMeals(meals, goals, mealTargets)

    insertLeaderboard(leaderboard, {
      meals,
      dayTotals,
      loss,
      itemSet: setFromMeals(meals),
    })
  }

  // Greedy refinement: hill-climb each top candidate by trying single-item swaps
  const refinedLeaderboard = []
  for (const candidate of leaderboard.slice(0, REFINE_CANDIDATES)) {
    const refined = greedyRefine(candidate, poolInfo, goals, mealTargets)
    insertLeaderboard(refinedLeaderboard, refined)
    insertLeaderboard(refinedLeaderboard, candidate)
  }
  for (const candidate of leaderboard.slice(REFINE_CANDIDATES)) {
    insertLeaderboard(refinedLeaderboard, candidate)
  }

  const diverseCandidates = selectDiverseCandidates(refinedLeaderboard)
  const best = diverseCandidates[0]
  const result = mapCandidateToResult(best, normalizedHall)

  if (diverseCandidates.length > 1) {
    result.alternatives = diverseCandidates.slice(1).map((candidate) => mapCandidateToResult(candidate, normalizedHall))
  }

  return result
}

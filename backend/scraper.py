from datetime import datetime
import re
import traceback
from typing import Dict
from pathlib import Path

from bs4 import BeautifulSoup
import pandas as pd
import requests


class UNCDiningScaper:
    def __init__(self):
        self.nutrition_url = "https://dining.unc.edu/wp-content/themes/nmc_dining/ajax-content/recipe.php"
        self.request_timeout = 20
        self.output_dir = Path(__file__).resolve().parent / "data"
        self._nutrition_cache: Dict[str, Dict[str, float]] = {}
        self.locations = {
            "lenoir": {
                "url": "https://dining.unc.edu/locations/top-of-lenoir/",
                "display_name": "Top of Lenoir",
            },
            "chase": {
                "url": "https://dining.unc.edu/locations/chase/",
                "display_name": "Chase Hall",
            },
        }

    def set_url(self, url: str):
        """Update the base URL for scraping."""
        self.locations["lenoir"]["url"] = url

    def _default_nutrition(self) -> Dict[str, float]:
        return {
            "Calories": 0.0,
            "Total Fat": 0.0,
            "Total Carbohydrates": 0.0,
            "Protein": 0.0,
            "Sodium": 0.0,
        }

    def _meal_flags(self, meal_label: str) -> Dict[str, int]:
        label = meal_label.strip().lower()
        return {
            "breakfast": 1 if "breakfast" in label else 0,
            "lunch": 1 if "lunch" in label and "late" not in label else 0,
            "late lunch": 1 if "late lunch" in label else 0,
            "dinner": 1 if "dinner" in label and "late dinner" not in label and "late night" not in label else 0,
            "late dinner": 1 if "late dinner" in label else 0,
            "late night": 1 if "late night" in label else 0,
        }

    def _parse_nutrition_html(self, html: str) -> Dict[str, float]:
        nutrition = self._default_nutrition()
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", class_="nutrition-facts-table")
        if table is None:
            return nutrition

        text = table.get_text(" ", strip=True)
        patterns = {
            "Calories": r"Calories\s*(\d+(?:\.\d+)?)",
            "Total Fat": r"Total Fat\s*(\d+(?:\.\d+)?)\s*g",
            "Total Carbohydrates": r"Total Carbohydrate\s*(\d+(?:\.\d+)?)\s*g",
            "Protein": r"Protein\s*(\d+(?:\.\d+)?)\s*g",
            "Sodium": r"Sodium\s*(\d+(?:\.\d+)?)\s*mg",
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                nutrition[key] = float(match.group(1))

        return nutrition

    def get_nutrition_info(self, recipe_id: str, session: requests.Session) -> Dict[str, float]:
        if not recipe_id:
            return self._default_nutrition()

        if recipe_id in self._nutrition_cache:
            return self._nutrition_cache[recipe_id]

        nutrition = self._default_nutrition()
        try:
            response = session.get(
                self.nutrition_url,
                params={"recipe": recipe_id, "hide_allergens": 0},
                timeout=self.request_timeout,
            )
            response.raise_for_status()
            payload = response.json()
            html = payload.get("html", "")
            if html:
                nutrition = self._parse_nutrition_html(html)
        except Exception:
            pass

        self._nutrition_cache[recipe_id] = nutrition
        return nutrition

    def scrape_menu(self):
        try:
            session = requests.Session()
            menu_items_by_key = {}

            for hall_key, hall_info in self.locations.items():
                response = requests.get(hall_info["url"], timeout=self.request_timeout)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")

                tab_labels = {}
                for tab_button in soup.select("#menu-tabs .c-tabs-nav [role='tab']"):
                    tab_id = tab_button.get("id", "").strip()
                    tab_label = tab_button.get_text(" ", strip=True)
                    if tab_id:
                        tab_labels[tab_id] = tab_label

                for tab_panel in soup.select("#menu-tabs [role='tabpanel']"):
                    labelled_by = tab_panel.get("aria-labelledby", "").strip()
                    meal_label = tab_labels.get(labelled_by, "")
                    meal_flags = self._meal_flags(meal_label)
                    menu_stations = tab_panel.find_all("div", class_="menu-station")

                    for station in menu_stations:
                        try:
                            station_button = station.find("button", class_="toggle-menu-station-data")
                            station_name = station_button.get_text(strip=True) if station_button else "Unknown"
                            menu_items_elements = station.find_all("li", class_="menu-item-li")

                            for item in menu_items_elements:
                                try:
                                    nutrition_link = item.find("a", class_="show-nutrition")
                                    if nutrition_link is None:
                                        continue

                                    name = nutrition_link.get_text(strip=True)
                                    class_names = set(nutrition_link.get("class", []))
                                    recipe_id = nutrition_link.get("data-recipe", "")
                                    nutrition = self.get_nutrition_info(recipe_id, session)

                                    restrictions = {
                                        "Vegan": "prop-vegan" in class_names,
                                        "Vegetarian": "prop-vegetarian" in class_names,
                                        "Made Without Gluten": "prop-made_without_gluten" in class_names,
                                        "Halal": "prop-halal" in class_names,
                                        "Organic": "prop-organic" in class_names,
                                    }

                                    row_key = (hall_key, recipe_id, station_name)
                                    if row_key not in menu_items_by_key:
                                        menu_items_by_key[row_key] = {
                                            "Food Name": name,
                                            "Dining Hall": hall_key,
                                            "Location": hall_info["display_name"],
                                            "Section": station_name,
                                            **nutrition,
                                            **restrictions,
                                            **meal_flags,
                                        }
                                    else:
                                        existing = menu_items_by_key[row_key]
                                        for meal_col, value in meal_flags.items():
                                            existing[meal_col] = max(existing[meal_col], value)
                                except Exception:
                                    continue
                        except Exception:
                            continue

            if menu_items_by_key:
                df = pd.DataFrame(menu_items_by_key.values())
                numeric_columns = ["Calories", "Total Fat", "Total Carbohydrates", "Protein", "Sodium"]
                for col in numeric_columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

                df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean()).fillna(0)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                self.output_dir.mkdir(parents=True, exist_ok=True)
                filename = self.output_dir / f"dining_menu_{timestamp}.csv"
                df.to_csv(filename, index=False)
                print(f"Saved {len(df)} menu rows to {filename}")
                return df

            print("No menu items were found on the page.")
            return None

        except Exception as exc:
            print(f"Failed to scrape menu: {exc}")
            traceback.print_exc()
            return None


if __name__ == "__main__":
    scraper = UNCDiningScaper()
    try:
        scraper.scrape_menu()
    except KeyboardInterrupt:
        print("Scraping stopped by user.")

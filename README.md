# AIMealPlanner

AIMealPlanner is a full-stack meal planning assistant built for students who want practical, macro-aware dining hall choices without spending hours comparing menu items. The app combines a React + Vite frontend with a lightweight data pipeline that ingests dining menu data and recommends realistic breakfast, lunch, and dinner combinations.

The planner lets users enter daily calorie and macro goals, choose preference profiles, and generate meal sets that balance protein, carbohydrates, and fats across the day. Recommendation logic uses constrained sampling and scoring to search many candidate combinations, then ranks outputs based on goal fit, variety, and meal realism. Additional guardrails filter low-quality options by excluding irrelevant sections, reducing repetitive item patterns, and favoring entree-adjacent selections so results feel like actual meals.

The interface includes dedicated pages for home, planner, AI-assisted ideas, and dietary preferences. A focused navigation bar keeps key flows easy to access, while active-state styling and loading feedback make interactions clear during meal generation.

Project structure is simple: frontend source lives in src, utility logic is in src/utils, and backend scripts are in backend, including scraper.py for menu data collection. Parsed menu data is stored under public/data for fast client-side access.

To run locally, install dependencies with npm install, then use npm run dev for development and npm run build for production builds. AIMealPlanner is designed to be easy to extend with new optimization rules, campus data sources, and personalization features.

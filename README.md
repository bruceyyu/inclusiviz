# <span style="color:rgb(127, 121, 179); font-style: italic">InclusiViz</span>: Visual Analytics of Human Mobility Data for Understanding and Mitigating Urban Segregation

IEEE PacificVis 2025

## Frontend (React + Vite):
- npm i
- npm run dev

## Backend (Django):
- conda create -n "inclusiviz" python=3.8.13
- conda activate inclusiviz
- pip install -r requirements.txt
- python manage.py runserver 8080

## Evaluation:
- install same environment as the backend
- bash run.sh

## Notes:
- When the backend is initiated or the attribute is switched, it will take several seconds for the backend to load the models. Please wait and do not start exploration until a *"loaded all models!"* statement appears in the console.
- This repo reuses some code of the Deep Gravity model, whose original repo can be found in this [link](https://github.com/scikit-mobility/DeepGravity/tree/master).
- Due to the data licensing terms, we have masked real-world mobility data to 0, including the `evaluation/deepgravity/data/{city}/flows.csv` and `inclusiviz-backend/data/{city}_adj_df.csv`. Researchers interested in reproducing this analysis can prepare their own mobility datasets following the data structure. If there are additional features, it is necessary to adjust some code like `get_features` function in `data_loader.py` to accommodate customized datasets and features.

## Contact
yue.yu@connect.ust.hk
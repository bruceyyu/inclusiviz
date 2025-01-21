# myapp/apps.py
from django.apps import AppConfig
import torch
from .deepgravity.what_if import WhatIf

attr_list_map = {
    "race": ["white", "black", "asian", "hispanic"],
    "income": ["Under $50K", "$50K - $100K", "$100K - $200K", "Over $200K"],
    "party": ["Lean Democrat", "Lean Republican"]
}

class MyAppConfig(AppConfig):
    name = 'inclusiviz'
    what_if_obj = None

    def ready(self):
        global what_if_obj
        MyAppConfig.what_if_obj = WhatIf(dataset="Houston", attr="income", attr_cate_list=attr_list_map['income'])
        print("loaded all models!")

    def get_what_if_obj():
        return MyAppConfig.what_if_obj
    
    def set_what_if_obj_attr(new_attr, new_city):
        print("setting what if obj attr to: ", new_attr)
        MyAppConfig.what_if_obj = WhatIf(dataset=new_city, attr=new_attr, attr_cate_list=attr_list_map[new_attr])


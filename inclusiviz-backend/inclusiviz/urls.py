from django.urls import path
from . import views

urlpatterns = [
    path('set_attr', views.set_attr, name='set_attr'),
    path('get_geo', views.get_geo, name='get_geo'),
    path('get_communities', views.get_communities, name='get_communities'),
    path('get_k_neighbors', views.get_k_neighbors, name='get_k_neighbors'),
    path('get_all_cbg_knn_feature', views.get_all_cbg_knn_feature, name='get_all_cbg_knn_feature'),
    path('get_cbg_feature', views.get_cbg_feature, name='get_cbg_feature'),
    path('what_if', views.what_if, name='what_if'),
    path('get_shap_values', views.get_shap_values, name='get_shap_values'),
]

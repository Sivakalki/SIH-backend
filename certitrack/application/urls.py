from django.urls import path
from .views import *

urlpatterns = [
    path('addApplication/',ApplicationView.as_view()),
]
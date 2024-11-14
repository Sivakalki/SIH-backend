from rest_framework import serializers
from django.contrib.auth.models import User
from .models import *
from rest_framework.serializers import Serializer,ModelSerializer

class CustomUserSerializer(ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password' ,'role','area']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            role = validated_data['role'],
            area = validated_data['area'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
    
class LoginSerializer(Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
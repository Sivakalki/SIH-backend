from django.shortcuts import render
from .models import *
from .serializers import *
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth import authenticate

class SignupAPIView(APIView):
    def post(self, request):
        username = request.data['username']
        password = request.data['password']
        email = request.data['email']
        role = request.data.get('role', 'default')
        area = request.data['area']
        data={
            'username':username,
            'password':password,
            'email':email,
            'role':role,
            'area':area
        }
        serializer = CustomUserSerializer(data = data)
        if serializer.is_valid():
            user=serializer.save()
            refresh = (RefreshToken.for_user(user))
            token = str(refresh.access_token)
            return Response(
                {"token": token}, status=status.HTTP_201_CREATED
            )
        else:
            print(serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class LoginView(APIView):
    def post(self, request):
        data = {
            'username': request.data['username'],
            'password':request.data['password']
        }
        serializer = LoginSerializer(data=data)
        if serializer.is_valid():
            username = serializer.validated_data["username"]
            password = serializer.validated_data["password"]
            user = authenticate(username=username, password=password)
            if user:
                refresh = RefreshToken.for_user(user)
                token = str(refresh.access_token)
                return Response(
                    {"token": str(token)},status=status.HTTP_200_OK
                )
            else:
                return Response({"error":"Invalid username and password"},status= status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error":"Invalid username and password"},status= status.HTTP_400_BAD_REQUEST)
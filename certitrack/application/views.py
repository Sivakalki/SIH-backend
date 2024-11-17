from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Application
from .serializers import ApplicationSerializer
from users.models import *

class ApplicationView(APIView):
    def get(self, request, *args, **kwargs): 
        """
        Retrieve all applications or a single application by ID.
        """
        applicant_id = kwargs.get('pk')  # Get the primary key (ID) from the URL if provided
        if applicant_id:
            try:
                application = Application.objects.get(applicant=applicant_id)
                serializer = ApplicationSerializer(application)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Application.DoesNotExist:
                return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            applications = Application.objects.all()
            serializer = ApplicationSerializer(applications, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """
        Create a new application with optional nested address data.
        """
        serializer = ApplicationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VroApplicationsView(APIView):
    def get(self, request):
        user = request.token
        applied_area = CustomUser.objects.get(username = user).area

        applications = Application.objects.filter(application_area = applied_area)
from rest_framework import serializers
from .models import Application, Address

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        # fields = '__all__'  # Include all fields of the Address model
        exclude = ['applicant_id']

class ApplicationSerializer(serializers.ModelSerializer):
    address = AddressSerializer(many=False, read_only=True)  # Include related address details
    address_data = AddressSerializer(write_only=True)  # Used to create/update address

    class Meta:
        model = Application
        fields = [
            'applicant', 
            'first_name', 
            'last_name', 
            'application_date', 
            'status', 
            'application_area', 
            'application_applied', 
            'address', 
            'address_data'
        ]

    def create(self, validated_data):
        # Extract nested address data
        address_data = validated_data.pop('address_data', None)
        application = Application.objects.create(**validated_data)

        if address_data:
            Address.objects.create(applicant_id=application, **address_data)
        
        return application

    def update(self, instance, validated_data):
        # Extract nested address data
        address_data = validated_data.pop('address_data', None)

        # Update application fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create address
        if address_data:
            address, created = Address.objects.update_or_create(
                applicant_id=instance, defaults=address_data
            )
        
        return instance


class VroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = '__all__'

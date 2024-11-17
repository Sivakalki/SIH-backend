from django.db import models
from users.models import CustomUser

class AddressProof(models.Model):
    DOCUMENT_CHOICES = [
        ('Aadhar', 'Aadhar'),
        ('ElectricityBill', 'ElectricityBill'),
        ('WaterBill', 'WaterBill')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_CHOICES)
    document_number = models.CharField(max_length=50, blank=True)  # e.g., aadhar_num
    document = models.FileField(upload_to='documents/address_proof/')

    def __str__(self):
        return f"{self.document_type} - {self.user.username}"

class DOBProof(models.Model):
    DOCUMENT_CHOICES = [
        ('PAN', 'PAN'),
        ('SSC', 'SSC'),
        ('TC', 'TransferCertificate')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_CHOICES)
    document_number = models.CharField(max_length=50, blank=True)  # e.g., pan_num
    document = models.FileField(upload_to='documents/dob_proof/')

    def __str__(self):
        return f"{self.document_type} - {self.user.username}"

class CasteProof(models.Model):
    DOCUMENT_CHOICES = [
        ('BloodRelationCaste', 'BloodRelationCaste')
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_CHOICES)
    document = models.FileField(upload_to='documents/caste_proof/')

    def __str__(self):
        return f"{self.document_type} - {self.user.username}"

class Application(models.Model):
    STATUS = [
        ('Pending', 'Pending'),
        ('UnderMRO', 'UnderMRO'), 
        ('UnderVRO', 'UnderVRO'), 
        ('Rejected', 'Rejected'),
        ('Approved', 'Approved'), 
    ]
    applicant = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    application_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS)
    application_area=  models.CharField(max_length=30)
    application_applied = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} application"

class Address(models.Model):
    applicant_id = models.ForeignKey(Application,on_delete=models.ForeignKey)
    location = models.CharField(max_length=50)
    village = models.CharField(max_length=20, null = True)
    city = models.CharField(max_length=20, null = True)
    mandal = models.CharField(max_length=20, null = True)
    pincode = models.CharField(max_length=20)
    district = models.CharField(max_length=30)
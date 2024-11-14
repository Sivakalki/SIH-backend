from django.db import models
from django.contrib.auth.models import User,AbstractUser



class CustomUser(AbstractUser):

    DEFAULT = 'default'
    VRO = 'vro'
    MRO = 'mro'
    DISTRICT = 'district'

    ROLE_CHOICES = (
        (DEFAULT, 'default'),
        (VRO, 'vro'),
        (MRO, 'mro'),
        (DISTRICT, 'district')
    )

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50,null=True,default='',unique=True)
    role = models.CharField(choices=ROLE_CHOICES,default="default", max_length=10)
    area = models.CharField(max_length=100)
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',  # Change the related_name
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',  # Change the related_name
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions'
    )
    def __str__(self):
        return self.username
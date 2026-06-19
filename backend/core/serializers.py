"""
TaskWave - Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Workspace,
    WorkspaceMember,
    Board,
    Column,
    Task,
    Comment,
    Notification,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            "date_joined",
            "plan_tier",
            "subscription_status",
        ]
        read_only_fields = [
            "id",
            "date_joined",
            "plan_tier",
            "subscription_status",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "password", "password_confirm"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password": "Le password non coincidono"}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            password=validated_data["password"],
        )
        return user


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ["id", "user", "role", "joined_at"]


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = WorkspaceMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ["id", "name", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "position",
            "assignee",
            "created_by",
            "column",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TaskMoveSerializer(serializers.Serializer):
    column_id = serializers.UUIDField()
    position = serializers.IntegerField()


class BoardSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(write_only=True, required=False)
    workspace = serializers.UUIDField(read_only=True)
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = [
            "id",
            "name",
            "description",
            "workspace",
            "workspace_id",
            "columns",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "workspace"]

    def create(self, validated_data):
        workspace_id = validated_data.pop("workspace_id", None)
        if workspace_id:
            from core.models import Workspace

            validated_data["workspace"] = Workspace.objects.get(id=workspace_id)
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "user", "content", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "task", "read", "created_at"]
        read_only_fields = ["id", "created_at"]

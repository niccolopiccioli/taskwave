"""
TaskWave - Modelli del database
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


PLAN_LIMITS = {
    "free": {"max_workspaces": 3, "max_members_per_workspace": 5},
    "pro": {"max_workspaces": None, "max_members_per_workspace": 20},
    "business": {"max_workspaces": None, "max_members_per_workspace": None},
}


class User(AbstractUser):
    """Utente personalizzato"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    avatar_url = models.URLField(blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(max_length=30, default="free")
    plan_tier = models.CharField(max_length=20, default="free")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "Utente"
        verbose_name_plural = "Utenti"

    def __str__(self):
        return self.email

    def get_plan_limits(self):
        return PLAN_LIMITS.get(self.plan_tier, PLAN_LIMITS["free"])

    def can_create_workspace(self):
        limits = self.get_plan_limits()
        max_workspaces = limits["max_workspaces"]
        if max_workspaces is None:
            return True
        return self.owned_workspaces.count() < max_workspaces

    def can_add_workspace_member(self, workspace):
        limits = self.get_plan_limits()
        max_members = limits["max_members_per_workspace"]
        if max_members is None:
            return True
        return workspace.members.count() < max_members


class Workspace(models.Model):
    """Workspace - contenitore per board e membri"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="owned_workspaces"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workspaces"
        verbose_name = "Workspace"
        verbose_name_plural = "Workspaces"

    def __str__(self):
        return self.name


class WorkspaceMember(models.Model):
    """Membri di un workspace con ruolo"""

    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("member", "Member"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="workspace_memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "workspace_members"
        unique_together = ["workspace", "user"]
        verbose_name = "Membro Workspace"
        verbose_name_plural = "Membri Workspace"

    def __str__(self):
        return f"{self.user.email} - {self.workspace.name} ({self.role})"


class Board(models.Model):
    """Board Kanban"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="boards"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "boards"
        verbose_name = "Board"
        verbose_name_plural = "Boards"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Column(models.Model):
    """Colonna Kanban"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="columns")
    name = models.CharField(max_length=100)
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "columns"
        verbose_name = "Colonna"
        verbose_name_plural = "Colonne"
        ordering = ["position"]

    def __str__(self):
        return f"{self.board.name} - {self.name}"


class Task(models.Model):
    """Task Kanban"""

    PRIORITY_CHOICES = [
        ("low", "Bassa"),
        ("medium", "Media"),
        ("high", "Alta"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    position = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tasks"
        verbose_name = "Task"
        verbose_name_plural = "Tasks"
        ordering = ["position"]

    def __str__(self):
        return self.title


class Comment(models.Model):
    """Commento su un task"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comments"
        verbose_name = "Commento"
        verbose_name_plural = "Commenti"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user.email} on {self.task.title}"


class Notification(models.Model):
    """Notifiche per gli utenti"""

    TYPE_CHOICES = [
        ("assigned", "Assegnato"),
        ("moved", "Spostato"),
        ("commented", "Commentato"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        verbose_name = "Notifica"
        verbose_name_plural = "Notifiche"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.type}"

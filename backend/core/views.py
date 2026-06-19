"""
TaskWave - Views API
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.shortcuts import get_object_or_404

from .models import (
    Workspace,
    WorkspaceMember,
    Board,
    Column,
    Task,
    Comment,
    Notification,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    WorkspaceSerializer,
    WorkspaceMemberSerializer,
    BoardSerializer,
    ColumnSerializer,
    TaskSerializer,
    TaskMoveSerializer,
    CommentSerializer,
    NotificationSerializer,
)


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission per owner o admin del workspace"""

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "workspace"):
            workspace = obj.workspace
        elif hasattr(obj, "board"):
            workspace = obj.board.workspace
        else:
            workspace = obj

        member = WorkspaceMember.objects.filter(
            workspace=workspace, user=request.user
        ).first()

        return member and member.role in ["admin", "owner"]


# Auth Views
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """Registrazione utente"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Info utente corrente"""
    return Response(UserSerializer(request.user).data)


# Workspace Views
class WorkspaceViewSet(viewsets.ModelViewSet):
    """ViewSet per i workspace"""

    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ritorna i workspace di cui l'utente è membro
        member_ids = self.request.user.workspace_memberships.values_list(
            "workspace_id", flat=True
        )
        return Workspace.objects.filter(id__in=member_ids)

    def perform_create(self, serializer):
        if not self.request.user.can_create_workspace():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Limite workspace raggiunto. Passa al piano Pro per workspace illimitati."
            )
        workspace = serializer.save(owner=self.request.user)
        # Aggiungi il creator come admin
        WorkspaceMember.objects.create(
            workspace=workspace, user=self.request.user, role="admin"
        )


class WorkspaceMemberViewSet(viewsets.ModelViewSet):
    """ViewSet per i membri del workspace"""

    serializer_class = WorkspaceMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get("workspace_id")
        return WorkspaceMember.objects.filter(workspace_id=workspace_id)

    def create(self, request, *args, **kwargs):
        """Crea membro tramite email"""
        from django.contrib.auth import get_user_model

        User = get_user_model()

        workspace_id = self.kwargs.get("workspace_id")
        email = request.data.get("email")
        role = request.data.get("role", "member")

        if not email:
            return Response(
                {"error": "Email richiesta"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Utente non trovato"}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if already a member
        if WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user=user
        ).exists():
            return Response(
                {"error": "Utente già membro del workspace"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workspace = Workspace.objects.get(id=workspace_id)

        if not workspace.owner.can_add_workspace_member(workspace):
            return Response(
                {
                    "error": "Limite membri raggiunto per questo workspace. Passa al piano Pro o Business."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        member = WorkspaceMember.objects.create(
            workspace=workspace, user=user, role=role
        )

        serializer = self.get_serializer(member)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Board Views
class BoardViewSet(viewsets.ModelViewSet):
    """ViewSet per le board"""

    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get("workspace_id")
        return Board.objects.filter(workspace_id=workspace_id)

    def perform_create(self, serializer):
        workspace_id = self.kwargs.get("workspace_id")
        board = serializer.save(workspace_id=workspace_id)
        # Crea colonne di default
        Column.objects.create(board=board, name="Da Fare", position=0)
        Column.objects.create(board=board, name="In Progress", position=1)
        Column.objects.create(board=board, name="Fatto", position=2)


class ColumnViewSet(viewsets.ModelViewSet):
    """ViewSet per le colonne"""

    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        board_id = self.kwargs.get("board_id")
        return Column.objects.filter(board_id=board_id)


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet per i task"""

    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        column_id = self.kwargs.get("column_id")
        return Task.objects.filter(column_id=column_id)

    def perform_create(self, serializer):
        task = serializer.save(
            created_by=self.request.user, column_id=self.kwargs.get("column_id")
        )
        # Notifica assignee
        if task.assignee:
            Notification.objects.create(user=task.assignee, type="assigned", task=task)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_assignee = instance.assignee

        response = super().update(request, *args, **kwargs)

        # Notifica nuovo assignee
        if old_assignee != instance.assignee and instance.assignee:
            Notification.objects.create(
                user=instance.assignee, type="assigned", task=instance
            )

        return response

    @api_view(["PUT"])
    def move(self, request, pk=None):
        """Sposta task in altra colonna"""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)

        if serializer.is_valid():
            column_id = serializer.validated_data["column_id"]
            position = serializer.validated_data["position"]

            task.column_id = column_id
            task.position = position
            task.save()

            # Notifica spostamento
            if task.assignee and task.assignee != request.user:
                Notification.objects.create(user=task.assignee, type="moved", task=task)

            return Response(TaskSerializer(task).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Comment Views
class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet per i commenti"""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get("task_id")
        return Comment.objects.filter(task_id=task_id)

    def perform_create(self, serializer):
        comment = serializer.save(
            user=self.request.user, task_id=self.kwargs.get("task_id")
        )
        # Notifica autore task
        if comment.task.created_by and comment.task.created_by != self.request.user:
            Notification.objects.create(
                user=comment.task.created_by, type="commented", task=comment.task
            )


# Notification Views
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet per le notifiche"""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @api_view(["POST"])
    def mark_read(self, request, pk=None):
        """Segna notifica come letta"""
        notification = get_object_or_404(Notification, id=pk, user=request.user)
        notification.read = True
        notification.save()
        return Response(status=status.HTTP_200_OK)
